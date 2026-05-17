import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { BadgeCardComponent } from '../../shared/components/badge-card/badge-card.component';
import { TrainingCoachChatComponent } from '../../shared/components/training-coach-chat/training-coach-chat.component';
import { MOCK_USER, MOCK_TRAINING, MOCK_BADGES, MOCK_LEADERBOARD } from '../../core/data/mock-data';
import { AuthService } from '../../core/auth/auth.service';
import { CurrentUserStoreService } from '../../core/services/current-user-store.service';
import { TrainingApiService } from '../../core/services/training-api.service';
import { Badge } from '../../core/models/models';
import { BadgeResponse, DailyActivityResponse, TrainingPathResponse, TrainingPreferencesRequest, TrainingPreferencesResponse, UserBadgeResponse, UserXPTrackerResponse } from '../../core/models/training.models';
import { catchError, firstValueFrom, forkJoin, of, timeout } from 'rxjs';

type LeaderboardEntry = {
  rank: number;
  name: string;
  initials: string;
  xp: number;
  streak: number;
  userId?: string;
};

type DailyGoal = {
  type: 'SESSION_COMPLETED' | 'BEHAVIORAL_PRACTICE' | 'LIBRARY_READING' | 'QUIZ_ASSESSMENT';
  title: string;
  xp: number;
  done: boolean;
  action: string;
};

@Component({
  selector: 'app-training-gamification',
  standalone: true,
  imports: [CommonModule, FormsModule, SectionHeaderComponent, BadgeCardComponent, TrainingCoachChatComponent],
  template: `
    <div class="training-page animate-fade">
      <div class="page-header">
        <div>
          <h1>Training & Growth</h1>
          <p>Your personalized learning journey with XP, badges, and daily challenges.</p>
        </div>
        <div class="level-badge">
          <i class="bi bi-lightning-charge-fill"></i>
          <span>Level {{ user.level }}</span>
        </div>
      </div>

      <div class="status-banner status-loading" *ngIf="isLoading">Loading your live training data...</div>
      <div class="status-banner status-error" *ngIf="!isLoading && errorMessage">{{ errorMessage }}</div>
      <div class="status-banner status-info" *ngIf="!isLoading && infoMessage">{{ infoMessage }}</div>

      <!-- XP Progress Banner -->
      <div class="xp-banner card">
        <div class="xp-left">
          <div class="xp-avatar">
            <img
              *ngIf="avatarUrl && !avatarFailed; else xpAvatarFallback"
              [src]="avatarUrl"
              alt="Profile photo"
              class="xp-avatar-img"
              (error)="onAvatarError()"
            />
            <ng-template #xpAvatarFallback>
              <div class="avatar-placeholder avatar-xl xp-avatar-initials">
                {{ user.initials }}
              </div>
            </ng-template>
            <div class="xp-level-badge">{{ user.level }}</div>
          </div>
          <div class="xp-info">
            <div class="xp-name">{{ user.name }}</div>
            <div class="xp-title">Level {{ user.level }} Candidate · {{ user.xp.toLocaleString() }} XP</div>
            <div class="xp-bar-wrap">
              <div class="progress-bar">
                <div class="progress-fill" [style.width]="xpProgressPercent + '%'"></div>
              </div>
              <div class="xp-bar-label">
                {{ xpIntoLevel.toLocaleString() }} / {{ xpLevelTotal.toLocaleString() }} XP to Level {{ user.level + 1 }}
                · {{ xpToNextLevel.toLocaleString() }} XP to go
              </div>
            </div>
          </div>
        </div>
        <div class="xp-right">
          <div class="xp-stat-group">
            <div class="xp-stat">
              <div class="xp-stat-val"><i class="bi bi-fire xp-icon-fire"></i> {{ user.streak }}</div>
              <div class="xp-stat-label">Day Streak</div>
            </div>
            <div class="xp-stat">
              <div class="xp-stat-val"><i class="bi bi-trophy-fill xp-icon-trophy"></i> {{ earnedCount }}</div>
              <div class="xp-stat-label">Badges</div>
            </div>
            <div class="xp-stat">
              <div class="xp-stat-val"><i class="bi bi-calendar-check-fill xp-icon-calendar"></i> {{ bestStreak }}</div>
              <div class="xp-stat-label">Best Streak</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main grid -->
      <div class="training-grid">

        <!-- Left: Learning paths + Daily goals -->
        <div class="training-main">

          <!-- Daily Goals -->
          <div class="card daily-goals">
            <app-section-header title="Today's Goals" icon='<i class="bi bi-bullseye"></i>' subtitle="Complete all goals to maintain your streak"></app-section-header>
            <div class="goals-list">
              <div class="goal-item" *ngFor="let g of dailyGoals" [class.completed]="g.done">
                <div class="goal-checkbox" [class.checked]="g.done">
                  <i class="bi bi-check-lg" *ngIf="g.done"></i>
                </div>
                <div class="goal-body">
                  <div class="goal-title">{{ g.title }}</div>
                  <div class="goal-xp">+{{ g.xp }} XP</div>
                </div>
                <span class="chip" [class]="g.done ? 'chip-teal' : 'chip-neutral'">{{ g.done ? 'Done' : g.action }}</span>
              </div>
            </div>
            <div class="goals-progress">
              <span>{{ completedGoals }}/{{ dailyGoals.length }} goals completed today</span>
              <div class="progress-bar" style="flex:1; height:6px;">
                <div class="progress-fill" [style.width]="(completedGoals/dailyGoals.length*100)+'%'"></div>
              </div>
            </div>
          </div>

          <!-- Learning path -->
          <div class="card learning-path">
            <app-section-header
              title="Your Learning Path"
              icon='<i class="bi bi-map-fill"></i>'
              subtitle="Personalized based on your goals and performance"
              actionLabel="Preferences"
              (actionClick)="togglePreferences()"
            ></app-section-header>

            <div class="prefs-editor" *ngIf="showPreferences">
              <div class="prefs-grid">
                <label class="prefs-field">
                  <span class="prefs-label">Goal</span>
                  <select class="input" [(ngModel)]="preferencesForm.goal" [ngModelOptions]="{standalone:true}">
                    <option value="">No preference</option>
                    <option value="TECHNICAL">TECHNICAL</option>
                    <option value="BEHAVIORAL">BEHAVIORAL</option>
                    <option value="CONFIDENCE">CONFIDENCE</option>
                  </select>
                </label>

                <label class="prefs-field">
                  <span class="prefs-label">Target role</span>
                  <input class="input" [(ngModel)]="preferencesForm.targetRole" [ngModelOptions]="{standalone:true}" placeholder="e.g. Backend" />
                </label>

                <label class="prefs-field">
                  <span class="prefs-label">Seniority</span>
                  <select class="input" [(ngModel)]="preferencesForm.seniority" [ngModelOptions]="{standalone:true}">
                    <option value="">No preference</option>
                    <option value="JUNIOR">JUNIOR</option>
                    <option value="MID">MID</option>
                    <option value="SENIOR">SENIOR</option>
                  </select>
                </label>

                <label class="prefs-field">
                  <span class="prefs-label">Minutes per day</span>
                  <input class="input" type="number" min="0" max="600" [(ngModel)]="preferencesForm.minutesPerDay" [ngModelOptions]="{standalone:true}" />
                </label>
              </div>

              <div class="prefs-actions">
                <button class="btn btn-primary" type="button" (click)="savePreferencesAndRegenerate()" [disabled]="isSavingPreferences || isGeneratingPath">
                  {{ isGeneratingPath ? 'Regenerating...' : (isSavingPreferences ? 'Saving...' : 'Save & Regenerate') }}
                </button>

                <button class="btn btn-ghost" type="button" (click)="createNewPath()" [disabled]="isSavingPreferences || isGeneratingPath || isCreatingNewPath">
                  {{ isCreatingNewPath ? 'Creating...' : 'Create New Path' }}
                </button>

                <button class="btn btn-ghost" type="button" (click)="toggleHistory()" [disabled]="isSavingPreferences || isGeneratingPath || isCreatingNewPath">
                  {{ showHistory ? 'Hide History' : 'Show History' }}
                </button>

                <button class="btn btn-ghost" type="button" (click)="showPreferences = false" [disabled]="isSavingPreferences || isGeneratingPath">Close</button>
                <span class="prefs-meta" *ngIf="preferencesUpdatedAt">Updated {{ preferencesUpdatedAt }}</span>
              </div>

              <div class="prefs-history" *ngIf="showHistory">
                <div class="prefs-history-loading" *ngIf="isLoadingHistory">Loading path history...</div>
                <div class="prefs-history-loading" *ngIf="!isLoadingHistory && historyErrorMessage">{{ historyErrorMessage }}</div>
                <div class="prefs-history-empty" *ngIf="!isLoadingHistory && !historyErrorMessage && pathHistory.length === 0">No saved paths yet.</div>

                <div class="prefs-history-list" *ngIf="!isLoadingHistory && !historyErrorMessage && pathHistory.length">
                  <div class="prefs-history-row" *ngFor="let p of pathHistory">
                    <div class="prefs-history-left">
                      <span class="chip" [class]="historyChip(p.status)">{{ p.id === activePathId ? 'Current' : p.status }}</span>
                      <span class="prefs-history-date">{{ formatEarnedDate(p.createdAt) }}</span>
                    </div>
                    <div class="prefs-history-right">
                      <span class="prefs-history-meta">{{ countCompleted(p) }}/{{ p.modules.length }} completed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="path-timeline">
              <div class="path-item" *ngFor="let m of modules; let i = index" [class]="'path-' + m.status">
                <div class="pi-connector" *ngIf="i > 0" [class.done]="modules[i-1].status === 'completed'"></div>
                <div class="pi-node">
                  <div class="pi-icon"><i class="bi" [ngClass]="m.icon"></i></div>
                </div>
                <div class="pi-body">
                  <div class="pi-header">
                    <div class="pi-title">{{ m.title }}</div>
                    <span class="chip" [class]="statusChip(m.status)">
                      <i class="bi"
                         [class.bi-check-lg]="m.status === 'completed'"
                         [class.bi-arrow-right-circle-fill]="m.status === 'in-progress'"
                         [class.bi-lock-fill]="m.status === 'locked'"></i>
                      {{ m.status === 'completed' ? 'Done' : m.status === 'in-progress' ? 'In Progress' : 'Locked' }}
                    </span>
                  </div>
                  <div class="pi-meta">{{ m.category }} · {{ m.completedLessons }}/{{ m.lessons }} lessons</div>

                  <div class="pi-lessons" *ngIf="(m.moduleLessons?.length ?? 0) > 0; else fallbackLessons">
                    <div class="pi-lesson" *ngFor="let l of m.moduleLessons" [class.done]="l.status === 'COMPLETED'">
                      <span class="pi-lesson-check"><i class="bi bi-check-lg" *ngIf="l.status === 'COMPLETED'"></i></span>
                      <div class="pi-lesson-body">
                        <a
                          *ngIf="l.format === 'VIDEO' && l.videoUrl"
                          class="pi-lesson-title pi-lesson-link"
                          [href]="l.videoUrl"
                          target="_blank"
                          rel="noopener noreferrer"
                          >{{ l.title }}</a
                        >

                        <button
                          *ngIf="l.format === 'TEXT' && (l.contentMarkdown ?? '').trim().length > 0"
                          type="button"
                          class="pi-lesson-title pi-lesson-toggle"
                          (click)="toggleLessonContent(l.id)"
                        >
                          {{ l.title }}
                        </button>

                        <span
                          *ngIf="(l.format !== 'VIDEO' || !l.videoUrl) && (l.format !== 'TEXT' || (l.contentMarkdown ?? '').trim().length === 0)"
                          class="pi-lesson-title"
                        >
                          {{ l.title }}
                        </span>

                        <div class="pi-lesson-sub" *ngIf="l.format === 'VIDEO' && l.videoUrl">
                          Video · {{ l.estimatedMinutes ?? 5 }} min
                        </div>

                        <div
                          class="pi-lesson-content"
                          *ngIf="l.format === 'TEXT' && isLessonContentOpen(l.id) && (l.contentMarkdown ?? '').trim().length > 0"
                        >
                          <pre class="pi-lesson-markdown">{{ l.contentMarkdown }}</pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  <ng-template #fallbackLessons>
                    <div class="pi-lessons" *ngIf="m.lessons > 0">
                      <div class="pi-lesson" *ngFor="let n of lessonRange(m.lessons); let idx = index" [class.done]="idx < m.completedLessons">
                        <span class="pi-lesson-check"><i class="bi bi-check-lg" *ngIf="idx < m.completedLessons"></i></span>
                        <span class="pi-lesson-title">Lesson {{ n }}</span>
                      </div>
                    </div>
                  </ng-template>

                  <div class="pi-progress" *ngIf="m.status !== 'locked'">
                    <div class="progress-bar" style="height:5px;">
                      <div class="progress-fill" [style.width]="m.progress + '%'" [class.fill-full]="m.progress === 100"></div>
                    </div>
                    <span class="pi-pct">{{ m.progress }}%</span>
                  </div>

                  <div class="pi-xp">+{{ m.xp }} XP on completion</div>
                  <div class="pi-actions" *ngIf="m.status !== 'locked'">
                    <button class="module-action" [disabled]="m.status === 'completed' || updatingModuleId === m.id" (click)="completeNextLesson(m)">
                      {{ updatingModuleId === m.id ? 'Updating...' : (m.status === 'completed' ? 'Completed' : '+1 Lesson') }}
                    </button>
                  </div>
            </div>
          </div>

          <!-- Challenges -->
          <div class="card challenges-card">
            <app-section-header title="Weekly Challenges" icon='<i class="bi bi-lightning-charge-fill"></i>' subtitle="Earn bonus XP this week"></app-section-header>
            <div class="challenges-list">
              <div class="challenge-item" *ngFor="let c of challenges">
                <div class="ch-icon"><i class="bi" [ngClass]="c.icon"></i></div>
                <div class="ch-body">
                  <div class="ch-title">{{ c.title }}</div>
                  <div class="progress-bar" style="height:5px; margin-top:6px;">
                    <div class="progress-fill" [style.width]="(c.current/c.total*100) + '%'"></div>
                  </div>
                  <div class="ch-meta">{{ c.current }}/{{ c.total }} · {{ c.desc }}</div>
                </div>
                <div class="ch-xp">+{{ c.xp }} XP</div>
              </div>
            </div>
          </div>

        </div>

        <!-- Right: Leaderboard + Badges -->
        <div class="training-side">

          <!-- Motivation Banner -->
          <div class="motivation-banner">
            <div class="mb-icon"><i class="bi bi-fire"></i></div>
            <div class="mb-text">
              <strong>{{ user.streak }}-day streak!</strong><br>
              <span>You're on a roll. Don't break the chain.</span>
            </div>
          </div>

          <!-- AI Coach -->
          <app-training-coach-chat></app-training-coach-chat>

          <!-- Leaderboard -->
          <div class="card leaderboard-card">
            <app-section-header title="Leaderboard" icon='<i class="bi bi-trophy-fill"></i>' subtitle="This week's top learners"></app-section-header>
            <div class="leaderboard-list">
              <div class="lb-row" *ngFor="let entry of leaderboard" [class.you]="entry.name.includes('You')">
                <span class="lb-rank" [class]="rankClass(entry.rank)">{{ entry.rank }}</span>
                <div class="avatar-placeholder" style="width:32px;height:32px;font-size:0.7rem;">{{ entry.initials }}</div>
                <div class="lb-info">
                  <div class="lb-name">{{ entry.name }}</div>
                  <div class="lb-streak"><i class="bi bi-fire"></i> {{ entry.streak }}d streak</div>
                </div>
                <div class="lb-xp">{{ entry.xp.toLocaleString() }} XP</div>
              </div>
            </div>
          </div>

          <!-- Badges -->
          <div class="card">
            <div id="badges-section">
              <app-section-header
                title="Badges"
                icon='<i class="bi bi-award-fill"></i>'
                subtitle="{{ earnedCount }}/{{ allBadges.length }} earned"
                actionLabel="All Badges"
                (actionClick)="onAllBadgesClick()"
              ></app-section-header>
              <div class="badges-grid-2">
                <app-badge-card
                  *ngFor="let badge of (showAllBadges ? allBadges : allBadges.slice(0,6))"
                  [badge]="badge"
                ></app-badge-card>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .training-page { display: flex; flex-direction: column; gap: var(--space-6); }

    .status-banner {
      border-radius: var(--radius-md);
      padding: var(--space-3) var(--space-4);
      font-size: var(--text-sm);
      border: 1px solid;
    }
    .status-loading { background: var(--color-bg-alt); border-color: var(--color-border); color: var(--color-text-muted); }
    .status-error { background: var(--error-50); border-color: var(--error-500); color: var(--error-500); }
    .status-info { background: var(--sky-50); border-color: var(--sky-200); color: var(--teal-700); }
    [data-theme="dark"] .status-error { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #f87171; }
    [data-theme="dark"] .status-info { background: rgba(20,184,166,0.1); border-color: rgba(20,184,166,0.3); color: var(--teal-300); }

    .level-badge {
      display: inline-flex; align-items: center; gap: var(--space-2);
      background: linear-gradient(135deg, var(--teal-500), var(--cyan-400));
      color: var(--color-text-inverse);
      padding: var(--space-2) var(--space-5);
      border-radius: var(--radius-full);
      font-weight: var(--weight-bold);
      font-family: var(--font-display);
      font-size: var(--text-lg);
      letter-spacing: -0.01em;
      box-shadow: var(--shadow-teal);
    }
    .level-badge i { font-size: 1rem; }

    /* XP Banner */
    .xp-banner {
      background:
        radial-gradient(120% 120% at 0% 0%, var(--color-primary-light) 0%, transparent 55%),
        radial-gradient(100% 100% at 100% 100%, var(--cyan-50) 0%, transparent 60%),
        var(--color-surface);
      border-color: var(--color-primary-mid);
      display: flex; align-items: center; justify-content: space-between; gap: var(--space-8);
      transition: box-shadow var(--duration-base) var(--ease-out);
    }
    .xp-banner:hover { box-shadow: var(--shadow-md); }
    [data-theme="dark"] .xp-banner {
      background:
        radial-gradient(120% 120% at 0% 0%, rgba(20,184,166,0.14) 0%, transparent 55%),
        radial-gradient(100% 100% at 100% 100%, rgba(34,211,238,0.10) 0%, transparent 60%),
        var(--color-surface);
    }

    .xp-left { display: flex; align-items: center; gap: var(--space-5); flex: 1; }

    .xp-avatar { position: relative; width: 64px; height: 64px; flex-shrink: 0; }
    .xp-avatar-img {
      width: 64px;
      height: 64px;
      border-radius: var(--radius-full);
      object-fit: cover;
      border: 3px solid var(--color-surface);
      box-shadow: var(--shadow-md);
      display: block;
    }
    .xp-avatar-initials {
      width: 64px;
      height: 64px;
      font-size: 1.1rem;
      border: 3px solid var(--color-surface);
      box-shadow: var(--shadow-md);
    }
    .xp-level-badge {
      position: absolute; bottom: -4px; right: -4px;
      width: 24px; height: 24px; border-radius: var(--radius-full);
      background: var(--color-primary);
      color: var(--color-text-inverse);
      font-size: 0.7rem;
      font-weight: var(--weight-bold);
      display: flex; align-items: center; justify-content: center;
      border: 2px solid var(--color-surface);
      box-shadow: var(--shadow-xs);
    }
    .xp-icon-fire     { color: #f97316; }
    .xp-icon-trophy   { color: var(--warning-500); }
    .xp-icon-calendar { color: var(--color-primary); }

    .xp-name { font-size: var(--text-lg); font-weight: 700; margin-bottom: 2px; }
    .xp-title { font-size: var(--text-sm); color: var(--color-text-muted); margin-bottom: var(--space-3); }
    .xp-bar-wrap { display: flex; flex-direction: column; gap: 4px; min-width: 280px; }
    .xp-bar-label { font-size: var(--text-xs); color: var(--color-text-muted); }

    .xp-stat-group { display: flex; gap: var(--space-6); }
    .xp-stat { text-align: center; }
    .xp-stat-val { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 700; }
    .xp-stat-label { font-size: var(--text-xs); color: var(--color-text-muted); }

    /* Training grid */
    .training-grid {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: var(--space-6);
      align-items: start;
    }

    .training-main, .training-side { display: flex; flex-direction: column; gap: var(--space-5); }

    /* Daily goals */
    .goals-list { display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-4); }
    .goal-item {
      display: flex; align-items: center; gap: var(--space-3);
      padding: var(--space-3); border-radius: var(--radius-md);
      border: 1px solid transparent;
      transition:
        background var(--duration-fast) var(--ease-out),
        border-color var(--duration-fast) var(--ease-out);
    }
    .goal-item.completed { opacity: 0.75; }
    .goal-item:hover { background: var(--color-bg-alt); border-color: var(--color-border); }

    .goal-checkbox {
      width: 24px; height: 24px;
      border-radius: var(--radius-sm);
      border: 2px solid var(--color-border);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.85rem;
      font-weight: var(--weight-bold);
      flex-shrink: 0;
      transition:
        background var(--duration-fast) var(--ease-out),
        border-color var(--duration-fast) var(--ease-out);
    }
    .goal-checkbox.checked {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--color-text-inverse);
    }
    .goal-checkbox i { line-height: 1; }

    .goal-body { flex: 1; min-width: 0; }
    .goal-title { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text); }
    .goal-xp { font-size: var(--text-xs); color: var(--color-primary); font-weight: var(--weight-semibold); }

    .goals-progress {
      display: flex; align-items: center; gap: var(--space-3);
      font-size: var(--text-xs); color: var(--color-text-muted);
    }

    /* Path timeline */
    .path-timeline { display: flex; flex-direction: column; }
    .path-item { display: flex; align-items: flex-start; gap: var(--space-4); position: relative; }
    .pi-connector {
      position: absolute; left: 15px; top: -24px;
      width: 2px; height: 24px; background: var(--neutral-200);
    }
    .pi-connector.done { background: var(--teal-400); }

    .pi-node {
      width: 36px; height: 36px; border-radius: var(--radius-full);
      border: 2px solid var(--color-border);
      display: flex; align-items: center; justify-content: center;
      background: var(--color-surface); flex-shrink: 0; font-size: 1rem;
      color: var(--color-text-muted);
      transition: all var(--duration-fast) var(--ease-out);
    }
    .pi-icon { display: inline-flex; align-items: center; justify-content: center; }
    .pi-icon i { font-size: 1rem; line-height: 1; }
    .path-completed .pi-node {
      border-color: var(--color-primary);
      background: var(--color-primary-light);
      color: var(--color-primary);
    }
    .path-in-progress .pi-node {
      border-color: var(--color-accent);
      background: var(--cyan-50);
      color: var(--color-accent);
      box-shadow: 0 0 0 4px rgba(34,211,238,0.15);
    }
    [data-theme="dark"] .path-completed .pi-node { background: rgba(20,184,166,0.12); }
    [data-theme="dark"] .path-in-progress .pi-node { background: rgba(34,211,238,0.12); }
    .path-locked .pi-node { opacity: 0.5; }

    .pi-body {
      flex: 1; padding: 4px 0 var(--space-5);
    }
    .pi-header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: 4px; }
    .pi-title { font-size: var(--text-sm); font-weight: 600; }
    .pi-meta { font-size: var(--text-xs); color: var(--color-text-muted); margin-bottom: var(--space-2); }

    .pi-lessons {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px 10px;
      margin-bottom: var(--space-2);
    }

    .pi-lesson {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      transition:
        background var(--duration-fast) var(--ease-out),
        border-color var(--duration-fast) var(--ease-out),
        color var(--duration-fast) var(--ease-out);
    }

    .pi-lesson.done {
      color: var(--teal-700);
      border-color: var(--color-primary-mid);
      background: var(--color-primary-light);
    }
    [data-theme="dark"] .pi-lesson.done {
      color: var(--teal-300);
      border-color: rgba(20,184,166,0.3);
      background: rgba(20,184,166,0.12);
    }

    .pi-lesson-check {
      width: 14px;
      text-align: center;
      font-weight: 700;
      color: var(--teal-600);
      flex-shrink: 0;
    }

    .pi-lesson-body { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .pi-lesson-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pi-lesson-link { color: inherit; text-decoration: underline; }
    .pi-lesson-toggle {
      border: 0;
      background: transparent;
      padding: 0;
      text-align: left;
      cursor: pointer;
      color: inherit;
      font: inherit;
      width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-decoration: underline;
    }
    .pi-lesson-sub { font-size: 11px; color: var(--color-text-muted); }
    .pi-lesson-content {
      border-top: 1px dashed var(--color-border);
      padding-top: 6px;
      margin-top: 4px;
      color: var(--color-text);
    }
    .pi-lesson-markdown {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 11px;
      line-height: 1.35;
      color: var(--color-text);
    }
    .pi-progress { display: flex; align-items: center; gap: var(--space-2); margin-bottom: 4px; }
    .pi-pct { font-size: var(--text-xs); font-weight: 600; color: var(--teal-600); white-space: nowrap; }
    .pi-xp { font-size: var(--text-xs); color: var(--teal-600); }
    .pi-actions { margin-top: var(--space-2); }
    .module-action {
      border: 1px solid var(--color-primary-mid);
      background: var(--color-primary-light);
      color: var(--teal-700);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      border-radius: var(--radius-sm);
      padding: 5px 12px;
      cursor: pointer;
      transition:
        background var(--duration-fast) var(--ease-out),
        color var(--duration-fast) var(--ease-out),
        transform var(--duration-fast) var(--ease-out);
    }
    .module-action:hover:not(:disabled) {
      background: var(--color-primary);
      color: var(--color-text-inverse);
      transform: translateY(-1px);
    }
    [data-theme="dark"] .module-action {
      background: rgba(20,184,166,0.15);
      color: var(--teal-300);
      border-color: rgba(20,184,166,0.3);
    }
    .module-action:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .fill-full { background: var(--teal-400) !important; }

    /* Preferences editor */
    .prefs-editor {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-4);
      margin-bottom: var(--space-4);
      background: var(--color-bg-alt);
    }
    .prefs-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-4);
      margin-bottom: var(--space-4);
    }
    .prefs-field { display: flex; flex-direction: column; gap: 6px; }
    .prefs-label { font-size: var(--text-xs); color: var(--color-text-muted); font-weight: 600; }
    .prefs-actions { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
    .prefs-meta { font-size: var(--text-xs); color: var(--color-text-muted); }

    .prefs-history { margin-top: var(--space-4); display: flex; flex-direction: column; gap: var(--space-2); }
    .prefs-history-loading, .prefs-history-empty { font-size: var(--text-xs); color: var(--color-text-muted); }
    .prefs-history-list { display: flex; flex-direction: column; gap: var(--space-2); }
    .prefs-history-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
    }
    .prefs-history-left { display: flex; align-items: center; gap: var(--space-3); }
    .prefs-history-date { font-size: var(--text-xs); color: var(--color-text-muted); }
    .prefs-history-meta { font-size: var(--text-xs); color: var(--color-text-muted); font-weight: 600; }

    /* Challenges */
    .challenges-list { display: flex; flex-direction: column; gap: var(--space-4); }
    .challenge-item {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-3);
      border-radius: var(--radius-md);
      transition: background var(--duration-fast) var(--ease-out);
    }
    .challenge-item:hover { background: var(--color-bg-alt); }
    .ch-icon {
      width: 44px; height: 44px;
      background: var(--color-primary-light);
      color: var(--color-primary);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-primary-mid);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .ch-icon i { font-size: 1.2rem; line-height: 1; }
    [data-theme="dark"] .ch-icon {
      background: rgba(20,184,166,0.15);
      border-color: rgba(20,184,166,0.3);
      color: var(--teal-300);
    }
    .ch-body { flex: 1; min-width: 0; }
    .ch-title { font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-text); }
    .ch-meta { font-size: var(--text-xs); color: var(--color-text-muted); margin-top: 4px; }
    .ch-xp { font-size: var(--text-xs); font-weight: var(--weight-bold); color: var(--color-primary); white-space: nowrap; }

    /* Motivation banner */
    .motivation-banner {
      background: linear-gradient(135deg, var(--peach-50), var(--sand-50));
      border: 1px solid var(--peach-100);
      border-radius: var(--radius-lg);
      padding: var(--space-4) var(--space-5);
      display: flex; align-items: center; gap: var(--space-4);
      transition: box-shadow var(--duration-fast) var(--ease-out);
    }
    .motivation-banner:hover { box-shadow: var(--shadow-sm); }
    [data-theme="dark"] .motivation-banner {
      background: linear-gradient(135deg, rgba(249,115,22,0.12), rgba(245,158,11,0.08));
      border-color: rgba(249,115,22,0.25);
    }
    .mb-icon {
      width: 44px; height: 44px;
      background: rgba(249,115,22,0.18);
      border-radius: var(--radius-full);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .mb-icon i { font-size: 1.4rem; color: #f97316; }
    .mb-text { font-size: var(--text-sm); color: var(--color-text); line-height: var(--leading-snug); }
    .mb-text strong { font-size: var(--text-base); color: var(--color-text); font-family: var(--font-display); }
    .mb-text span { color: var(--color-text-muted); }

    /* Leaderboard */
    .leaderboard-list { display: flex; flex-direction: column; gap: var(--space-2); }
    .lb-row {
      display: flex; align-items: center; gap: var(--space-3);
      padding: var(--space-3);
      border-radius: var(--radius-md);
      border: 1px solid transparent;
      transition:
        background var(--duration-fast) var(--ease-out),
        border-color var(--duration-fast) var(--ease-out);
    }
    .lb-row:hover { background: var(--color-bg-alt); }
    .lb-row.you {
      background: var(--color-primary-light);
      border-color: var(--color-primary-mid);
    }
    [data-theme="dark"] .lb-row.you {
      background: rgba(20,184,166,0.12);
      border-color: rgba(20,184,166,0.3);
    }

    .lb-rank {
      font-family: var(--font-display);
      font-size: var(--text-lg);
      font-weight: var(--weight-bold);
      width: 28px;
      text-align: center;
      letter-spacing: -0.02em;
    }
    .rank-1 { color: var(--warning-500); }
    .rank-2 { color: var(--neutral-400); }
    .rank-3 { color: #b45309; }

    .lb-info { flex: 1; min-width: 0; }
    .lb-name { font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-text); }
    .lb-streak {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    .lb-streak i { color: #f97316; }
    .lb-xp { font-size: var(--text-xs); font-weight: var(--weight-bold); color: var(--color-primary); white-space: nowrap; }

    .badges-grid-2 { display: grid; grid-template-columns: repeat(2,1fr); gap: var(--space-2); }

    @media (max-width: 1024px) {
      .training-grid { grid-template-columns: 1fr; }
      .xp-banner { flex-direction: column; align-items: stretch; gap: var(--space-5); }
      .prefs-grid { grid-template-columns: 1fr; }
      .pi-lessons { grid-template-columns: 1fr; }
    }

    @media (max-width: 720px) {
      .xp-left { flex-direction: column; align-items: flex-start; gap: var(--space-3); }
      .xp-bar-wrap { width: 100%; min-width: 0; }
      .xp-right { width: 100%; }
      .xp-stat-group { width: 100%; justify-content: space-between; gap: var(--space-3); }
      .pi-lessons { grid-template-columns: 1fr; }
      .badges-grid-2 { grid-template-columns: 1fr; }
      .path-item { gap: var(--space-3); }
      .pi-header { flex-wrap: wrap; gap: var(--space-2); }
      .pi-header .chip { font-size: var(--text-xs); }
      .challenge-item { gap: var(--space-2); }
      .ch-icon { width: 38px; height: 38px; }
      .lb-row { padding: var(--space-2); }
      .prefs-actions { flex-direction: column; align-items: stretch; }
      .prefs-actions .btn { width: 100%; }
      .level-badge { font-size: var(--text-base); padding: var(--space-1) var(--space-3); }
    }

    @media (max-width: 480px) {
      .xp-banner { padding: var(--space-4); }
      .xp-name { font-size: var(--text-base); }
      .xp-title { font-size: var(--text-xs); }
      .xp-stat-group { flex-wrap: wrap; }
      .xp-stat { flex: 1 0 30%; }
      .xp-stat-val { font-size: var(--text-base); }
      .motivation-banner { padding: var(--space-3); gap: var(--space-3); }
      .mb-icon { width: 36px; height: 36px; }
      .mb-text { font-size: var(--text-xs); }
      .mb-text strong { font-size: var(--text-sm); }
      .goal-item { padding: var(--space-2); }
      .goal-title { font-size: var(--text-xs); }
    }
  `]
})
export class TrainingGamificationComponent implements OnInit {
  private authService = inject(AuthService);
  private trainingApi = inject(TrainingApiService);
  private currentUserStore = inject(CurrentUserStoreService);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  user = MOCK_USER;
  /** Real avatar URL pulled from CurrentUserStoreService — empty falls back to initials. */
  avatarUrl = '';
  /** Set to true when the <img> 404s so we can drop back to the initials placeholder. */
  avatarFailed = false;
  modules = MOCK_TRAINING;
  allBadges: Badge[] = MOCK_BADGES;
  leaderboard: LeaderboardEntry[] = MOCK_LEADERBOARD;
  isLoading = true;
  errorMessage: string | null = null;
  infoMessage: string | null = null;
  activePathId: number | null = null;
  currentUserId: string | null = null;
  updatingModuleId: string | null = null;
  private badgeCatalog: BadgeResponse[] = [];
  showAllBadges = false;

  private lessonRangeCache = new Map<number, number[]>();

  private openLessonContentIds = new Set<string>();

  showPreferences = false;
  isSavingPreferences = false;
  isGeneratingPath = false;
  isCreatingNewPath = false;
  private preferencesActionSeq = 0;
  preferencesUpdatedAt: string | null = null;
  showHistory = false;
  isLoadingHistory = false;
  historyErrorMessage: string | null = null;
  pathHistory: TrainingPathResponse[] = [];
  preferencesForm: {
    goal: string;
    targetRole: string;
    seniority: string;
    minutesPerDay: number | null;
  } = {
    goal: '',
    targetRole: '',
    seniority: '',
    minutesPerDay: null,
  };

  // Tracker-derived (live) stats used by the XP banner
  readonly xpLevelTotal = 1000;
  xpToNextLevel = 0;
  xpIntoLevel = 0;
  xpProgressPercent = 0;
  bestStreak = 0;

  ngOnInit(): void {
    this.currentUserStore.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((u) => {
        if (!u) return;
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
        if (fullName) {
          this.user.name = fullName;
          this.user.initials = this.computeInitials(fullName);
        }
        const url = (u.avatarUrl || '').trim();
        if (url !== this.avatarUrl) {
          this.avatarUrl = url;
          this.avatarFailed = false;
        }
        this.cdr.markForCheck();
      });

    if (!this.currentUserStore.initialized) {
      this.currentUserStore
        .loadCurrentUser()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    }

    this.loadTrainingData();
  }

  /** Hide the broken <img> when its src 404s; the initials placeholder takes over. */
  onAvatarError(): void {
    this.avatarFailed = true;
    this.cdr.markForCheck();
  }

  lessonRange(total: number): number[] {
    const safeTotal = Math.max(0, Math.min(50, Math.floor(Number(total) || 0)));
    const cached = this.lessonRangeCache.get(safeTotal);
    if (cached) {
      return cached;
    }
    const arr = Array.from({ length: safeTotal }, (_, i) => i + 1);
    this.lessonRangeCache.set(safeTotal, arr);
    return arr;
  }

  toggleLessonContent(lessonId: string): void {
    if (!lessonId) return;
    if (this.openLessonContentIds.has(lessonId)) {
      this.openLessonContentIds.delete(lessonId);
      return;
    }
    this.openLessonContentIds.add(lessonId);
  }

  isLessonContentOpen(lessonId: string): boolean {
    return !!lessonId && this.openLessonContentIds.has(lessonId);
  }

  get earnedCount() { return this.allBadges.filter(b => b.earned).length; }

  dailyGoals: DailyGoal[] = [
    { type: 'SESSION_COMPLETED', title: 'Complete 1 mock interview', xp: 150, done: false, action: 'Start' },
    { type: 'BEHAVIORAL_PRACTICE', title: 'Answer 5 behavioral questions', xp: 75, done: false, action: 'Practice' },
    { type: 'LIBRARY_READING', title: 'Read 1 library resource', xp: 50, done: false, action: 'Read' },
    { type: 'QUIZ_ASSESSMENT', title: 'Complete a quiz assessment', xp: 100, done: false, action: 'Take Quiz' },
  ];

  get completedGoals() { return this.dailyGoals.filter(g => g.done).length; }

  challenges = [
    { icon: 'bi-mic-fill',          title: '5-Session Sprint',     current: 4, total: 5,  xp: 500, desc: 'Complete 5 sessions this week' },
    { icon: 'bi-pencil-square',     title: 'Quiz Champion',        current: 2, total: 3,  xp: 300, desc: 'Score 80%+ on 3 quizzes' },
    { icon: 'bi-fire',              title: 'Streak Master',        current: 7, total: 10, xp: 750, desc: '10-day study streak' },
    { icon: 'bi-book-half',         title: 'Resource Explorer',    current: 3, total: 5,  xp: 200, desc: 'Save 5 library resources' },
  ];

  statusChip(s: string): string {
    return s === 'completed' ? 'chip chip-teal' : s === 'in-progress' ? 'chip chip-cyan' : 'chip chip-neutral';
  }

  rankClass(rank: number): string {
    return `lb-rank rank-${rank}`;
  }

  onAllBadgesClick(): void {
    this.showAllBadges = true;
    setTimeout(() => {
      document
        .getElementById('badges-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  private loadTrainingData(): void {
    const userId = this.authService.getKeycloakId();
    this.currentUserId = userId;
    if (!userId) {
      this.isLoading = false;
      this.errorMessage = 'Authentication required to load training data.';
      return;
    }

    const fullName = this.authService.getFullName();
    if (fullName) {
      this.user.name = fullName;
      this.user.initials = this.computeInitials(fullName);
    }

    forkJoin({
      path: this.trainingApi.getOrCreatePath(userId).pipe(timeout(20000)),
      preferences: this.trainingApi.getMyPreferences().pipe(timeout(20000), catchError(() => of(null))),
      tracker: this.trainingApi.getUserXpTracker(userId).pipe(timeout(20000), catchError(() => of(null))),
      leaderboard: this.trainingApi.getLeaderboard(10).pipe(timeout(20000), catchError(() => of([] as UserXPTrackerResponse[]))),
      activity: this.trainingApi.getTodayActivity(userId).pipe(timeout(20000), catchError(() => of(null))),
      badgeCatalog: this.trainingApi.getActiveBadges().pipe(timeout(20000), catchError(() => of([] as BadgeResponse[]))),
      userBadges: this.trainingApi.getUserBadges(userId).pipe(timeout(20000), catchError(() => of([] as UserBadgeResponse[]))),
    }).subscribe({
      next: ({ path, preferences, tracker, leaderboard, activity, badgeCatalog, userBadges }) => {
        try {
          this.activePathId = path.id;
          this.applyPathData(path);
          this.applyPreferencesData(preferences);
          if (tracker) {
            this.applyTrackerData(tracker);
          }
          this.applyLeaderboardData(leaderboard, userId);
          this.applyDailyGoals(activity);
          this.applyBadges(badgeCatalog, userBadges);
          this.errorMessage = null;
        } catch (e) {
          console.error('Failed to map training data payload', e);
          this.errorMessage = 'Training data received but could not be rendered completely.';
        } finally {
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.activePathId = null;
        this.isLoading = false;
        this.errorMessage = 'Unable to load live training data. Showing fallback content.';
        this.cdr.detectChanges();
      },
    });
  }

  togglePreferences(): void {
    this.showPreferences = !this.showPreferences;
  }

  async createNewPath(): Promise<void> {
    if (this.isSavingPreferences || this.isGeneratingPath || this.isCreatingNewPath) {
      return;
    }

    this.infoMessage = null;
    this.errorMessage = null;
    this.isCreatingNewPath = true;
    this.cdr.detectChanges();

    try {
      const path = await firstValueFrom(this.trainingApi.createNewMyPath().pipe(timeout(20000)));
      this.activePathId = path.id;
      this.applyPathData(path);
      this.infoMessage = 'A fresh learning path was created. Your previous path was saved in history.';

      if (this.showHistory) {
        await this.loadHistory();
      }
    } catch {
      this.errorMessage = 'Could not create a new learning path. Please try again.';
    } finally {
      this.isCreatingNewPath = false;
      this.cdr.detectChanges();
    }
  }

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
    this.historyErrorMessage = null;
    if (this.showHistory) {
      this.loadHistory();
    }
  }

  private async loadHistory(): Promise<void> {
    if (this.isLoadingHistory) {
      return;
    }

    this.isLoadingHistory = true;
    this.historyErrorMessage = null;
    this.cdr.detectChanges();

    try {
      const history = await firstValueFrom(this.trainingApi.getMyPathHistory().pipe(timeout(20000)));
      this.pathHistory = Array.isArray(history) ? history : [];
    } catch {
      this.historyErrorMessage = 'Could not load path history.';
      this.pathHistory = [];
    } finally {
      this.isLoadingHistory = false;
      this.cdr.detectChanges();
    }
  }

  countCompleted(path: TrainingPathResponse): number {
    return (path.modules ?? []).filter((m) => m.status === 'COMPLETED').length;
  }

  historyChip(status: TrainingPathResponse['status']): string {
    return status === 'ARCHIVED' ? 'chip chip-neutral' : status === 'COMPLETED' ? 'chip chip-teal' : 'chip chip-cyan';
  }

  async savePreferencesAndRegenerate(): Promise<void> {
    if (this.isSavingPreferences || this.isGeneratingPath) {
      return;
    }

    this.infoMessage = null;
    this.errorMessage = null;

    this.isSavingPreferences = true;
    this.isGeneratingPath = false;
    const actionId = ++this.preferencesActionSeq;
    const payload: TrainingPreferencesRequest = {
      goal: this.normalizeOptional(this.preferencesForm.goal),
      targetRole: this.normalizeOptional(this.preferencesForm.targetRole),
      seniority: this.normalizeOptional(this.preferencesForm.seniority),
      minutesPerDay: this.preferencesForm.minutesPerDay ?? null,
    };

    let preferencesSaved = false;

    try {
      const saved = await firstValueFrom(this.trainingApi.putMyPreferences(payload).pipe(timeout(20000)));
      preferencesSaved = true;
      this.applyPreferencesData(saved);

      if (actionId === this.preferencesActionSeq) {
        this.isSavingPreferences = false;
        this.isGeneratingPath = true;
        this.cdr.detectChanges();
      }

      const path = await firstValueFrom(this.trainingApi.generateMyPath().pipe(timeout(20000)));
      this.activePathId = path.id;
      this.applyPathData(path);
      this.infoMessage = 'Your learning path has been regenerated.';
    } catch {
      this.errorMessage = preferencesSaved
        ? 'Preferences saved, but path regeneration failed. Please try again.'
        : 'Could not save preferences. Please try again.';
    } finally {
      if (actionId === this.preferencesActionSeq) {
        this.isSavingPreferences = false;
        this.isGeneratingPath = false;
        this.cdr.detectChanges();
      }
    }
  }

  async completeNextLesson(module: { id: string; title: string; lessons: number; completedLessons: number; progress: number; status: string; xp: number }): Promise<void> {
    if (!this.activePathId || !this.currentUserId) {
      this.errorMessage = 'Training path is not ready yet. Please reload.';
      return;
    }
    const currentUserId = this.currentUserId;

    const moduleId = Number(module.id);
    if (!Number.isFinite(moduleId) || module.status === 'completed') {
      return;
    }

    const nextCompleted = Math.min(module.completedLessons + 1, module.lessons);
    const nextProgress = Math.min(100, Math.round((nextCompleted / module.lessons) * 100));

    this.updatingModuleId = module.id;
    this.infoMessage = null;
    this.errorMessage = null;
    this.cdr.detectChanges();

    try {
      const updated = await firstValueFrom(
        this.trainingApi.updateModuleProgress(this.activePathId, moduleId, this.currentUserId, {
          completedLessons: nextCompleted,
          progress: nextProgress,
        }).pipe(timeout(20000)),
      );

      this.modules = this.modules.map((existing) => {
        if (Number(existing.id) !== updated.id) return existing;

        const updatedModuleLessons = (updated as any).moduleLessons as
          | Array<{ id: number; title: string; status: string; orderIndex?: number | null }>
          | undefined;

        return {
          ...existing,
          completedLessons: updated.completedLessons,
          progress: updated.progress,
          status: this.mapModuleStatus(updated.status),
          moduleLessons: this.mergeUpdatedModuleLessons(
            existing.moduleLessons,
            updatedModuleLessons,
            updated.completedLessons
          ),
        };
      });

      const isCompleted = updated.status === 'COMPLETED';

      if (isCompleted) {
        try {
          const path = await firstValueFrom(
            this.trainingApi.getPathByUserId(currentUserId).pipe(timeout(20000)),
          );
          this.activePathId = path.id;
          this.applyPathData(path);
        } catch {
          // Non-blocking: keep local module update.
        }
      }

      try {
        const tracker = await firstValueFrom(
          this.trainingApi.recordDailyActivity({
            userId: currentUserId,
            xpEarned: isCompleted ? updated.xpReward : 0,
            sessionCompleted: isCompleted,
            goalsCompleted: isCompleted ? 1 : 0,
            behavioralCount: isCompleted ? 1 : 0,
            libraryCount: 0,
            quizCount: 0,
          }).pipe(timeout(20000)),
        );
        this.applyTrackerData(tracker);
      } catch {
        this.infoMessage = `${updated.title} updated, but activity sync failed. Reload to refresh tracker stats.`;
      }

      try {
        const activity = await firstValueFrom(
          this.trainingApi.getTodayActivity(currentUserId).pipe(timeout(20000), catchError(() => of(null))),
        );
        this.applyDailyGoals(activity);
      } catch {
        // Non-blocking
      }

      this.refreshBadges(currentUserId);
      if (!this.infoMessage) {
        this.infoMessage = `${updated.title} updated to ${updated.progress}% progress.`;
      }
    } catch {
      this.errorMessage = 'Could not update module progress. Please try again.';
    } finally {
      this.updatingModuleId = null;
      this.cdr.detectChanges();
    }
  }

  private applyPathData(path: TrainingPathResponse): void {
    this.modules = path.modules.map((module) => ({
      id: String(module.id),
      title: module.title,
      category: module.category.replaceAll('_', ' '),
      progress: module.progress,
      xp: module.xpReward,
      lessons: module.lessons,
      completedLessons: module.completedLessons,
      status: this.mapModuleStatus(module.status),
      icon: this.iconForCategory(module.category),
      moduleLessons: (module.moduleLessons ?? [])
        .slice()
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
        .map((l) => ({
          id: String(l.id),
          title: l.title,
          status: l.status,
          orderIndex: l.orderIndex,
          format: l.format,
          contentMarkdown: l.contentMarkdown ?? null,
          videoUrl: l.videoUrl ?? null,
          estimatedMinutes: l.estimatedMinutes,
        })),
    }));
  }

  private mergeUpdatedModuleLessons(
    existingModuleLessons: any,
    updatedModuleLessons:
      | Array<{
          id: number;
          title: string;
          status: string;
          orderIndex?: number | null;
          format?: 'TEXT' | 'VIDEO' | string;
          contentMarkdown?: string | null;
          videoUrl?: string | null;
          estimatedMinutes?: number;
        }>
      | undefined,
    completedLessons: number,
  ): any {
    if (Array.isArray(updatedModuleLessons) && updatedModuleLessons.length > 0) {
      return updatedModuleLessons
        .slice()
        .sort((a, b) => (Number(a.orderIndex ?? 0) - Number(b.orderIndex ?? 0)))
        .map((l) => ({
          id: String(l.id),
          title: l.title,
          status: l.status,
          orderIndex: l.orderIndex,
          format: (l as any).format,
          contentMarkdown: (l as any).contentMarkdown ?? null,
          videoUrl: (l as any).videoUrl ?? null,
          estimatedMinutes: (l as any).estimatedMinutes,
        }));
    }

    if (!Array.isArray(existingModuleLessons) || existingModuleLessons.length === 0) {
      return existingModuleLessons;
    }

    return existingModuleLessons.map((l: any, index: number) => ({
      ...l,
      status: index < completedLessons ? 'COMPLETED' : 'PENDING',
    }));
  }

  private applyPreferencesData(preferences: TrainingPreferencesResponse | null): void {
    if (!preferences) {
      return;
    }

    this.preferencesForm = {
      goal: preferences.goal ?? '',
      targetRole: preferences.targetRole ?? '',
      seniority: preferences.seniority ?? '',
      minutesPerDay: preferences.minutesPerDay ?? null,
    };

    this.preferencesUpdatedAt = preferences.updatedAt
      ? this.formatEarnedDate(preferences.updatedAt)
      : null;
  }

  private applyLeaderboardData(entries: UserXPTrackerResponse[], currentUserId: string): void {
    if (!entries.length) {
      return;
    }

    this.leaderboard = entries.map((entry, index) => {
      const isCurrent = entry.userId === currentUserId;
      return {
        rank: index + 1,
        userId: entry.userId,
        initials: this.computeInitials(isCurrent ? this.user.name : entry.userId),
        name: isCurrent ? `${this.user.name} (You)` : this.displayUser(entry.userId),
        streak: entry.currentStreak,
        xp: entry.totalXp,
      };
    });

    const myEntry = entries.find((entry) => entry.userId === currentUserId);
    if (myEntry) {
      this.applyTrackerData(myEntry);
    }
  }

  private applyTrackerData(tracker: UserXPTrackerResponse): void {
    this.user.xp = tracker.totalXp;
    this.user.level = tracker.currentLevel;
    this.user.streak = tracker.currentStreak;

    this.xpToNextLevel = Math.max(0, Number(tracker.xpToNextLevel ?? 0));
    this.bestStreak = Math.max(0, Number(tracker.longestStreak ?? tracker.currentStreak ?? 0));

    const into = this.xpLevelTotal - this.xpToNextLevel;
    this.xpIntoLevel = Math.min(this.xpLevelTotal, Math.max(0, into));
    this.xpProgressPercent = Math.round((this.xpIntoLevel / this.xpLevelTotal) * 100);

    this.syncCurrentUserLeaderboard(tracker);
  }

  private syncCurrentUserLeaderboard(tracker: UserXPTrackerResponse): void {
    if (!this.currentUserId) {
      return;
    }

    const others = this.leaderboard.filter((entry) => entry.userId !== this.currentUserId);
    const currentEntry = {
      rank: 0,
      userId: this.currentUserId,
      initials: this.user.initials,
      name: `${this.user.name} (You)`,
      streak: tracker.currentStreak,
      xp: tracker.totalXp,
    };

    this.leaderboard = [...others, currentEntry]
      .sort((a, b) => b.xp - a.xp)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  private applyDailyGoals(activity: DailyActivityResponse | null): void {
    if (!activity) {
      this.dailyGoals = this.dailyGoals.map((goal) => ({ ...goal, done: false }));
      return;
    }

    this.dailyGoals = this.dailyGoals.map((goal) => {
      if (goal.type === 'SESSION_COMPLETED') {
        return { ...goal, done: Boolean(activity.sessionCompleted) };
      }
      if (goal.type === 'BEHAVIORAL_PRACTICE') {
        return { ...goal, done: (activity.behavioralCount ?? 0) > 0 };
      }
      if (goal.type === 'LIBRARY_READING') {
        return { ...goal, done: (activity.libraryCount ?? 0) > 0 };
      }
      if (goal.type === 'QUIZ_ASSESSMENT') {
        return { ...goal, done: (activity.quizCount ?? 0) > 0 };
      }
      return { ...goal, done: false };
    });
  }

  private applyBadges(catalog: BadgeResponse[], userBadges: UserBadgeResponse[]): void {
    if (!catalog.length) {
      // Backend unavailable or no seed data: keep mock catalog so UI still renders.
      this.allBadges = MOCK_BADGES;
      return;
    }

    this.badgeCatalog = catalog;
    const earnedByBadgeId = new Map<number, UserBadgeResponse>();
    for (const ub of userBadges) {
      earnedByBadgeId.set(ub.badgeId, ub);
    }

    this.allBadges = catalog.map((b) => {
      const earned = earnedByBadgeId.get(b.id);
      return {
        id: String(b.id),
        name: b.name,
        description: b.description,
        icon: b.icon,
        color: '',
        earned: Boolean(earned),
        earnedDate: earned?.earnedDate ? this.formatEarnedDate(earned.earnedDate) : undefined,
        xpReward: b.xpReward ?? 0,
      };
    });
  }

  private refreshBadges(userId: string): void {
    // Avoid flicker if we already have a catalog; just refresh earned list.
    const catalog$ = this.badgeCatalog.length
      ? of(this.badgeCatalog)
      : this.trainingApi.getActiveBadges().pipe(catchError(() => of([] as BadgeResponse[])));

    forkJoin({
      badgeCatalog: catalog$,
      userBadges: this.trainingApi.getUserBadges(userId).pipe(catchError(() => of([] as UserBadgeResponse[]))),
    }).subscribe({
      next: ({ badgeCatalog, userBadges }) => this.applyBadges(badgeCatalog, userBadges),
      error: () => {
        // Non-blocking: keep whatever badges are currently displayed.
      },
    });
  }

  formatEarnedDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  private mapModuleStatus(status: string): 'locked' | 'in-progress' | 'completed' {
    if (status === 'COMPLETED') return 'completed';
    if (status === 'IN_PROGRESS') return 'in-progress';
    return 'locked';
  }

  private iconForCategory(category: string): string {
    if (category === 'COMMUNICATION') return 'bi-chat-dots-fill';
    if (category === 'STRESS_MANAGEMENT') return 'bi-heart-pulse-fill';
    if (category === 'CONTENT_PREP') return 'bi-pencil-square';
    if (category === 'BODY_LANGUAGE') return 'bi-person-fill';
    if (category === 'INDUSTRY_SPECIFIC') return 'bi-building-fill';
    return 'bi-book-fill';
  }

  private displayUser(userId: string): string {
    return `User ${userId.slice(0, 8)}`;
  }

  private computeInitials(value: string): string {
    const parts = value.trim().split(' ').filter(Boolean);
    if (!parts.length) return 'NA';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  private normalizeOptional(value: string): string | null {
    const trimmed = (value ?? '').trim();
    return trimmed ? trimmed : null;
  }
}
