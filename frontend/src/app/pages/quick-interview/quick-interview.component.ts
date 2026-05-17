import { Component, OnInit, inject, ChangeDetectorRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { firstValueFrom } from "rxjs";

import { InterviewApiService } from "../../core/services/interview-api.service";
import {
  Question,
  InterviewSessionResponse,
} from "../../core/models/interview.models";

interface AnsweredTurn {
  question: Question;
  answer: string;
  score: number;
  durationSeconds: number;
}

@Component({
  selector: "app-quick-interview",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <!-- Header -->
      <header class="page-header">
        <div>
          <p class="eyebrow">Quick Q&amp;A</p>
          <h1>Interview Session</h1>
          <p class="subtitle" *ngIf="session">
            {{ formatType(session.type) }} ·
            {{ formatIndustry(session.industry) }} · {{ session.targetLevel }} ·
            Difficulty {{ session.difficultyLevel }}
          </p>
        </div>
        <button class="btn-ghost" (click)="confirmEnd()" [disabled]="busy">
          End session
        </button>
      </header>

      <div class="error-banner" *ngIf="error">{{ error }}</div>

      <!-- Loading state -->
      <div class="state-box" *ngIf="!session && !error">
        <div class="spinner"></div>
        <span>Loading session…</span>
      </div>

      <!-- Progress bar -->
      <div
        class="progress-bar-wrap"
        *ngIf="answeredTurns.length > 0 || currentQuestion"
      >
        <div class="progress-bar-track">
          <div class="progress-bar-fill" [style.width.%]="progressPct()"></div>
        </div>
        <span class="progress-label">{{ answeredTurns.length }} answered</span>
      </div>

      <div class="layout" *ngIf="session">
        <!-- ── Current question panel ─────────────────────────────── -->
        <section class="question-panel" *ngIf="currentQuestion && !finished">
          <div class="q-number">Question {{ answeredTurns.length + 1 }}</div>
          <h2 class="q-text">{{ currentQuestion.text }}</h2>

          <div class="hint" *ngIf="currentQuestion.expectedMethod">
            <span class="hint-label">Suggested approach</span>
            <span>{{ currentQuestion.expectedMethod }}</span>
          </div>

          <label class="answer-label">Your answer</label>
          <textarea
            class="answer-box"
            [(ngModel)]="answer"
            placeholder="Type your answer here…"
            rows="6"
            [disabled]="submitting"
            (keydown.control.enter)="submitAnswer()"
            (keydown.meta.enter)="submitAnswer()"
          >
          </textarea>

          <div class="answer-meta">
            <span class="word-count">{{ wordCount() }} words</span>
            <span class="hint-key">Ctrl + Enter to submit</span>
          </div>

          <div class="submit-row">
            <button
              class="btn-primary"
              (click)="submitAnswer()"
              [disabled]="submitting || !answer.trim()"
            >
              {{ submitting ? "Evaluating…" : "Submit answer" }}
            </button>
          </div>
        </section>

        <!-- ── Loading next question ─────────────────────────────── -->
        <section
          class="state-box tall"
          *ngIf="!currentQuestion && !finished && !error && session"
        >
          <div class="spinner"></div>
          <span>Generating next question…</span>
        </section>

        <!-- ── Finished state ────────────────────────────────────── -->
        <section class="finished-panel" *ngIf="finished">
          <div class="finished-icon">✓</div>
          <h2>Session complete</h2>
          <p>
            Your report has been generated. You can view it on the interviews
            page.
          </p>
          <div class="finished-score" *ngIf="avgScore !== null">
            Average score: <strong>{{ asPct(avgScore) }}</strong>
          </div>
          <button class="btn-primary" (click)="goBack()">
            View my interviews
          </button>
        </section>

        <!-- ── History (right panel) ─────────────────────────────── -->
        <aside class="history" *ngIf="answeredTurns.length > 0">
          <h3 class="history-title">Your answers so far</h3>
          <div
            class="history-item"
            *ngFor="let turn of answeredTurns; let i = index"
          >
            <div class="history-head">
              <span class="history-num">Q{{ i + 1 }}</span>
              <span class="score-pill" [class]="scorePillClass(turn.score)">
                {{ asPct(turn.score) }}
              </span>
            </div>
            <p class="history-q">{{ turn.question.text }}</p>
            <p class="history-a">{{ turn.answer }}</p>
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        --ink: #0b1220;
        --ink-soft: #374151;
        --ink-muted: #6b7280;
        --ink-faint: #9ca3af;
        --canvas: #f6f7f9;
        --paper: #ffffff;
        --line: #e5e7eb;
        --line-soft: #f1f2f4;
        --accent: #0d9488;
        --accent-soft: #ccfbf1;
        --ok: #15803d;
        --ok-soft: #dcfce7;
        --warn: #b45309;
        --warn-soft: #fef3c7;
        --danger: #b91c1c;
        --danger-soft: #fee2e2;
        --font-display: ui-serif, Georgia, serif;
        --font-body: "Inter", system-ui, sans-serif;
        --shadow-md: 0 4px 18px -6px rgba(12, 18, 30, 0.1);
        --radius-md: 16px;
        --radius-lg: 24px;

        display: block;
        font-family: var(--font-body);
        color: var(--ink);
        background: var(--canvas);
        min-height: 100vh;
      }

      .page {
        max-width: 1100px;
        margin: 0 auto;
        padding: 36px 32px 64px;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      /* Header */
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        flex-wrap: wrap;
      }
      .eyebrow {
        margin: 0 0 4px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--accent);
      }
      .page-header h1 {
        margin: 0;
        font-family: var(--font-display);
        font-size: 36px;
        font-weight: 500;
        letter-spacing: -0.02em;
        line-height: 1;
      }
      .subtitle {
        margin: 8px 0 0;
        font-size: 14px;
        color: var(--ink-muted);
      }

      /* Buttons */
      .btn-primary,
      .btn-ghost {
        font-family: var(--font-body);
        font-size: 14px;
        font-weight: 600;
        padding: 10px 20px;
        border-radius: 999px;
        border: 1px solid transparent;
        cursor: pointer;
        transition:
          transform 120ms ease,
          box-shadow 200ms ease,
          background 180ms ease;
      }
      .btn-primary {
        background: var(--ink);
        color: #fff;
        box-shadow: var(--shadow-md);
      }
      .btn-primary:hover:not(:disabled) {
        transform: translateY(-1px);
      }
      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-ghost {
        background: transparent;
        border-color: var(--line);
        color: var(--ink);
      }
      .btn-ghost:hover:not(:disabled) {
        background: var(--paper);
        border-color: var(--ink);
      }
      .btn-ghost:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Error */
      .error-banner {
        background: var(--danger-soft);
        color: var(--danger);
        padding: 12px 16px;
        border-radius: 12px;
        font-size: 14px;
      }

      /* State box */
      .state-box {
        display: flex;
        align-items: center;
        gap: 12px;
        justify-content: center;
        padding: 48px 24px;
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        font-size: 15px;
        color: var(--ink-muted);
      }
      .state-box.tall {
        min-height: 200px;
      }
      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid var(--line);
        border-top-color: var(--accent);
        border-radius: 50%;
        animation: spin 700ms linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* Progress */
      .progress-bar-wrap {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .progress-bar-track {
        flex: 1;
        height: 4px;
        background: var(--line);
        border-radius: 999px;
        overflow: hidden;
      }
      .progress-bar-fill {
        height: 100%;
        background: var(--accent);
        border-radius: 999px;
        transition: width 400ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      .progress-label {
        font-size: 12px;
        color: var(--ink-muted);
        white-space: nowrap;
      }

      /* Two-column layout */
      .layout {
        display: grid;
        grid-template-columns: 1fr 340px;
        gap: 24px;
        align-items: start;
      }
      @media (max-width: 820px) {
        .layout {
          grid-template-columns: 1fr;
        }
      }

      /* Question panel */
      .question-panel {
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        padding: 32px;
        display: flex;
        flex-direction: column;
        gap: 18px;
        box-shadow: var(--shadow-md);
      }
      .q-number {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--accent);
      }
      .q-text {
        margin: 0;
        font-family: var(--font-display);
        font-size: 26px;
        font-weight: 500;
        line-height: 1.4;
        letter-spacing: -0.01em;
        color: var(--ink);
      }

      .hint {
        background: var(--canvas);
        border-radius: 10px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 13px;
        color: var(--ink-muted);
        line-height: 1.5;
      }
      .hint-label {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--accent);
      }

      .answer-label {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--ink-muted);
      }
      .answer-box {
        font-family: var(--font-body);
        font-size: 15px;
        line-height: 1.65;
        padding: 14px 16px;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: var(--canvas);
        color: var(--ink);
        resize: vertical;
        outline: none;
        transition:
          border-color 150ms ease,
          background 150ms ease;
        width: 100%;
        box-sizing: border-box;
      }
      .answer-box:focus {
        border-color: var(--accent);
        background: var(--paper);
      }
      .answer-box:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .answer-meta {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: var(--ink-faint);
      }
      .word-count {
        font-variant-numeric: tabular-nums;
      }
      .hint-key {
        font-style: italic;
      }

      .submit-row {
        display: flex;
        justify-content: flex-end;
      }

      /* Finished */
      .finished-panel {
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        padding: 48px 40px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        box-shadow: var(--shadow-md);
      }
      .finished-icon {
        width: 56px;
        height: 56px;
        background: var(--ok-soft);
        color: var(--ok);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        font-weight: 700;
      }
      .finished-panel h2 {
        margin: 0;
        font-family: var(--font-display);
        font-size: 28px;
        font-weight: 500;
        letter-spacing: -0.02em;
      }
      .finished-panel p {
        margin: 0;
        color: var(--ink-muted);
        font-size: 15px;
        max-width: 420px;
      }
      .finished-score {
        font-size: 16px;
        color: var(--ink);
        padding: 10px 20px;
        background: var(--canvas);
        border-radius: 999px;
      }
      .finished-score strong {
        font-family: var(--font-display);
        font-size: 20px;
      }

      /* History sidebar */
      .history {
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-height: 80vh;
        overflow-y: auto;
      }
      .history-title {
        margin: 0;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--ink-muted);
      }
      .history-item {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-bottom: 14px;
        border-bottom: 1px solid var(--line-soft);
      }
      .history-item:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
      .history-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .history-num {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--ink-faint);
      }
      .score-pill {
        font-size: 12px;
        font-weight: 700;
        padding: 2px 10px;
        border-radius: 999px;
      }
      .score-good {
        background: var(--ok-soft);
        color: var(--ok);
      }
      .score-medium {
        background: var(--warn-soft);
        color: var(--warn);
      }
      .score-low {
        background: var(--danger-soft);
        color: var(--danger);
      }
      .score-neutral {
        background: var(--line-soft);
        color: var(--ink-muted);
      }

      .history-q {
        margin: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--ink);
        line-height: 1.4;
      }
      .history-a {
        margin: 0;
        font-size: 13px;
        color: var(--ink-muted);
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    `,
  ],
})
export class QuickInterviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(InterviewApiService);
  private cdr = inject(ChangeDetectorRef);

  sessionId = Number(this.route.snapshot.paramMap.get("id"));

  session: InterviewSessionResponse | null = null;
  currentQuestion: Question | null = null;
  answeredTurns: AnsweredTurn[] = [];

  answer = "";
  submitting = false;
  busy = false;
  finished = false;
  error = "";

  private startedAt: number = Date.now();
  readonly MAX_QUESTIONS = 6;

  get avgScore(): number | null {
    if (this.answeredTurns.length === 0) return null;
    const sum = this.answeredTurns.reduce((acc, t) => acc + t.score, 0);
    return sum / this.answeredTurns.length;
  }

  async ngOnInit() {
    // Use session passed via router state (from interviews page) so we don't
    // need an extra HTTP call that can hang waiting for Keycloak token refresh
    const navState = window.history.state;
    if (navState?.session) {
      this.session = navState.session;
      await this.loadNextQuestion();
    } else {
      // Fallback: page was refreshed or navigated directly — fetch from API
      try {
        this.session = await firstValueFrom(
          this.api.getSession(this.sessionId),
        );
        await this.loadNextQuestion();
      } catch (err) {
        console.error("Failed to load session:", err);
        this.error =
          "Could not load the session. Please go back and try again.";
      }
    }
  }

  private async loadNextQuestion() {
    this.startedAt = Date.now();
    try {
      this.currentQuestion = await firstValueFrom(
        this.api.getNextQuestion(this.sessionId),
      );
      this.cdr.detectChanges();
    } catch (err: any) {
      if (err?.status === 404 || err?.status === 400 || err?.status === 422) {
        // No more questions or session already complete
        await this.completeSession();
      } else {
        this.error = "Failed to load the next question. Please try again.";
        console.error(err);
        this.cdr.detectChanges();
      }
    }
  }

  async submitAnswer() {
    if (!this.answer.trim() || this.submitting || !this.currentQuestion) return;

    this.submitting = true;
    this.error = "";

    const durationSeconds = Math.round((Date.now() - this.startedAt) / 1000);
    const transcription = this.answer.trim();
    const wc = this.wordCount();
    const question = this.currentQuestion;

    try {
      const result = await firstValueFrom(
        this.api.submitResponse(this.sessionId, {
          questionId: question.id,
          transcription,
          durationSeconds,
          wordCount: wc,
        }),
      );

      this.answeredTurns.push({
        question,
        answer: transcription,
        score: result.overallScore,
        durationSeconds,
      });

      this.answer = "";
      this.currentQuestion = null;

      if (
        !result.nextQuestion ||
        this.answeredTurns.length >= this.MAX_QUESTIONS
      ) {
        await this.completeSession();
      } else {
        this.currentQuestion = result.nextQuestion;
      }
    } catch (err) {
      console.error("Failed to submit answer:", err);
      this.error = "We couldn't submit your answer. Please try again.";
    } finally {
      this.submitting = false;
      this.cdr.detectChanges();
    }
  }

  private async completeSession() {
    try {
      await firstValueFrom(this.api.completeSession(this.sessionId));
    } catch (err) {
      console.warn(
        "Complete session call failed (may already be complete):",
        err,
      );
    }
    this.finished = true;
    this.currentQuestion = null;
    this.cdr.detectChanges();
  }

  async confirmEnd() {
    if (
      !confirm(
        "End this session? Progress will be saved and a report generated.",
      )
    )
      return;
    this.busy = true;
    this.cdr.detectChanges();
    await this.completeSession();
    this.busy = false;
    this.cdr.detectChanges();
  }

  goBack() {
    this.router.navigate(["/interviews"]);
  }

  progressPct(): number {
    return Math.min(
      100,
      (this.answeredTurns.length / this.MAX_QUESTIONS) * 100,
    );
  }

  wordCount(): number {
    return this.answer.trim() ? this.answer.trim().split(/\s+/).length : 0;
  }

  asPct(v: number | null | undefined): string {
    if (v == null) return "—";
    return `${Math.round(v * 100)}%`;
  }

  scorePillClass(score: number): string {
    if (score >= 0.7) return "score-good";
    if (score >= 0.45) return "score-medium";
    if (score > 0) return "score-low";
    return "score-neutral";
  }

  formatType(t: string): string {
    const map: Record<string, string> = {
      BEHAVIORAL: "Behavioral",
      TECHNICAL: "Technical",
      CASE_STUDY: "Case Study",
      PANEL: "Panel",
      PITCH: "Pitch",
    };
    return map[t] ?? t;
  }

  formatIndustry(i: string): string {
    const map: Record<string, string> = {
      IT_TECH: "IT / Tech",
      FINANCE: "Finance",
      HEALTH: "Health",
      ENGINEERING: "Engineering",
      CONSULTING: "Consulting",
      SALES_MARKETING: "Sales / Marketing",
    };
    return map[i] ?? i;
  }
}
