// quiz-assessment.component.ts — IMPROVED DESIGN VERSION
// ✅ English UI throughout
// ✅ Removed AI/Gemini branding
// ✅ Wrong answers: light red (#FCEBEB / #E24B4A), correct: teal
// ✅ Professional, minimal emoji usage
// ✅ Same teal palette, refined design

import { Component, OnInit, OnDestroy, signal, inject, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, DatePipe }    from '@angular/common';
import { FormsModule }               from '@angular/forms';
import { RouterModule }              from '@angular/router';
import { HttpClient }                from '@angular/common/http';
import { Subscription }              from 'rxjs';
import Swal                          from 'sweetalert2';

import { QuizService }               from '../../core/services/quiz.service';
import { TrainingApiService }        from '../../core/services/training-api.service';
import { AiService, VideoScriptResponse } from '../../core/services/ai.service';
import { AuthService }               from '../../core/auth/auth.service';
import { AntiCheatService, CheatEvent, CheatType } from '../../core/services/anti-cheat.service';
import { SectionHeaderComponent }    from '../../shared/components/section-header/section-header.component';
import { OralQuizComponent, OralQuizResult } from '../quiz/oral-quiz.component';
import { VideoExplainerComponent }   from '../training/video-explainer.component';
import { AntiCheatOverlayComponent, OverlayMode } from '../quiz/anti-cheat-overlay.component';
import { ActivatedRoute }            from '@angular/router';
import {
  QuizEvaluationReportComponent,
  AttemptForReport,
  ModuleInfo
} from '../quiz/quiz-evaluation-report.component';

// ─── Types ──────────────────────────────────────────────────────────
type ViewState = 'MODULE_LIST' | 'MODULE_QUIZZES' | 'QUIZ_SETUP';
type QuizTab   = 'history' | 'stats';

const LEVEL_MAP: Record<string, 'EASY' | 'MEDIUM' | 'HARD'> = {
  'Beginner': 'EASY', 'Intermediate': 'MEDIUM', 'Advanced': 'HARD',
};

// ─── Guide Steps ────────────────────────────────────────────────────
interface GuideStep {
  targetId:    string;
  title:       string;
  description: string;
  placement:   'top' | 'bottom' | 'left' | 'right';
  stripLabel:  string;
  view:        'MODULE_LIST' | 'MODULE_QUIZZES' | 'QUIZ_SETUP';
  quizTab?:    'history' | 'stats';
  requiresModule?: boolean;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    targetId: 'guide-module-list',
    title: 'Select a Module',
    description: 'Click a module from the list to select it. Each module offers personalized quiz questions generated from its content.',
    placement: 'right',
    stripLabel: 'Module',
    view: 'MODULE_LIST',
  },
  {
    targetId: 'guide-stats-card',
    title: 'Your Statistics',
    description: 'View your past attempts, best score, and success rate. Aim for 70% to validate the module and unlock your XP.',
    placement: 'bottom',
    stripLabel: 'Stats',
    view: 'MODULE_LIST',
    requiresModule: true,
  },
  {
    targetId: 'guide-resume-btn',
    title: 'Module Summary',
    description: 'Generate a smart summary of the module with key points to review. Great for studying before starting a quiz.',
    placement: 'bottom',
    stripLabel: 'Summary',
    view: 'MODULE_LIST',
    requiresModule: true,
  },
  {
    targetId: 'guide-level-btns',
    title: 'Select Difficulty',
    description: 'Beginner, Intermediate, or Advanced. Question difficulty adapts in real time based on your choice.',
    placement: 'top',
    stripLabel: 'Level',
    view: 'QUIZ_SETUP',
  },
  {
    targetId: 'guide-mode-opts',
    title: 'Answer Mode',
    description: 'Written quiz with a 45-second timer per question, or oral quiz where the tutor speaks, listens, and provides vocal feedback.',
    placement: 'top',
    stripLabel: 'Mode',
    view: 'QUIZ_SETUP',
  },
  {
    targetId: 'guide-anticheat-tip',
    title: 'Anti-Cheat Policy',
    description: 'Important: never leave the window during a quiz. 1st incident = warning. 2nd incident = automatic termination with 0% score. This is recorded.',
    placement: 'top',
    stripLabel: 'Policy',
    view: 'QUIZ_SETUP',
  },
  {
    targetId: 'guide-start-btn',
    title: 'Start Quiz',
    description: 'This button generates your questions and starts the session. Questions are unique and extracted from the module content each attempt.',
    placement: 'top',
    stripLabel: 'Start',
    view: 'QUIZ_SETUP',
  },
  {
    targetId: 'guide-quiz-history',
    title: 'Attempt History',
    description: 'Find all your past sessions here. Click an attempt to display the detailed correction question by question in the right panel.',
    placement: 'right',
    stripLabel: 'History',
    view: 'MODULE_QUIZZES',
    quizTab: 'history',
  },
  {
    targetId: 'guide-correction-panel',
    title: 'Detailed Correction',
    description: 'Navigate question by question using the colored indicators. Green = correct, red = incorrect. Each question shows the correct answer and an explanation.',
    placement: 'left',
    stripLabel: 'Correction',
    view: 'MODULE_QUIZZES',
    quizTab: 'history',
  },
  {
    targetId: 'guide-rapport-btn',
    title: 'Performance Report',
    description: 'Generate a full report with achievement badges, animated stats, analysis of your strengths and improvement areas, and a personalized action plan.',
    placement: 'top',
    stripLabel: 'Report',
    view: 'MODULE_QUIZZES',
    quizTab: 'history',
  },
];

interface ChatMessage {
  role:    'user' | 'ai';
  content: string;
  time:    Date;
}

const GEMINI_API_KEY = 'VOTRE_CLE_GEMINI_ICI';
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

@Component({
  selector: 'app-quiz-assessment',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe, RouterModule,
    SectionHeaderComponent, OralQuizComponent, VideoExplainerComponent,
    AntiCheatOverlayComponent, QuizEvaluationReportComponent,
  ],
  template: `
<div class="qp" id="quiz-page-root">

  <!-- ══ GUIDE OVERLAY ══ -->
  <div class="guide-backdrop" *ngIf="guideActive()" (click)="$event.stopPropagation()"></div>

  <div class="guide-tooltip animate-scale"
       *ngIf="guideActive() && guideStep() >= 0"
       [ngStyle]="guideTooltipStyle()">

    <div class="gt-arrow-tri" [class]="'gt-arrow-' + GUIDE_STEPS[guideStep()].placement"></div>

    <div class="gt-tag">
      <div class="gt-tag-dot"></div>
      Step {{ guideStep() + 1 }} of {{ GUIDE_STEPS.length }}
    </div>

    <div class="gt-title">{{ GUIDE_STEPS[guideStep()].title }}</div>
    <p class="gt-desc">{{ GUIDE_STEPS[guideStep()].description }}</p>

    <div class="gt-prog">
      <div class="gt-prog-track">
        <div class="gt-prog-fill" [style.width]="((guideStep()+1)/GUIDE_STEPS.length*100)+'%'"></div>
      </div>
      <span class="gt-prog-label">{{ guideStep()+1 }}/{{ GUIDE_STEPS.length }}</span>
    </div>

    <div class="gt-dots">
      <div class="gt-dot" *ngFor="let s of GUIDE_STEPS; let i=index" [class.active]="i === guideStep()"></div>
    </div>

    <div class="gt-actions">
      <button class="gt-skip" (click)="endGuide()">Exit</button>
      <button class="gt-next" (click)="guideNext()">
        {{ guideStep() === GUIDE_STEPS.length - 1 ? 'Finish' : 'Next' }}
        <span class="gt-next-arr" *ngIf="guideStep() < GUIDE_STEPS.length-1">→</span>
      </button>
    </div>
  </div>

  <div class="guide-strip" *ngIf="guideActive()">
    <div class="gs-steps">
      <div class="gs-pill"
           *ngFor="let s of GUIDE_STEPS; let i=index"
           [class.gs-done]="i < guideStep()"
           [class.gs-active]="i === guideStep()"
           [class.gs-todo]="i > guideStep()"
           (click)="jumpToStep(i)">
        <div class="gs-num">
          <span *ngIf="i < guideStep()">✓</span>
          <span *ngIf="i >= guideStep()">{{ i+1 }}</span>
        </div>
        <span class="gs-label">{{ s.stripLabel }}</span>
      </div>
    </div>
    <button class="gs-close" (click)="endGuide()">Exit Guide</button>
  </div>

  <!-- ══ CHEAT TERMINATION POPUP ══ -->
  <div class="cheat-backdrop" *ngIf="showCheatTermination()">
    <div class="cheat-popup animate-scale">
      <div class="cp-header">
        <div class="cp-h-left">
          <div class="cp-h-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <div class="cp-h-title">Quiz Terminated</div>
            <div class="cp-h-sub">Second window exit detected</div>
          </div>
        </div>
        <div class="cp-h-badge">Confirmed Violation</div>
      </div>
      <div class="cp-body">
        <div class="cp-score-row">
          <div class="cp-ring-wrap">
            <svg viewBox="0 0 64 64" width="64" height="64">
              <circle cx="32" cy="32" r="26" fill="none" stroke="#CCFBF1" stroke-width="5"/>
              <circle cx="32" cy="32" r="26" fill="none" stroke="#5EEAD4" stroke-width="5" stroke-linecap="round" stroke-dasharray="163.4" stroke-dashoffset="163.4" transform="rotate(-90 32 32)"/>
            </svg>
            <div class="cp-ring-num">0%</div>
          </div>
          <div class="cp-score-info">
            <div class="cp-score-title">Final Score: 0%</div>
            <div class="cp-score-sub">Session permanently closed</div>
          </div>
        </div>
        <div class="cp-timeline">
          <div class="cp-tl-item cp-tl-done">
            <div class="cp-tl-dot cp-tl-dot-ok"></div>
            <div class="cp-tl-content">
              <span class="cp-tl-label">1st Violation</span>
              <span class="cp-tl-desc">Warning received — you were able to continue</span>
            </div>
            <span class="cp-tl-tag cp-tag-ok">Received</span>
          </div>
          <div class="cp-tl-connector"></div>
          <div class="cp-tl-item cp-tl-current">
            <div class="cp-tl-dot cp-tl-dot-bad"></div>
            <div class="cp-tl-content">
              <span class="cp-tl-label">2nd Violation</span>
              <span class="cp-tl-desc">Automatic termination — 0% score recorded</span>
            </div>
            <span class="cp-tl-tag cp-tag-bad">Now</span>
          </div>
        </div>
        <div class="cp-note">
          <span>This incident is <strong>recorded</strong> in your history. The attempt will appear with a score of <strong>0%</strong> in your training statistics.</span>
        </div>
        <div class="cp-countdown">
          <div class="cp-cd-ring">
            <svg viewBox="0 0 44 44" width="44" height="44">
              <circle cx="22" cy="22" r="18" fill="none" stroke="#CCFBF1" stroke-width="4"/>
              <circle cx="22" cy="22" r="18" fill="none" stroke="#14B8A6" stroke-width="4" stroke-linecap="round" stroke-dasharray="113.1"
                [style.stroke-dashoffset]="113.1 - (cheatCountdown() / CHEAT_COUNTDOWN_MAX * 113.1)"
                transform="rotate(-90 22 22)" style="transition:stroke-dashoffset 0.95s linear"/>
            </svg>
            <div class="cp-cd-num">{{ cheatCountdown() }}</div>
          </div>
          <div class="cp-cd-label">
            <strong>Auto-close in {{ cheatCountdown() }}s</strong>
            Click below to view your results
          </div>
        </div>
        <button class="cp-cta" (click)="confirmCheatTermination()">
          View Results (0%)
        </button>
      </div>
      <div class="cp-footer">
        <span class="cp-rec-dot"></span>
        <span class="cp-footer-text">Incident recorded · {{ cheatTerminationTime() | date:'HH:mm:ss' }}</span>
      </div>
    </div>
  </div>

  <!-- ══ ANTI-CHEAT OVERLAY ══ -->
  <app-anti-cheat-overlay
    *ngIf="showCheatOverlay()"
    [mode]="cheatOverlayMode()"
    [cheatType]="lastCheatType()"
    [timestamp]="lastCheatTime()"
    (onResume)="resumeAfterWarning()"
    (onQuit)="terminateQuiz()">
  </app-anti-cheat-overlay>

  <!-- ══ PAGE HEADER ══ -->
  <div class="page-header" *ngIf="viewState()==='MODULE_LIST'">
    <div>
      <h1>Quizzes & Assessments</h1>
      <p>Test your knowledge by module.</p>
    </div>
    <div class="header-right">
      <button class="guide-launch-btn" (click)="startGuide()" title="Launch interactive guide">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Guide
      </button>
    </div>
  </div>

  <div class="banner banner-load" *ngIf="loading()">{{ loadingMsg() }}</div>
  <div class="banner banner-err"  *ngIf="errorMsg()">{{ errorMsg() }}</div>
  <div class="banner banner-ok"   *ngIf="successMsg()">{{ successMsg() }}</div>

  <!-- ══ MODULE LIST ══ -->
  <ng-container *ngIf="viewState()==='MODULE_LIST'">
    <div class="two-col">
      <div class="left-panel" id="guide-module-list">
        <div class="tabs">
          <button class="tab" [class.active]="moduleTab()==='all'"  (click)="moduleTab.set('all');modulePage.set(0)">All ({{ modules().length }})</button>
          <button class="tab" [class.active]="moduleTab()==='done'" (click)="moduleTab.set('done');modulePage.set(0)">Completed ({{ completedModuleCount() }})</button>
        </div>
        <div class="list">
          <div class="empty" *ngIf="!filteredModules().length && !loading()">No modules available.</div>
          <div class="module-card"
            *ngFor="let m of pagedModules()"
            [class.selected]="selectedModule()?.id === m.id"
            (click)="selectModule(m)">
            <div class="mc-cat chip chip-teal">{{ m.category }}</div>
            <div class="mc-title">{{ m.title }}</div>
            <div class="mc-desc">{{ m.description?.slice(0,65) }}…</div>
            <div class="mc-xp" *ngIf="m.xpReward || m.xp_reward">{{ m.xpReward || m.xp_reward }} XP</div>
          </div>
        </div>
        <div class="pagination" *ngIf="totalModulePages() > 1">
          <button class="pg-btn" (click)="modulePage.set(modulePage()-1)" [disabled]="modulePage()===0">‹</button>
          <button class="pg-num"
            *ngFor="let p of pagesArray()"
            [class.pg-active]="modulePage()===p"
            (click)="modulePage.set(p)">{{ p + 1 }}</button>
          <button class="pg-btn" (click)="modulePage.set(modulePage()+1)" [disabled]="modulePage()===totalModulePages()-1">›</button>
        </div>
      </div>

      <div class="right-panel">
        <div class="empty-state" *ngIf="!selectedModule()">
          <div class="es-icon-wrap">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
          </div>
          <h3>Select a Module</h3>
          <p>Choose a module to generate a personalized quiz.</p>
        </div>

        <ng-container *ngIf="selectedModule()">
          <div class="card" id="guide-stats-card">
            <div class="card-head">
              <div>
                <span class="chip chip-teal">{{ selectedModule()!.category }}</span>
                <h2 class="card-title">{{ selectedModule()!.title }}</h2>
                <p class="card-sub">{{ selectedModule()!.description }}</p>
              </div>
              <div class="card-actions">
                <button class="btn btn-secondary" id="guide-resume-btn" (click)="onSummary(selectedModule()!)" [disabled]="summaryLoading()">
                  {{ summaryLoading() ? 'Loading…' : 'Summary' }}
                </button>
                <button class="btn btn-primary" (click)="goToModuleQuizzes(selectedModule()!)">Quiz Space →</button>
              </div>
            </div>
            <div class="stats-row">
              <div class="stat"><div class="sv">{{ pastAttempts().length }}</div><div class="sl">Attempts</div></div>
              <div class="stat"><div class="sv teal">{{ bestScore() }}%</div><div class="sl">Best</div></div>
              <div class="stat"><div class="sv">{{ avgScore() }}%</div><div class="sl">Average</div></div>
              <div class="stat"><div class="sv">{{ successRate() }}%</div><div class="sl">Pass Rate</div></div>
            </div>
          </div>

          <div class="card summary-card" *ngIf="summaryData()">
            <div class="summary-head">
              <span class="chip chip-teal">Module Summary</span>
              <span class="read-time">{{ summaryData()!.estimatedReadMinutes }} min read</span>
              <button class="btn-regen" (click)="clearSummary()">Regenerate</button>
            </div>
            <p class="summary-text">{{ summaryData()!.summary }}</p>
            <div class="key-points" *ngIf="summaryData()!.keyPoints?.length">
              <div class="kp-title">Key Points</div>
              <ul class="kp-list">
                <li *ngFor="let p of summaryData()!.keyPoints" class="kp-item">
                  <span class="kp-dot"></span>{{ p }}
                </li>
              </ul>
            </div>
            <div class="video-launch-row">
              <button class="btn-video"
                (click)="showVideo() ? showVideo.set(false) : onVideoScript(selectedModule()!)"
                [disabled]="videoLoading()">
                <span class="vl-spinner" *ngIf="videoLoading()"></span>
                <span *ngIf="!videoLoading() && !showVideo()">Explanatory Video</span>
                <span *ngIf="videoLoading()">Generating…</span>
                <span *ngIf="showVideo() && !videoLoading()">Close Video</span>
              </button>
            </div>
            <div class="video-player-wrap animate-fade" *ngIf="showVideo() && videoScript()">
              <app-video-explainer [script]="videoScript()!"></app-video-explainer>
            </div>
          </div>

          <div class="card tips-card">
            <app-section-header title="Preparation Tips" icon=""></app-section-header>
            <div class="tips-list">
              <div class="tip-item">
                <span class="tip-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </span>
                <span>Review the module content before starting to maximize your score.</span>
              </div>
              <div class="tip-item">
                <span class="tip-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                </span>
                <span>Questions are generated from the real content of the module.</span>
              </div>
              <div class="tip-item">
                <span class="tip-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </span>
                <span>Aim for 70% to validate your skills and unlock the module XP.</span>
              </div>
            </div>
          </div>
        </ng-container>
      </div>
    </div>
  </ng-container>

  <!-- ══ MODULE QUIZZES ══ -->
  <div class="animate-fade" *ngIf="viewState()==='MODULE_QUIZZES'">
    <button class="back-link" (click)="viewState.set('MODULE_LIST')">← Back to Modules</button>
    <div class="two-col">
      <div class="left-panel">
        <div class="panel-module-name">
          <span class="chip chip-teal">{{ selectedModule()?.category }}</span>
          <div class="pmn-title">{{ selectedModule()?.title }}</div>
        </div>
        <div class="tabs">
          <button class="tab" [class.active]="quizTab()==='history'" (click)="quizTab.set('history')">History ({{ pastAttempts().length }})</button>
          <button class="tab" [class.active]="quizTab()==='stats'"   (click)="quizTab.set('stats')">Statistics</button>
        </div>

        <div class="list" id="guide-quiz-history" *ngIf="quizTab()==='history'">
          <div class="empty" *ngIf="!pastAttempts().length">No attempts yet. Generate a quiz to get started.</div>
          <div class="attempt-card"
            *ngFor="let a of pastAttempts()"
            [class.selected]="selectedAttempt()?.id === a.id"
            (click)="selectAttemptInline(a)">
            <div class="ac-score" [class.good]="a.score >= 70" [class.bad]="a.score < 70">{{ a.score }}%</div>
            <div class="ac-body">
              <div class="ac-title">{{ a.questionsCount }} questions</div>

              <div class="ac-date">{{ a.date | date:'dd MMM yyyy · HH:mm' }}</div>
              <div class="ac-badges">
                <span class="badge" [class.badge-green]="a.score >= 70" [class.badge-red]="a.score < 70">
                  {{ a.score >= 70 ? 'Passed' : 'Failed' }}
                </span>
                <span class="badge badge-level">{{ a.level }}</span>
              </div>
            </div>
            <span class="ac-arrow">›</span>
          </div>
        </div>

        <div class="stats-detail" *ngIf="quizTab()==='stats'">
          <div class="sd-row"><span>Best Score</span><strong class="teal">{{ bestScore() }}%</strong></div>
          <div class="sd-row"><span>Average Score</span><strong>{{ avgScore() }}%</strong></div>
          <div class="sd-row"><span>Attempts</span><strong>{{ pastAttempts().length }}</strong></div>
          <div class="sd-row"><span>Pass Rate</span><strong class="teal">{{ successRate() }}%</strong></div>
        </div>

        <div class="panel-foot">
          <button class="btn btn-primary btn-full" (click)="viewState.set('QUIZ_SETUP')">New Quiz</button>
        </div>
      </div>

      <div class="right-panel">
        <div class="report-overlay animate-fade" *ngIf="showReport()">
          <app-quiz-evaluation-report
            [module]="reportModuleInfo()"
            [attempts]="reportAttempts()"
            [userId]="userId()"
            [moduleId]="selectedModule()?.id ?? 0"
            (close)="showReport.set(false)">
          </app-quiz-evaluation-report>
        </div>

         <!-- Anchor permanent pour le guide étape Rapport -->
        <div id="guide-rapport-btn" style="position:absolute;pointer-events:none;opacity:0;height:0"></div>
        <div class="correction-empty" *ngIf="!selectedAttempt() && !showReport()">
          <div class="ce-illustration">
            <div class="ce-circle">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
            </div>
            <div class="ce-lines">
              <div class="ce-line l1"></div><div class="ce-line l2"></div><div class="ce-line l3"></div>
            </div>
          </div>
          <h3 class="ce-title">Detailed Correction</h3>
          <p class="ce-sub">Select an attempt from the list<br>to view your correction.</p>
          <div class="ce-stats-preview" *ngIf="pastAttempts().length > 0">
            <div class="csp-item"><div class="csp-val">{{ pastAttempts().length }}</div><div class="csp-label">Quizzes</div></div>
            <div class="csp-sep"></div>
            <div class="csp-item"><div class="csp-val teal">{{ bestScore() }}%</div><div class="csp-label">Best</div></div>
            <div class="csp-sep"></div>
            <div class="csp-item"><div class="csp-val">{{ successRate() }}%</div><div class="csp-label">Pass Rate</div></div>
          </div>
          <button class="btn-report-ia" id="guide-rapport-btn" (click)="openReport()" [disabled]="pastAttempts().length === 0">
            <div class="bri-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </div>
            <div class="bri-body">
              <span class="bri-title">Performance Report</span>
              <span class="bri-sub">Badges · Stats · {{ pastAttempts().length }} quizzes analyzed</span>
            </div>
            <span class="bri-arrow">→</span>
          </button>
          <button class="btn btn-primary" style="margin-top:8px;width:100%;justify-content:center"
            (click)="viewState.set('QUIZ_SETUP')">New Quiz</button>
        </div>

        <!-- CORRECTION PANEL -->
        <div class="ri-panel animate-fade" id="guide-correction-panel" *ngIf="selectedAttempt() && !showReport()">
          <div class="ri-head">
            <div class="ri-score-ring">
              <svg width="68" height="68" viewBox="0 0 68 68">
                <circle cx="34" cy="34" r="28" fill="none" stroke="var(--color-border)" stroke-width="4"/>
                <circle cx="34" cy="34" r="28" fill="none"
                  [attr.stroke]="selectedAttempt()!.score >= 70 ? '#14B8A6' : '#E24B4A'"
                  stroke-width="4" stroke-linecap="round"
                  [attr.stroke-dasharray]="175.9"
                  [style.stroke-dashoffset]="175.9 - (selectedAttempt()!.score / 100 * 175.9)"
                  transform="rotate(-90 34 34)"
                  style="transition:stroke-dashoffset .8s ease"/>
              </svg>
              <span class="rsr-num" [class.rsr-good]="selectedAttempt()!.score >= 70" [class.rsr-bad]="selectedAttempt()!.score < 70">
                {{ selectedAttempt()!.score }}%
              </span>
            </div>
            <div class="ri-head-info">
              <div class="ri-head-title">Correction</div>
              <div class="ri-head-meta">{{ selectedAttempt()!.questionsCount }} questions · {{ selectedAttempt()!.level }}</div>
              <div class="ri-head-date">{{ selectedAttempt()!.date | date:'dd MMM yyyy at HH:mm' }}</div>
              <div class="ri-head-badges">
                <span class="ri-badge-good">{{ correctCount() }} correct</span>
                <span class="ri-badge-bad">{{ wrongCount() }} incorrect</span>
              </div>
            </div>
            <div class="ri-head-actions">
              <button class="btn-report-sm" (click)="openReport()">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                <span class="brs-label">Report</span>
              </button>
              <button class="ri-close" (click)="selectedAttempt.set(null)">✕</button>
            </div>
          </div>

          <div class="ri-progress-bar">
            <div class="ri-progress-fill"
              [style.width]="selectedAttempt()!.score + '%'"
              [class.ri-pf-good]="selectedAttempt()!.score >= 70"
              [class.ri-pf-bad]="selectedAttempt()!.score < 70"></div>
          </div>

          <div class="ri-nav-pills" *ngIf="selectedAttempt()!.questions?.length > 0">
            <span class="ri-nav-title">Navigate Questions</span>
            <div class="ri-pills-row">
              <button class="ri-pill"
                *ngFor="let q of selectedAttempt()!.questions; let i = index"
                [class.rp-correct]="q.isCorrect" [class.rp-wrong]="!q.isCorrect" [class.rp-active]="reviewIdx() === i"
                (click)="reviewIdx.set(i)">{{ i + 1 }}</button>
            </div>
          </div>

          <div class="ri-q-block" *ngIf="selectedAttempt()!.questions?.[reviewIdx()]">
            <div class="ri-q-toprow">
              <span class="ri-q-num">Q{{ reviewIdx() + 1 }} / {{ selectedAttempt()!.questions!.length }}</span>
              <span class="ri-q-badge" [class.rqb-ok]="selectedAttempt()!.questions![reviewIdx()]?.isCorrect" [class.rqb-ko]="!selectedAttempt()!.questions![reviewIdx()]?.isCorrect">
                {{ selectedAttempt()!.questions![reviewIdx()]?.isCorrect ? 'Correct' : 'Incorrect' }}
              </span>
            </div>
            <div class="ri-oral-box" *ngIf="selectedAttempt()!.questions![reviewIdx()]?.oralTranscript">
              <span class="rob-label">You said:</span>
              <span class="rob-text">"{{ selectedAttempt()!.questions![reviewIdx()].oralTranscript }}"</span>
              <span class="rob-score" *ngIf="selectedAttempt()!.questions![reviewIdx()].oralScore">{{ selectedAttempt()!.questions![reviewIdx()].oralScore }}%</span>
            </div>
            <div class="ri-q-text">{{ selectedAttempt()!.questions![reviewIdx()]?.content }}</div>
            <div class="ri-answers" *ngIf="selectedAttempt()!.questions![reviewIdx()]?.answers?.length > 0">
              <div class="ri-ans" *ngFor="let opt of selectedAttempt()!.questions![reviewIdx()].answers"
                [class.ra-correct]="opt.isCorrect"
                [class.ra-wrong]="opt.userSelected && !opt.isCorrect"
                [class.ra-neutral]="!opt.isCorrect && !opt.userSelected">
                <div class="ra-dot">
                  <span *ngIf="opt.isCorrect">✔</span>
                  <span *ngIf="opt.userSelected && !opt.isCorrect">✗</span>
                  <span *ngIf="!opt.isCorrect && !opt.userSelected">○</span>
                </div>
                <span class="ra-text">{{ opt.content }}</span>
                <span class="ra-tag" *ngIf="opt.isCorrect">Correct</span>
                <span class="ra-tag ra-tag-ko" *ngIf="opt.userSelected && !opt.isCorrect">Your answer</span>
              </div>
            </div>
            <div class="ri-expl-box" *ngIf="selectedAttempt()!.questions![reviewIdx()]?.explanation">
              <div class="reb-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <p class="reb-text">{{ selectedAttempt()!.questions![reviewIdx()].explanation }}</p>
            </div>
            <div class="ri-q-nav">
              <button class="btn btn-ghost btn-sm" (click)="reviewIdx.update(i=>i-1)" [disabled]="reviewIdx()===0">← Prev</button>
              <span class="ri-q-counter">{{ reviewIdx()+1 }} / {{ selectedAttempt()!.questions!.length }}</span>
              <button class="btn btn-primary btn-sm" (click)="reviewIdx.update(i=>i+1)" [disabled]="reviewIdx()===selectedAttempt()!.questions!.length-1">Next →</button>
            </div>
          </div>

          <div class="ri-no-details" *ngIf="!selectedAttempt()!.questions?.length">Details not available.</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ QUIZ SETUP + PLAY ══ -->
  <div class="animate-fade" *ngIf="viewState()==='QUIZ_SETUP'">
    <button class="back-link" (click)="viewState.set('MODULE_QUIZZES')">← Back to History</button>
    <div class="two-col">
      <div class="left-panel">
        <app-section-header title="Configure Quiz" icon="" subtitle="Customize your session"></app-section-header>

        <!-- LEVEL -->
        <div class="cfg-group" id="guide-level-btns">
          <label class="cfg-label">Difficulty Level</label>
          <div class="lvl-row">
            <button class="lvl-btn" [class.active]="config.level==='Beginner'"     (click)="config.level='Beginner'"     [disabled]="quizActive()">Beginner</button>
            <button class="lvl-btn" [class.active]="config.level==='Intermediate'" (click)="config.level='Intermediate'" [disabled]="quizActive()">Intermediate</button>
            <button class="lvl-btn" [class.active]="config.level==='Advanced'"     (click)="config.level='Advanced'"     [disabled]="quizActive()">Advanced</button>
          </div>
        </div>

        <div class="cfg-group">
          <label class="cfg-label">Number of Questions</label>
          <select [(ngModel)]="config.count" class="input" [disabled]="quizActive()">
            <option [ngValue]="5">5 questions (Quick)</option>
            <option [ngValue]="10">10 questions (Standard)</option>
            <option [ngValue]="20">20 questions (Exam)</option>
          </select>
        </div>

        <!-- MODE -->
        <div class="cfg-group" id="guide-mode-opts">
          <label class="cfg-label">Answer Mode</label>
          <div class="mode-opts">
            <label class="mode-opt" [class.active]="config.mode==='written'" [class.disabled]="quizActive()">
              <input type="radio" name="mode" value="written" [(ngModel)]="config.mode" style="display:none" [disabled]="quizActive()">
              <span class="mode-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </span>
              <span>Written Quiz </span>
            </label>
            <label class="mode-opt" [class.active]="config.mode==='oral'" [class.disabled]="quizActive()">
              <input type="radio" name="mode" value="oral" [(ngModel)]="config.mode" style="display:none" [disabled]="quizActive()">
              <span class="mode-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </span>
              <span>Oral Quiz — Vocal Tutor</span>
            </label>
          </div>
          <div class="oral-note" *ngIf="config.mode==='oral'">
            <strong>Vocal Tutor</strong>: asks questions verbally, listens to your answers, provides hints if you hesitate, and corrects vocally. Chrome / Edge required.
          </div>
        </div>

        <!-- ANTI-CHEAT -->
        <div class="anticheat-tip" id="guide-anticheat-tip">
          <div class="at-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div class="at-body">
            <div class="at-title">Anti-Cheat Policy</div>
            <div class="at-desc">Do not leave the window during the quiz. 2 violations = automatic 0% score.</div>
          </div>
        </div>

        <div class="quiz-running-panel" *ngIf="quizActive()">
          <div class="qrp-title">Quiz in Progress</div>
          <div class="qrp-row"><span>Questions</span><strong>{{ inlineAnsweredCount() }}/{{ inlineQuestions().length }}</strong></div>
          <div class="qrp-row"><span>Mode</span><strong>{{ config.mode==='oral' ? 'Oral' : 'Written' }}</strong></div>
          <div class="qrp-timer" *ngIf="config.mode==='written'">
            <span>Time Remaining</span>
            <strong [class.urgent]="timerSecs() < 20">{{ formatTimer(timerSecs()) }}</strong>
          </div>
          <div class="qrp-prog">
            <div class="qrp-bar"><div class="qrp-fill" [style.width]="inlineProgressPct()+'%'"></div></div>
            <span>{{ inlineProgressPct() }}%</span>
          </div>
          <button class="btn btn-ghost btn-sm btn-full" style="margin-top:12px" (click)="confirmEndInline()">End Quiz</button>
        </div>

        <!-- START BUTTON -->
        <div class="panel-foot" *ngIf="!quizActive()">
          <button class="btn btn-primary btn-full" id="guide-start-btn" (click)="generateAndStart()" [disabled]="loading()">
            {{ loading() ? 'Generating…' : 'Generate & Start Quiz' }}
          </button>
        </div>
      </div>

      <div class="right-panel">
        <ng-container *ngIf="!quizActive() && !loading()">
          <div class="card">
            <span class="chip chip-teal">Personalized Quiz</span>
            <h2 class="card-title">Quiz Configuration</h2>
            <p class="card-sub">For: <strong>{{ selectedModule()?.title }}</strong></p>
            <div class="stats-row">
              <div class="stat"><div class="sv">{{ config.count }}</div><div class="sl">Questions</div></div>
              <div class="stat"><div class="sv">{{ config.level }}</div><div class="sl">Level</div></div>
              <div class="stat"><div class="sv teal">+{{ config.count * 10 }} XP</div><div class="sl">To Earn</div></div>
            </div>
          </div>
          <div class="tips-card">
            <div class="tip"><span>Questions are generated from the real module content.</span></div>
            <div class="tip" *ngIf="config.mode==='written'"><span>3 types: single choice, multiple choice, true/false with timer.</span></div>
            <div class="tip" *ngIf="config.mode==='oral'"><span>Vocal Tutor: speaks, listens, provides hints if you hesitate, corrects vocally.</span></div>
          </div>
        </ng-container>

        <div class="loading-card" *ngIf="loading()">
          <div class="lc-spinner"></div>
          <div class="lc-text">{{ loadingMsg() }}</div>
          <div class="lc-sub">Generating questions from module content…</div>
        </div>

        <!-- WRITTEN QUIZ -->
        <div class="inline-quiz-card" *ngIf="quizActive() && config.mode==='written' && inlineCurrentQ()">
          <div class="iq-topbar">
            <div class="iq-left">
              <span class="iq-counter">Q{{ inlineIdx()+1 }}/{{ inlineQuestions().length }}</span>
              <span [class]="getTypeBadge(inlineCurrentQ()?.type)">{{ getTypeLabel(inlineCurrentQ()?.type) }}</span>
            </div>
            <div class="iq-timer-badge" [class.urgent]="timerSecs()<15">{{ formatTimer(timerSecs()) }}</div>
          </div>
          <div class="iq-prog-track"><div class="iq-prog-fill" [style.width]="inlineProgressPct()+'%'"></div></div>
          <div class="iq-pills">
            <div class="iq-pill" *ngFor="let q of inlineQuestions(); let i=index"
              [class.iq-pill-active]="inlineIdx()===i" [class.iq-pill-done]="inlineAnsweredQ(q.id)"
              (click)="inlineIdx.set(i)">{{ i+1 }}</div>
          </div>
          <div class="iq-question">{{ inlineCurrentQ()?.content }}</div>
          <div class="iq-answers" *ngIf="inlineCurrentQ()?.type==='SINGLE_CHOICE'||!inlineCurrentQ()?.type">
            <div class="iq-answer" *ngFor="let opt of inlineCurrentQ()?.answers; let i=index"
              [class.iq-ans-sel]="opt?.id && inlinePicked(inlineCurrentQ()?.id, opt.id)"
              (click)="opt?.id && inlineSelect(inlineCurrentQ()?.id, opt.id)">
              <div class="iq-letter">{{ 'ABCD'[i] }}</div>
              <span class="iq-ans-txt">{{ opt.content }}</span>
              <div class="iq-check-mark" *ngIf="opt?.id && inlinePicked(inlineCurrentQ()?.id, opt.id)">✔</div>
            </div>
          </div>
          <div class="iq-answers" *ngIf="inlineCurrentQ()?.type==='MULTIPLE_CHOICE'">
            <div class="iq-multi-hint">Select all correct answers</div>
            <div class="iq-answer iq-ans-multi" *ngFor="let opt of inlineCurrentQ()?.answers"
              [class.iq-ans-sel]="opt?.id && inlinePicked(inlineCurrentQ()?.id, opt.id)"
              (click)="opt?.id && inlineToggle(inlineCurrentQ()?.id, opt.id)">
              <div class="iq-checkbox" [class.checked]="opt?.id && inlinePicked(inlineCurrentQ()?.id, opt.id)">
                <span *ngIf="opt?.id && inlinePicked(inlineCurrentQ()?.id, opt.id)">✔</span>
              </div>
              <span class="iq-ans-txt">{{ opt.content }}</span>
            </div>
          </div>
          <div class="iq-tf-row" *ngIf="inlineCurrentQ()?.type==='TRUE_FALSE'">
            <div class="iq-tf" *ngFor="let opt of inlineCurrentQ()?.answers"
              [class.iq-tf-true]="opt?.id && inlinePicked(inlineCurrentQ()?.id,opt.id)&&(opt.content==='Vrai'||opt.content==='True')"
              [class.iq-tf-false]="opt?.id && inlinePicked(inlineCurrentQ()?.id,opt.id)&&(opt.content==='Faux'||opt.content==='False')"
              [class.iq-ans-sel]="opt?.id && inlinePicked(inlineCurrentQ()?.id, opt.id)"
              (click)="opt?.id && inlineSelect(inlineCurrentQ()?.id, opt.id)">
              <span class="iq-tf-icon">{{ (opt.content==='Vrai'||opt.content==='True') ? 'True' : 'False' }}</span>
            </div>
          </div>
          <div class="iq-nav">
            <button class="btn btn-ghost btn-sm" (click)="inlinePrev()" [disabled]="inlineIdx()===0">← Prev</button>
            <span class="iq-answered-info">{{ inlineAnsweredCount() }}/{{ inlineQuestions().length }} answered</span>
            <button class="btn btn-primary btn-sm" *ngIf="inlineIdx()<inlineQuestions().length-1"
              (click)="inlineNext()" [disabled]="!inlineAnsweredQ(inlineCurrentQ()?.id)">Next →</button>
            <button class="btn btn-primary btn-sm" *ngIf="inlineIdx()===inlineQuestions().length-1"
              (click)="submitInlineQuiz()" [disabled]="!inlineAnsweredCount()">Submit</button>
          </div>
        </div>

        <!-- ORAL QUIZ -->
        <div class="oral-quiz-wrap" *ngIf="quizActive() && config.mode==='oral' && inlineCurrentQ()">
          <app-oral-quiz
            [question]="inlineCurrentQ()!"
            [questionNumber]="oralQNum"
            [totalQuestions]="oralTotal"
            (onNext)="handleOralResult($event)">
          </app-oral-quiz>
        </div>
      </div>
    </div>
  </div>

</div>
  `,
  styles: [`
/* ═══════════════════════════════════════════════════════════
   QUIZ ASSESSMENT — REFINED TEAL DESIGN
   ═══════════════════════════════════════════════════════════ */

/* Palette */
:host {
  --t50:  #e0f5f5;
  --t100: #9FE1CB;
  --t300: #2DD4BF;
  --t400: #14B8A6;
  --t500: #0D9488;
  --t600: #0F766E;
  --t700: #0A5E58;
  --r50:  #FCEBEB;
  --r100: #F7C1C1;
  --r300: #F09595;
  --r400: #E24B4A;
  --r600: #A32D2D;
}

.qp { display:flex; flex-direction:column; gap:24px; position:relative; }
.animate-fade  { animation:fadeIn .3s ease-out; }
.animate-scale { animation:scaleIn .35s cubic-bezier(0.34,1.56,0.64,1); }
@keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
@keyframes scaleIn { from{transform:scale(0.88);opacity:0} to{transform:scale(1);opacity:1} }

/* ══ GUIDE ══ */
.guide-backdrop {
  position:fixed; inset:0; z-index:900;
  background:rgba(0,0,0,0.5); backdrop-filter:blur(3px);
  animation:fadeIn .3s ease-out;
}
.guide-spotlight {
  position:relative; z-index:905; border-radius:10px;
  box-shadow:0 0 0 3px var(--t400), 0 0 0 7px rgba(20,184,166,.18), 0 0 0 9999px rgba(0,0,0,.5) !important;
}
.guide-tooltip {
  position:fixed; z-index:910; background:#fff;
  border:1px solid var(--t100); border-radius:14px;
  padding:18px 20px; width:272px;
  box-shadow:0 12px 40px rgba(20,184,166,.15), 0 3px 12px rgba(0,0,0,.07);
}
.gt-arrow-tri { position:absolute; width:0; height:0; pointer-events:none; }
.gt-arrow-right  { top:26px; left:-9px; border-top:7px solid transparent; border-bottom:7px solid transparent; border-right:9px solid var(--t100); }
.gt-arrow-left   { top:26px; right:-9px; border-top:7px solid transparent; border-bottom:7px solid transparent; border-left:9px solid var(--t100); }
.gt-arrow-bottom { top:-9px; left:50%; transform:translateX(-50%); border-left:7px solid transparent; border-right:7px solid transparent; border-bottom:9px solid var(--t100); }
.gt-arrow-top    { bottom:-9px; left:50%; transform:translateX(-50%); border-left:7px solid transparent; border-right:7px solid transparent; border-top:9px solid var(--t100); }
.gt-tag { display:flex; align-items:center; gap:5px; font-size:.6rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--t600); margin-bottom:7px; }
.gt-tag-dot { width:5px; height:5px; border-radius:50%; background:var(--t400); }
.gt-title { font-size:.9rem; font-weight:700; color:var(--t700); margin-bottom:5px; }
.gt-desc  { font-size:.78rem; color:#475569; line-height:1.6; margin:0 0 12px; }
.gt-prog { display:flex; align-items:center; gap:7px; margin-bottom:10px; }
.gt-prog-track { flex:1; height:2.5px; background:var(--t50); border-radius:999px; overflow:hidden; }
.gt-prog-fill  { height:100%; background:var(--t400); border-radius:999px; transition:width .4s ease; }
.gt-prog-label { font-size:.62rem; color:var(--t600); font-weight:600; white-space:nowrap; }
.gt-dots { display:flex; gap:4px; margin-bottom:12px; }
.gt-dot  { width:4px; height:4px; border-radius:50%; background:var(--t50); transition:all .2s; }
.gt-dot.active { background:var(--t400); width:12px; border-radius:2px; }
.gt-actions { display:flex; justify-content:space-between; gap:8px; }
.gt-skip { padding:6px 12px; border-radius:7px; border:1px solid #e2e8f0; background:none; color:#64748b; font-size:.76rem; font-weight:600; cursor:pointer; }
.gt-next { display:flex; align-items:center; gap:5px; padding:6px 14px; border-radius:7px; border:none; background:var(--t400); color:white; font-size:.76rem; font-weight:700; cursor:pointer; }
.gt-next:hover { background:var(--t500); }
.gt-next-arr { font-size:.88rem; }

/* Strip */
.guide-strip {
  position:fixed; bottom:0; left:0; right:0; z-index:920;
  background:rgba(10,22,18,0.92); backdrop-filter:blur(10px);
  border-top:1px solid rgba(94,234,212,.15);
  padding:10px 24px; display:flex; align-items:center; justify-content:space-between; gap:12px;
}
.gs-steps { display:flex; align-items:center; gap:5px; flex-wrap:wrap; }
.gs-pill  { display:flex; align-items:center; gap:5px; padding:5px 12px; border-radius:999px; font-size:.7rem; font-weight:500; cursor:pointer; border:1px solid transparent; transition:all .2s; flex-shrink:0; }
.gs-done  { background:rgba(20,184,166,.1); border-color:rgba(94,234,212,.3); color:#5EEAD4; }
.gs-active{ background:var(--t400); color:#fff; border-color:var(--t400); }
.gs-todo  { background:rgba(255,255,255,.04); border-color:rgba(255,255,255,.08); color:rgba(255,255,255,.35); }
.gs-num { width:15px; height:15px; border-radius:50%; font-size:.58rem; display:flex; align-items:center; justify-content:center; }
.gs-label { font-size:.68rem; }
.gs-close { background:none; border:1px solid rgba(255,255,255,.12); border-radius:999px; color:rgba(255,255,255,.4); padding:5px 13px; font-size:.7rem; cursor:pointer; flex-shrink:0; }
.gs-close:hover { color:rgba(255,255,255,.65); }

/* ══ CHEAT POPUP ══ */
.cheat-backdrop { position:fixed; inset:0; z-index:99999; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.6); backdrop-filter:blur(8px); }
.cheat-popup { background:#fff; max-width:400px; width:92%; border-radius:18px; border:1px solid var(--t100); box-shadow:0 20px 70px rgba(20,184,166,.2); display:flex; flex-direction:column; overflow:hidden; }
.cp-header { background:var(--t600); padding:13px 18px; display:flex; align-items:center; justify-content:space-between; }
.cp-h-left { display:flex; align-items:center; gap:10px; }
.cp-h-icon { width:30px; height:30px; border-radius:50%; background:rgba(255,255,255,.15); display:flex; align-items:center; justify-content:center; color:#fff; }
.cp-h-title { font-size:.86rem; font-weight:700; color:#fff; }
.cp-h-sub   { font-size:.66rem; color:rgba(255,255,255,.6); margin-top:1px; }
.cp-h-badge { font-size:.58rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; background:rgba(255,255,255,.13); color:#CCFBF1; padding:3px 9px; border-radius:999px; border:1px solid rgba(255,255,255,.18); }
.cp-body { padding:16px 18px; display:flex; flex-direction:column; gap:11px; }
.cp-score-row { display:flex; align-items:center; gap:13px; }
.cp-ring-wrap { position:relative; width:64px; height:64px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.cp-ring-wrap svg { position:absolute; inset:0; }
.cp-ring-num { position:absolute; font-size:.95rem; font-weight:800; color:var(--t600); }
.cp-score-title { font-size:.9rem; font-weight:700; color:var(--t600); }
.cp-score-sub   { font-size:.7rem; color:var(--t500); margin-top:2px; }
.cp-timeline { display:flex; flex-direction:column; gap:0; }
.cp-tl-item { display:flex; align-items:center; gap:9px; padding:9px 11px; border-radius:8px; border:1px solid transparent; }
.cp-tl-done    { background:var(--t50); border-color:var(--t100); }
.cp-tl-current { background:#F0FDFB; border-color:var(--t300); }
.cp-tl-connector { width:2px; height:5px; background:linear-gradient(var(--t100),var(--t300)); margin:0 auto; margin-left:19px; }
.cp-tl-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.cp-tl-dot-ok  { background:var(--t400); }
.cp-tl-dot-bad { background:var(--t600); border:2px solid var(--t300); }
.cp-tl-content { flex:1; display:flex; flex-direction:column; gap:1px; }
.cp-tl-label   { font-size:.78rem; font-weight:700; color:#1e293b; }
.cp-tl-desc    { font-size:.66rem; color:#64748b; }
.cp-tl-tag { font-size:.58rem; font-weight:700; padding:2px 8px; border-radius:999px; white-space:nowrap; }
.cp-tag-ok  { background:var(--t50); color:var(--t600); border:1px solid var(--t100); }
.cp-tag-bad { background:var(--t500); color:#fff; }
.cp-note { background:#F0FDFB; border:1px solid var(--t100); border-radius:8px; padding:9px 13px; font-size:.76rem; color:var(--t600); line-height:1.6; }
.cp-note strong { color:var(--t500); }
.cp-countdown { display:flex; align-items:center; gap:11px; background:var(--t50); border:1px solid var(--t100); border-radius:8px; padding:9px 13px; }
.cp-cd-ring { position:relative; width:44px; height:44px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.cp-cd-ring svg { position:absolute; inset:0; }
.cp-cd-num { position:absolute; font-size:.86rem; font-weight:800; color:var(--t600); }
.cp-cd-label { font-size:.73rem; color:var(--t500); line-height:1.5; }
.cp-cd-label strong { color:var(--t600); font-weight:700; display:block; font-size:.78rem; }
.cp-cta { width:100%; padding:12px 18px; border:none; border-radius:9px; background:var(--t400); color:white; font-size:.86rem; font-weight:700; cursor:pointer; transition:all .2s; }
.cp-cta:hover { background:var(--t500); }
.cp-footer { padding:9px 18px; border-top:1px solid var(--t50); display:flex; align-items:center; gap:6px; background:#F0FDFB; }
.cp-rec-dot { width:5px; height:5px; border-radius:50%; background:var(--t400); animation:recBlink 1.2s steps(1) infinite; flex-shrink:0; }
@keyframes recBlink { 0%,100%{opacity:1} 50%{opacity:.2} }
.cp-footer-text { font-size:.6rem; color:var(--t500); }

/* ══ HEADER ══ */
.page-header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
.header-right { display:flex; align-items:center; gap:8px; }
.guide-launch-btn { display:inline-flex; align-items:center; gap:6px; padding:7px 14px; background:var(--t50); color:var(--t600); border:1px solid var(--t100); border-radius:8px; font-size:.76rem; font-weight:600; cursor:pointer; transition:all .15s; }
.guide-launch-btn:hover { background:var(--t100); }

/* ══ ANTI-CHEAT TIP ══ */
.anticheat-tip { display:flex; align-items:flex-start; gap:10px; background:var(--t50); border:1px solid var(--t100); border-radius:9px; padding:11px 13px; margin-bottom:14px; }
.at-icon { color:var(--t500); flex-shrink:0; margin-top:1px; }
.at-title { font-size:.78rem; font-weight:700; color:var(--t600); }
.at-desc  { font-size:.7rem; color:var(--t500); margin-top:2px; line-height:1.5; }

/* ══ LAYOUT ══ */
.banner { border-radius:8px; padding:11px 15px; font-size:.83rem; border:1px solid; margin-bottom:4px; }
.banner-load { background:var(--neutral-50,#f8fafc); border-color:var(--color-border,#e2e8f0); color:var(--color-text-muted,#64748b); }
.banner-err  { background:#FCEBEB; border-color:var(--r100); color:var(--r600); }
.banner-ok   { background:var(--t50); border-color:var(--t100); color:var(--t600); }
.back-link { background:none; border:none; color:var(--color-text-muted,#64748b); cursor:pointer; margin-bottom:18px; font-weight:500; display:inline-flex; align-items:center; gap:5px; font-size:.83rem; }
.back-link:hover { color:var(--color-text,#1e293b); }
.two-col { display:grid; grid-template-columns:340px 1fr; gap:22px; align-items:start; }
.left-panel { background:var(--color-surface,#fff); border:1px solid var(--color-border,#e2e8f0); border-radius:12px; padding:18px; display:flex; flex-direction:column; gap:0; position:sticky; top:20px; }
.right-panel { display:flex; flex-direction:column; gap:14px; }
.tabs { display:flex; border-bottom:1px solid var(--color-border,#e2e8f0); margin-bottom:14px; }
.tab { padding:7px 14px; font-size:.83rem; font-weight:500; background:none; border:none; border-bottom:2px solid transparent; cursor:pointer; color:var(--color-text-muted,#64748b); margin-bottom:-1px; transition:all .18s; }
.tab.active { color:var(--t600); border-bottom-color:var(--t400); }
.list { display:flex; flex-direction:column; gap:9px; min-height:100px; }
.empty { text-align:center; padding:28px 14px; color:var(--color-text-muted,#94a3b8); font-size:.83rem; }

/* Module cards */
.module-card { padding:13px; border:1px solid var(--color-border,#e2e8f0); border-radius:9px; cursor:pointer; transition:all .18s; }
.module-card:hover { border-color:var(--t300); background:var(--t50); }
.module-card.selected { border-color:var(--t400); background:var(--t50); box-shadow:0 0 0 3px rgba(20,184,166,.08); }
.mc-cat { margin-bottom:5px; }
.mc-title { font-size:.88rem; font-weight:600; color:var(--color-text,#1e293b); margin-bottom:3px; }
.mc-desc  { font-size:.73rem; color:var(--color-text-muted,#94a3b8); }
.mc-xp    { font-size:.7rem; color:var(--t600); margin-top:5px; font-weight:600; }

/* Pagination */
.pagination { display:flex; align-items:center; justify-content:center; gap:5px; padding:10px 0 4px; }
.pg-btn { width:30px; height:30px; border-radius:7px; border:1px solid var(--color-border,#e2e8f0); background:var(--color-surface,#fff); cursor:pointer; font-size:.9rem; color:var(--color-text-muted,#94a3b8); display:flex; align-items:center; justify-content:center; transition:all .15s; }
.pg-btn:hover:not(:disabled) { border-color:var(--t400); color:var(--t600); }
.pg-btn:disabled { opacity:.35; cursor:not-allowed; }
.pg-num { min-width:30px; height:30px; border-radius:7px; border:1px solid var(--color-border,#e2e8f0); background:var(--color-surface,#fff); cursor:pointer; font-size:.75rem; font-weight:600; color:var(--color-text-muted,#94a3b8); display:flex; align-items:center; justify-content:center; transition:all .15s; padding:0 4px; }
.pg-num:hover { border-color:var(--t300); color:var(--t600); }
.pg-num.pg-active { background:var(--t500,#14b8a6); border-color:var(--t500,#14b8a6); color:#fff; }

/* Attempt cards */
.attempt-card { display:flex; align-items:center; gap:11px; padding:13px; border:1px solid var(--color-border,#e2e8f0); border-radius:9px; cursor:pointer; transition:all .18s; background:var(--color-surface,#fff); }
.attempt-card:hover { border-color:var(--t300); background:var(--t50); transform:translateX(2px); }
.attempt-card.selected { border-color:var(--t400); background:var(--t50); box-shadow:0 0 0 3px rgba(20,184,166,.08); }
.ac-score { width:46px; height:46px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.7rem; border:2px solid; flex-shrink:0; }
.ac-score.good { border-color:var(--t400); color:var(--t500); background:var(--t50); }
.ac-score.bad  { border-color:var(--r300); color:var(--r400); background:var(--r50); }
.ac-body { flex:1; }
.ac-title { font-size:.83rem; font-weight:600; color:var(--color-text,#1e293b); }
.ac-date  { font-size:.7rem; color:var(--color-text-muted,#94a3b8); margin:2px 0 5px; }
.ac-badges { display:flex; gap:5px; flex-wrap:wrap; }
.ac-arrow { font-size:1.15rem; color:var(--color-text-muted,#94a3b8); }
.badge { font-size:.6rem; font-weight:700; padding:2px 7px; border-radius:999px; }
.badge-green { background:var(--t50); color:var(--t600); border:1px solid var(--t100); }
.badge-red   { background:var(--r50); color:var(--r600); border:1px solid var(--r100); }
.badge-level { background:var(--t50); color:var(--t700); border:1px solid var(--t100); }

/* Cards */
.card { background:var(--color-surface,#fff); border:1px solid var(--color-border,#e2e8f0); border-radius:12px; padding:18px; }
.card-head { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; margin-bottom:14px; }
.card-title { font-size:1.15rem; font-weight:700; margin:5px 0 3px; }
.card-sub   { font-size:.83rem; color:var(--color-text-muted,#64748b); margin:0; }
.card-actions { display:flex; flex-direction:column; gap:7px; flex-shrink:0; }
.stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; background:#f8fafc; border-radius:8px; padding:13px; }
.stat { text-align:center; }
.sv { font-size:1.05rem; font-weight:700; }
.sv.teal { color:var(--t600); }
.sl { font-size:.63rem; color:var(--color-text-muted,#94a3b8); margin-top:1px; }

/* Summary */
.summary-card { background:var(--color-surface,#fff); border:1px solid var(--color-border,#e2e8f0); border-radius:12px; padding:18px; }
.summary-head { display:flex; align-items:center; gap:9px; margin-bottom:13px; }
.read-time { font-size:.7rem; color:var(--color-text-muted,#94a3b8); }
.btn-regen { background:none; border:none; cursor:pointer; color:var(--color-text-muted,#94a3b8); margin-left:auto; font-size:.78rem; font-weight:500; text-decoration:underline; }
.summary-text { font-size:.83rem; color:var(--color-text,#1e293b); line-height:1.65; white-space:pre-line; margin:0 0 13px; }
.key-points { background:var(--t50); border-radius:8px; padding:13px; }
.kp-title { font-size:.62rem; font-weight:700; color:var(--t400); text-transform:uppercase; letter-spacing:.08em; margin-bottom:9px; }
.kp-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:5px; }
.kp-item { display:flex; align-items:flex-start; gap:7px; font-size:.83rem; color:var(--t600); }
.kp-dot  { width:5px; height:5px; border-radius:50%; background:var(--t400); flex-shrink:0; margin-top:6px; }
.video-launch-row { margin-top:14px; padding-top:14px; border-top:1px solid var(--color-border,#e2e8f0); }
.btn-video { display:inline-flex; align-items:center; gap:7px; background:#0f172a; color:#93c5fd; border:1px solid #1e3a5f; border-radius:7px; padding:9px 16px; font-size:.83rem; font-weight:600; cursor:pointer; transition:all .18s; }
.btn-video:hover:not(:disabled) { background:#1e293b; }
.btn-video:disabled { opacity:.6; cursor:not-allowed; }
.vl-spinner { display:inline-block; width:11px; height:11px; border:2px solid #1e3a5f; border-top-color:#93c5fd; border-radius:50%; animation:spin .7s linear infinite; }
@keyframes spin { to{transform:rotate(360deg)} }
.video-player-wrap { margin-top:14px; border-radius:10px; overflow:hidden; }

/* Tips */
.tips-card { background:var(--color-surface,#fff); border:1px solid var(--color-border,#e2e8f0); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:9px; }
.tips-list { display:flex; flex-direction:column; gap:9px; }
.tip-item { display:flex; gap:9px; font-size:.83rem; color:var(--color-text-muted,#64748b); align-items:flex-start; line-height:1.5; }
.tip-icon { color:var(--t500); flex-shrink:0; margin-top:1px; }

/* Panel module name */
.panel-module-name { margin-bottom:13px; }
.pmn-title { font-size:.92rem; font-weight:700; margin-top:5px; }
.panel-foot { margin-top:18px; padding-top:14px; border-top:1px solid var(--color-border,#e2e8f0); }
.stats-detail { padding:6px 0; display:flex; flex-direction:column; gap:9px; }
.sd-row { display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid var(--color-border,#e2e8f0); font-size:.83rem; }
.sd-row span { color:var(--color-text-muted,#64748b); }
.sd-row strong.teal { color:var(--t600); }

/* Report */
.report-overlay { width:100%; }
.btn-report-ia { display:flex; align-items:center; gap:11px; width:100%; padding:13px 15px; margin-top:13px; background:var(--color-surface,#fff); border:1px solid var(--t100); border-radius:11px; cursor:pointer; text-align:left; transition:all .18s; }
.btn-report-ia:hover:not(:disabled) { background:var(--t50); border-color:var(--t300); }
.btn-report-ia:disabled { opacity:.4; cursor:not-allowed; }
.bri-icon { width:36px; height:36px; border-radius:8px; flex-shrink:0; background:var(--t400); color:white; display:flex; align-items:center; justify-content:center; }
.bri-body { flex:1; display:flex; flex-direction:column; gap:2px; }
.bri-title { font-size:.86rem; font-weight:700; color:var(--color-text,#1e293b); }
.bri-sub   { font-size:.68rem; color:var(--color-text-muted,#94a3b8); }
.bri-arrow { font-size:.95rem; color:var(--t400); font-weight:700; }
.btn-report-sm { display:inline-flex; align-items:center; gap:5px; background:var(--t50); border:1px solid var(--t100); color:var(--t600); border-radius:7px; padding:5px 9px; font-size:.76rem; font-weight:600; cursor:pointer; }
.brs-label { font-size:.7rem; }

/* Empty state */
.correction-empty { background:var(--color-surface,#fff); border:1px solid var(--color-border,#e2e8f0); border-radius:14px; padding:36px 26px; display:flex; flex-direction:column; align-items:center; gap:13px; text-align:center; }
.ce-circle { width:72px; height:72px; border-radius:50%; background:var(--t50); border:1.5px solid var(--t100); display:flex; align-items:center; justify-content:center; color:var(--t500); margin:0 auto 8px; }
.ce-lines { display:flex; flex-direction:column; gap:5px; align-items:center; }
.ce-line  { height:3px; border-radius:2px; background:var(--t100); }
.l1{width:72px} .l2{width:54px;opacity:.6} .l3{width:36px;opacity:.35}
.ce-title { font-size:1.05rem; font-weight:700; color:var(--color-text,#1e293b); margin:0; }
.ce-sub   { font-size:.83rem; color:var(--color-text-muted,#64748b); line-height:1.6; margin:0; }
.ce-stats-preview { display:flex; align-items:center; background:var(--t50); border:1px solid var(--t100); border-radius:11px; padding:13px 18px; width:100%; }
.csp-item  { flex:1; text-align:center; }
.csp-val   { font-size:1.25rem; font-weight:700; color:var(--color-text,#1e293b); }
.csp-val.teal { color:var(--t400); }
.csp-label { font-size:.62rem; color:var(--t500); margin-top:2px; }
.csp-sep   { width:1px; height:32px; background:var(--t100); flex-shrink:0; }

/* ══ CORRECTION PANEL ══ */
.ri-panel  { display:flex; flex-direction:column; gap:13px; }
.ri-head   { display:flex; align-items:center; gap:14px; background:var(--color-surface,#fff); border:1px solid var(--color-border,#e2e8f0); border-radius:13px; padding:15px; }
.ri-score-ring { position:relative; width:68px; height:68px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.rsr-num  { position:absolute; font-size:.83rem; font-weight:800; }
.rsr-good { color:var(--t400); }
.rsr-bad  { color:var(--r400); }
.ri-head-info  { flex:1; }
.ri-head-title { font-size:.92rem; font-weight:700; color:var(--color-text,#1e293b); }
.ri-head-meta,.ri-head-date { font-size:.76rem; color:var(--color-text-muted,#94a3b8); }
.ri-head-badges { display:flex; gap:5px; margin-top:5px; }
.ri-badge-good { font-size:.63rem; font-weight:700; background:var(--t50); color:var(--t600); padding:2px 7px; border-radius:999px; border:1px solid var(--t100); }
.ri-badge-bad  { font-size:.63rem; font-weight:700; background:var(--r50); color:var(--r600); padding:2px 7px; border-radius:999px; border:1px solid var(--r100); }
.ri-head-actions { display:flex; align-items:center; gap:5px; }
.ri-close  { background:none; border:none; cursor:pointer; color:var(--color-text-muted,#94a3b8); font-size:.95rem; padding:3px 7px; }

/* Progress bar */
.ri-progress-bar  { height:3px; background:#f1f5f9; border-radius:999px; overflow:hidden; }
.ri-progress-fill { height:100%; border-radius:999px; transition:width .8s ease; }
.ri-pf-good { background:var(--t400); }
.ri-pf-bad  { background:var(--r300); }

/* Nav pills */
.ri-nav-pills { display:flex; flex-direction:column; gap:7px; }
.ri-nav-title { font-size:.62rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--color-text-muted,#94a3b8); }
.ri-pills-row { display:flex; flex-wrap:wrap; gap:4px; }
.ri-pill  { width:29px; height:29px; border-radius:50%; border:1.5px solid var(--color-border,#e2e8f0); background:#f8fafc; font-size:.68rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; color:var(--color-text-muted,#94a3b8); }
.rp-correct { border-color:var(--t400); background:var(--t50); color:var(--t600); }
.rp-wrong   { border-color:var(--r300); background:var(--r50); color:var(--r400); }
.rp-active  { box-shadow:0 0 0 3px rgba(20,184,166,.2); transform:scale(1.1); }

/* Question block */
.ri-q-block { background:var(--color-surface,#fff); border:1px solid var(--color-border,#e2e8f0); border-radius:13px; padding:16px; display:flex; flex-direction:column; gap:11px; }
.ri-q-toprow { display:flex; justify-content:space-between; align-items:center; }
.ri-q-num   { font-size:.7rem; font-weight:600; color:var(--color-text-muted,#94a3b8); }
.ri-q-badge { font-size:.7rem; font-weight:700; padding:3px 9px; border-radius:6px; }
.rqb-ok { background:var(--t50); color:var(--t600); border:1px solid var(--t100); }
.rqb-ko { background:var(--r50); color:var(--r600); border:1px solid var(--r100); }

/* Oral box */
.ri-oral-box { display:flex; align-items:center; gap:7px; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:7px; padding:9px 13px; font-size:.8rem; }
.rob-label { font-size:.6rem; font-weight:700; text-transform:uppercase; color:#94a3b8; letter-spacing:.05em; flex-shrink:0; }
.rob-text  { font-style:italic; color:#475569; flex:1; }
.rob-score { font-weight:700; color:var(--t400); }

.ri-q-text { font-size:.88rem; font-weight:600; color:var(--color-text,#1e293b); line-height:1.5; background:#f8fafc; border-left:3px solid var(--t400); padding:11px 13px; border-radius:0 7px 7px 0; }

/* Answers in correction */
.ri-answers { display:flex; flex-direction:column; gap:5px; }
.ri-ans { display:flex; align-items:center; gap:9px; padding:9px 13px; border-radius:7px; border:1.5px solid; font-size:.83rem; }
.ra-correct { border-color:var(--t300); background:var(--t50); }
.ra-wrong   { border-color:var(--r300); background:var(--r50); }
.ra-neutral { border-color:#e2e8f0; background:#f8fafc; opacity:.75; }
.ra-dot { width:19px; height:19px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; flex-shrink:0; }
.ra-correct .ra-dot { background:var(--t400); color:white; }
.ra-wrong   .ra-dot { background:var(--r300); color:white; }
.ra-neutral .ra-dot { background:#e2e8f0; color:#94a3b8; }
.ra-text { flex:1; font-weight:500; }
.ra-correct .ra-text { color:var(--t700); }
.ra-wrong   .ra-text { color:var(--r600); }
.ra-tag    { font-size:.58rem; font-weight:700; padding:2px 7px; border-radius:999px; background:var(--t50); color:var(--t600); border:1px solid var(--t100); }
.ra-tag-ko { background:var(--r50); color:var(--r600); border-color:var(--r100); }

/* Explanation */
.ri-expl-box { display:flex; gap:7px; background:#f0f9ff; border:1px solid #bae6fd; border-radius:7px; padding:11px; }
.reb-icon { color:#0284c7; flex-shrink:0; margin-top:1px; }
.reb-text { font-size:.8rem; color:#0c4a6e; line-height:1.5; margin:0; }
.ri-q-nav { display:flex; justify-content:space-between; align-items:center; padding-top:11px; border-top:1px solid var(--color-border,#e2e8f0); }
.ri-q-counter { font-size:.7rem; color:var(--color-text-muted,#94a3b8); }
.ri-no-details { font-size:.83rem; color:var(--color-text-muted,#94a3b8); padding:14px; text-align:center; }

/* ══ QUIZ SETUP ══ */
.cfg-group { margin-bottom:18px; }
.cfg-label { display:block; font-size:.83rem; font-weight:600; color:var(--color-text-muted,#64748b); margin-bottom:9px; }
.input { width:100%; padding:9px 13px; border:1px solid var(--color-border,#e2e8f0); border-radius:7px; font-size:.83rem; background:var(--color-surface,#fff); color:var(--color-text,#1e293b); }
.lvl-row { display:flex; gap:5px; }
.lvl-btn { flex:1; padding:9px; border-radius:7px; border:1px solid var(--color-border,#e2e8f0); background:#f8fafc; font-size:.8rem; font-weight:500; cursor:pointer; transition:all .18s; }
.lvl-btn.active  { border-color:var(--t400); background:var(--t50); color:var(--t600); font-weight:700; }
.lvl-btn:disabled{ opacity:.5; cursor:not-allowed; }
.mode-opts { display:flex; flex-direction:column; gap:7px; }
.mode-opt { display:flex; align-items:center; gap:9px; padding:11px 14px; border:1px solid var(--color-border,#e2e8f0); border-radius:7px; cursor:pointer; background:#f8fafc; transition:all .18s; font-size:.83rem; font-weight:500; }
.mode-opt.active   { border-color:var(--t400); background:var(--t50); color:var(--t600); }
.mode-opt.disabled { opacity:.5; cursor:not-allowed; }
.mode-icon { color:var(--t500); }
.oral-note { font-size:.73rem; color:#1e40af; background:#eff6ff; padding:9px 13px; border-radius:7px; border:1px solid #bfdbfe; margin-top:7px; line-height:1.5; }

/* Quiz running panel */
.quiz-running-panel { background:var(--t50); border:1px solid var(--t100); border-radius:9px; padding:13px; margin-top:14px; }
.qrp-title { font-size:.62rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--t400); margin-bottom:9px; }
.qrp-row   { display:flex; justify-content:space-between; font-size:.8rem; margin-bottom:5px; }
.qrp-row span { color:var(--color-text-muted,#64748b); }
.qrp-timer { display:flex; justify-content:space-between; font-size:.8rem; margin-bottom:9px; }
.qrp-timer span { color:var(--color-text-muted,#64748b); }
.qrp-timer strong.urgent { color:var(--r400); animation:urgP .5s ease-in-out infinite; }
@keyframes urgP { 0%,100%{opacity:1} 50%{opacity:.5} }
.qrp-prog { display:flex; align-items:center; gap:7px; }
.qrp-bar  { flex:1; height:4px; background:var(--t100); border-radius:999px; overflow:hidden; }
.qrp-fill { height:100%; background:var(--t400); border-radius:999px; transition:width .4s ease; }
.qrp-prog span { font-size:.7rem; font-weight:700; color:var(--t600); }

/* Loading */
.loading-card { display:flex; flex-direction:column; align-items:center; gap:13px; padding:52px 22px; background:var(--color-surface,#fff); border:1px solid var(--color-border,#e2e8f0); border-radius:13px; }
.lc-spinner { width:38px; height:38px; border:3px solid var(--t50); border-top-color:var(--t400); border-radius:50%; animation:spin .8s linear infinite; }
.lc-text { font-size:.95rem; font-weight:600; color:var(--color-text,#1e293b); }
.lc-sub  { font-size:.8rem; color:var(--color-text-muted,#94a3b8); text-align:center; }

/* ══ INLINE QUIZ ══ */
.inline-quiz-card { background:var(--color-surface,#fff); border:1px solid var(--color-border,#e2e8f0); border-radius:13px; padding:22px; display:flex; flex-direction:column; gap:14px; }
.iq-topbar { display:flex; justify-content:space-between; align-items:center; }
.iq-left   { display:flex; align-items:center; gap:9px; }
.iq-counter { font-size:.7rem; font-weight:600; color:var(--color-text-muted,#94a3b8); }
.iq-type-badge { font-size:.6rem; font-weight:700; padding:2px 9px; border-radius:999px; }
.iq-single   { background:#eff6ff; color:#1e40af; }
.iq-multi    { background:var(--t50); color:var(--t600); }
.iq-tf-badge { background:#f5f3ff; color:#5b21b6; }
.iq-timer-badge { font-size:.76rem; font-weight:700; color:var(--t500); background:var(--t50); padding:3px 11px; border-radius:999px; border:1px solid var(--t100); }
.iq-timer-badge.urgent { color:var(--r400); background:var(--r50); border-color:var(--r100); }
.iq-prog-track { height:3px; background:#f1f5f9; border-radius:999px; overflow:hidden; }
.iq-prog-fill  { height:100%; background:var(--t400); border-radius:999px; transition:width .4s ease; }
.iq-pills { display:flex; gap:4px; flex-wrap:wrap; }
.iq-pill  { width:25px; height:25px; border-radius:50%; border:1px solid var(--color-border,#e2e8f0); background:#f8fafc; font-size:.63rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .12s; color:var(--color-text-muted,#94a3b8); }
.iq-pill-active { border-color:var(--t400); background:var(--t400); color:white; }
.iq-pill-done   { border-color:var(--t100); background:var(--t50); color:var(--t600); }
.iq-question { font-size:.96rem; font-weight:600; color:var(--color-text,#1e293b); line-height:1.5; padding:14px 16px; background:#f8fafc; border-left:3px solid var(--t400); border-radius:0 9px 9px 0; }
.iq-answers { display:flex; flex-direction:column; gap:8px; }
.iq-answer  { display:flex; align-items:center; gap:12px; padding:13px 15px; border:1.5px solid var(--color-border,#e2e8f0); border-radius:9px; cursor:pointer; transition:all .15s; background:var(--color-surface,#fff); }
.iq-answer:hover { border-color:var(--t100); background:var(--t50); transform:translateX(2px); }
.iq-ans-sel { border-color:var(--t400); background:var(--t50); box-shadow:0 0 0 2px rgba(20,184,166,.08); }
.iq-letter  { width:28px; height:28px; border-radius:50%; background:#f1f5f9; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.8rem; flex-shrink:0; color:var(--color-text-muted,#94a3b8); transition:all .15s; }
.iq-ans-sel .iq-letter { background:var(--t400); color:white; }
.iq-ans-txt    { flex:1; font-size:.88rem; font-weight:500; }
.iq-check-mark { color:var(--t400); font-weight:700; }
.iq-multi-hint { font-size:.73rem; color:#1e40af; background:#eff6ff; padding:7px 11px; border-radius:6px; }
.iq-ans-multi .iq-letter { display:none; }
.iq-checkbox { width:18px; height:18px; border:1.5px solid var(--t100); border-radius:3px; display:flex; align-items:center; justify-content:center; font-size:10px; color:white; transition:all .15s; flex-shrink:0; }
.iq-checkbox.checked { background:var(--t400); border-color:var(--t400); }
.iq-tf-row { display:flex; gap:12px; }
.iq-tf { flex:1; flex-direction:column !important; justify-content:center !important; text-align:center; padding:18px !important; gap:6px !important; font-size:.9rem; font-weight:600; }
.iq-tf-icon { font-size:1rem; }
.iq-tf-true.iq-ans-sel  { border-color:var(--t400) !important; background:var(--t50) !important; }
.iq-tf-false.iq-ans-sel { border-color:var(--r300) !important; background:var(--r50) !important; }
.iq-nav { display:flex; align-items:center; justify-content:space-between; padding-top:12px; border-top:1px solid var(--color-border,#e2e8f0); }
.iq-answered-info { font-size:.7rem; color:var(--color-text-muted,#94a3b8); font-weight:600; }
.oral-quiz-wrap { border-radius:14px; overflow:hidden; }

/* Empty state */
.empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:52px 22px; color:var(--color-text-muted,#94a3b8); background:var(--color-surface,#fff); border:1px solid var(--color-border,#e2e8f0); border-radius:13px; }
.es-icon-wrap { width:64px; height:64px; border-radius:50%; background:var(--t50); color:var(--t500); display:flex; align-items:center; justify-content:center; margin-bottom:12px; }
.empty-state h3 { font-size:1.05rem; font-weight:600; color:var(--color-text,#1e293b); margin-bottom:5px; }

/* Chips */
.chip { display:inline-block; font-size:.6rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; padding:2px 9px; border-radius:999px; }
.chip-teal { background:var(--t50); color:var(--t700); border:1px solid var(--t100); }
.teal { color:var(--t600); }

/* Buttons */
.btn { display:inline-flex; align-items:center; gap:5px; padding:7px 14px; border-radius:7px; font-size:.83rem; font-weight:600; cursor:pointer; border:1px solid transparent; transition:all .15s; }
.btn:disabled { opacity:.5; cursor:not-allowed; }
.btn-primary   { background:var(--t400); color:white; border-color:var(--t400); }
.btn-primary:hover:not(:disabled) { background:var(--t500); }
.btn-secondary { background:#f8fafc; color:var(--color-text,#1e293b); border-color:var(--color-border,#e2e8f0); }
.btn-ghost     { background:transparent; color:var(--color-text-muted,#94a3b8); border-color:var(--color-border,#e2e8f0); }
.btn-ghost:hover:not(:disabled) { background:#f8fafc; }
.btn-sm   { padding:5px 11px; font-size:.73rem; }
.btn-full { width:100%; justify-content:center; }

/* Tip */
.tip { font-size:.83rem; color:var(--color-text-muted,#64748b); line-height:1.5; padding:7px 0; border-bottom:1px solid var(--color-border,#e2e8f0); }
.tip:last-child { border-bottom:none; }

@media(max-width:1024px) { .two-col { grid-template-columns:1fr; } .left-panel { position:static; } }
@media(max-width:600px)  { .stats-row { grid-template-columns:repeat(2,1fr); } .iq-tf-row { flex-direction:column; } }
  `]
})
export class QuizAssessmentComponent implements OnInit, OnDestroy {

  /* ── Services ── */
  private quizService        = inject(QuizService);
  private trainingApiService = inject(TrainingApiService);
  private aiService          = inject(AiService);
  private authService        = inject(AuthService);
  private antiCheatService   = inject(AntiCheatService);
  private http               = inject(HttpClient);
  private route              = inject(ActivatedRoute);

  @ViewChild('chatScroll') private chatScroll!: ElementRef;

  /* ── ViewState ── */
  viewState  = signal<ViewState>('MODULE_LIST');
  moduleTab  = signal<'all' | 'done'>('all');
  quizTab    = signal<QuizTab>('history');
  modulePage = signal(0);
  readonly MODULE_PAGE_SIZE = 6;
  loading    = signal(false);
  loadingMsg = signal('');
  errorMsg   = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  summaryLoading = signal(false);

  /* ── Data ── */
  modules        = signal<any[]>([]);
  selectedModule = signal<any>(null);
  pastAttempts   = signal<any[]>([]);
  summaryData    = signal<any>(null);
  videoScript    = signal<VideoScriptResponse | null>(null);
  videoLoading   = signal(false);
  showVideo      = signal(false);

  /* ── Report ── */
  showReport = signal(false);
  userId = computed(() => this.authService.getKeycloakId());
  reportModuleInfo = computed((): ModuleInfo => ({
    title:       this.selectedModule()?.title    ?? 'Module',
    category:    this.selectedModule()?.category ?? '',
    description: this.selectedModule()?.description,
  }));
  reportAttempts = computed((): AttemptForReport[] =>
    this.pastAttempts().map(a => ({
      id: a.id, date: a.date, score: a.score, level: a.level,
      questionsCount: a.questionsCount, mode: a.mode,
      questions: a.questions?.map((q: any) => ({ content: q.content, isCorrect: q.isCorrect })),
    }))
  )

  /* ── Guide ── */
  readonly GUIDE_STEPS = GUIDE_STEPS;
  guideActive = signal(false);
  guideStep   = signal(0);
  guideShown  = signal(false);

  guideTooltipStyle(): Record<string, string> {
    const step = GUIDE_STEPS[this.guideStep()];
    if (!step) return {};
    const el   = document.getElementById(step.targetId);
    if (!el) return { position: 'fixed', top: '200px', left: '50%', transform: 'translateX(-50%)' };
    const r = el.getBoundingClientRect();
    const tw = 272, gap = 16;
    switch (step.placement) {
      case 'right':  return { position:'fixed', top:`${Math.max(20,r.top)}px`, left:`${r.right+gap}px` };
      case 'left':   return { position:'fixed', top:`${Math.max(20,r.top)}px`, left:`${r.left-tw-gap}px` };
      case 'bottom': return { position:'fixed', top:`${r.bottom+gap}px`, left:`${Math.min(r.left,window.innerWidth-tw-20)}px` };
      default:       return { position:'fixed', top:`${Math.max(20,r.top-320)}px`, left:`${Math.min(r.left,window.innerWidth-tw-20)}px` };
    }
  }

private navigateToStepView(stepIdx: number): Promise<void> {
    const step = GUIDE_STEPS[stepIdx];
    if (!step) return Promise.resolve();
    return new Promise(resolve => {
      const needsViewChange = this.viewState() !== step.view;
      if (needsViewChange) this.viewState.set(step.view);
      if (step.view === 'MODULE_QUIZZES' && step.quizTab) this.quizTab.set(step.quizTab);

      // Étape 8 (index 7) = Historique : on désélectionne tout pour montrer la liste proprement
      if (stepIdx === 7) {
        this.selectedAttempt.set(null);
        this.showReport.set(false);
      }

      // Étape 9 (index 8) = Correction : on sélectionne la 1ère tentative si disponible
      if (stepIdx === 8) {
        this.showReport.set(false);
        if (!this.selectedAttempt() && this.pastAttempts().length > 0) {
          this.selectedAttempt.set(this.pastAttempts()[0]);
          this.reviewIdx.set(0);
        }
      }

      // Étape 10 (index 9) = Rapport : on DÉSELECTIONNE la tentative pour afficher correction-empty
      // qui contient le bouton guide-rapport-btn
      if (stepIdx === 9) {
        this.selectedAttempt.set(null);
        this.showReport.set(false);
      }

      setTimeout(resolve, needsViewChange ? 280 : 80);
    });
  }

  startGuide() {
    this.removeAllSpotlights();
    this.guideStep.set(0);
    this.guideActive.set(true);
    this.guideShown.set(true);
    this.navigateToStepView(0).then(() => this.applySpotlight(0));
  }

  guideNext() {
    const next = this.guideStep() + 1;
    this.removeAllSpotlights();
    if (next >= GUIDE_STEPS.length) { this.endGuide(); return; }
    this.guideStep.set(next);
    this.navigateToStepView(next).then(() => this.applySpotlight(next));
  }

  jumpToStep(idx: number) {
    this.removeAllSpotlights();
    this.guideStep.set(idx);
    this.navigateToStepView(idx).then(() => this.applySpotlight(idx));
  }

  endGuide() {
    this.removeAllSpotlights();
    this.guideActive.set(false);
    localStorage.setItem('quiz_guide_v2_done', '1');
  }

  private applySpotlight(stepIdx: number) {
    const step = GUIDE_STEPS[stepIdx];
    if (!step) return;
    const el = document.getElementById(step.targetId);
    if (!el) {
      setTimeout(() => {
        const r = document.getElementById(step.targetId);
        if (r) { r.classList.add('guide-spotlight'); r.scrollIntoView({ behavior:'smooth', block:'nearest' }); }
      }, 300);
      return;
    }
    el.classList.add('guide-spotlight');
    el.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }

  private removeAllSpotlights() {
    document.querySelectorAll('.guide-spotlight').forEach(el => el.classList.remove('guide-spotlight'));
  }

  /* ── Anti-Cheat ── */
  showCheatOverlay    = signal(false);
  cheatOverlayMode    = signal<OverlayMode>('WARNING');
  lastCheatType       = signal<CheatType>('WINDOW_BLUR');
  lastCheatTime       = signal<Date>(new Date());
  showCheatTermination  = signal(false);
  cheatTerminationTime  = signal<Date>(new Date());
  cheatCountdown        = signal(8);
  readonly CHEAT_COUNTDOWN_MAX = 8;
  private cheatCountdownTimer: any = null;
  private warningGiven = false;
  private cheatSub?: Subscription;
  private processScanInterval: any = null;

  private handleCheatEvent(event: CheatEvent) {
    if (!this.quizActive() || this.showCheatOverlay() || this.showCheatTermination()) return;
    this.lastCheatType.set(event.type);
    this.lastCheatTime.set(event.timestamp);
    if (!this.warningGiven) {
      this.warningGiven = true;
      this.cheatOverlayMode.set('WARNING');
      this.showCheatOverlay.set(true);
    } else {
      this.stopAntiCheat();
      this.showCheatOverlay.set(false);
      this.cheatTerminationTime.set(event.timestamp);
      this.cheatCountdown.set(this.CHEAT_COUNTDOWN_MAX);
      this.showCheatTermination.set(true);
      this.cheatCountdownTimer = setInterval(() => {
        const c = this.cheatCountdown() - 1;
        if (c <= 0) { this.cheatCountdown.set(0); clearInterval(this.cheatCountdownTimer); this.confirmCheatTermination(); }
        else this.cheatCountdown.set(c);
      }, 1000);
    }
  }

  confirmCheatTermination() { clearInterval(this.cheatCountdownTimer); this.showCheatTermination.set(false); this.submitWithZeroScore(); }
  resumeAfterWarning() { this.showCheatOverlay.set(false); }
  terminateQuiz() { this.showCheatOverlay.set(false); this.stopAntiCheat(); this.inlineQuestions.set([]); this.viewState.set('MODULE_QUIZZES'); this.showSuccess('Quiz ended due to a detected violation.'); }

  private startAntiCheat() {
    const attempt = this.currentAttempt();
    if (!attempt?.id) return;
    this.antiCheatService.start(attempt.id);
    this.warningGiven = false;
    this.cheatSub = this.antiCheatService.cheatDetected$.subscribe(e => this.handleCheatEvent(e));
    this.processScanInterval = setInterval(() => {
      this.antiCheatService.checkProcesses().then(r => {
        if (r.suspicious) this.handleCheatEvent({ type:'SUSPICIOUS_PROCESS', details:`Suspicious: ${r.processes.join(', ')}`, timestamp:new Date(), attemptId:attempt.id });
      });
    }, 30_000);
  }

  private stopAntiCheat() {
    this.antiCheatService.stop();
    this.cheatSub?.unsubscribe();
    if (this.processScanInterval) { clearInterval(this.processScanInterval); this.processScanInterval = null; }
    this.showCheatOverlay.set(false);
  }

  private submitWithZeroScore() {
    const attempt = this.currentAttempt();
    if (!attempt?.id) { this.terminateQuiz(); return; }
    this.quizService.submitAttempt(attempt.id, { answers:[], timeSpentSeconds:0 }).subscribe({
      next: () => {
        const zero = { id:attempt.id, date:new Date(), score:0, level:this.config.level, questionsCount:this.inlineQuestions().length, mode:this.config.mode, questions:[] };
        this.pastAttempts.update(p => [zero, ...p]);
        this.selectedAttempt.set(zero);
        this.inlineQuestions.set([]);
        this.viewState.set('MODULE_QUIZZES');
      },
      error: () => this.terminateQuiz(),
    });
  }

  /* ── Quiz config ── */
  config = { count: 10, level: 'Intermediate', mode: 'written' };
  currentAttempt   = signal<any>(null);
  selectedAttempt  = signal<any>(null);
  reviewIdx        = signal(0);
  inlineQuestions  = signal<any[]>([]);
  inlineIdx        = signal(0);
  inlineAnswers    = signal<{ [k: string]: string[] }>({});
  availableQuizzes = signal<any[]>([]);
  oralQuizzes      = signal<any[]>([]);
  writtenQuizzes   = signal<any[]>([]);
  oralQNum  = () => this.inlineIdx() + 1;
  oralTotal = () => this.inlineQuestions().length;
  timerSecs = signal(0);
  private timerRef: any = null;

  quizActive          = computed(() => this.inlineQuestions().length > 0);
  inlineCurrentQ      = computed(() => this.inlineQuestions()[this.inlineIdx()] ?? null);
  inlineAnsweredCount = computed(() => Object.keys(this.inlineAnswers()).filter(k => (this.inlineAnswers()[k]?.length ?? 0) > 0).length);
  inlineProgressPct   = computed(() => { const t = this.inlineQuestions().length; return t > 0 ? Math.round((this.inlineAnsweredCount() / t) * 100) : 0; });
  correctCount        = computed(() => (this.selectedAttempt()?.questions || []).filter((q: any) => q?.isCorrect).length);
  wrongCount          = computed(() => (this.selectedAttempt()?.questions || []).filter((q: any) => !q?.isCorrect).length);
  bestScore           = computed(() => { const a = this.pastAttempts(); return a.length ? Math.max(...a.map((x: any) => x.score)) : 0; });
  avgScore            = computed(() => { const a = this.pastAttempts(); return a.length ? Math.round(a.reduce((s: number, x: any) => s + x.score, 0) / a.length) : 0; });
  successRate         = computed(() => { const a = this.pastAttempts(); return a.length ? Math.round(a.filter((x: any) => x.score >= 70).length / a.length * 100) : 0; });

  filteredModules      = computed(() =>
    this.moduleTab() === 'done'
      ? this.modules().filter((m: any) => m.status === 'COMPLETED')
      : this.modules()
  );
  completedModuleCount = computed(() => this.modules().filter((m: any) => m.status === 'COMPLETED').length);
  totalModulePages     = computed(() => Math.ceil(this.filteredModules().length / this.MODULE_PAGE_SIZE));
  pagedModules         = computed(() => {
    const start = this.modulePage() * this.MODULE_PAGE_SIZE;
    return this.filteredModules().slice(start, start + this.MODULE_PAGE_SIZE);
  });

  pagesArray(): number[] {
    return Array.from({ length: this.totalModulePages() }, (_, i) => i);
  }

  /* ── Lifecycle ── */
  ngOnInit() {
    this.loadModules();
    const moduleId = this.route.snapshot.paramMap.get('moduleId');
    if (moduleId) this.loadQuizzesByModule(moduleId);
    else this.quizService.getQuizzes().subscribe({ next:(res:any) => this.updateQuizLists(res.content || res), error:(err) => console.error(err) });
    if (!localStorage.getItem('quiz_guide_v2_done')) setTimeout(() => this.startGuide(), 1200);
  }

  ngOnDestroy() { this.stopTimer(); window.speechSynthesis?.cancel(); this.stopAntiCheat(); this.removeAllSpotlights(); if (this.cheatCountdownTimer) clearInterval(this.cheatCountdownTimer); }

  /* ── Modules ── */
  loadModules() {
    this.loading.set(true); this.loadingMsg.set('Loading modules…');
    this.trainingApiService.getAllTrainingModules().subscribe({
      next:(r:any) => { this.modules.set(Array.isArray(r) ? r : (r?.content || [])); this.loading.set(false); this.loadingMsg.set(''); },
      error:() => { this.loading.set(false); this.setError('Unable to load modules.'); },
    });
  }

  selectModule(m: any) {
    this.selectedModule.set(m); this.summaryData.set(null); this.videoScript.set(null); this.showVideo.set(false); this.showReport.set(false);
    this.loadPastAttempts(m);
  }

loadPastAttempts(m: any) {
    if (!m?.id) return;
    this.quizService.getMyAttempts().subscribe({
      next: (a: any) => {
        const all = Array.isArray(a) ? a : (a?.content || []);
 
        // Filtre strict : ne garder que les tentatives du module sélectionné
        const filtered = all.filter((x: any) => {
          // Cherche l'id du module dans tous les champs possibles
          const mid =
            x.moduleId ??
            x.quiz?.moduleId ??
            x.quizModuleId ??
            x.quiz?.module?.id ??
            null;
          if (mid === null || mid === undefined) return false;
          return String(mid) === String(m.id);
        });
 
        this.pastAttempts.set(this.mapAttempts(filtered));
      },
      error: () => this.pastAttempts.set([]),
    });
  }

private parseDate(val: any): Date {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    if (Array.isArray(val)) {
      const [y, mo, d, h = 0, mi = 0, s = 0] = val;
      return new Date(y, mo - 1, d, h, mi, s);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  }

private mapAttempts(raw: any[]): any[] {
  return raw.map((a: any) => ({
    id:             a.attemptId || a.id,
    date:           this.parseDate(a.submittedAt || a.createdAt),
    score:          Math.round(a.percentage ?? a.score ?? 0),
    level:          a.difficulty || this.config.level,
    questionsCount: a.totalQuestionsCount ?? a.questionsCount ?? a.questionResults?.length ?? 0, // ← fallback sur questionResults
    mode:           a.mode || 'written',
    moduleId:       a.moduleId ?? a.quiz?.moduleId ?? null,
    questions:      (a.questionResults || []).map((qr: any) => ({
      id:             qr.questionId || qr.id,
      content:        qr.questionContent || qr.content,
      isCorrect:      qr.isCorrect,
      explanation:    qr.explanation || '',
      oralTranscript: qr.oralTranscript,
      oralScore:      qr.oralScore,
      answers:        (qr.answerDetails || []).map((ad: any) => ({
        id:           ad.id || ad.answerId,
        content:      ad.content,
        isCorrect:    ad.isCorrect,
        userSelected: ad.wasSelected || ad.userSelected || false,
      })),
    })),
  }));
}


  loadQuizzesByModule(moduleId: string) {
    this.availableQuizzes.set([]); this.oralQuizzes.set([]); this.writtenQuizzes.set([]);
    this.quizService.getQuizzesByModule(moduleId).subscribe({
      next:(res:any) => this.updateQuizLists(res.content || res),
      error:(err) => console.error(err),
    });
  }

  private updateQuizLists(quizzes: any[]) {
    this.availableQuizzes.set(quizzes);
    this.oralQuizzes.set(quizzes.filter((q:any) => q.category === 'ORAL'));
    this.writtenQuizzes.set(quizzes.filter((q:any) => q.category !== 'ORAL'));
  }

  goToModuleQuizzes(m: any) {
    this.selectedModule.set(m); this.selectedAttempt.set(null); this.showReport.set(false);
    this.inlineQuestions.set([]); this.reviewIdx.set(0);
    if (m.id) this.loadQuizzesByModule(m.id.toString());
    else this.setError('Module ID not found.');
    this.loadPastAttempts(m);
    this.viewState.set('MODULE_QUIZZES');
  }

  selectAttemptInline(a: any) { this.showReport.set(false); this.selectedAttempt.set(a); this.reviewIdx.set(0); }
  openReport() { if (!this.selectedModule()) return; this.selectedAttempt.set(null); this.showReport.set(true); }

  /* ── Summary + Video ── */
  onSummary(m: any) {
    if (!m?.id) return;
    this.summaryLoading.set(true); this.summaryData.set(null);
    this.aiService.summarizeModule(Number(m.id), 'fr', m.title, m.category).subscribe({
      next:(r) => { this.summaryData.set(r); this.summaryLoading.set(false); this.showSuccess('Summary generated.'); },
      error:(e) => { this.summaryLoading.set(false); this.setError('Summary error: '+(e.message||'')); },
    });
  }

  clearSummary() { this.summaryData.set(null); this.videoScript.set(null); this.showVideo.set(false); }

  onVideoScript(m: any) {
    if (!m?.id) return;
    this.videoLoading.set(true); this.videoScript.set(null); this.showVideo.set(false);
    this.aiService.generateVideoScript(Number(m.id), 'fr', m.title, m.category).subscribe({
      next:(r:VideoScriptResponse) => { this.videoScript.set(r); this.videoLoading.set(false); this.showVideo.set(true); },
      error:(e:any) => { this.videoLoading.set(false); this.setError('Video error: '+(e.message||'')); },
    });
  }
  /* ── Génération quiz ── */
  generateAndStart() {
    const m = this.selectedModule();
    if (!m) return;
    this.loading.set(true);
    this.loadingMsg.set('L\'IA génère votre quiz…');
    this.errorMsg.set(null);

    const content = (m.moduleLessons || [])
      .filter((l: any) => l.contentMarkdown)
      .map((l: any) => `## ${l.title}\n${l.contentMarkdown}`)
      .join('\n\n') || m.description || m.title;

    this.aiService.generateQuiz({
      moduleId: Number(m.id), moduleTitle: m.title || 'Module',
      moduleCategory: m.category || 'GENERAL', moduleContent: content,
      questionCount: this.config.count,
      difficulty: LEVEL_MAP[this.config.level] || 'MEDIUM', language: 'fr',
    }).subscribe({
      next: (quiz: any) => {
        this.loading.set(false); this.loadingMsg.set('');
        if (!quiz?.id) { this.setError('Réponse invalide.'); return; }

        const qs = (quiz.questions || []).map((q: any) => ({
  id:          String(q.id),   // ← vrai ID serveur, pas Math.random()
  content:     q.content ?? '',
  type:        q.type ?? 'SINGLE_CHOICE',
  explanation: q.explanation ?? '',
  answers:     (q.answers || []).map((a: any) => ({
    id:        String(a.id),   // ← vrai ID serveur, jamais Math.random()
    content:   a.content ?? '',
    isCorrect: Boolean(a.isCorrect),
  })),
}));


        if (!qs.length) { this.setError('Aucune question générée.'); return; }

        const patchAndStart = (quizId: any) => {
          const doPatch = (!quiz.moduleId && m.id)
            ? this.quizService.updateQuiz(quizId, { moduleId: Number(m.id) })
            : { subscribe: (h: any) => h.next?.() };

          (doPatch as any).subscribe({
            next: () => {
              this.quizService.startQuiz(quizId).subscribe({
                next: (a: any) => {
                  this.currentAttempt.set({ id: a.attemptId || a.id, quizId });
                  this.inlineQuestions.set(qs); this.inlineIdx.set(0); this.inlineAnswers.set({});
                  if (this.config.mode === 'written') this.startTimer(45);
                  this.startAntiCheat();
                },
                error: () => {
                  this.currentAttempt.set({ id: null, quizId });
                  this.inlineQuestions.set(qs); this.inlineIdx.set(0); this.inlineAnswers.set({});
                  if (this.config.mode === 'written') this.startTimer(45);
                },
              });
            },
            error: (e: any) => {
              console.warn('⚠️ patch moduleId échoué:', e?.message);
              this.quizService.startQuiz(quizId).subscribe({
                next: (a: any) => {
                  this.currentAttempt.set({ id: a.attemptId || a.id, quizId });
                  this.inlineQuestions.set(qs); this.inlineIdx.set(0); this.inlineAnswers.set({});
                  if (this.config.mode === 'written') this.startTimer(45);
                  this.startAntiCheat();
                },
                error: () => {
                  this.currentAttempt.set({ id: null, quizId });
                  this.inlineQuestions.set(qs); this.inlineIdx.set(0); this.inlineAnswers.set({});
                  if (this.config.mode === 'written') this.startTimer(45);
                },
              });
            },
          });
        };
        patchAndStart(quiz.id);
      },
      error: (e) => { this.loading.set(false); this.loadingMsg.set(''); this.setError('Erreur IA: ' + (e?.message || '')); },
    });
  }

  /* ── Inline answers ── */
  inlineSelect(qId:string|undefined, aId:string) { if (!qId) return; this.inlineAnswers.update(p => ({ ...p, [qId]:[aId] })); }
  inlineToggle(qId:string|undefined, aId:string) {
    if (!qId) return;
    const cur = this.inlineAnswers()[qId]||[];
    const idx = cur.indexOf(aId);
    this.inlineAnswers.update(p => ({ ...p, [qId]:idx>=0?cur.filter((x:string)=>x!==aId):[...cur,aId] }));
  }
  inlinePicked(qId:string|undefined, aId:string): boolean { return qId ? (this.inlineAnswers()[qId]||[]).includes(aId) : false; }
  inlineAnsweredQ(qId:string|undefined): boolean { return qId ? (this.inlineAnswers()[qId]?.length??0) > 0 : false; }
  inlineNext() { if (this.inlineIdx()<this.inlineQuestions().length-1) { this.inlineIdx.update(i=>i+1); if (this.config.mode==='written') this.startTimer(45); } }
  inlinePrev() { if (this.inlineIdx()>0) { this.inlineIdx.update(i=>i-1); if (this.config.mode==='written') this.startTimer(45); } }

  confirmEndInline() {
    this.stopTimer();
    Swal.fire({
      title: 'End Quiz?',
      html: `<div style="display:flex;flex-direction:column;align-items:center;gap:10px">
        <p style="margin:0;font-size:.88rem;color:#475569;line-height:1.6">
          You answered <strong style="color:#0F766E">${this.inlineAnsweredCount()}</strong> of <strong style="color:#0F766E">${this.inlineQuestions().length}</strong> question${this.inlineQuestions().length>1?'s':''}.
          <br>Unanswered questions will be marked incorrect.
        </p>
        <div style="display:flex;gap:20px;background:#E0F5EE;border:1px solid #9FE1CB;border-radius:10px;padding:10px 20px;width:100%">
          <div style="flex:1;text-align:center"><div style="font-size:1.2rem;font-weight:800;color:#0F766E">${this.inlineAnsweredCount()}</div><div style="font-size:.65rem;color:#0D9488">Answered</div></div>
          <div style="width:1px;background:#9FE1CB"></div>
          <div style="flex:1;text-align:center"><div style="font-size:1.2rem;font-weight:800;color:#94A3B8">${this.inlineQuestions().length-this.inlineAnsweredCount()}</div><div style="font-size:.65rem;color:#94A3B8">Remaining</div></div>
          <div style="width:1px;background:#9FE1CB"></div>
          <div style="flex:1;text-align:center"><div style="font-size:1.2rem;font-weight:800;color:#0F766E">${this.inlineQuestions().length}</div><div style="font-size:.65rem;color:#0D9488">Total</div></div>
        </div>
      </div>`,
      background:'#ffffff', color:'#1e293b', showCancelButton:true, reverseButtons:true,
      confirmButtonText:'Submit Quiz', cancelButtonText:'Continue',
      customClass:{ popup:'swal-teal-popup', title:'swal-teal-title', confirmButton:'swal-teal-confirm', cancelButton:'swal-teal-cancel', actions:'swal-teal-actions' },
      icon:undefined,
      didOpen:() => {
        if (!document.getElementById('swal-teal-styles')) {
          const style = document.createElement('style');
          style.id = 'swal-teal-styles';
          style.textContent = `.swal-teal-popup{border-radius:16px!important;border:1px solid #9FE1CB!important;box-shadow:0 20px 60px rgba(20,184,166,.15)!important;padding:24px!important;max-width:380px!important}.swal-teal-title{font-size:1.05rem!important;font-weight:700!important;color:#0F766E!important;margin-bottom:4px!important}.swal-teal-actions{gap:8px!important;margin-top:16px!important}.swal-teal-confirm{background:#14B8A6!important;color:#fff!important;border:none!important;border-radius:8px!important;padding:10px 20px!important;font-size:.86rem!important;font-weight:700!important}.swal-teal-confirm:hover{background:#0D9488!important}.swal-teal-cancel{background:transparent!important;color:#64748b!important;border:1px solid #e2e8f0!important;border-radius:8px!important;padding:10px 20px!important;font-size:.86rem!important;font-weight:600!important}.swal-teal-cancel:hover{border-color:#9FE1CB!important;color:#0F766E!important}`;
          document.head.appendChild(style);
        }
      },
    }).then(r => { if (r.isConfirmed) this.submitInlineQuiz(); else if (this.config.mode==='written') this.startTimer(45); });
  }


 submitInlineQuiz() {
  this.stopAntiCheat();
  const attempt = this.currentAttempt();
  if (!attempt?.id) {
    this.buildLocalReview();
    return;
  }
  Swal.fire({ title: 'Correction…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

  const answers = Object.entries(this.inlineAnswers())
    .filter(([, ids]) => ids.length > 0)
    .map(([questionId, selectedAnswerIds]) => ({ questionId, selectedAnswerIds }));

  this.quizService.submitAttempt(attempt.id, { answers, timeSpentSeconds: 0 }).subscribe({
    next: () => {
      // ✅ Recharger les tentatives depuis le backend
      if (this.selectedModule()) {
        this.loadPastAttempts(this.selectedModule());
      }
      // Nettoyer l'état du quiz
      this.inlineQuestions.set([]);
      this.viewState.set('MODULE_QUIZZES');
      Swal.close();

      this.showSuccess('Quiz terminé ! Vos résultats sont affichés ci-dessous.');

      // Sélectionner la dernière tentative une fois rechargée
      setTimeout(() => {
        if (this.pastAttempts().length > 0) {
          this.selectedAttempt.set(this.pastAttempts()[0]);
          this.reviewIdx.set(0);
        }
      }, 300);
    },
    error: (err) => {
      Swal.close();
      console.error('Submit error', err);
      this.buildLocalReview();
    },
  });
}
 /*submitInlineQuiz() {
    this.stopAntiCheat();
    const attempt = this.currentAttempt();
    if (!attempt?.id) { this.buildLocalReview(); return; }
    Swal.fire({ title: 'Correction…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const answers = Object.entries(this.inlineAnswers())
  .filter(([, ids]) => ids.length > 0) // ← filtre les vides
  .map(([questionId, selectedAnswerIds]) => ({ questionId, selectedAnswerIds }));
    this.quizService.submitAttempt(attempt.id, { answers, timeSpentSeconds: 0 }).subscribe({
      next: (r: any) => {
        Swal.close();
        const rev = this.mapResult(r);
        this.pastAttempts.update(p => [rev, ...p]);
        this.selectedAttempt.set(rev); this.reviewIdx.set(0);
        this.inlineQuestions.set([]); this.viewState.set('MODULE_QUIZZES');
        this.showSuccess(`Quiz terminé ! Score : ${rev.score}%`);
      },
      error: () => { Swal.close(); this.buildLocalReview(); },
    });
  }
 
 private mapResult(r: any): any {
  return {
    id: r.attemptId, date: r.submittedAt || new Date(), score: Math.round(r.percentage || 0),
    level: this.config.level,
    questionsCount: r.totalQuestionsCount || this.inlineQuestions().length, // ← fallback sur les questions en cours
    mode: this.config.mode, // ← mode depuis la config courante
    questions: (r.questionResults || []).map((qr: any) => ({
      id: qr.questionId, content: qr.questionContent, isCorrect: qr.isCorrect, explanation: qr.explanation || '',
      answers: (qr.answerDetails || []).map((ad: any) => ({ id: ad.id || ad.answerId, content: ad.content, isCorrect: ad.isCorrect, userSelected: ad.wasSelected })),
    })),
  };
}*/
private mapResult(r: any): any {
  // Accepte plusieurs noms de champs possibles
  const percentage = r.percentage ?? r.score ?? r.globalScore ?? 0;
  const questionsCount = r.totalQuestionsCount ?? r.questionsCount ?? this.inlineQuestions().length;
  
  return {
    id: r.attemptId,
    date: this.parseDate(r.submittedAt || r.createdAt),
    score: Math.round(percentage),
    level: this.config.level,
    questionsCount: questionsCount,
    mode: this.config.mode,
    questions: (r.questionResults || []).map((qr: any) => ({
      id: qr.questionId,
      content: qr.questionContent,
      isCorrect: qr.isCorrect,
      explanation: qr.explanation || '',
      answers: (qr.answerDetails || []).map((ad: any) => ({
        id: ad.id || ad.answerId,
        content: ad.content,
        isCorrect: ad.isCorrect,
        userSelected: ad.wasSelected,
      })),
    })),
  };
}

  private buildLocalReview() {
    Swal.close();
    const qs = this.inlineQuestions().map(q => { const sel=(this.inlineAnswers()[q.id]||[])[0]; return { ...q, isCorrect:false, answers:q.answers.map((a:any)=>({ ...a, userSelected:String(a.id)===String(sel) })) }; });
    const a = { id:'local_'+Date.now(), date:new Date(), score:0, level:this.config.level, questionsCount:qs.length, mode:this.config.mode, questions:qs };
    this.pastAttempts.update(p=>[a,...p]);
    this.selectedAttempt.set(a); this.reviewIdx.set(0);
    this.inlineQuestions.set([]); this.viewState.set('MODULE_QUIZZES');
    Swal.fire({ title:'Quiz Completed', text:'Local correction (server unavailable).', icon:'info', confirmButtonColor:'#14B8A6' });
  }

 /* handleOralResult(result: OralQuizResult) {
    const q = this.inlineCurrentQ();
    if (!q) return;
this.inlineAnswers.update(p => ({ ...p, [q.id]: [result.selectedAnswerId ?? ''] }));
    const isLast = this.inlineIdx() === this.inlineQuestions().length - 1;
    if (!isLast) { this.inlineIdx.update(i => i + 1); }
    else {
      const attempt = this.currentAttempt();
      if (!attempt?.id) setTimeout(() => this.submitInlineQuiz(), 2000);
      else this.submitInlineQuiz();
    }
  }
*/
handleOralResult(result: OralQuizResult) {
  const q = this.inlineCurrentQ();
  if (!q) return;

  let answerId = result.selectedAnswerId;

  // Si aucun ID n'a été détecté, tentative de fallback via la transcription
  if (!answerId && result.transcription && q.answers) {
    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const normalizedUser = normalize(result.transcription);
    const matched = q.answers.find((a: any) => {
      const norm = normalize(a.content);
      return norm.length > 2 && (normalizedUser.includes(norm) || norm.includes(normalizedUser));
    });
    if (matched) answerId = matched.id ?? '';
  }

  if (answerId) {
    this.inlineAnswers.update(p => ({ ...p, [q.id]: [answerId] }));
  } else {
    console.warn(`Aucune réponse valide pour la question ${q.id} – ignorée (sera comptée comme fausse).`);
  }

  const isLast = this.inlineIdx() === this.inlineQuestions().length - 1;
  if (!isLast) {
    this.inlineIdx.update(i => i + 1);
  } else {
    const attempt = this.currentAttempt();
    if (!attempt?.id) setTimeout(() => this.submitInlineQuiz(), 2000);
    else this.submitInlineQuiz();
  }
}
  /* ── Timer ── */
  private startTimer(secs:number) {
    this.stopTimer(); this.timerSecs.set(secs);
    this.timerRef = setInterval(() => { const r=this.timerSecs()-1; if (r<=0) { this.timerSecs.set(0); this.stopTimer(); this.inlineNext(); } else this.timerSecs.set(r); }, 1000);
  }
  private stopTimer() { if (this.timerRef) { clearInterval(this.timerRef); this.timerRef=null; } }
  formatTimer(s:number): string { const m=Math.floor(s/60); return `${m}:${(s%60).toString().padStart(2,'0')}`; }

  /* ── Helpers ── */
  getTypeLabel(t:string|undefined): string { return ({ SINGLE_CHOICE:'Single Choice', MULTIPLE_CHOICE:'Multiple Choice', TRUE_FALSE:'True / False' } as any)[t||'']||'Single Choice'; }
  getTypeBadge(t:string|undefined): string { return ({ SINGLE_CHOICE:'iq-type-badge iq-single', MULTIPLE_CHOICE:'iq-type-badge iq-multi', TRUE_FALSE:'iq-type-badge iq-tf-badge' } as any)[t||'']||'iq-type-badge iq-single'; }
  private setError(msg:string) { this.errorMsg.set(msg); setTimeout(()=>this.errorMsg.set(null),6000); }
  private showSuccess(msg:string) { this.successMsg.set(msg); setTimeout(()=>this.successMsg.set(null),4000); }
}