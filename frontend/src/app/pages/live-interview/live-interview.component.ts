import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { firstValueFrom } from "rxjs";

import { LiveInterviewApiService } from "../../core/services/live-interview-api.service";
import { AudioPcmService } from "../../core/services/audio-pcm.service";
import { FaceMetricsService } from "../../core/services/face-metrics.service";
import { AgentTtsService } from "../../core/services/agent-tts.service";
import { KokoroTtsService } from "../../core/services/kokoro-tts.service";
import {
  LiveActionResponse,
  LiveStartResponse,
} from "../../core/models/live-interview.models";
import { Question } from "../../core/models/interview.models";
import { environment } from "../../../environments/environment";
import { SimliAvatarComponent } from "./simli-avatar/simli-avatar.component";
import { SimliRecruiterAudioService } from "../../core/services/simli-recruiter-audio.service";

type LivePhase =
  | "ready"
  | "PRE_INTERVIEW"
  | "INTRO"
  | "SELF_INTRO_CAPTURE"
  | "ASKING"
  | "WAITING_ANSWER"
  | "LISTENING"
  | "ENCOURAGING"
  | "EVALUATING"
  | "FINISHED";

@Component({
  selector: "app-live-interview",
  standalone: true,
  imports: [CommonModule, SimliAvatarComponent],
  template: `
    <div class="page">
      <div class="header">
        <div>
          <h1>Live Interview</h1>
          <p>AI Recruiter · Vosk STT · MediaPipe face metrics</p>
        </div>
        <button class="btn danger" (click)="endInterview()" [disabled]="busy">
          End interview
        </button>
      </div>

      <div class="error" *ngIf="error">{{ error }}</div>

      <div class="layout">
        <div class="left card">
          <div class="video-call">
            <div class="video-tile">
              <div class="video-label">AI Recruiter</div>
              <div class="avatar-wrapper">
                <app-simli-avatar #simliAvatar></app-simli-avatar>
              </div>
            </div>
            <div class="video-tile">
              <div class="video-label">You</div>
              <video
                #video
                autoplay
                muted
                playsinline
                class="user-camera"
              ></video>
            </div>
          </div>
        </div>

        <div class="right">
          <div class="card">
            <div class="row top-row">
              <div>
                <strong>Progress:</strong> {{ answeredCount }}/{{
                  maxQuestions
                }}
              </div>
              <div><strong>Status:</strong> {{ statusLabel() }}</div>
            </div>

            <div class="guide-box" *ngIf="!started">
              <div class="guide-title">How it works</div>
              <ol>
                <li>Click <strong>Start interview</strong></li>
                <li>Listen to the AI recruiter</li>
                <li>Introduce yourself when prompted</li>
                <li>
                  Answer each question by clicking
                  <strong>Start answering</strong>
                </li>
                <li>Click <strong>Stop answering</strong> when finished</li>
              </ol>
            </div>

            <div class="phase-box">
              <div class="phase-label">Current phase</div>
              <div class="phase-value">{{ statusLabel() }}</div>
            </div>

            <div class="agent-bubble" *ngIf="agentMessage && started">
              <div class="agent-label">🤖 AI Recruiter</div>
              <div class="agent-text">{{ agentMessage }}</div>
            </div>

            <div class="question" *ngIf="currentQuestion">
              <div class="label">Current question</div>
              <div class="text">{{ currentQuestion.text }}</div>
              <div class="hint" *ngIf="currentQuestion.expectedMethod">
                Suggested approach: {{ currentQuestion.expectedMethod }}
              </div>
            </div>

            <div
              class="recording-banner info"
              *ngIf="
                phase === 'INTRO' ||
                phase === 'SELF_INTRO_CAPTURE' ||
                phase === 'ASKING'
              "
            >
              🤖 The AI recruiter is speaking. Please listen.
            </div>

            <div
              class="recording-banner success"
              *ngIf="phase === 'WAITING_ANSWER'"
            >
              ✅ Your turn. Click <strong>Start answering</strong> to record
              your answer.
            </div>

            <div
              class="recording-banner recording"
              *ngIf="phase === 'LISTENING'"
            >
              🎙️ Recording… Speak now, then click
              <strong>Stop answering</strong>.
            </div>

            <div
              class="recording-banner evaluating"
              *ngIf="phase === 'EVALUATING' || phase === 'ENCOURAGING'"
            >
              ⏳
              {{
                phase === "ENCOURAGING"
                  ? "Great answer! Moving on…"
                  : "Evaluating your answer…"
              }}
            </div>

            <div class="controls-box">
              <div class="controls-title">Answer controls</div>
              <div class="actions">
                <button
                  class="btn primary"
                  *ngIf="!started && phase === 'ready'"
                  (click)="startInterview()"
                  [disabled]="busy"
                >
                  Start interview
                </button>

                <button
                  class="btn primary"
                  *ngIf="
                    started &&
                    phase === 'WAITING_ANSWER' &&
                    currentQuestion &&
                    !sessionFinished &&
                    !agentSpeaking
                  "
                  (click)="startAnswering()"
                  [disabled]="busy"
                >
                  Start answering
                </button>

                <button
                  class="btn primary"
                  *ngIf="
                    started &&
                    phase === 'SELF_INTRO_CAPTURE' &&
                    !agentSpeaking &&
                    !sessionFinished
                  "
                  (click)="startAnswering()"
                  [disabled]="busy"
                >
                  Introduce myself
                </button>

                <button
                  class="btn secondary"
                  *ngIf="phase === 'LISTENING' && !sessionFinished"
                  (click)="stopAnswering()"
                  [disabled]="busy"
                >
                  Stop answering
                </button>

                <button
                  class="btn ghost"
                  *ngIf="
                    started &&
                    (phase === 'WAITING_ANSWER' ||
                      phase === 'SELF_INTRO_CAPTURE') &&
                    !sessionFinished
                  "
                  (click)="repeatMessage()"
                  [disabled]="busy || agentSpeaking"
                >
                  Repeat
                </button>
              </div>
            </div>
          </div>

          <div class="card" *ngIf="lastTranscript">
            <div class="label">Your last answer (transcript)</div>
            <div>{{ lastTranscript }}</div>
          </div>

          <div class="card" *ngIf="lastFeedback">
            <div class="label">AI feedback</div>
            <div>{{ lastFeedback }}</div>
          </div>

          <div class="card" *ngIf="lastMetrics">
            <div class="label">Live metrics</div>
            <div class="metrics">
              <span>Score: {{ pct(lastMetrics.overallScore) }}</span>
              <span
                >Communication: {{ pct(lastMetrics.communicationScore) }}</span
              >
              <span>Hesitation: {{ pct(lastMetrics.hesitationScore) }}</span>
              <span>Stress proxy: {{ pct(lastMetrics.stressProxyScore) }}</span>
              <span
                >Confidence: {{ pct(lastMetrics.confidenceProxyScore) }}</span
              >
            </div>
          </div>

          <div class="card success" *ngIf="sessionFinished">
            <strong>Interview finished!</strong>
            <div>Your performance report has been generated.</div>
            <button
              class="btn primary"
              style="margin-top: 12px"
              (click)="goBack()"
            >
              Back to interviews
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 24px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .layout {
        display: grid;
        grid-template-columns: 580px 1fr;
        gap: 16px;
      }
      .card {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        padding: 16px;
      }
      .video-call {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        height: 420px;
      }
      .video-tile {
        position: relative;
        border-radius: 12px;
        overflow: hidden;
        background: linear-gradient(160deg, #1e1b4b 0%, #0f172a 100%);
      }
      .avatar-wrapper {
        width: 100%;
        height: 100%;
      }
      .video-tile app-simli-avatar,
      .avatar-wrapper,
      .video-tile .user-camera {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .video-label {
        position: absolute;
        bottom: 10px;
        left: 12px;
        z-index: 10;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        font-size: 12px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 20px;
        backdrop-filter: blur(4px);
      }
      .top-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }

      .guide-box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 12px 14px;
        margin-bottom: 14px;
      }
      .guide-title {
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 8px;
        color: #0f172a;
        text-transform: uppercase;
      }
      .guide-box ol {
        margin: 0;
        padding-left: 18px;
        color: #475569;
        font-size: 14px;
        line-height: 1.6;
      }

      .phase-box {
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 12px;
        padding: 12px 14px;
        margin-bottom: 14px;
      }
      .phase-label {
        font-size: 12px;
        color: #6b7280;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .phase-value {
        font-size: 16px;
        font-weight: 700;
        color: #1e3a8a;
      }

      .agent-bubble {
        background: #faf5ff;
        border: 1px solid #e9d5ff;
        border-radius: 12px;
        padding: 14px;
        margin-bottom: 14px;
      }
      .agent-label {
        font-size: 12px;
        font-weight: 700;
        color: #7c3aed;
        text-transform: uppercase;
        margin-bottom: 6px;
      }
      .agent-text {
        font-size: 15px;
        color: #3b0764;
        line-height: 1.6;
        font-style: italic;
      }

      .question .label,
      .label {
        font-size: 12px;
        color: #6b7280;
        margin-bottom: 8px;
        text-transform: uppercase;
      }
      .question .text {
        font-size: 22px;
        font-weight: 700;
        line-height: 1.5;
        color: #0f172a;
        margin-bottom: 10px;
      }
      .hint {
        font-size: 14px;
        color: #475569;
        background: #f8fafc;
        border-radius: 10px;
        padding: 10px 12px;
      }

      .recording-banner {
        margin-top: 14px;
        padding: 12px 14px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
      }
      .recording-banner.info {
        background: #ecfeff;
        border: 1px solid #a5f3fc;
        color: #155e75;
      }
      .recording-banner.success {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #166534;
      }
      .recording-banner.recording {
        background: #fff7ed;
        border: 1px solid #fed7aa;
        color: #9a3412;
      }
      .recording-banner.evaluating {
        background: #fef9c3;
        border: 1px solid #fde047;
        color: #713f12;
      }

      .controls-box {
        margin-top: 18px;
        background: #fafafa;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 14px;
      }
      .controls-title {
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        color: #374151;
        margin-bottom: 10px;
      }
      .actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .btn {
        border: none;
        border-radius: 10px;
        padding: 12px 16px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
      }
      .btn.primary {
        background: #14b8a6;
        color: #fff;
      }
      .btn.secondary {
        background: #f59e0b;
        color: #fff;
      }
      .btn.ghost {
        background: #e5e7eb;
        color: #111827;
      }
      .btn.danger {
        background: #ef4444;
        color: #fff;
      }
      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .error {
        background: #fee2e2;
        color: #991b1b;
        padding: 12px;
        border-radius: 12px;
      }
      .success {
        background: #ecfdf5;
        border-color: #a7f3d0;
      }
      .metrics {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .small {
        margin-top: 8px;
        font-size: 12px;
        color: #6b7280;
      }
      @media (max-width: 900px) {
        .layout {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class LiveInterviewComponent implements AfterViewInit, OnDestroy {
  @ViewChild("video") videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild("simliAvatar") simliAvatar?: SimliAvatarComponent;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(LiveInterviewApiService);
  private audio = inject(AudioPcmService);
  private face = inject(FaceMetricsService);
  private tts = inject(AgentTtsService);
  private kokoro = inject(KokoroTtsService);
  private simliAudio = inject(SimliRecruiterAudioService);
  private cdr = inject(ChangeDetectorRef);

  sessionId = Number(this.route.snapshot.paramMap.get("id"));

  started = false;
  recording = false;
  busy = false;
  agentSpeaking = false;
  sessionFinished = false;
  error = "";

  phase: LivePhase = "ready";

  answeredCount = 0;
  maxQuestions = 0;
  currentQuestion: Question | null = null;
  agentMessage = "";
  isSelfIntroPhase = false;
  useSimliAvatar = environment.simli?.enabled ?? true;
  lastTranscript = "";
  lastFeedback = "";
  lastMetrics: LiveActionResponse | null = null;

  private cameraStream: MediaStream | null = null;

  async ngAfterViewInit() {
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      this.videoRef.nativeElement.srcObject = this.cameraStream;
      await this.videoRef.nativeElement.play();
    } catch {
      this.error = "Camera access failed. Face metrics will not be available.";
    }
  }

  ngOnDestroy() {
    this.simliAvatar?.disconnect();
    this.kokoro.stop();
    this.tts.stop();
    this.audio.stopMedia();
    this.cameraStream?.getTracks().forEach((t) => t.stop());
  }

  statusLabel(): string {
    switch (this.phase) {
      case "ready":
        return "Ready";
      case "PRE_INTERVIEW":
      case "INTRO":
        return "AI is introducing itself";
      case "SELF_INTRO_CAPTURE":
        return this.agentSpeaking
          ? "AI is speaking"
          : "Your turn to introduce yourself";
      case "ASKING":
        return "AI is asking the question";
      case "WAITING_ANSWER":
        return "Your turn to answer";
      case "LISTENING":
        return "Recording your answer";
      case "ENCOURAGING":
        return "Great answer! Moving on…";
      case "EVALUATING":
        return "Evaluating your answer";
      case "FINISHED":
        return "Finished";
      default:
        return String(this.phase);
    }
  }

  async startInterview() {
    if (this.busy) return;
    this.busy = true;
    this.error = "";
    this.cdr.detectChanges();

    let res: LiveStartResponse;

    try {
      res = await firstValueFrom(this.api.start(this.sessionId));
    } catch (err: any) {
      console.error("Start interview API failed:", err);

      if (
        err?.status === 422 ||
        err?.error?.message?.includes("already finished")
      ) {
        this.error = "This session is already finished. Redirecting…";
        this.busy = false;
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(["/interviews"]), 2500);
        return;
      }

      this.error = "Failed to start the live interview. Please try again.";
      this.busy = false;
      this.cdr.detectChanges();
      return;
    }

    const backendPhase =
      (res.phase as string) ??
      (res.currentQuestion ? "WAITING_ANSWER" : "SELF_INTRO_CAPTURE");

    const greeting =
      (res.agentGreeting ?? res.agentMessage ?? "").trim() ||
      "Hello! Welcome to your interview.";

    this.started = true;
    this.answeredCount = Number(res.answeredCount ?? 0);
    this.maxQuestions = Number(res.maxQuestions ?? 6);
    this.currentQuestion = res.currentQuestion ?? null;

    this.isSelfIntroPhase =
      backendPhase === "SELF_INTRO_CAPTURE" ||
      backendPhase === "INTRO" ||
      !res.currentQuestion;

    this.agentMessage = greeting;
    this.busy = false;
    this.cdr.detectChanges();

    if (this.isSelfIntroPhase) {
      await this.speakAgent(greeting, "SELF_INTRO_CAPTURE", "INTRO");
      return;
    }

    await this.speakAgent(
      greeting || this.currentQuestion?.text || "",
      "WAITING_ANSWER",
      "ASKING",
    );
  }

  async startAnswering() {
    if (this.agentSpeaking || this.busy) return;
    if (this.phase !== "WAITING_ANSWER" && this.phase !== "SELF_INTRO_CAPTURE")
      return;

    this.busy = true;
    this.error = "";

    try {
      await this.audio.start();

      try {
        await this.face.start(this.videoRef.nativeElement);
      } catch (e) {
        console.warn("Face metrics failed to start:", e);
      }

      this.recording = true;
      this.phase = "LISTENING";
    } catch (e) {
      console.error("Audio start failed:", e);
      this.error =
        "Microphone access failed. Please allow microphone permission and try again.";
      this.recording = false;
    } finally {
      this.busy = false;
      this.cdr.detectChanges();
    }
  }

  async stopAnswering() {
    if (!this.recording || this.busy) return;

    this.recording = false;
    this.busy = true;
    this.error = "";
    this.phase = "EVALUATING";
    this.cdr.detectChanges();

    try {
      const audioResult = await this.audio.stop();
      const faceMetrics = this.face.stopAndSummarize();
      const wasSelfIntro = this.isSelfIntroPhase;

      const res: LiveActionResponse = await firstValueFrom(
        this.api.commitTurn(this.sessionId, {
          questionId: wasSelfIntro ? null : (this.currentQuestion?.id ?? null),
          pcm16Base64: audioResult.pcm16Base64,
          durationSeconds: audioResult.durationSeconds,
          audioMetrics: {
            averageVolume: audioResult.averageVolume,
            maxVolume: audioResult.maxVolume,
            silenceRatio: audioResult.silenceRatio,
          },
          faceMetrics,
          turnMode: wasSelfIntro ? "SELF_INTRO" : "QUESTION",
        }),
      );

      this.lastTranscript = res.transcript ?? "";

      if (res.overallScore != null) {
        this.lastFeedback = res.feedback ?? "";
        this.lastMetrics = res;
        this.answeredCount = Math.min(
          this.maxQuestions,
          this.answeredCount + 1,
        );
      }

      if (res.agentMessage != null) {
        this.agentMessage = res.agentMessage;
      }

      this.currentQuestion = res.nextQuestion ?? null;
      this.isSelfIntroPhase = false;
      this.busy = false;

      if (res.sessionFinished) {
        this.sessionFinished = true;
        this.phase = "FINISHED";
        this.cdr.detectChanges();

        await this.speakAgent(
          res.agentMessage ||
            "The interview is finished. Your report has been generated.",
          "FINISHED",
          "EVALUATING",
        );
        return;
      }

      const backendPhase =
        (res.phase as string) ??
        (res.nextQuestion ? "WAITING_ANSWER" : "SELF_INTRO_CAPTURE");

      const nextUiPhase = this.resolveUiPhase(backendPhase);
      const nextSpeech = (
        res.agentMessage ??
        res.nextQuestion?.text ??
        ""
      ).trim();
      this.cdr.detectChanges();

      if (nextSpeech) {
        const speakingPhase: LivePhase =
          nextUiPhase === "SELF_INTRO_CAPTURE" ? "INTRO" : "ASKING";

        await this.speakAgent(nextSpeech, nextUiPhase, speakingPhase);
      } else {
        this.phase = nextUiPhase;
        this.cdr.detectChanges();
      }
    } catch (err) {
      console.error("Commit turn failed:", err);
      this.busy = false;
      this.error = "Failed to submit your answer. Please try again.";
      this.phase = this.isSelfIntroPhase
        ? "SELF_INTRO_CAPTURE"
        : "WAITING_ANSWER";
      this.cdr.detectChanges();
    }
  }

  async repeatMessage() {
    if (!this.agentMessage?.trim() || this.agentSpeaking) return;

    await this.speakAgent(
      this.agentMessage,
      this.phase === "SELF_INTRO_CAPTURE"
        ? "SELF_INTRO_CAPTURE"
        : "WAITING_ANSWER",
      this.phase === "SELF_INTRO_CAPTURE" ? "INTRO" : "ASKING",
    );
  }

  async endInterview() {
    this.busy = true;
    await this.simliAvatar?.disconnect();
    this.kokoro.stop();
    this.tts.stop();

    try {
      if (this.recording) {
        try {
          await this.audio.stop();
        } catch {}
        try {
          this.face.stopAndSummarize();
        } catch {}
        this.recording = false;
      }

      await firstValueFrom(this.api.end(this.sessionId));
      this.sessionFinished = true;
      this.currentQuestion = null;
      this.phase = "FINISHED";
    } catch (err) {
      console.error("End interview failed:", err);
      this.error = "Failed to end the interview.";
    } finally {
      this.busy = false;
      this.cdr.detectChanges();
    }
  }

  goBack() {
    this.router.navigate(["/interviews"]);
  }

  pct(value: number | undefined | null): string {
    if (value == null) return "-";
    return `${Math.round(value * 100)}%`;
  }

  private async speakAgent(
    text: string,
    nextPhase?: LivePhase,
    speakingPhase: LivePhase = "ASKING",
  ): Promise<void> {
    const cleanText = (text ?? "").trim();

    if (!cleanText) {
      if (!this.sessionFinished && nextPhase) {
        this.phase = nextPhase;
        this.cdr.detectChanges();
      }
      return;
    }

    this.phase = speakingPhase;
    this.agentSpeaking = true;
    this.error = "";
    this.cdr.detectChanges();

    try {
      if (!this.useSimliAvatar) {
        throw new Error(
          "Simli avatar is disabled in environment configuration.",
        );
      }

      if (!this.simliAvatar) {
        throw new Error("Simli avatar component is not ready.");
      }

      const speechBlob = await this.simliAudio.createSpeechBlob(cleanText);
      await this.simliAvatar.speakFromAudioBlob(speechBlob);
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error("[LiveInterview] Simli avatar speech failed:", err);

      this.error =
        error?.message ??
        "AI recruiter avatar failed. Please check Simli configuration.";
    } finally {
      this.agentSpeaking = false;

      if (!this.sessionFinished && nextPhase) {
        this.phase = nextPhase;
      }

      this.cdr.detectChanges();
    }
  }

  private resolveUiPhase(backendPhase: string): LivePhase {
    switch (backendPhase) {
      case "SELF_INTRO_CAPTURE":
      case "INTRO":
      case "PRE_INTERVIEW":
        return "SELF_INTRO_CAPTURE";
      case "WAITING_ANSWER":
      case "ASKING":
      case "QUESTION":
      case "PROBE":
      case "FEEDBACK":
        return "WAITING_ANSWER";
      case "ENCOURAGING":
      case "ENCOURAGE":
        return "ENCOURAGING";
      case "EVALUATING":
        return "EVALUATING";
      case "FINISHED":
      case "END":
        return "FINISHED";
      default:
        return "WAITING_ANSWER";
    }
  }
}
