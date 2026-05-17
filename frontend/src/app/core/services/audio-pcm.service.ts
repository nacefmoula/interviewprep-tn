import { Injectable } from "@angular/core";

export interface PcmCaptureResult {
  pcm16Base64: string;
  durationSeconds: number;
  averageVolume: number;
  maxVolume: number;
  silenceRatio: number;
}

@Injectable({ providedIn: "root" })
export class AudioPcmService {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private silentGain: GainNode | null = null;

  private chunks: Int16Array[] = [];
  private startedAt = 0;
  private frameCount = 0;
  private silentFrames = 0;
  private avgVolumeAcc = 0;
  private maxVolume = 0;

  async prepare() {
    if (!this.stream) {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    }

    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  async start() {
    await this.prepare();

    this.processor?.disconnect();
    this.source?.disconnect();
    this.silentGain?.disconnect();

    this.chunks = [];
    this.startedAt = performance.now();
    this.frameCount = 0;
    this.silentFrames = 0;
    this.avgVolumeAcc = 0;
    this.maxVolume = 0;

    this.source = this.audioContext!.createMediaStreamSource(this.stream!);
    this.processor = this.audioContext!.createScriptProcessor(4096, 1, 1);
    this.silentGain = this.audioContext!.createGain();
    this.silentGain.gain.value = 0;

    this.processor.onaudioprocess = (event: AudioProcessingEvent) => {
      const input = event.inputBuffer.getChannelData(0);

      const downsampled = this.downsampleBuffer(
        input,
        this.audioContext!.sampleRate,
        16000
      );
      this.chunks.push(downsampled);

      let sum = 0;
      for (let i = 0; i < input.length; i++) {
        sum += input[i] * input[i];
      }

      const rms = Math.sqrt(sum / input.length);

      this.frameCount++;
      this.avgVolumeAcc += rms;
      this.maxVolume = Math.max(this.maxVolume, rms);

      if (rms < 0.02) {
        this.silentFrames++;
      }
    };

    this.source.connect(this.processor);
    this.processor.connect(this.silentGain);
    this.silentGain.connect(this.audioContext!.destination);
  }

  async stop(): Promise<PcmCaptureResult> {
    if (!this.audioContext || !this.processor || !this.source) {
      throw new Error("Audio capture was not started.");
    }

    this.processor.disconnect();
    this.source.disconnect();
    this.silentGain?.disconnect();

    const merged = this.mergeInt16(this.chunks);
    const bytes = new Uint8Array(merged.buffer);
    const base64 = this.uint8ToBase64(bytes);

    const durationSeconds = Math.max(
      1,
      Math.round((performance.now() - this.startedAt) / 1000)
    );

    const averageVolume = this.frameCount
      ? this.avgVolumeAcc / this.frameCount
      : 0;

    const silenceRatio = this.frameCount
      ? this.silentFrames / this.frameCount
      : 0;

    this.processor = null;
    this.source = null;
    this.silentGain = null;

    return {
      pcm16Base64: base64,
      durationSeconds,
      averageVolume,
      maxVolume: this.maxVolume,
      silenceRatio,
    };
  }

  stopMedia() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.audioContext?.close();
    this.audioContext = null;
    this.source = null;
    this.processor = null;
    this.silentGain = null;
  }

  private downsampleBuffer(
    buffer: Float32Array,
    inputSampleRate: number,
    outputSampleRate: number
  ): Int16Array {
    if (outputSampleRate === inputSampleRate) {
      return this.floatTo16BitPCM(buffer);
    }

    const ratio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);

    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;

      for (
        let i = offsetBuffer;
        i < nextOffsetBuffer && i < buffer.length;
        i++
      ) {
        accum += buffer[i];
        count++;
      }

      result[offsetResult] = count ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }

    return this.floatTo16BitPCM(result);
  }

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);

    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    return output;
  }

  private mergeInt16(chunks: Int16Array[]): Int16Array {
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const merged = new Int16Array(totalLength);

    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    return merged;
  }

  private uint8ToBase64(bytes: Uint8Array): string {
    const chunkSize = 0x8000;
    let binary = "";

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const slice = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...slice);
    }

    return btoa(binary);
  }
}