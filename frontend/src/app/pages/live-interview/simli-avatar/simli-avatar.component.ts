import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";

import {
  generateSimliSessionToken,
  LogLevel,
  SimliClient,
  SimliSessionRequest,
} from "simli-client";

import { environment } from "../../../../environments/environment";

@Component({
  selector: "app-simli-avatar",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="simli-card">
      <video
        #simliVideo
        class="simli-video"
        autoplay
        playsinline>
      </video>

      <audio
        #simliAudio
        autoplay>
      </audio>

      <div class="overlay" *ngIf="loading">
        <div class="loader"></div>
        <div>{{ loadingText }}</div>
      </div>

      <div class="overlay idle" *ngIf="!loading && !connected && !error">
        <div class="avatar-icon">👩‍💼</div>
        <div>AI recruiter avatar ready</div>
      </div>

      <div class="overlay error" *ngIf="error">
        <div>Simli avatar unavailable</div>
        <small>{{ error }}</small>
      </div>
    </div>
  `,
  styles: [
    `
      .simli-card {
        position: relative;
        width: 100%;
        height: 100%;
        background: linear-gradient(160deg, #111827 0%, #020617 100%);
        overflow: hidden;
      }

      .simli-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        background: #020617;
      }

      audio {
        display: none;
      }

      .overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 20px;
        background: rgba(15, 23, 42, 0.78);
        color: white;
        text-align: center;
        font-size: 14px;
      }

      .overlay.idle {
        background: rgba(15, 23, 42, 0.95);
      }

      .overlay.error {
        background: rgba(127, 29, 29, 0.9);
      }

      .avatar-icon {
        font-size: 48px;
      }

      .loader {
        width: 32px;
        height: 32px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.9s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class SimliAvatarComponent implements OnDestroy {
  @ViewChild("simliVideo", { static: true })
  simliVideo!: ElementRef<HTMLVideoElement>;

  @ViewChild("simliAudio", { static: true })
  simliAudio!: ElementRef<HTMLAudioElement>;

  private cdr = inject(ChangeDetectorRef);

  private simliClient: SimliClient | null = null;
  private connectingPromise: Promise<void> | null = null;

  loading = false;
  loadingText = "Connecting AI recruiter avatar...";
  connected = false;
  error = "";

  isEnabled(): boolean {
    return Boolean(
      environment.simli?.enabled &&
        environment.simli?.apiKey &&
        environment.simli?.faceId,
    );
  }

  async connect(): Promise<void> {
    if (!this.isEnabled()) {
      throw new Error("Simli is disabled or missing apiKey/faceId.");
    }

    if (this.simliClient && this.connected) {
      return;
    }

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    this.loading = true;
    this.loadingText = "Connecting AI recruiter avatar...";
    this.error = "";
    this.cdr.detectChanges();

    this.connectingPromise = this.createConnection();

    try {
      await this.connectingPromise;
      this.connected = true;
      this.loading = false;
      this.cdr.detectChanges();
    } catch (error: any) {
      this.connected = false;
      this.loading = false;
      this.error = error?.message ?? "Could not connect Simli avatar.";
      this.cdr.detectChanges();
      throw error;
    } finally {
      this.connectingPromise = null;
    }
  }

  async speakFromAudioBlob(audioBlob: Blob): Promise<void> {
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error("Empty audio blob cannot be sent to Simli.");
    }

    await this.connect();

    if (!this.simliClient) {
      throw new Error("Simli client is not initialized.");
    }

    this.loading = true;
    this.loadingText = "AI recruiter is speaking...";
    this.error = "";
    this.cdr.detectChanges();

    const chunks = await this.blobToPcm16Chunks(audioBlob, 100);

    for (const chunk of chunks) {
      if (!this.simliClient || !this.connected) break;
      try {
        this.simliClient.sendAudioData(new Uint8Array(chunk.buffer));
      } catch {
        break;
      }
      await this.sleep(100);
    }

    // Small delay so the last buffered audio can finish visually.
    await this.sleep(600);

    this.loading = false;
    this.cdr.detectChanges();
  }

  clear(): void {
    try {
      this.simliClient?.ClearBuffer?.();
    } catch {
      // Ignore cleanup errors.
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.simliClient?.ClearBuffer?.();
      await this.simliClient?.stop?.();
    } catch {
      // Ignore disconnect errors.
    }

    this.simliClient = null;
    this.connected = false;
    this.loading = false;
    this.error = "";
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private async createConnection(): Promise<void> {
    const config: SimliSessionRequest = {
      faceId: environment.simli.faceId,
      handleSilence: true,
      maxSessionLength: 600,
      maxIdleTime: 180,
      model: "fasttalk",
    };

    const tokenResponse = await generateSimliSessionToken({
      apiKey: environment.simli.apiKey,
      config,
    });

    this.simliClient = new SimliClient(
      tokenResponse.session_token,
      this.simliVideo.nativeElement,
      this.simliAudio.nativeElement,
      null,
      LogLevel.INFO,
      "livekit",
    );

    this.simliClient.on("start", () => {
      console.log("[Simli] started");
      this.connected = true;
      this.loading = false;
      this.cdr.detectChanges();
    });

    this.simliClient.on("error", (message: string) => {
      console.error("[Simli] error:", message);
      this.error = message || "Simli error.";
      this.loading = false;
      this.cdr.detectChanges();
    });

    this.simliClient.on("startup_error", (message: string) => {
      console.error("[Simli] startup_error:", message);
      this.error = message || "Simli startup error.";
      this.loading = false;
      this.connected = false;
      this.cdr.detectChanges();
    });

    this.simliClient.on("silent", () => {
      this.loading = false;
      this.cdr.detectChanges();
    });

    this.simliClient.on("stop", () => {
      this.connected = false;
      this.simliClient = null;
      this.loading = false;
      this.cdr.detectChanges();
    });

    await this.simliClient.start();
  }

  private async blobToPcm16Chunks(
    blob: Blob,
    chunkSizeMs = 100,
  ): Promise<Int16Array[]> {
    const arrayBuffer = await blob.arrayBuffer();

    const audioCtx = new AudioContext();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

    const targetSampleRate = 16000;
    const mono = this.mixToMono(decoded);
    const resampled = this.resampleLinear(
      mono,
      decoded.sampleRate,
      targetSampleRate,
    );

    await audioCtx.close();

    const chunkSize = Math.floor((chunkSizeMs / 1000) * targetSampleRate);
    const chunks: Int16Array[] = [];

    for (let i = 0; i < resampled.length; i += chunkSize) {
      const slice = resampled.subarray(i, i + chunkSize);
      const pcm = new Int16Array(slice.length);

      for (let j = 0; j < slice.length; j++) {
        const sample = Math.max(-1, Math.min(1, slice[j]));
        pcm[j] = sample < 0 ? sample * 32768 : sample * 32767;
      }

      chunks.push(pcm);
    }

    return chunks;
  }

  private mixToMono(buffer: AudioBuffer): Float32Array {
    if (buffer.numberOfChannels === 1) {
      return buffer.getChannelData(0).slice();
    }

    const length = buffer.length;
    const output = new Float32Array(length);

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        output[i] += data[i] / buffer.numberOfChannels;
      }
    }

    return output;
  }

  private resampleLinear(
    input: Float32Array,
    inputRate: number,
    outputRate: number,
  ): Float32Array {
    if (inputRate === outputRate) {
      return input;
    }

    const ratio = inputRate / outputRate;
    const outputLength = Math.floor(input.length / ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const position = i * ratio;
      const index = Math.floor(position);
      const fraction = position - index;

      const current = input[index] ?? 0;
      const next = input[index + 1] ?? current;

      output[i] = current + (next - current) * fraction;
    }

    return output;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}