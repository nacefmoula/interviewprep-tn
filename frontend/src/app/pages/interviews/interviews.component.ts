import { ChangeDetectorRef, Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { firstValueFrom } from "rxjs";

import { InterviewApiService } from "../../core/services/interview-api.service";
import { InterviewReportCardComponent } from "./interview-report-card.component";
import {
  InterviewSessionResponse,
  CreateSessionRequest,
  InterviewType,
  InterviewLanguage,
  IndustryType,
  ProgressTracker,
  PreparationLevel,
} from "../../core/models/interview.models";

type FilterTab = "ALL" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

@Component({
  selector: "app-interviews",
  standalone: true,
  imports: [CommonModule, FormsModule, InterviewReportCardComponent],
  template: `
    <div class="page">

      <!-- ─── Page header ─────────────────────────────────────────────── -->
      <header class="page-header">
        <div class="titles">
          <p class="eyebrow">Interview practice</p>
          <h1>My Interviews</h1>
          <p class="subtitle">
            Simulated conversations, evaluated in real time, with a post-session report.
          </p>
        </div>
      </header>

      <!-- ─── Progress summary ────────────────────────────────────────── -->
      <section class="progress-strip" *ngIf="progress">
        <div class="progress-metric">
          <span class="metric-label">Sessions completed</span>
          <span class="metric-value">{{ progress.totalSessionsCompleted }}</span>
        </div>
        <div class="progress-divider"></div>
        <div class="progress-metric">
          <span class="metric-label">Average score</span>
          <span class="metric-value">{{ asPct(progress.averageScore) }}</span>
          <div class="metric-bar">
            <div class="metric-bar-fill" [style.width.%]="(progress.averageScore ?? 0) * 100"></div>
          </div>
        </div>
        <div class="progress-divider"></div>
        <div class="progress-metric">
          <span class="metric-label">Best score</span>
          <span class="metric-value">{{ asPct(progress.bestScore) }}</span>
          <div class="metric-bar best">
            <div class="metric-bar-fill" [style.width.%]="(progress.bestScore ?? 0) * 100"></div>
          </div>
        </div>
        <div class="progress-divider"></div>
        <div class="progress-metric">
          <span class="metric-label">Preparation level</span>
          <span class="metric-value level" [class]="'level-' + (progress.currentLevel ?? 'BEGINNER').toLowerCase()">
            {{ formatLevel(progress.currentLevel) }}
          </span>
        </div>
      </section>

      <section class="progress-strip empty-strip" *ngIf="!progress && !progressError">
        <p class="empty-strip-msg">Complete your first interview to unlock your progress tracker.</p>
      </section>

      <!-- ─── Two-column body ────────────────────────────────────────── -->
      <div class="body-columns">

        <!-- LEFT: session list ─────────────────────────────────────── -->
        <div class="col-sessions">

          <!-- Filter tabs -->
          <nav class="tabs" *ngIf="!loading && sessions.length > 0">
            <button
              *ngFor="let tab of tabs"
              class="tab"
              [class.active]="activeTab === tab.key"
              (click)="activeTab = tab.key"
            >
              {{ tab.label }}
              <span class="tab-count">{{ countFor(tab.key) }}</span>
            </button>
          </nav>

          <!-- Loading -->
          <div class="state-banner" *ngIf="loading">
            <div class="spinner"></div>
            <span>Loading sessions…</span>
          </div>

          <!-- Error -->
          <div class="state-banner error" *ngIf="loadError">
            <span>{{ loadError }}</span>
            <button class="btn-ghost small" (click)="loadSessions()">Retry</button>
          </div>

          <!-- Empty -->
          <div class="empty-state" *ngIf="!loading && !loadError && sessions.length === 0">
            <div class="empty-icon">◎</div>
            <h3>No sessions yet</h3>
            <p>Set up a new interview on the right to start practicing.</p>
          </div>

          <!-- Session list -->
          <section class="session-list" *ngIf="!loading && filtered.length > 0">
            <article
              class="session-card"
              *ngFor="let s of paginated; let i = index"
              [attr.data-status]="s.status.toLowerCase()"
              [style.animation-delay.ms]="i * 40"
            >
              <div class="session-head">
                <div class="session-main">
                  <span class="status-dot" [class]="'dot-' + s.status.toLowerCase()"></span>
                  <span class="session-type-label">{{ formatType(s.type) }}</span>
                  <span class="session-chip">{{ formatIndustry(s.industry) }}</span>
                  <span class="session-chip subtle">{{ s.targetLevel }}</span>
                  <span class="session-chip subtle">{{ s.language }}</span>
                </div>
                <time class="session-time">{{ formatDate(s.createdAt) }}</time>
              </div>

              <div class="session-meta">
                <span>{{ s.durationMinutes }} min</span>
                <span class="dot-sep"></span>
                <span>Difficulty {{ s.difficultyLevel }}</span>
                <span class="dot-sep"></span>
                <span class="status-label" [class]="'status-' + s.status.toLowerCase()">
                  {{ formatStatus(s.status) }}
                </span>
              </div>

              <div class="session-actions">
                <button
                  *ngIf="s.status === 'IN_PROGRESS' || s.status === 'PAUSED'"
                  class="btn-primary"
                  (click)="goToLive(s.id)"
                >Continue</button>

                <button
                  *ngIf="s.status === 'COMPLETED'"
                  class="btn-ghost"
                  (click)="toggleReport(s.id)"
                >{{ expandedReportId === s.id ? "Hide report" : "View report" }}</button>

                <ng-container *ngIf="pendingDeleteId !== s.id">
                  <button
                    *ngIf="s.status !== 'CANCELLED'"
                    class="btn-danger-ghost"
                    (click)="askDelete(s.id)"
                  >{{ s.status === "COMPLETED" ? "Delete" : "Cancel" }}</button>
                </ng-container>
                <ng-container *ngIf="pendingDeleteId === s.id">
                  <span class="confirm-prompt">Remove this session?</span>
                  <button class="btn-confirm-yes" (click)="doDelete(s)">Yes</button>
                  <button class="btn-ghost small" (click)="pendingDeleteId = null">No</button>
                </ng-container>
              </div>

              <div class="report-slot" *ngIf="expandedReportId === s.id">
                <app-interview-report-card [sessionId]="s.id"></app-interview-report-card>
              </div>
            </article>
          </section>

          <!-- Pagination -->
          <nav class="pagination" *ngIf="!loading && totalPages > 1">
            <button class="page-btn" [disabled]="currentPage === 1" (click)="currentPage = currentPage - 1">&#8592;</button>
            <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
            <button class="page-btn" [disabled]="currentPage === totalPages" (click)="currentPage = currentPage + 1">&#8594;</button>
          </nav>

        </div><!-- /col-sessions -->

        <!-- RIGHT: new interview panel ────────────────────────────── -->
        <aside class="col-new">
          <div class="new-panel">
            <div class="new-panel-header">
              <h2 class="new-panel-title">New interview</h2>
              <p class="new-panel-sub">Configure and launch a session</p>
            </div>

            <div class="form-grid">
              <label class="field">
                <span>Type</span>
                <select [(ngModel)]="form.type">
                  <option value="BEHAVIORAL">Behavioral</option>
                  <option value="TECHNICAL">Technical</option>
                  <option value="CASE_STUDY">Case Study</option>
                  <option value="PANEL">Panel</option>
                  <option value="PITCH">Pitch</option>
                </select>
              </label>
              <label class="field">
                <span>Industry</span>
                <select [(ngModel)]="form.industry">
                  <option value="IT_TECH">IT / Tech</option>
                  <option value="FINANCE">Finance</option>
                  <option value="HEALTH">Health</option>
                  <option value="ENGINEERING">Engineering</option>
                  <option value="CONSULTING">Consulting</option>
                  <option value="SALES_MARKETING">Sales / Marketing</option>
                </select>
              </label>
              <label class="field">
                <span>Language</span>
                <select [(ngModel)]="form.language">
                  <option value="EN">English</option>
                  <option value="FR">Français</option>
                  <option value="AR_TN">Tunisian Arabic</option>
                </select>
              </label>
              <label class="field">
                <span>Level</span>
                <select [(ngModel)]="form.targetLevel">
                  <option value="JUNIOR">Junior</option>
                  <option value="MID">Mid</option>
                  <option value="SENIOR">Senior</option>
                </select>
              </label>
              <label class="field">
                <span>Duration</span>
                <select [(ngModel)]="form.durationMinutes">
                  <option [ngValue]="15">15 min</option>
                  <option [ngValue]="30">30 min</option>
                  <option [ngValue]="45">45 min</option>
                  <option [ngValue]="60">60 min</option>
                </select>
              </label>
              <label class="field">
                <span>Difficulty</span>
                <select [(ngModel)]="form.difficultyLevel">
                  <option [ngValue]="1">1 — Easy</option>
                  <option [ngValue]="2">2</option>
                  <option [ngValue]="3">3 — Medium</option>
                  <option [ngValue]="4">4</option>
                  <option [ngValue]="5">5 — Hard</option>
                </select>
              </label>
            </div>

            <div class="form-checks">
              <label class="check">
                <input type="checkbox" [(ngModel)]="form.isRecorded" />
                <span>Record session</span>
              </label>
              <label class="check">
                <input type="checkbox" [(ngModel)]="form.consentGiven" />
                <span>I consent to audio &amp; face-metrics processing</span>
              </label>
            </div>

            <div class="inline-error" *ngIf="createError">{{ createError }}</div>

            <div class="mode-picker">
              <button
                class="mode-card active"
                (click)="createAndStart('live')"
                [disabled]="creating || !form.consentGiven"
              >
                <span class="mode-icon">🎙️</span>
                <span class="mode-title">{{ creating ? "Creating…" : "Live interview" }}</span>
                <span class="mode-desc">AI recruiter speaks, you answer out loud.</span>
              </button>
              <button
                class="mode-card"
                (click)="createAndStart('qa')"
                [disabled]="creating || !form.consentGiven"
              >
                <span class="mode-icon">📝</span>
                <span class="mode-title">{{ creating ? "Creating…" : "Quick Q&A" }}</span>
                <span class="mode-desc">Text-only, no audio. Quick practice.</span>
              </button>
            </div>
          </div>
        </aside><!-- /col-new -->

      </div><!-- /body-columns -->
    </div><!-- /page -->
  `,
  styles: [
    `
      /* ─── Design tokens ─────────────────────────────────────────────── */
      :host {
        --ink: #0b1220;
        --ink-soft: #374151;
        --ink-muted: #6b7280;
        --ink-faint: #9ca3af;
        --canvas: #f6f7f9;
        --paper: #ffffff;
        --line: #e5e7eb;
        --line-soft: #f1f2f4;
        --accent: #0d9488; /* deep teal */
        --accent-soft: #ccfbf1;
        --accent-ink: #134e4a;
        --warn: #b45309;
        --warn-soft: #fef3c7;
        --danger: #b91c1c;
        --danger-soft: #fee2e2;
        --ok: #15803d;
        --ok-soft: #dcfce7;
        --info: #1d4ed8;
        --info-soft: #dbeafe;
        --font-display: ui-serif, Georgia, "Times New Roman", serif;
        --font-body: "Inter", system-ui, -apple-system, sans-serif;
        --shadow-sm: 0 1px 2px rgba(12, 18, 30, 0.04);
        --shadow-md: 0 4px 18px -6px rgba(12, 18, 30, 0.08);
        --shadow-lg: 0 20px 50px -20px rgba(12, 18, 30, 0.2);
        --radius-sm: 10px;
        --radius-md: 16px;
        --radius-lg: 24px;

        font-family: var(--font-body);
        color: var(--ink);
        display: block;
        background: var(--canvas);
      }

      .page {
        width: 100%;
        padding: 36px 28px 64px;
        display: flex;
        flex-direction: column;
        gap: 28px;
        box-sizing: border-box;
      }

      /* ─── Two-column body ───────────────────────────────────────────── */
      .body-columns {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 420px;
        gap: 28px;
        align-items: start;
      }
      .col-sessions {
        display: flex;
        flex-direction: column;
        gap: 18px;
        min-width: 0;
      }
      .col-new {
        position: sticky;
        top: 24px;
      }
      .new-panel {
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        padding: 24px;
        box-shadow: var(--shadow-md);
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .new-panel-header {
        border-bottom: 1px solid var(--line);
        padding-bottom: 16px;
      }
      .new-panel-title {
        margin: 0 0 4px;
        font-family: var(--font-display);
        font-weight: 500;
        font-size: 22px;
        color: var(--ink);
        letter-spacing: -0.01em;
      }
      .new-panel-sub {
        margin: 0;
        font-size: 13px;
        color: var(--ink-muted);
      }

      /* ─── Page header ───────────────────────────────────────────────── */
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 24px;
        flex-wrap: wrap;
      }
      .eyebrow {
        margin: 0 0 6px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--accent);
      }
      .page-header h1 {
        margin: 0;
        font-family: var(--font-display);
        font-weight: 500;
        font-size: 44px;
        letter-spacing: -0.02em;
        line-height: 1;
        color: var(--ink);
      }
      .subtitle {
        margin: 10px 0 0;
        color: var(--ink-muted);
        font-size: 15px;
        max-width: 540px;
      }

      /* ─── Buttons ───────────────────────────────────────────────────── */
      .btn-primary,
      .btn-ghost,
      .btn-danger-ghost {
        font-family: var(--font-body);
        font-size: 14px;
        font-weight: 600;
        padding: 10px 18px;
        border-radius: 999px;
        border: 1px solid transparent;
        cursor: pointer;
        transition:
          transform 120ms ease,
          box-shadow 200ms ease,
          background 180ms ease,
          border-color 180ms ease;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .btn-primary {
        background: var(--ink);
        color: #fff;
        box-shadow: var(--shadow-md);
      }
      .btn-primary:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: var(--shadow-lg);
      }
      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-icon {
        font-weight: 400;
        font-size: 17px;
        line-height: 1;
      }

      .btn-ghost {
        background: transparent;
        border-color: var(--line);
        color: var(--ink);
      }
      .btn-ghost:hover {
        background: var(--paper);
        border-color: var(--ink);
      }
      .btn-ghost.small {
        padding: 6px 14px;
        font-size: 13px;
      }

      .btn-danger-ghost {
        background: transparent;
        border-color: var(--line);
        color: var(--danger);
      }
      .btn-danger-ghost:hover {
        background: var(--danger-soft);
        border-color: var(--danger-soft);
      }

      /* ─── Progress strip ────────────────────────────────────────────── */
      .progress-strip {
        display: grid;
        grid-template-columns: 1fr auto 1.1fr auto 1.1fr auto 1fr;
        align-items: center;
        gap: 20px;
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        padding: 22px 28px;
        box-shadow: var(--shadow-sm);
      }
      .progress-metric {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }
      .metric-label {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--ink-muted);
      }
      .metric-value {
        font-family: var(--font-display);
        font-weight: 500;
        font-size: 30px;
        color: var(--ink);
        letter-spacing: -0.02em;
        line-height: 1;
      }
      .metric-value.level {
        font-family: var(--font-body);
        font-size: 15px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        padding: 4px 12px;
        border-radius: 999px;
        display: inline-block;
        width: fit-content;
      }
      .level-beginner {
        background: var(--info-soft);
        color: var(--info);
      }
      .level-intermediate {
        background: var(--accent-soft);
        color: var(--accent-ink);
      }
      .level-advanced {
        background: var(--warn-soft);
        color: var(--warn);
      }
      .level-expert {
        background: var(--ink);
        color: #fff;
      }

      .metric-bar {
        position: relative;
        width: 100%;
        height: 3px;
        background: var(--line);
        border-radius: 999px;
        overflow: hidden;
        margin-top: 2px;
      }
      .metric-bar-fill {
        position: absolute;
        inset: 0 auto 0 0;
        background: var(--accent);
        border-radius: 999px;
        transition: width 500ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      .metric-bar.best .metric-bar-fill {
        background: var(--ink);
      }

      .progress-divider {
        width: 1px;
        align-self: stretch;
        background: var(--line);
      }
      .empty-strip {
        grid-template-columns: 1fr;
        justify-items: center;
        padding: 28px 20px;
      }
      .empty-strip-msg {
        margin: 0;
        font-size: 14px;
        color: var(--ink-muted);
        font-style: italic;
      }

      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px 16px;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .field > span {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--ink-muted);
      }
      .field select {
        font-family: var(--font-body);
        font-size: 14px;
        padding: 10px 12px;
        background: var(--canvas);
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        color: var(--ink);
        outline: none;
        transition:
          border-color 150ms ease,
          background 150ms ease;
      }
      .field select:hover {
        border-color: var(--ink-muted);
      }
      .field select:focus {
        border-color: var(--accent);
        background: var(--paper);
      }

      .form-checks {
        display: flex;
        gap: 28px;
        flex-wrap: wrap;
        margin-bottom: 22px;
      }
      .check {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        font-size: 14px;
        color: var(--ink-soft);
      }
      .check input[type="checkbox"] {
        width: 16px;
        height: 16px;
        accent-color: var(--accent);
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      /* ─── Tabs ──────────────────────────────────────────────────────── */
      .tabs {
        display: flex;
        gap: 4px;
        border-bottom: 1px solid var(--line);
        margin-top: 4px;
      }
      .tab {
        font-family: var(--font-body);
        font-size: 14px;
        font-weight: 600;
        background: transparent;
        border: none;
        padding: 12px 18px 14px;
        color: var(--ink-muted);
        cursor: pointer;
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: color 150ms ease;
      }
      .tab:hover {
        color: var(--ink);
      }
      .tab.active {
        color: var(--ink);
      }
      .tab.active::after {
        content: "";
        position: absolute;
        left: 14px;
        right: 14px;
        bottom: -1px;
        height: 2px;
        background: var(--ink);
      }
      .tab-count {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 999px;
        background: var(--line-soft);
        color: var(--ink-muted);
        letter-spacing: 0.04em;
      }
      .tab.active .tab-count {
        background: var(--ink);
        color: #fff;
      }

      /* ─── State banners ─────────────────────────────────────────────── */
      .state-banner {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: var(--radius-md);
        font-size: 14px;
        color: var(--ink-muted);
        justify-content: center;
      }
      .state-banner.error {
        background: var(--danger-soft);
        border-color: var(--danger-soft);
        color: var(--danger);
        justify-content: space-between;
      }
      .spinner {
        width: 14px;
        height: 14px;
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

      .empty-state {
        text-align: center;
        padding: 72px 24px;
        background: var(--paper);
        border: 1px dashed var(--line);
        border-radius: var(--radius-lg);
      }
      .empty-icon {
        font-size: 48px;
        color: var(--ink-faint);
        margin-bottom: 12px;
      }
      .empty-state h3 {
        margin: 0 0 6px;
        font-family: var(--font-display);
        font-weight: 500;
        font-size: 22px;
        color: var(--ink);
      }
      .empty-state p {
        margin: 0 0 20px;
        color: var(--ink-muted);
      }

      /* ─── Session cards ─────────────────────────────────────────────── */
      .session-list {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .session-card {
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        padding: 22px 26px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        transition:
          border-color 200ms ease,
          transform 200ms ease,
          box-shadow 300ms ease;
        animation: fadeInUp 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .session-card:hover {
        border-color: var(--ink);
        box-shadow: var(--shadow-md);
      }

      .session-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .session-main {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .dot-in_progress {
        background: var(--info);
        box-shadow: 0 0 0 4px var(--info-soft);
      }
      .dot-paused {
        background: var(--warn);
        box-shadow: 0 0 0 4px var(--warn-soft);
      }
      .dot-completed {
        background: var(--ok);
        box-shadow: 0 0 0 4px var(--ok-soft);
      }
      .dot-cancelled {
        background: var(--ink-faint);
        box-shadow: 0 0 0 4px var(--line-soft);
      }

      .session-type-label {
        font-family: var(--font-display);
        font-weight: 500;
        font-size: 20px;
        color: var(--ink);
        letter-spacing: -0.01em;
      }
      .session-chip {
        font-size: 12px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 999px;
        background: var(--line-soft);
        color: var(--ink-soft);
        letter-spacing: 0.04em;
      }
      .session-chip.subtle {
        background: transparent;
        border: 1px solid var(--line);
      }

      .session-time {
        font-size: 13px;
        color: var(--ink-faint);
        font-variant-numeric: tabular-nums;
      }

      .session-meta {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        color: var(--ink-muted);
      }
      .dot-sep {
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background: var(--ink-faint);
      }
      .status-label {
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 999px;
      }
      .status-in_progress {
        background: var(--info-soft);
        color: var(--info);
      }
      .status-paused {
        background: var(--warn-soft);
        color: var(--warn);
      }
      .status-completed {
        background: var(--ok-soft);
        color: var(--ok);
      }
      .status-cancelled {
        background: var(--line-soft);
        color: var(--ink-muted);
      }

      .session-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .report-slot {
        margin-top: 4px;
        padding-top: 20px;
        border-top: 1px solid var(--line);
        animation: fadeInUp 400ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      .confirm-prompt {
        font-size: 13px;
        font-weight: 600;
        color: var(--danger);
        padding: 0 4px;
        align-self: center;
      }
      .btn-confirm-yes {
        font-family: var(--font-body);
        font-size: 13px;
        font-weight: 700;
        padding: 8px 16px;
        border-radius: 999px;
        border: none;
        background: var(--danger);
        color: #fff;
        cursor: pointer;
        transition: opacity 150ms ease;
      }
      .btn-confirm-yes:hover {
        opacity: 0.85;
      }

      .mode-picker {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        margin-bottom: 16px;
      }
      .mode-card {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 18px;
        border: 2px solid var(--line);
        border-radius: var(--radius-md);
        background: var(--canvas);
        cursor: pointer;
        text-align: left;
        transition:
          border-color 180ms ease,
          background 180ms ease,
          transform 120ms ease;
        position: relative;
        font-family: var(--font-body);
      }
      .mode-card.active {
        border-color: var(--ink);
        background: var(--paper);
      }
      .mode-card.active:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }
      .mode-card.active:disabled {
        opacity: 0.55;
        cursor: not-allowed;
        transform: none;
      }
      .mode-card.disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .mode-icon {
        font-size: 22px;
        line-height: 1;
      }
      .mode-title {
        font-size: 15px;
        font-weight: 700;
        color: var(--ink);
      }
      .mode-desc {
        font-size: 13px;
        color: var(--ink-muted);
        line-height: 1.5;
      }
      .mode-badge {
        display: inline-block;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        padding: 2px 8px;
        border-radius: 999px;
        background: var(--warn-soft);
        color: var(--warn);
        width: fit-content;
        margin-top: 2px;
      }

      .inline-error {
        background: var(--danger-soft);
        color: var(--danger);
        padding: 10px 14px;
        border-radius: var(--radius-sm);
        font-size: 13px;
        margin-bottom: 12px;
      }

      /* ─── Pagination ───────────────────────────────────────────────── */
      .pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 8px 0 4px;
      }
      .page-btn {
        font-family: var(--font-body);
        font-size: 16px;
        font-weight: 600;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 1px solid var(--line);
        background: var(--paper);
        color: var(--ink);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: background 150ms ease, border-color 150ms ease, transform 120ms ease;
      }
      .page-btn:hover:not(:disabled) {
        border-color: var(--ink);
        transform: scale(1.05);
      }
      .page-btn:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
      .page-info {
        font-size: 14px;
        font-weight: 600;
        color: var(--ink-muted);
        min-width: 52px;
        text-align: center;
      }

      /* ─── Mobile ────────────────────────────────────────────────────── */
      @media (max-width: 1024px) {
        .body-columns {
          grid-template-columns: 1fr;
        }
        .col-new {
          position: static;
          order: -1;
        }
        .form-grid {
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        }
      }
      @media (max-width: 820px) {
        .page {
          padding: 24px 18px 48px;
        }
        .page-header h1 {
          font-size: 34px;
        }
        .progress-strip {
          grid-template-columns: 1fr 1fr;
        }
        .progress-divider {
          display: none;
        }
        .session-head {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
})
export class InterviewsComponent implements OnInit {
  private router = inject(Router);
  private api = inject(InterviewApiService);
  private cdr = inject(ChangeDetectorRef);

  sessions: InterviewSessionResponse[] = [];
  progress: ProgressTracker | null = null;

  loading = true;
  loadError = "";
  progressError = "";

  creating = false;
  createError = "";

  private _activeTab: FilterTab = "ALL";
  get activeTab(): FilterTab { return this._activeTab; }
  set activeTab(v: FilterTab) { this._activeTab = v; this.currentPage = 1; }
  expandedReportId: number | null = null;
  pendingDeleteId: number | null = null;

  currentPage = 1;
  readonly pageSize = 6;

  get paginated(): InterviewSessionResponse[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  readonly tabs: { key: FilterTab; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "IN_PROGRESS", label: "In progress" },
    { key: "COMPLETED", label: "Completed" },
    { key: "CANCELLED", label: "Cancelled" },
  ];

  form: CreateSessionRequest = {
    type: "BEHAVIORAL",
    industry: "IT_TECH",
    targetLevel: "MID",
    language: "EN" as InterviewLanguage,
    durationMinutes: 30,
    difficultyLevel: 3,
    isRecorded: false,
    consentGiven: false,
  };

  async ngOnInit() {
    await Promise.all([this.loadSessions(), this.loadProgress()]);
  }

  async loadSessions(silent = false) {
    if (!silent) {
      this.loading = true;
      this.loadError = "";
    }
    try {
      const sessions = await firstValueFrom(this.api.getMySessions());
      this.sessions = [...sessions].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } catch (err) {
      console.error("Failed to load sessions:", err);
      if (!silent) {
        this.loadError =
          "We couldn't load your sessions. Check the connection and retry.";
      }
    } finally {
      if (!silent) this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async loadProgress() {
    try {
      this.progress = await firstValueFrom(this.api.getMyProgress());
    } catch (err: any) {
      // 404 when the user has no completed sessions yet — not an error for UX.
      if (err?.status !== 404) {
        console.warn("Progress unavailable:", err);
      }
      this.progress = null;
      this.progressError = "";
    } finally {
      this.cdr.detectChanges();
    }
  }

  toggleCreate() {
    this.createError = "";
  }

  async createAndStart(mode: "live" | "qa" = "live") {
    this.creating = true;
    this.createError = "";
    try {
      const session = await firstValueFrom(this.api.createSession(this.form));
      if (mode === "qa") {
        this.router.navigate(["/quick-interview", session.id], {
          state: { session },
        });
      } else {
        this.router.navigate(["/live-interview", session.id]);
      }
    } catch (err) {
      console.error("Failed to create session:", err);
      this.createError = "We couldn't create the session. Please try again.";
      this.creating = false;
    }
  }

  goToLive(id: number) {
    this.router.navigate(["/live-interview", id]);
  }

  toggleReport(id: number) {
    this.expandedReportId = this.expandedReportId === id ? null : id;
  }

  /** Show the inline "Sure?" confirmation row — no native dialog = no freeze */
  askDelete(id: number) {
    this.pendingDeleteId = id;
  }

  async doDelete(session: InterviewSessionResponse) {
    const word = session.status === "COMPLETED" ? "delete" : "cancel";
    this.pendingDeleteId = null;

    // Optimistic removal so the row disappears instantly
    this.sessions = this.sessions.filter((s) => s.id !== session.id);
    if (this.expandedReportId === session.id) this.expandedReportId = null;

    try {
      if (session.status === "COMPLETED") {
        await firstValueFrom(this.api.deleteSession(session.id));
      } else {
        await firstValueFrom(this.api.cancelSession(session.id));
      }
      await this.loadSessions(true);
    } catch (err: any) {
      // 404 = already deleted — treat as success
      if (err?.status === 404) {
        await this.loadSessions(true);
        return;
      }
      console.error(`Failed to ${word} session:`, err);
      await this.loadSessions(true); // restore from server
    }
  }

  get filtered(): InterviewSessionResponse[] {
    if (this.activeTab === "ALL") return this.sessions;
    return this.sessions.filter((s) => s.status === this.activeTab);
  }

  countFor(tab: FilterTab): number {
    if (tab === "ALL") return this.sessions.length;
    return this.sessions.filter((s) => s.status === tab).length;
  }

  // ─── Formatting helpers ─────────────────────────────────────────────
  formatStatus(s: string): string {
    return s.replace(/_/g, " ").toLowerCase();
  }

  formatLevel(l: PreparationLevel | undefined): string {
    if (!l) return "Beginner";
    return l.charAt(0) + l.slice(1).toLowerCase();
  }

  formatType(t: InterviewType): string {
    const map: Record<InterviewType, string> = {
      BEHAVIORAL: "Behavioral",
      TECHNICAL: "Technical",
      CASE_STUDY: "Case study",
      PANEL: "Panel",
      PITCH: "Pitch",
    };
    return map[t] ?? t;
  }

  formatIndustry(i: IndustryType): string {
    const map: Record<IndustryType, string> = {
      IT_TECH: "IT / Tech",
      FINANCE: "Finance",
      HEALTH: "Health",
      ENGINEERING: "Engineering",
      CONSULTING: "Consulting",
      SALES_MARKETING: "Sales / Marketing",
    };
    return map[i] ?? i;
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const sameYear = d.getFullYear() === now.getFullYear();
    return (
      d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        ...(sameYear ? {} : { year: "numeric" }),
      }) +
      " · " +
      d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    );
  }

  asPct(v: number | null | undefined): string {
    if (v == null) return "—";
    return `${Math.round(v * 100)}%`;
  }
}
