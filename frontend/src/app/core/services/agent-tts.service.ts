import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { environment } from "../../../environments/environment";
import { BrowserTtsService } from "./browser-tts.service";

export interface AgentSpeakOptions {
  lang?: string;
  /**
   * Optionally pass a backend TTS voice ID.
   * Omit to let the backend use its configured default.
   * Do NOT hard-code "recruiter_en" — that value is not a valid ID
   * for any standard TTS provider and causes a 422 from the backend.
   */
  voice?: string;
  preferRemote?: boolean;
  /** Defaults to true — always fall back to browser TTS when remote fails. */
  allowBrowserFallback?: boolean;
  /** Called with normalized volume [0–1] on each audio frame during remote TTS playback. */
  onVolume?: (v: number) => void;
}

@Injectable({ providedIn: "root" })
export class AgentTtsService {
  private readonly http = inject(HttpClient);
  private readonly browserTts = inject(BrowserTtsService);
  private readonly base = environment.interviewApiUrl;

  private remoteAvailable: boolean | null = null;

  private activeAudioCtx: AudioContext | null = null;
  private activeRafId: number | null = null;
  private activeStopResolve: (() => void) | null = null;

  private async checkRemoteAvailable(): Promise<boolean> {
    if (this.remoteAvailable !== null) return this.remoteAvailable;
    try {
      const res = await firstValueFrom(
        this.http.get<{ available: boolean }>(`${this.base}/api/live-voice/available`),
      );
      this.remoteAvailable = res.available;
    } catch {
      this.remoteAvailable = false;
    }
    return this.remoteAvailable ?? false;
  }

  /** Force-reset the remote-available cache (e.g. after a new session starts). */
  resetAvailabilityCache(): void {
    this.remoteAvailable = null;
  }

  async speak(text: string, options: AgentSpeakOptions = {}): Promise<void> {
    const cleanText = (text ?? "").trim();
    if (!cleanText) return;

    const preferRemote = options.preferRemote ?? true;
    // Default to true — browser TTS is the safe fallback, never leave the user in silence.
    const allowBrowserFallback = options.allowBrowserFallback ?? true;

    if (preferRemote && (await this.checkRemoteAvailable())) {
      try {
        console.log("[AgentTTS] Trying remote TTS:", cleanText);

        // Build the request body without a voice override unless the caller
        // explicitly provides one.  Hard-coding "recruiter_en" causes 422 from
        // the backend DTO validator because it is not a recognised provider voice ID.
        const body: Record<string, string> = {
          text: cleanText,
          lang: options.lang ?? "en-US",
        };
        if (options.voice) {
          body["voice"] = options.voice;
        }

        const blob = await firstValueFrom(
          this.http.post(
            `${this.base}/api/live-voice/speak`,
            body,
            { responseType: "blob" },
          ),
        );

        console.log(
          "[AgentTTS] Remote TTS success:",
          blob.size,
          blob.type || "unknown",
        );
        await this.playBlob(blob, options.onVolume);
        return;
      } catch (error: any) {
        const status: number = error?.status ?? 0;
        console.warn(
          `[AgentTTS] Remote TTS failed (HTTP ${status}) — switching to browser TTS.`,
          error?.message ?? error,
        );
        // Mark remote as unavailable for the rest of this service lifetime
        // so we don't keep hammering a broken endpoint.
        this.remoteAvailable = false;

        if (!allowBrowserFallback) {
          throw error;
        }
      }
    }

    console.log("[AgentTTS] Using browser TTS");
    await this.browserTts.speak(cleanText, options.lang ?? "en-US");
  }

  stop(): void {
    this.browserTts.stop();
    if (this.activeRafId !== null) cancelAnimationFrame(this.activeRafId);
    this.activeAudioCtx?.close().catch(() => {});
    this.activeStopResolve?.();
    this.activeRafId = null;
    this.activeAudioCtx = null;
    this.activeStopResolve = null;
  }

  private async playBlob(blob: Blob, onVolume?: (v: number) => void): Promise<void> {
    if (!blob || blob.size === 0) {
      throw new Error("Empty audio blob returned from remote TTS");
    }

    if (onVolume) {
      const arrayBuffer = await blob.arrayBuffer();
      const audioCtx = new AudioContext();
      this.activeAudioCtx = audioCtx;
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);

      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        onVolume(Math.min(avg / 80, 1.0));
        this.activeRafId = requestAnimationFrame(tick);
      };

      await new Promise<void>((resolve, reject) => {
        this.activeStopResolve = resolve;
        source.onended = () => {
          cancelAnimationFrame(this.activeRafId!);
          onVolume(0);
          audioCtx.close();
          this.activeRafId = null;
          this.activeAudioCtx = null;
          this.activeStopResolve = null;
          resolve();
        };
        source.addEventListener('error', () => reject(new Error("Audio playback failed")));
        source.start();
        tick();
      });
      return;
    }

    const objectUrl = URL.createObjectURL(blob);

    try {
      const audio = new Audio(objectUrl);

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error("Audio playback failed"));
        audio.play().catch(reject);
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
}