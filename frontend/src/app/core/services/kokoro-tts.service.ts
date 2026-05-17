import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface KokoroSpeakOptions {
  voice?: string;
  speed?: number;
  onVolume?: (v: number) => void;
}

export class KokoroUnavailableError extends Error {
  constructor() { super('Kokoro TTS is not available'); }
}

@Injectable({ providedIn: 'root' })
export class KokoroTtsService {
  private readonly base = environment.kokoroUrl;

  private availableCache: boolean | null = null;
  private cacheExpiry = 0;

  private activeAudioCtx: AudioContext | null = null;
  private activeRafId: number | null = null;
  private activeOnVolume: ((v: number) => void) | null = null;
  private pendingResolve: (() => void) | null = null;

  async isAvailable(): Promise<boolean> {
    if (!this.base) return false;
    if (this.availableCache !== null && Date.now() < this.cacheExpiry) {
      return this.availableCache;
    }
    try {
      const res = await fetch(`${this.base}/v1/voices`, { method: 'GET' });
      this.availableCache = res.ok;
    } catch {
      this.availableCache = false;
    }
    this.cacheExpiry = Date.now() + 30_000;
    return this.availableCache;
  }

  async speak(text: string, options: KokoroSpeakOptions = {}): Promise<void> {
    const cleanText = (text ?? '').trim();
    if (!cleanText) return;

    if (!(await this.isAvailable())) {
      throw new KokoroUnavailableError();
    }

    const res = await fetch(`${this.base}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'tts-1',
        input: cleanText,
        voice: options.voice ?? 'af_heart',
        response_format: 'wav',
        speed: options.speed ?? 0.95,
      }),
    });

    if (!res.ok) {
      this.availableCache = false;
      this.cacheExpiry = Date.now() + 30_000;
      throw new Error(`Kokoro HTTP ${res.status}`);
    }

    const blob = await res.blob();
    if (!blob || blob.size === 0) throw new Error('Kokoro returned empty audio');

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

    const onVolume = options.onVolume;
    this.activeOnVolume = onVolume ?? null;

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      onVolume?.(Math.min(avg / 80, 1.0));
      this.activeRafId = requestAnimationFrame(tick);
    };

    await new Promise<void>((resolve) => {
      this.pendingResolve = resolve;

      source.onended = () => {
        this.cleanup();
        resolve();
      };

      source.start();
      tick();
    });
  }

  stop(): void {
    if (this.activeRafId !== null) {
      cancelAnimationFrame(this.activeRafId);
    }
    this.activeOnVolume?.(0);
    this.activeAudioCtx?.close().catch(() => {});
    this.pendingResolve?.();
    this.cleanup();
  }

  resetAvailabilityCache(): void {
    this.availableCache = null;
  }

  private cleanup(): void {
    this.activeRafId = null;
    this.activeAudioCtx = null;
    this.activeOnVolume = null;
    this.pendingResolve = null;
  }
}
