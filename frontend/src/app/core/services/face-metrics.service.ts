import { Injectable } from "@angular/core";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { FaceMetricsPayload } from "../models/live-interview.models";

@Injectable({ providedIn: "root" })
export class FaceMetricsService {
  private landmarker: FaceLandmarker | null = null;
  private rafId = 0;
  private running = false;

  private frameCount = 0;
  private blinkCount = 0;
  private lastBlinkHigh = false;

  private nosePrevX: number | null = null;
  private nosePrevY: number | null = null;
  private headMotionAcc = 0;

  private browAcc = 0;
  private mouthAcc = 0;

  async init() {
    if (this.landmarker) return;

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    this.landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "/assets/models/face_landmarker.task",
      },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
    });
  }

  async start(video: HTMLVideoElement) {
    await this.init();
    this.reset();
    this.running = true;

    const loop = () => {
      if (!this.running || !this.landmarker) return;

      const now = performance.now();
      const result = this.landmarker.detectForVideo(video, now);

      if (result.faceLandmarks?.length) {
        this.frameCount++;

        const landmarks = result.faceLandmarks[0];
        const nose = landmarks[1];

        if (this.nosePrevX !== null && this.nosePrevY !== null) {
          const dx = nose.x - this.nosePrevX;
          const dy = nose.y - this.nosePrevY;
          this.headMotionAcc += Math.sqrt(dx * dx + dy * dy);
        }

        this.nosePrevX = nose.x;
        this.nosePrevY = nose.y;

        const blendMap = new Map<string, number>();
        const categories = result.faceBlendshapes?.[0]?.categories ?? [];
        for (const c of categories) {
          blendMap.set(c.categoryName, c.score);
        }

        const blink = ((blendMap.get("eyeBlinkLeft") ?? 0) + (blendMap.get("eyeBlinkRight") ?? 0)) / 2;
        const brow = blendMap.get("browInnerUp") ?? 0;
        const mouth = ((blendMap.get("mouthPressLeft") ?? 0) + (blendMap.get("mouthPressRight") ?? 0)) / 2;

        if (blink > 0.55 && !this.lastBlinkHigh) {
          this.blinkCount++;
          this.lastBlinkHigh = true;
        }
        if (blink <= 0.55) {
          this.lastBlinkHigh = false;
        }

        this.browAcc += brow;
        this.mouthAcc += mouth;
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  stopAndSummarize(): FaceMetricsPayload {
    this.running = false;
    cancelAnimationFrame(this.rafId);

    if (!this.frameCount) {
      return {
        blinkRate: 0.2,
        gazeStabilityScore: 0.65,
        headMotionScore: 0.25,
        browTensionScore: 0.25,
        mouthTensionScore: 0.25,
      };
    }

    const blinkRate = Math.min(1, this.blinkCount / Math.max(1, this.frameCount / 18));
    const headMotionScore = Math.min(1, (this.headMotionAcc / this.frameCount) * 25);
    const gazeStabilityScore = Math.max(0, 1 - headMotionScore);
    const browTensionScore = this.browAcc / this.frameCount;
    const mouthTensionScore = this.mouthAcc / this.frameCount;

    return {
      blinkRate,
      gazeStabilityScore,
      headMotionScore,
      browTensionScore,
      mouthTensionScore,
    };
  }

  private reset() {
    this.frameCount = 0;
    this.blinkCount = 0;
    this.lastBlinkHigh = false;
    this.nosePrevX = null;
    this.nosePrevY = null;
    this.headMotionAcc = 0;
    this.browAcc = 0;
    this.mouthAcc = 0;
  }
}