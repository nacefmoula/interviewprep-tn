import { Component, DoCheck, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, forkJoin, map, of, timeout } from 'rxjs';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ResourceCardComponent } from '../../shared/components/resource-card/resource-card.component';
import { ResourceFormModalComponent } from '../../shared/components/resource-form-modal/resource-form-modal.component';
import { LibResourceGridComponent } from './lib-resource-grid/lib-resource-grid.component';
import { Resource } from '../../core/models/models';
import {
  AiGenerateResourcesResponse,
  AiResourceSummaryResponse,
  CategoryApiResponse,
  BookmarkApiResponse,
  EngagementApiResponse,
  PageResponse,
  ResourceApiResponse,
  ResourceApiService,
  ResourceStatsResponse,
} from '../../core/services/resource-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { UserApiService } from '../../core/services/user-api.service';
import { environment } from '../../../environments/environment';
import { ActivatedRoute, Router } from '@angular/router';

interface ResourceEngagement {
  bookmarkedAt: string;
  openCount: number;
  openedDays: string[];
  lastOpenedAt: string | null;
}

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, FormsModule, SectionHeaderComponent, ResourceCardComponent, ResourceFormModalComponent, LibResourceGridComponent],
  template: `
    <div class="library-page animate-fade">
      <!-- HERO HEADER -->
      <header class="lib-hero">
        <div class="lib-hero-bg" aria-hidden="true">
          <div class="lib-hero-orb lib-hero-orb-1"></div>
          <div class="lib-hero-orb lib-hero-orb-2"></div>
          <div class="lib-hero-orb lib-hero-orb-3"></div>
          <div class="lib-hero-grid"></div>
        </div>

        <div class="lib-hero-content">
          <div class="lib-hero-text">
            <div class="lib-hero-kicker">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span>BIBLIOTHÈQUE DE RESSOURCES</span>
            </div>
            <h1 class="lib-hero-title">
              Apprenez, pratiquez,
              <span class="lib-hero-title-accent">maîtrisez.</span>
            </h1>
            <p class="lib-hero-sub">
              Articles, vidéos, podcasts, exercices et modèles — organisés par thème et niveau pour accompagner chaque étape de votre parcours.
            </p>

            <div class="lib-hero-role" [class.admin]="isAdmin">
              <span class="lib-hero-role-dot"></span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path *ngIf="!isAdmin" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle *ngIf="!isAdmin" cx="12" cy="7" r="4"/>
                <path *ngIf="isAdmin" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              {{ isAdmin ? 'Mode administrateur' : 'Mode apprenant' }}
            </div>
          </div>

          <div class="lib-hero-stats" role="group" aria-label="Filtres rapides">
            <button
              type="button"
              class="lib-stat lib-stat-primary"
              [class.active]="activeStat === 'all'"
              (click)="applyStatFilter('all')"
              [attr.aria-pressed]="activeStat === 'all'">
              <div class="lib-stat-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <div class="lib-stat-body">
                <div class="lib-stat-value">
                  <span class="lib-stat-num" [class.just-changed]="statPulse.res">{{ heroStats?.totalCount ?? totalElements }}</span>
                </div>
                <div class="lib-stat-label">
                  Ressource{{ (heroStats?.totalCount ?? totalElements) !== 1 ? 's' : '' }}
                  <span class="lib-stat-trend" *ngIf="newThisWeekCount > 0">+{{ newThisWeekCount }} cette semaine</span>
                </div>
              </div>
              <span class="lib-stat-arrow">→</span>
            </button>

            <button
              type="button"
              class="lib-stat"
              [class.active]="activeStat === 'video'"
              [class.disabled]="videoCount === 0"
              [disabled]="videoCount === 0"
              (click)="applyStatFilter('video')"
              [attr.aria-pressed]="activeStat === 'video'">
              <div class="lib-stat-icon lib-stat-icon-video">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
              </div>
              <div class="lib-stat-body">
                <div class="lib-stat-value">
                  <span class="lib-stat-num" [class.just-changed]="statPulse.vid">{{ heroStats?.videoCount ?? videoCount }}</span>
                  <span class="lib-stat-pct" *ngIf="(heroStats?.totalCount ?? resources.length) > 0">{{ heroVideoPercent }}%</span>
                </div>
                <div class="lib-stat-label">Vidéo{{ (heroStats?.videoCount ?? videoCount) !== 1 ? 's' : '' }}</div>
              </div>
              <span class="lib-stat-arrow">→</span>
            </button>

            <button
              type="button"
              class="lib-stat"
              [class.active]="activeStat === 'saved'"
              [class.disabled]="bookmarkCount === 0"
              [disabled]="bookmarkCount === 0"
              (click)="applyStatFilter('saved')"
              [attr.aria-pressed]="activeStat === 'saved'">
              <div class="lib-stat-icon lib-stat-icon-accent">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div class="lib-stat-body">
                <div class="lib-stat-value">
                  <span class="lib-stat-num" [class.just-changed]="statPulse.saved">{{ bookmarkCount }}</span>
                </div>
                <div class="lib-stat-label">Enregistrée{{ bookmarkCount !== 1 ? 's' : '' }}</div>
              </div>
              <span class="lib-stat-arrow">→</span>
            </button>

            <button
              type="button"
              class="lib-stat"
              [class.active]="activeStat === 'categories'"
              [class.disabled]="categories.length === 0"
              [disabled]="categories.length === 0"
              (click)="applyStatFilter('categories')"
              [attr.aria-pressed]="activeStat === 'categories'">
              <div class="lib-stat-icon lib-stat-icon-cat">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
                </svg>
              </div>
              <div class="lib-stat-body">
                <div class="lib-stat-value">
                  <span class="lib-stat-num" [class.just-changed]="statPulse.cat">{{ realCategoriesCount }}</span>
                </div>
                <div class="lib-stat-label">Catégorie{{ realCategoriesCount !== 1 ? 's' : '' }}</div>
              </div>
              <span class="lib-stat-arrow">→</span>
            </button>
          </div>
        </div>
      </header>

      <!-- ── Progression strip ─────────────────────────────── -->
      <section *ngIf="authService.isAuthenticated()" class="eng-dash" aria-label="Votre progression">

        <div class="eng-dash-head">
          <div class="eng-dash-title-group">
            <div class="eng-dash-kicker">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              VOTRE PROGRESSION
            </div>
            <h2 class="eng-dash-title">Reprendre là où vous vous êtes arrêté</h2>
          </div>
          <div class="eng-dash-chips">
            <span class="chip chip-neutral" *ngIf="bookmarkCount > 0">{{ inProgressEngagements.length }} en cours</span>
            <span *ngIf="engCompletedCount > 0" class="chip chip-success">{{ engCompletedCount }} terminée{{ engCompletedCount !== 1 ? 's' : '' }}</span>
            <span *ngIf="engMaxStreak > 1" class="chip chip-fire">🔥 {{ engMaxStreak }}j streak</span>
          </div>
        </div>

        <!-- Fix 7: Empty state when no bookmarks -->
        <div *ngIf="!engagementsLoading && bookmarkCount === 0" class="eng-empty">
          <div class="eng-empty-icon">🔖</div>
          <div class="eng-empty-text">
            <strong>Suivez votre progression</strong>
            <span>Sauvegardez une ressource pour la retrouver ici et mesurer votre avancement</span>
          </div>
          <button class="eng-empty-cta" (click)="scrollToGrid()">Parcourir les ressources →</button>
        </div>

        <!-- Loading skeletons -->
        <div *ngIf="engagementsLoading" class="eng-scroll">
          <div class="eng-skel" *ngFor="let i of [1,2,3,4]"></div>
        </div>

        <!-- Fix 1: Scroll arrows + Fix 6: In-progress strip -->
        <div *ngIf="!engagementsLoading && inProgressEngagements.length > 0" class="eng-scroll-wrap">
          <button class="eng-scroll-btn eng-scroll-btn--l" (click)="scrollEng(-1)" aria-label="Précédent">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="10 13 5 8 10 3"/></svg>
          </button>
          <div class="eng-scroll" #engScrollEl>
          <div class="eng-card eng-card--{{ eng.status.toLowerCase() }}"
               *ngFor="let eng of inProgressEngagements; trackBy: trackEngById">

            <!-- Thumb / icon area -->
            <div class="eng-card-thumb eng-card-thumb--{{ eng.resourceType | lowercase }}">
              <span class="eng-card-thumb-icon">{{ typeIcon(eng.resourceType | lowercase) }}</span>
              <span class="eng-status-badge eng-status-badge--{{ eng.status.toLowerCase() }}">{{ statusLabel(eng.status) }}</span>
            </div>

            <!-- Body -->
            <div class="eng-card-body">
              <div class="eng-title">{{ eng.resourceTitle }}</div>
              <div class="eng-meta">
                <span class="eng-type-pill eng-type-pill--{{ eng.resourceType | lowercase }}">{{ typeLabel(eng.resourceType | lowercase) }}</span>
                <span *ngIf="eng.resourceCategoryName" class="eng-cat">{{ eng.resourceCategoryName }}</span>
                <span *ngIf="eng.streakDays > 0" class="eng-streak">🔥 {{ eng.streakDays }}j</span>
              </div>

              <!-- Progress zone — interactive slider -->
              <div class="eng-progress-zone">
                <div class="eng-progress-header">
                  <span class="eng-progress-label eng-progress-label--{{ eng.status.toLowerCase() }}">
                    <ng-container *ngIf="eng.status === 'NOT_STARTED'">
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      Pas commencé
                    </ng-container>
                    <ng-container *ngIf="eng.status === 'IN_PROGRESS'">
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                      En cours
                    </ng-container>
                    <ng-container *ngIf="eng.status === 'COMPLETED'">
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Terminé
                    </ng-container>
                  </span>
                  <span class="eng-progress-pct" [class.pct--done]="eng.status === 'COMPLETED'">{{ getLocalProgress(eng.resourceId) }}%</span>
                </div>

                <!-- Draggable slider -->
                <input type="range" min="0" max="100" step="5"
                  class="eng-slider eng-slider--{{ eng.status.toLowerCase() }}"
                  [value]="getLocalProgress(eng.resourceId)"
                  [style.--pct]="getLocalProgress(eng.resourceId) + '%'"
                  list="pct-ticks"
                  (input)="onProgressInput(eng.resourceId, +$any($event.target).value)"
                  (change)="onProgressChange(eng.resourceId, +$any($event.target).value)"
                  [attr.aria-label]="'Progression : ' + getLocalProgress(eng.resourceId) + '%'">

                <!-- Hints -->
                <div class="eng-progress-hint" *ngIf="eng.status === 'IN_PROGRESS'">
                  <span *ngIf="getLocalProgress(eng.resourceId) < 80">Encore {{ 100 - getLocalProgress(eng.resourceId) }}% — presque !</span>
                  <span *ngIf="getLocalProgress(eng.resourceId) >= 80">Presque fini — encore un effort 💪</span>
                </div>
                <div class="eng-completed-banner" *ngIf="eng.status === 'COMPLETED'">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Terminé · Bravo !</span>
                  <span class="eng-completed-opens" *ngIf="eng.openCount > 0">{{ eng.openCount }}×</span>
                </div>

                <div class="eng-activity" *ngIf="eng.openCount > 0">
                  <span class="eng-dot" *ngFor="let d of last7Days" [class.eng-dot--on]="eng.activityDays?.includes(d)" [title]="d"></span>
                  <span class="eng-activity-label">7j</span>
                  <span *ngIf="eng.lastOpenedAt" class="eng-last-opened">· {{ formatRelTime(eng.lastOpenedAt) }}</span>
                </div>
              </div>

              <!-- Notes inline -->
              <div class="eng-notes" *ngIf="eng.notes || editingNotesId === eng.resourceId">
                <textarea *ngIf="editingNotesId === eng.resourceId"
                  class="eng-notes-input"
                  [(ngModel)]="editingNotesValue"
                  placeholder="Ajouter une note…"
                  maxlength="600" rows="2"
                  (blur)="saveNotes(eng.resourceId)"
                  (keydown.escape)="cancelNotes()"></textarea>
                <div *ngIf="editingNotesId !== eng.resourceId"
                     class="eng-notes-text"
                     (click)="startEditNotes(eng.resourceId, eng.notes)">{{ eng.notes }}</div>
              </div>
            </div>

            <!-- Footer actions -->
            <div class="eng-actions">
              <button class="eng-btn-open eng-btn-open--{{ eng.status.toLowerCase() }}" (click)="openEngagement(eng)">
                <ng-container *ngIf="eng.status === 'NOT_STARTED'">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Commencer
                </ng-container>
                <ng-container *ngIf="eng.status === 'IN_PROGRESS'">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Continuer
                </ng-container>
                <ng-container *ngIf="eng.status === 'COMPLETED'">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  Revoir
                </ng-container>
              </button>
              <div class="eng-icon-btns">
                <button class="eng-icon-btn eng-icon-btn--note" [class.on]="!!eng.notes"
                  (click)="startEditNotes(eng.resourceId, eng.notes)" title="Note">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button *ngIf="eng.status !== 'COMPLETED'" class="eng-icon-btn eng-icon-btn--done"
                  (click)="markComplete(eng.resourceId)" title="Marquer terminé">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
                <button class="eng-icon-btn eng-icon-btn--del"
                  (click)="removeBookmarkByEngagement(eng)"
                  [disabled]="bookmarkPendingIds.has(eng.resourceId)" title="Retirer">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
            </div>

          </div>
          </div>
          <button class="eng-scroll-btn eng-scroll-btn--r" (click)="scrollEng(1)" aria-label="Suivant">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 3 11 8 6 13"/></svg>
          </button>
        </div>

        <!-- Fix 6: Completed section (collapsed) -->
        <details *ngIf="completedEngagements.length > 0" class="eng-completed-section">
          <summary class="eng-completed-summary">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            {{ completedEngagements.length }} ressource{{ completedEngagements.length !== 1 ? 's' : '' }} terminée{{ completedEngagements.length !== 1 ? 's' : '' }}
            <svg class="eng-completed-chevron" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 6 8 10 12 6"/></svg>
          </summary>
          <div class="eng-scroll eng-scroll--completed">
            <div class="eng-card eng-card--completed"
                 *ngFor="let eng of completedEngagements; trackBy: trackEngById">
              <div class="eng-card-thumb eng-card-thumb--{{ eng.resourceType | lowercase }}">
                <span class="eng-card-thumb-icon">{{ typeIcon(eng.resourceType | lowercase) }}</span>
                <span class="eng-status-badge eng-status-badge--completed">Terminé</span>
              </div>
              <div class="eng-card-body">
                <div class="eng-title">{{ eng.resourceTitle }}</div>
                <div class="eng-meta">
                  <span class="eng-type-pill eng-type-pill--{{ eng.resourceType | lowercase }}">{{ typeLabel(eng.resourceType | lowercase) }}</span>
                  <span *ngIf="eng.resourceCategoryName" class="eng-cat">{{ eng.resourceCategoryName }}</span>
                </div>
                <div class="eng-completed-banner">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Terminé · Bravo !</span>
                  <span class="eng-completed-opens" *ngIf="eng.openCount > 0">{{ eng.openCount }}×</span>
                </div>
              </div>
              <div class="eng-actions">
                <button class="eng-btn-open eng-btn-open--completed" (click)="openEngagement(eng)">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  Revoir
                </button>
                <div class="eng-icon-btns">
                  <button class="eng-icon-btn eng-icon-btn--del"
                    (click)="removeBookmarkByEngagement(eng)"
                    [disabled]="bookmarkPendingIds.has(eng.resourceId)" title="Retirer">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </details>

        <!-- Single datalist for all sliders -->
        <datalist id="pct-ticks">
          <option value="0"></option>
          <option value="25"></option>
          <option value="50"></option>
          <option value="75"></option>
          <option value="100"></option>
        </datalist>

      </section>

      <section class="admin-bar" *ngIf="isAdmin">
        <div class="admin-bar-left">
          <div class="admin-bar-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
            </svg>
          </div>
          <div class="admin-bar-text">
            <div class="admin-bar-kicker">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>ESPACE ADMINISTRATEUR</span>
            </div>
            <h3 class="admin-bar-title">Ajoutez une ressource à la bibliothèque</h3>
            <p class="admin-bar-sub">Publiez une nouvelle ressource manuellement, ou laissez l'IA générer des suggestions pertinentes pour votre catalogue.</p>
          </div>
        </div>

        <div class="admin-bar-actions">
          <button type="button" class="admin-bar-btn admin-bar-btn-primary" (click)="openCreateResourceForm()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Créer une ressource
          </button>
          <button type="button" class="admin-bar-btn admin-bar-btn-ghost" (click)="openAiAtelier()" [disabled]="isAiGenerating">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2z"/>
            </svg>
            Atelier IA
          </button>
        </div>
      </section>

      <div *ngIf="uiMessage" class="ui-feedback" [class.ui-feedback-error]="uiMessageType === 'error'">{{ uiMessage }}</div>

      <!-- Featured spotlight carousel: interactive, 3D tilt, glow, shine, stats -->
      <section
        *ngIf="spotlightResources.length > 0"
        class="sp-stage"
        (mouseenter)="onSpotlightEnter()"
        (mouseleave)="onSpotlightLeave(stageEl)"
        #stageEl>
        <div class="sp-timer">
          <div class="sp-timer-fill" [class.paused]="spotlightPaused" [class.single]="spotlightResources.length <= 1" [style.animation-duration]="'8s'"></div>
        </div>

        <div class="sp-viewport">
          <div class="sp-track" [style.transform]="'translateX(-' + (spotlightIndex * 100) + '%)'">
            <article
              *ngFor="let fr of spotlightResources; let i = index; trackBy: trackSpotlightById"
              class="sp-slide"
              [class.active]="spotlightIndex === i"
              (mousemove)="onSpotlightMove($event, cardRef)"
              (click)="openResource(fr)"
              role="button"
              tabindex="0"
              (keyup.enter)="openResource(fr)"
              #cardRef>
              <div class="sp-glow" aria-hidden="true"></div>

              <div class="sp-thumb">
                <img
                  *ngIf="fr.thumbnailUrl && !spotlightThumbErrors[i]"
                  [src]="fr.thumbnailUrl"
                  [alt]="fr.title"
                  loading="lazy"
                  (error)="spotlightThumbErrors[i] = true" />
                <div *ngIf="!fr.thumbnailUrl || spotlightThumbErrors[i]"
                     class="sp-thumb-fallback"
                     [ngClass]="'sp-thumb-' + fr.type">
                  <span class="sp-thumb-emoji">{{ typeIcon(fr.type) }}</span>
                </div>

                <!-- Shine sweep -->
                <div class="sp-shine" aria-hidden="true"></div>

                <!-- Stats overlay on thumbnail -->
                <div class="sp-stats-overlay">
                  <span class="sp-stat">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    {{ fr.rating }}
                  </span>
                  <span class="sp-stat" *ngIf="fr.duration && fr.duration !== '—' && fr.duration !== '--'">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {{ fr.duration }}
                  </span>
                </div>

                <!-- Animated play button with pulse ring -->
                <button type="button" class="sp-play" (click)="$event.stopPropagation(); openResource(fr)" [attr.aria-label]="'Ouvrir ' + fr.title">
                  <span class="sp-play-ring"></span>
                  <span class="sp-play-ring sp-play-ring-2"></span>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                    <polygon points="6 4 20 12 6 20 6 4"/>
                  </svg>
                </button>

                <span class="sp-badge-live" *ngIf="hasRealResourceUrl(fr.url)" title="Ressource active">
                  <span class="sp-live-dot"></span>
                  En ligne
                </span>
              </div>

              <div class="sp-body">
                <div class="sp-accent-stripe" aria-hidden="true"></div>
                <div class="sp-body-inner">
                  <div class="sp-kicker">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    <span>RECOMMANDÉ CETTE SEMAINE</span>
                  </div>
                  <h2 class="sp-title">{{ fr.title }}</h2>
                  <p class="sp-desc">{{ fr.description }}</p>
                  <div class="sp-meta">
                    <span class="sp-meta-item sp-meta-type" [ngClass]="'mt-' + fr.type">{{ typeIcon(fr.type) }} {{ typeLabel(fr.type) }}</span>
                    <span class="sp-meta-item">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <polyline points="2 17 12 22 22 17"/>
                        <polyline points="2 12 12 17 22 12"/>
                      </svg>
                      {{ levelLabel(fr.level) }}
                    </span>
                    <span class="sp-meta-item sp-meta-muted">{{ fr.category }}</span>
                  </div>
                  <div class="sp-actions">
                    <button type="button" class="sp-btn sp-btn-primary" (click)="$event.stopPropagation(); openResource(fr)">
                      Ouvrir
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </button>
                    <button type="button" class="sp-btn sp-btn-ghost" [class.saved]="fr.saved" (click)="$event.stopPropagation(); toggleSaved(fr)">
                      <svg viewBox="0 0 24 24" width="14" height="14" [attr.fill]="fr.saved ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                      </svg>
                      {{ fr.saved ? 'Enregistré' : 'Enregistrer' }}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>

        <!-- Navigation arrows -->
        <button
          *ngIf="spotlightResources.length > 1"
          type="button"
          class="sp-nav sp-nav-prev"
          (click)="prevSpotlight()"
          aria-label="Ressource précédente">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <button
          *ngIf="spotlightResources.length > 1"
          type="button"
          class="sp-nav sp-nav-next"
          (click)="nextSpotlight()"
          aria-label="Ressource suivante">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        <!-- Dots + counter -->
        <div class="sp-controls" *ngIf="spotlightResources.length > 1">
          <div class="sp-dots">
            <button
              *ngFor="let fr of spotlightResources; let i = index"
              type="button"
              class="sp-dot"
              [class.active]="spotlightIndex === i"
              (click)="goToSpotlight(i)"
              [attr.aria-label]="'Aller à ' + fr.title"
              [attr.aria-current]="spotlightIndex === i ? 'true' : null"></button>
          </div>
          <span class="sp-counter">
            <strong>{{ spotlightIndex + 1 }}</strong><span class="sp-counter-sep">/</span>{{ spotlightResources.length }}
          </span>
        </div>
      </section>

      <div class="lib-cmdbar">
        <!-- Row 1: Search + Actions -->
        <div class="lcb-primary">
          <div
            class="lcb-search-wrap"
            [class.has-query]="searchQuery.length > 0"
            [class.focused]="searchFocused"
            [class.has-dropdown]="showSearchDropdown">
            <div class="lcb-search">
              <svg class="lcb-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                #searchInput
                class="lcb-search-input"
                type="search"
                placeholder="Rechercher une ressource…"
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchChange($event)"
                (keyup.enter)="onSearchEnter()"
                (focus)="onSearchFocus()"
                (blur)="onSearchBlur()"
                (keydown.arrowdown)="moveSearchHint(1); $event.preventDefault()"
                (keydown.arrowup)="moveSearchHint(-1); $event.preventDefault()"
                (keydown.escape)="onSearchEscape(); $event.preventDefault()"
                aria-label="Rechercher"
                [attr.aria-expanded]="showSearchDropdown"
                aria-autocomplete="list"
                autocomplete="off"
              >
              <kbd class="lcb-search-kbd" *ngIf="!searchFocused && searchQuery.length === 0" aria-hidden="true">
                {{ isMac ? '⌘' : 'Ctrl' }} K
              </kbd>
              <button *ngIf="searchQuery.length > 0" type="button" class="lcb-search-clear" (click)="clearSearchInput()" aria-label="Effacer la recherche" title="Effacer (Esc)">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              <button
                *ngIf="voiceSearchSupported"
                type="button"
                class="lcb-voice-lang"
                (mousedown)="$event.preventDefault()"
                (click)="toggleVoiceLang()"
                [attr.aria-label]="'Langue du vocal : ' + voiceLangShort + ' (cliquer pour basculer)'"
                [title]="'Dictée : ' + voiceLangShort + ' · clic pour basculer FR↔EN'">
                <span>{{ voiceLangShort }}</span>
                <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M17 3l4 4-4 4"/>
                  <path d="M3 7h18"/>
                  <path d="M7 21l-4-4 4-4"/>
                  <path d="M21 17H3"/>
                </svg>
              </button>
              <button
                *ngIf="voiceSearchSupported"
                type="button"
                class="lcb-voice-btn"
                [class.listening]="isVoiceListening"
                (mousedown)="$event.preventDefault()"
                (click)="toggleVoiceSearch()"
                [attr.aria-label]="isVoiceListening ? 'Arrêter la recherche vocale' : ('Démarrer la recherche vocale en ' + voiceLangShort)"
                [title]="isVoiceListening ? 'Arrêter la dictée' : ('Recherche vocale (' + voiceLangShort + ')')">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
            </div>

            <!-- Live search dropdown -->
            <div class="lcb-dd" *ngIf="showSearchDropdown" (mousedown)="$event.preventDefault()">
              <!-- Empty state: recent searches + hot topics -->
              <ng-container *ngIf="searchQuery.trim().length === 0">
                <div class="lcb-dd-section" *ngIf="recentSearches.length > 0">
                  <div class="lcb-dd-head">
                    <span class="lcb-dd-label">
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      RECHERCHES RÉCENTES
                    </span>
                    <button type="button" class="lcb-dd-clear" (click)="clearRecentSearches(); $event.stopPropagation()">Effacer</button>
                  </div>
                  <button
                    *ngFor="let q of recentSearches; let i = index"
                    type="button"
                    class="lcb-dd-item lcb-dd-item-slim"
                    [class.active]="searchHintIndex === i"
                    (mouseenter)="searchHintIndex = i"
                    (click)="applySearch(q)">
                    <span class="lcb-dd-item-icon">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                    </span>
                    <span class="lcb-dd-item-text">{{ q }}</span>
                    <span class="lcb-dd-item-enter">↵</span>
                  </button>
                </div>

                <div class="lcb-dd-section">
                  <div class="lcb-dd-head">
                    <span class="lcb-dd-label">
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                      SUGGESTIONS POPULAIRES
                    </span>
                  </div>
                  <div class="lcb-dd-chips">
                    <button
                      *ngFor="let h of hotSuggestions"
                      type="button"
                      class="lcb-dd-chip"
                      (click)="applySearch(h)">{{ h }}</button>
                  </div>
                </div>

                <div class="lcb-dd-tip">
                  <span class="lcb-dd-tip-kbd">↑↓</span> naviguer
                  <span class="lcb-dd-tip-kbd">↵</span> ouvrir
                  <span class="lcb-dd-tip-kbd">Esc</span> fermer
                </div>
              </ng-container>

              <!-- Typing state: live matching resources -->
              <ng-container *ngIf="searchQuery.trim().length > 0">
                <div class="lcb-dd-head">
                  <span class="lcb-dd-label">
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <circle cx="11" cy="11" r="8"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    {{ searchSuggestions.length }} résultat{{ searchSuggestions.length !== 1 ? 's' : '' }} pour « {{ searchQuery }} »
                  </span>
                </div>

                <div class="lcb-dd-empty" *ngIf="searchSuggestions.length === 0">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    <line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                  Aucun résultat. Essayez un autre mot-clé.
                </div>

                <button
                  *ngFor="let r of searchSuggestions; let i = index; trackBy: trackSearchSuggestionById"
                  type="button"
                  class="lcb-dd-item"
                  [class.active]="searchHintIndex === i"
                  (mouseenter)="searchHintIndex = i"
                  (click)="openResourceFromSearch(r)">
                  <div class="lcb-dd-thumb" [ngClass]="'tt-' + r.type">
                    <img *ngIf="r.thumbnailUrl" [src]="r.thumbnailUrl" [alt]="r.title" loading="lazy" />
                    <span *ngIf="!r.thumbnailUrl" class="lcb-dd-thumb-emoji">{{ typeIcon(r.type) }}</span>
                  </div>
                  <div class="lcb-dd-body">
                    <div class="lcb-dd-title" [innerHTML]="highlightQuery(r.title)"></div>
                    <div class="lcb-dd-sub">
                      <span class="lcb-dd-type">{{ typeLabel(r.type) }}</span>
                      <span>·</span>
                      <span>{{ levelLabel(r.level) }}</span>
                      <span *ngIf="r.category">· {{ r.category }}</span>
                    </div>
                  </div>
                  <svg class="lcb-dd-arrow" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>

                <button
                  *ngIf="displayedResources.length > searchSuggestions.length"
                  type="button"
                  class="lcb-dd-view-all"
                  (click)="applySearch(searchQuery)">
                  Voir les {{ displayedResources.length }} résultats →
                </button>
              </ng-container>
            </div>
          </div>

          <div class="lcb-actions">
            <label class="lcb-sort-wrap">
              <span class="lcb-sort-label">Trier</span>
              <select class="lcb-sort-select" [ngModel]="sortBy()" (ngModelChange)="setSort($event)" aria-label="Trier">
                <option value="relevance">Pertinence</option>
                <option value="title-asc">Titre A-Z</option>
                <option value="title-desc">Titre Z-A</option>
                <option value="rating-desc">Mieux notés</option>
              </select>
              <svg class="lcb-sort-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </label>

            <div class="lcb-density" role="group" aria-label="Densité d'affichage">
              <button type="button" class="lcb-density-btn" [class.active]="viewDensity() === 'comfortable'" (click)="setViewDensity('comfortable')" aria-label="Affichage confort" title="Confort">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              </button>
              <button type="button" class="lcb-density-btn" [class.active]="viewDensity() === 'compact'" (click)="setViewDensity('compact')" aria-label="Affichage compact" title="Compact">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Row 2: Tabs underline -->
        <div class="lcb-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class="lcb-tab"
            *ngFor="let tab of tabs"
            [class.active]="activeTab() === tab.key"
            [attr.aria-selected]="activeTab() === tab.key"
            (click)="setTab(tab.key)">
            <span class="lcb-tab-icon" *ngIf="tab.icon" [innerHTML]="tab.icon"></span>
            <span class="lcb-tab-label">{{ tab.label }}</span>
          </button>
        </div>

        <!-- Row 3: Filters -->
        <div class="lcb-filters">
          <div class="lcb-filter-block lcb-cat-block">
            <span class="lcb-filter-lbl">Catégorie</span>
            <div class="lcb-chip-rail">
              <button
                type="button"
                class="lcb-chip"
                *ngFor="let c of displayedCategories"
                [class.active]="activeCat().id === c.id"
                (click)="setCat(c)">
                {{ c.name }}
              </button>
              <button
                *ngIf="categories.length > maxVisibleCategories"
                type="button"
                class="lcb-chip lcb-chip-ghost"
                (click)="toggleCategoryView()">
                {{ showAllCategories ? '− Moins' : '+ Plus' }}
              </button>
            </div>
          </div>

          <div class="lcb-filter-block">
            <span class="lcb-filter-lbl">Niveau</span>
            <div class="lcb-segment" role="radiogroup" aria-label="Filtrer par niveau">
              <button type="button" class="lcb-seg-btn" [class.active]="activeLevel() === 'ALL'" (click)="setLevel('ALL')">Tous</button>
              <button type="button" class="lcb-seg-btn" [class.active]="activeLevel() === 'BEGINNER'" (click)="setLevel('BEGINNER')">Débutant</button>
              <button type="button" class="lcb-seg-btn" [class.active]="activeLevel() === 'INTERMEDIATE'" (click)="setLevel('INTERMEDIATE')">Intermédiaire</button>
              <button type="button" class="lcb-seg-btn" [class.active]="activeLevel() === 'ADVANCED'" (click)="setLevel('ADVANCED')">Avancé</button>
            </div>
          </div>

          <div class="lcb-filter-footer">
            <span class="lcb-count">
              <strong>{{ displayedResources.length }}</strong> résultat{{ displayedResources.length !== 1 ? 's' : '' }}
            </span>
            <span *ngIf="activeFilterCount > 0" class="lcb-filter-pill">
              <svg viewBox="0 0 24 24" width="8" height="8" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="6"/></svg>
              {{ activeFilterSummary }}
            </span>
            <button *ngIf="hasActiveFilters" type="button" class="lcb-clear-btn" (click)="resetFilters()">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Effacer
            </button>
          </div>
        </div>
      </div>

      <!-- Main resource grid (extracted sub-component) -->
      <app-lib-resource-grid
        [resources]="displayedResources"
        [isLoading]="isLoading"
        [loadError]="loadError"
        [isAdmin]="isAdmin"
        [compact]="viewDensity() === 'compact'"
        [currentPage]="currentPage"
        [totalPages]="totalPages"
        [totalElements]="totalElements"
        [sectionTitle]="sectionTitleFr"
        [summarizingIds]="isSummarizingById"
        [recentlyCreatedIds]="recentlyCreatedSet"
        [progressMap]="resourceProgress"
        [bookmarkPendingIds]="bookmarkPendingIds"
        (toggleSaved)="toggleSaved($event)"
        (open)="openResource($event)"
        (summarize)="onResourceSummarize($event)"
        (edit)="onResourceEdit($event)"
        (delete)="onResourceDelete($event)"
        (pageChange)="onGridPageChange($event)"
        (retry)="retryLoad()"
        (resetFilters)="resetFilters()"
        (create)="openCreateResourceForm()"
      ></app-lib-resource-grid>

      <!-- Resource Form Modal -->
      <app-resource-form-modal
        [isOpen]="showResourceForm"
        [resource]="editingResource || undefined"
        (closed)="onFormClosed($event)"
      ></app-resource-form-modal>

      <!-- ================== KEYBOARD SHORTCUTS OVERLAY ================== -->
      <div class="kbd-overlay" *ngIf="showShortcuts" (click)="showShortcuts = false">
        <div class="kbd-modal" (click)="$event.stopPropagation()" role="dialog" aria-label="Raccourcis clavier">
          <header class="kbd-head">
            <div>
              <div class="kbd-kicker">RACCOURCIS CLAVIER</div>
              <h3 class="kbd-title">Maîtrisez la bibliothèque en un clin d'œil</h3>
            </div>
            <button type="button" class="kbd-close" (click)="showShortcuts = false" aria-label="Fermer">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </header>

          <div class="kbd-grid">
            <div class="kbd-section">
              <div class="kbd-section-title">NAVIGATION</div>
              <div class="kbd-row"><span class="kbd-desc">Focus la recherche</span><span class="kbd-keys"><kbd>{{ isMac ? '⌘' : 'Ctrl' }}</kbd><kbd>K</kbd></span></div>
              <div class="kbd-row"><span class="kbd-desc">Focus la recherche (rapide)</span><span class="kbd-keys"><kbd>/</kbd></span></div>
              <div class="kbd-row"><span class="kbd-desc">Naviguer les résultats</span><span class="kbd-keys"><kbd>↑</kbd><kbd>↓</kbd></span></div>
              <div class="kbd-row"><span class="kbd-desc">Ouvrir le résultat sélectionné</span><span class="kbd-keys"><kbd>↵</kbd></span></div>
              <div class="kbd-row"><span class="kbd-desc">Fermer / annuler</span><span class="kbd-keys"><kbd>Esc</kbd></span></div>
            </div>

            <div class="kbd-section">
              <div class="kbd-section-title">SPOTLIGHT</div>
              <div class="kbd-row"><span class="kbd-desc">Ressource précédente / suivante</span><span class="kbd-keys"><kbd>←</kbd><kbd>→</kbd></span></div>
              <div class="kbd-row"><span class="kbd-desc">Pause du carousel</span><span class="kbd-keys"><kbd>hover</kbd></span></div>
            </div>

            <div class="kbd-section">
              <div class="kbd-section-title">IA</div>
              <div class="kbd-row"><span class="kbd-desc">Résumer la ressource focus</span><span class="kbd-keys"><kbd>S</kbd></span></div>
              <div class="kbd-row"><span class="kbd-desc">Écouter le résumé (TTS)</span><span class="kbd-keys"><kbd>P</kbd></span></div>
              <div class="kbd-row"><span class="kbd-desc">Régénérer le résumé</span><span class="kbd-keys"><kbd>R</kbd></span></div>
            </div>

            <div class="kbd-section">
              <div class="kbd-section-title">GÉNÉRAL</div>
              <div class="kbd-row"><span class="kbd-desc">Afficher ce panneau</span><span class="kbd-keys"><kbd>?</kbd></span></div>
              <div class="kbd-row"><span class="kbd-desc">Ouvrir l'Atelier IA (admin)</span><span class="kbd-keys"><kbd>G</kbd></span></div>
              <div class="kbd-row"><span class="kbd-desc">Créer une ressource (admin)</span><span class="kbd-keys"><kbd>N</kbd></span></div>
            </div>
          </div>

          <footer class="kbd-footer">
            <span class="kbd-hint">Appuyez sur <kbd>?</kbd> à tout moment pour afficher ce panneau</span>
          </footer>
        </div>
      </div>

      <!-- ================== AI ATELIER (multi-step generate) ================== -->
      <div class="aia-overlay" *ngIf="showAiAtelier" (click)="closeAiAtelier()">
        <div class="aia" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <!-- animated mesh background -->
          <div class="aia-bg" aria-hidden="true">
            <div class="aia-mesh aia-mesh-1"></div>
            <div class="aia-mesh aia-mesh-2"></div>
            <div class="aia-mesh aia-mesh-3"></div>
            <div class="aia-grid"></div>
          </div>

          <button class="aia-close" (click)="closeAiAtelier()" aria-label="Fermer l'atelier" [disabled]="aiAtelierStep === 'generating'">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <header class="aia-head">
            <div class="aia-kicker">
              <span class="aia-kicker-dot"></span>
              <span>ATELIER IA · CO-CRÉATION</span>
            </div>
            <h2 class="aia-title">
              <span>L'intelligence au service de votre</span>
              <span class="aia-title-accent">bibliothèque</span>
            </h2>
            <p class="aia-sub">Formulez votre brief, l'IA orchestre le reste — génération, structuration, publication.</p>
          </header>

          <!-- ========= STEP 1: BRIEF ========= -->
          <section class="aia-step" *ngIf="aiAtelierStep === 'brief'">
            <div class="aia-field">
              <label class="aia-label">
                <span>Combien de ressources ?</span>
                <strong class="aia-label-value">{{ aiBrief.count }}</strong>
              </label>
              <div class="aia-slider-wrap">
                <input
                  type="range"
                  min="1" max="10" step="1"
                  class="aia-slider"
                  [(ngModel)]="aiBrief.count"
                  [style.--slider-fill]="((aiBrief.count - 1) / 9 * 100) + '%'"
                />
                <div class="aia-slider-ticks">
                  <span *ngFor="let n of aiSliderTicks" [class.active]="aiBrief.count >= n">{{ n }}</span>
                </div>
              </div>
            </div>

            <div class="aia-field">
              <label class="aia-label"><span>Niveau cible</span></label>
              <div class="aia-segment">
                <button type="button" class="aia-seg" [class.active]="aiBrief.level === 'MIX'" (click)="aiBrief.level = 'MIX'">Mix équilibré</button>
                <button type="button" class="aia-seg" [class.active]="aiBrief.level === 'BEGINNER'" (click)="aiBrief.level = 'BEGINNER'">Débutant</button>
                <button type="button" class="aia-seg" [class.active]="aiBrief.level === 'INTERMEDIATE'" (click)="aiBrief.level = 'INTERMEDIATE'">Intermédiaire</button>
                <button type="button" class="aia-seg" [class.active]="aiBrief.level === 'ADVANCED'" (click)="aiBrief.level = 'ADVANCED'">Avancé</button>
              </div>
            </div>

            <div class="aia-field">
              <label class="aia-label"><span>Axes thématiques</span><span class="aia-label-hint">optionnel</span></label>
              <div class="aia-focus-grid">
                <button
                  type="button"
                  class="aia-focus"
                  *ngFor="let f of aiFocusOptions"
                  [class.active]="aiBrief.focus.includes(f.value)"
                  (click)="toggleAiFocus(f.value)">
                  <span class="aia-focus-emoji">{{ f.emoji }}</span>
                  <span class="aia-focus-label">{{ f.label }}</span>
                  <svg *ngIf="aiBrief.focus.includes(f.value)" class="aia-focus-check" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="aia-launchpad">
              <button type="button" class="aia-launch" (click)="runAiGeneration()">
                <span class="aia-launch-ring"></span>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2z"/>
                </svg>
                Lancer la génération
              </button>
              <p class="aia-launch-hint">L'IA va analyser le catalogue et créer <strong>{{ aiBrief.count }}</strong> ressource{{ aiBrief.count !== 1 ? 's' : '' }} cohérentes.</p>
            </div>
          </section>

          <!-- ========= STEP 2: GENERATING ========= -->
          <section class="aia-step aia-step-gen" *ngIf="aiAtelierStep === 'generating'">
            <div class="aia-brain">
              <div class="aia-brain-core"></div>
              <div class="aia-brain-orbit aia-orbit-1">
                <div class="aia-orbit-node"></div>
              </div>
              <div class="aia-brain-orbit aia-orbit-2">
                <div class="aia-orbit-node"></div>
              </div>
              <div class="aia-brain-orbit aia-orbit-3">
                <div class="aia-orbit-node"></div>
              </div>
              <svg class="aia-brain-icon" viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/>
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/>
              </svg>
            </div>

            <div class="aia-gen-status" aria-live="polite">
              <div class="aia-gen-label">L'IA compose votre bibliothèque</div>
              <div class="aia-gen-message">{{ aiStatusMessages[aiStatusIndex] }}</div>
            </div>

            <div class="aia-gen-progress">
              <div class="aia-gen-track">
                <div class="aia-gen-fill"></div>
              </div>
              <div class="aia-gen-dots">
                <span class="aia-gen-dot" *ngFor="let _ of [1,2,3,4,5]"></span>
              </div>
            </div>

            <ul class="aia-gen-checklist">
              <li [class.done]="aiStatusIndex >= 1">
                <span class="aia-check-box"></span>Analyse du catalogue existant
              </li>
              <li [class.done]="aiStatusIndex >= 2">
                <span class="aia-check-box"></span>Identification des lacunes
              </li>
              <li [class.done]="aiStatusIndex >= 3">
                <span class="aia-check-box"></span>Génération des ressources
              </li>
              <li [class.done]="aiStatusIndex >= 4">
                <span class="aia-check-box"></span>Vérification & publication
              </li>
            </ul>

            <div class="aia-gen-actions">
              <button type="button" class="aia-btn aia-btn-ghost" (click)="cancelAiGeneration()" [disabled]="aiCancelRequested">
                {{ aiCancelRequested ? 'Annulation…' : 'Annuler' }}
              </button>
              <p class="aia-gen-hint">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                {{ aiModelLabel }} tourne en local · jusqu'à 30s pour la première génération
              </p>
            </div>
          </section>

          <!-- ========= STEP 3: DONE ========= -->
          <section class="aia-step aia-step-done" *ngIf="aiAtelierStep === 'done'">
            <div class="aia-success">
              <div class="aia-success-ring">
                <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div class="aia-confetti-burst" aria-hidden="true">
                <span>✨</span><span>🎉</span><span>⭐</span><span>💫</span><span>✨</span>
              </div>
            </div>

            <h3 class="aia-done-title">{{ aiLastResult?.created || 0 }} ressource{{ (aiLastResult?.created || 0) !== 1 ? 's' : '' }} créée{{ (aiLastResult?.created || 0) !== 1 ? 's' : '' }} !</h3>
            <p class="aia-done-sub" *ngIf="(aiLastResult?.skipped || 0) > 0">{{ aiLastResult?.skipped }} doublon{{ (aiLastResult?.skipped || 0) !== 1 ? 's' : '' }} ignoré{{ (aiLastResult?.skipped || 0) !== 1 ? 's' : '' }} automatiquement.</p>

            <div class="aia-done-gallery" *ngIf="aiGeneratedPreviews.length > 0">
              <div
                class="aia-done-card"
                *ngFor="let r of aiGeneratedPreviews; let i = index"
                [style.animation-delay]="(i * 90) + 'ms'">
                <div class="aia-done-type" [ngClass]="'aia-dt-' + mapType(r.type)">{{ typeIcon(mapType(r.type)) }}</div>
                <div class="aia-done-body">
                  <div class="aia-done-name">{{ r.title }}</div>
                  <div class="aia-done-meta">
                    <span class="aia-done-chip">{{ typeLabel(mapType(r.type)) }}</span>
                    <span class="aia-done-chip aia-done-chip-muted">{{ levelLabel(mapLevel(r.level)) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="aia-done-actions">
              <button type="button" class="aia-btn aia-btn-primary" (click)="closeAiAtelier()">
                Voir dans la bibliothèque
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
              <button type="button" class="aia-btn aia-btn-ghost" (click)="resetAiAtelier()">Générer encore</button>
            </div>
          </section>

          <!-- ========= ERROR ========= -->
          <section class="aia-step aia-step-error" *ngIf="aiAtelierStep === 'error'">
            <div class="aia-error-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3 class="aia-done-title">La génération a échoué</h3>
            <p class="aia-done-sub">{{ aiError || 'Une erreur inattendue s\\'est produite.' }}</p>
            <div class="aia-done-actions">
              <button type="button" class="aia-btn aia-btn-primary" (click)="resetAiAtelier()">Réessayer</button>
              <button type="button" class="aia-btn aia-btn-ghost" (click)="closeAiAtelier()">Fermer</button>
            </div>
          </section>
        </div>
      </div>

      <!-- ================== AI SUMMARY THEATER ================== -->
      <div class="ast-overlay" *ngIf="showSummaryModal" (click)="closeSummaryModal()">
        <div class="ast" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-label="Résumé IA">
          <div class="ast-bg" aria-hidden="true">
            <div class="ast-wave ast-wave-1"></div>
            <div class="ast-wave ast-wave-2"></div>
          </div>

          <header class="ast-head">
            <div class="ast-head-badge">
              <div class="ast-brain-pulse" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2zM14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/>
                </svg>
              </div>
              <div>
                <div class="ast-kicker">RÉSUMÉ GÉNÉRÉ PAR L'IA</div>
                <h3 class="ast-title">{{ summaryResourceTitle }}</h3>
              </div>
            </div>
            <button class="ast-close" (click)="closeSummaryModal()" aria-label="Fermer">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </header>

          <div class="ast-body">
            <!-- Typewriter summary -->
            <div class="ast-section">
              <div class="ast-section-label">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                SYNTHÈSE
              </div>
              <div class="ast-skel-wrap" *ngIf="!summaryTypewriter && !summaryRevealDone" aria-hidden="true">
                <div class="ast-skel-line" style="width:88%"></div>
                <div class="ast-skel-line" style="width:100%"></div>
                <div class="ast-skel-line" style="width:66%"></div>
              </div>
              <p class="ast-summary-text" *ngIf="summaryTypewriter || summaryRevealDone" (click)="skipSummaryReveal()" [class.done]="summaryRevealDone">
                {{ summaryTypewriter }}<span class="ast-caret" *ngIf="!summaryRevealDone"></span>
              </p>
            </div>

            <!-- Key points checklist -->
            <div class="ast-section" *ngIf="summaryPoints.length > 0">
              <div class="ast-section-label">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="9 11 12 14 20 6"/>
                  <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12"/>
                </svg>
                POINTS CLÉS
              </div>
              <ul class="ast-points">
                <li
                  *ngFor="let p of summaryPoints; let i = index"
                  class="ast-point"
                  [class.revealed]="i < summaryRevealedPoints">
                  <span class="ast-point-check">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </span>
                  <span class="ast-point-text">{{ p }}</span>
                </li>
              </ul>
            </div>

            <!-- Related resources (AI similarity) -->
            <div class="ast-sim-section" *ngIf="similarLoading || similarResources.length > 0">

              <div class="ast-sim-header">
                <span class="ast-sim-header-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="13" height="13" fill="currentColor">
                    <path d="M10 2l1.5 4.5 4.5.7-3.3 3.2.8 4.6L10 13l-3.5 2 .8-4.6L4 7.2l4.5-.7z"/>
                    <circle cx="3.5" cy="3.5" r="1.1"/>
                    <circle cx="16.5" cy="4" r="0.9"/>
                    <circle cx="17" cy="15" r="1"/>
                  </svg>
                </span>
                <span class="ast-sim-header-text">Aller plus loin</span>
                <span class="ast-sim-header-count" *ngIf="!similarLoading && similarResources.length > 0">{{ similarResources.length }}</span>
              </div>

              <!-- Skeletons -->
              <div class="ast-sim-list" *ngIf="similarLoading">
                <div class="ast-sim-skel" *ngFor="let _ of [1,2,3]"></div>
              </div>

              <!-- Items -->
              <div class="ast-sim-list" *ngIf="!similarLoading">
                <button
                  type="button"
                  class="ast-sim-item"
                  *ngFor="let s of similarResources; let i = index"
                  [style.animation-delay]="(i * 70) + 'ms'"
                  (click)="openSimilarResource(s)">

                  <!-- Thumb -->
                  <div class="ast-sim-thumb" [ngClass]="'ast-sim-t-' + mapType(s.type)">
                    <img *ngIf="s.thumbUrl" [src]="s.thumbUrl" [alt]="s.title" loading="lazy" (error)="s.thumbUrl = null" />
                    <span *ngIf="!s.thumbUrl" class="ast-sim-emoji">{{ typeIcon(mapType(s.type)) }}</span>
                  </div>

                  <!-- Body -->
                  <div class="ast-sim-body">
                    <div class="ast-sim-title">{{ s.title }}</div>
                    <div class="ast-sim-tags">
                      <span class="ast-sim-badge" [ngClass]="'ast-sim-b-' + mapType(s.type)">{{ typeLabel(mapType(s.type)) }}</span>
                      <span class="ast-sim-level">{{ levelLabel(mapLevel(s.level)) }}</span>
                      <span class="ast-sim-cat" *ngIf="s.categoryName">{{ s.categoryName }}</span>
                    </div>
                  </div>

                  <!-- Arrow -->
                  <span class="ast-sim-cta" aria-hidden="true">
                    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="3" y1="8" x2="13" y2="8"/>
                      <polyline points="9 4 13 8 9 12"/>
                    </svg>
                  </span>
                </button>
              </div>
            </div>

            <!-- AI provider footer -->
            <div class="ast-provider" *ngIf="summaryProvider">
              <div class="ast-provider-dot"></div>
              Synthétisé par <strong>{{ summaryProvider === 'ollama' ? 'Ollama (local)' : summaryProvider === 'stub' ? 'Analyse locale' : summaryProvider === 'groq' ? 'Groq · Llama 3' : summaryProvider }}</strong>
              <span class="ast-provider-time" *ngIf="summaryGeneratedAt">· {{ summaryGeneratedAt }}</span>
              <span class="ast-provider-cache" *ngIf="summaryProvider === 'ollama'" title="Résultat mis en cache 30 min après la première génération">
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                mis en cache
              </span>
            </div>
          </div>

          <footer class="ast-footer">
            <button
              type="button"
              class="ast-btn ast-btn-ghost"
              (click)="toggleSpeakSummary()"
              [class.speaking]="isSpeakingSummary"
              *ngIf="ttsSupported"
              [title]="isSpeakingSummary ? 'Arrêter la lecture' : 'Écouter le résumé'">
              <svg *ngIf="!isSpeakingSummary" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
              <svg *ngIf="isSpeakingSummary" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                <rect x="5" y="5" width="4" height="14" rx="1"/>
                <rect x="15" y="5" width="4" height="14" rx="1"/>
              </svg>
              {{ isSpeakingSummary ? 'Stop' : 'Écouter' }}
            </button>
            <button type="button" class="ast-btn ast-btn-ghost" (click)="copySummary()" [class.copied]="summaryCopied">
              <svg *ngIf="!summaryCopied" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              <svg *ngIf="summaryCopied" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {{ summaryCopied ? 'Copié !' : 'Copier' }}
            </button>
            <button type="button" class="ast-btn ast-btn-ghost" (click)="regenerateSummary()" [disabled]="summaryRegenerating">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" [class.spin]="summaryRegenerating">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              {{ summaryRegenerating ? 'Régénération…' : 'Régénérer' }}
            </button>
            <button type="button" class="ast-btn ast-btn-primary" (click)="closeSummaryModal()">Terminé</button>
          </footer>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ============ HERO HEADER (redesigned) ============ */
    .lib-hero {
      position: relative;
      margin-bottom: 24px;
      padding: 36px 40px;
      border-radius: 24px;
      overflow: hidden;
      background:
        radial-gradient(circle at 20% 20%, rgba(20, 184, 166, 0.08), transparent 50%),
        radial-gradient(circle at 80% 30%, rgba(34, 211, 238, 0.08), transparent 55%),
        linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
    }

    /* Animated orbs background */
    .lib-hero-bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
    .lib-hero-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.55;
    }
    .lib-hero-orb-1 {
      width: 320px; height: 320px;
      background: radial-gradient(circle, #14b8a6, transparent 70%);
      top: -100px; left: -80px;
      animation: lib-hero-orb-1 18s ease-in-out infinite;
    }
    .lib-hero-orb-2 {
      width: 280px; height: 280px;
      background: radial-gradient(circle, #22d3ee, transparent 70%);
      top: 20%; right: 15%;
      animation: lib-hero-orb-2 22s ease-in-out infinite;
    }
    .lib-hero-orb-3 {
      width: 240px; height: 240px;
      background: radial-gradient(circle, #a5f3fc, transparent 70%);
      bottom: -80px; right: -60px;
      animation: lib-hero-orb-3 20s ease-in-out infinite;
    }
    @keyframes lib-hero-orb-1 { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(40px, 30px); } }
    @keyframes lib-hero-orb-2 { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(-50px, 20px); } }
    @keyframes lib-hero-orb-3 { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(-30px, -40px); } }

    .lib-hero-grid {
      position: absolute; inset: 0;
      background-image:
        linear-gradient(rgba(15, 23, 42, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(15, 23, 42, 0.04) 1px, transparent 1px);
      background-size: 28px 28px;
      mask-image: radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 75%);
      -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 75%);
    }

    .lib-hero-content {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 32px;
      align-items: center;
    }

    /* Left: text */
    .lib-hero-text { min-width: 0; }

    .lib-hero-kicker {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 11px 5px 9px;
      border-radius: 999px;
      background: linear-gradient(135deg, rgba(20, 184, 166, 0.14), rgba(34, 211, 238, 0.14));
      color: #0f766e;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      border: 1px solid rgba(20, 184, 166, 0.25);
      margin-bottom: 14px;
    }
    .lib-hero-kicker svg { color: #f59e0b; animation: lib-hero-sparkle 2.4s ease-in-out infinite; }
    @keyframes lib-hero-sparkle { 0%, 100% { transform: scale(1) rotate(0); } 50% { transform: scale(1.25) rotate(15deg); } }

    .lib-hero-title {
      font-family: 'Fraunces', Georgia, serif;
      font-size: clamp(1.8rem, 3.6vw, 2.5rem);
      font-weight: 600;
      color: #0f172a;
      margin: 0 0 10px;
      line-height: 1.08;
      letter-spacing: -0.025em;
    }
    .lib-hero-title-accent {
      background: linear-gradient(135deg, #14b8a6 0%, #0891b2 50%, #0ea5e9 100%);
      background-size: 200% 100%;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      font-style: italic;
      animation: lib-hero-gradient 6s ease infinite;
    }
    @keyframes lib-hero-gradient { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }

    .lib-hero-sub {
      font-size: 1rem;
      color: #64748b;
      line-height: 1.55;
      margin: 0 0 18px;
      max-width: 620px;
    }

    .lib-hero-role {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px 6px 10px;
      border-radius: 999px;
      background: #f0fdfa;
      color: #0f766e;
      border: 1px solid #ccfbf1;
      font-size: 0.78rem;
      font-weight: 600;
    }
    .lib-hero-role.admin {
      background: linear-gradient(135deg, #fef3c7, #fde68a);
      color: #92400e;
      border-color: #fcd34d;
    }
    .lib-hero-role-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 0 0 currentColor;
      animation: lib-hero-role-pulse 2s infinite;
      opacity: 0.9;
    }
    @keyframes lib-hero-role-pulse {
      0% { box-shadow: 0 0 0 0 rgba(20, 184, 166, 0.5); }
      70% { box-shadow: 0 0 0 8px rgba(20, 184, 166, 0); }
      100% { box-shadow: 0 0 0 0 rgba(20, 184, 166, 0); }
    }

    /* Right: stats dashboard */
    .lib-hero-stats {
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex-shrink: 0;
    }
    .lib-stat {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(226, 232, 240, 0.85);
      min-width: 210px;
      cursor: pointer;
      font-family: inherit;
      color: inherit;
      text-align: left;
      overflow: hidden;
      transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease, background 220ms ease;
    }
    .lib-stat:hover:not(:disabled) {
      transform: translateY(-2px);
      border-color: rgba(20, 184, 166, 0.45);
      box-shadow: 0 12px 26px -8px rgba(15, 23, 42, 0.15);
    }
    .lib-stat:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    .lib-stat:focus-visible {
      outline: none;
      border-color: #14b8a6;
      box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.22);
    }
    .lib-stat.active:not(.lib-stat-primary) {
      border-color: #14b8a6;
      background: linear-gradient(135deg, #f0fdfa, #ecfeff);
      box-shadow: 0 6px 16px -6px rgba(20, 184, 166, 0.3), 0 0 0 2px rgba(20, 184, 166, 0.3);
    }
    .lib-stat.active .lib-stat-arrow { opacity: 1; transform: translateX(2px); color: #14b8a6; }

    /* Sweep highlight on hover */
    .lib-stat::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(115deg, transparent 40%, rgba(20, 184, 166, 0.08) 50%, transparent 60%);
      transform: translateX(-120%);
      transition: transform 650ms ease;
      pointer-events: none;
    }
    .lib-stat:hover:not(:disabled)::before { transform: translateX(120%); }

    .lib-stat-primary {
      background: linear-gradient(135deg, #0f766e 0%, #0891b2 100%);
      border: 1px solid transparent;
      color: #fff;
      box-shadow: 0 10px 24px -8px rgba(15, 118, 110, 0.45);
    }
    .lib-stat-primary:hover:not(:disabled) {
      box-shadow: 0 16px 34px -8px rgba(15, 118, 110, 0.55);
      border-color: rgba(255,255,255,0.2);
    }
    .lib-stat-primary.active {
      box-shadow: 0 16px 34px -8px rgba(15, 118, 110, 0.6), 0 0 0 2px rgba(255,255,255,0.35) inset;
    }
    .lib-stat-primary::before {
      background: linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.2) 50%, transparent 60%);
    }
    .lib-stat-primary .lib-stat-arrow { color: rgba(255,255,255,0.8); }
    .lib-stat-icon {
      width: 40px; height: 40px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .lib-stat:not(.lib-stat-primary) .lib-stat-icon {
      background: linear-gradient(135deg, rgba(20, 184, 166, 0.1), rgba(34, 211, 238, 0.1));
      color: #0f766e;
      border: 1px solid rgba(20, 184, 166, 0.15);
    }
    .lib-stat-icon-accent { background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(244, 63, 94, 0.1)) !important; color: #be185d !important; border: 1px solid rgba(236, 72, 153, 0.18) !important; }
    .lib-stat-icon-video  { background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1)) !important; color: #6d28d9 !important; border: 1px solid rgba(139, 92, 246, 0.18) !important; }
    .lib-stat-icon-cat    { background: linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(14, 165, 233, 0.12)) !important; color: #0e7490 !important; border: 1px solid rgba(6, 182, 212, 0.2) !important; }

    .lib-stat-body { min-width: 0; flex: 1; }
    .lib-stat-value {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .lib-stat-num {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 1.7rem;
      font-weight: 600;
      line-height: 1;
      letter-spacing: -0.02em;
      color: #0f172a;
      transition: color 220ms ease;
    }
    .lib-stat-num.just-changed {
      animation: lib-stat-pulse 900ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    @keyframes lib-stat-pulse {
      0%   { transform: scale(1); color: inherit; }
      25%  { transform: scale(1.18); color: #14b8a6; text-shadow: 0 0 14px rgba(20, 184, 166, 0.45); }
      100% { transform: scale(1); color: inherit; text-shadow: none; }
    }
    .lib-stat-primary .lib-stat-num.just-changed {
      animation: lib-stat-pulse-light 900ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    @keyframes lib-stat-pulse-light {
      0%   { transform: scale(1); }
      25%  { transform: scale(1.18); text-shadow: 0 0 16px rgba(255, 255, 255, 0.7); }
      100% { transform: scale(1); text-shadow: none; }
    }
    .lib-stat-pct {
      font-size: 0.72rem;
      font-weight: 600;
      color: #64748b;
      padding: 2px 7px;
      border-radius: 999px;
      background: #f1f5f9;
    }
    .lib-stat-primary .lib-stat-num { color: #fff; }
    .lib-stat-primary .lib-stat-pct { color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.15); }

    .lib-stat-label {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      margin-top: 3px;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .lib-stat-trend {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 999px;
      background: #dcfce7;
      color: #15803d;
      text-transform: none;
      letter-spacing: 0;
    }
    .lib-stat-primary .lib-stat-trend { background: rgba(255,255,255,0.18); color: #fff; }
    .lib-stat-primary .lib-stat-label { color: rgba(255, 255, 255, 0.85); }

    .lib-stat-arrow {
      position: absolute;
      top: 50%;
      right: 14px;
      transform: translateY(-50%);
      color: #94a3b8;
      font-size: 1rem;
      font-weight: 600;
      opacity: 0;
      transition: opacity 180ms ease, transform 180ms ease, color 180ms ease;
      pointer-events: none;
    }
    .lib-stat:hover:not(:disabled) .lib-stat-arrow { opacity: 1; transform: translateY(-50%) translateX(2px); color: #14b8a6; }
    .lib-stat-primary:hover:not(:disabled) .lib-stat-arrow { color: rgba(255,255,255,0.95); }

    /* Hide legacy header styles */
    .page-header, .quick-note.info-banner { display: none !important; }

    @media (max-width: 900px) {
      .lib-hero-content { grid-template-columns: 1fr; gap: 20px; }
      .lib-hero-stats { flex-direction: row; flex-wrap: wrap; }
      .lib-stat { min-width: auto; flex: 1 1 auto; }
    }
    @media (max-width: 640px) {
      .lib-hero { padding: 24px 20px; border-radius: 18px; }
      .lib-hero-title { font-size: 1.65rem; }
      .lib-stat { min-width: 140px; padding: 10px 14px; }
      .lib-stat-icon { width: 36px; height: 36px; }
      .lib-stat-value { font-size: 1.35rem; }
    }

    @media (prefers-reduced-motion: reduce) {
      .lib-hero-orb-1, .lib-hero-orb-2, .lib-hero-orb-3, .lib-hero-kicker svg,
      .lib-hero-title-accent, .lib-hero-role-dot, .lib-stat { animation: none !important; transition: none !important; transform: none !important; }
    }

                    /* Best-in-class discover panel refinement */
                    .discover-panel {
                      background: linear-gradient(120deg, #fafdff 90%, #e0f7fa 100%);
                      border-radius: 14px;
                      box-shadow: 0 2px 8px 0 rgba(56, 189, 248, 0.07);
                      padding: 14px 18px 10px 18px;
                      margin-bottom: 16px;
                      border: none;
                      max-width: 900px;
                      margin-left: auto;
                      margin-right: auto;
                    }
                    .minimal-tabs .tab-item {
                      font-size: 1.01rem;
                      padding: 7px 14px;
                      border-radius: 10px;
                      background: none;
                      color: #0284c7;
                      font-weight: 600;
                      box-shadow: 0 1px 4px 0 rgba(56,189,248,0.05);
                      transition: background 0.18s, color 0.18s;
                    }
                    .minimal-tabs .tab-item.active {
                      background: linear-gradient(90deg, #e0f2fe 80%, #f0fdfa 100%);
                      color: #0ea5e9;
                      box-shadow: 0 1.5px 8px rgba(56,189,248,0.07);
                    }
                    .tab-icon {
                      font-size: 1.1em;
                    }
                    .minimal-search {
                      background: #fafdff;
                      border-radius: 999px;
                      padding: 4px 10px;
                      box-shadow: 0 1px 4px 0 rgba(56,189,248,0.05);
                      border: 1px solid #e0e7ef;
                      margin-bottom: 6px;
                    }
                    .minimal-search .input {
                      font-size: 1.01rem;
                      color: #0f172a;
                      padding: 6px 0;
                    }
                    .minimal-filter-group {
                      gap: 5px;
                    }
                    .chip-scroll .chip, .minimal-filter-group .chip {
                      font-size: 1em;
                      padding: 8px 18px;
                      border-radius: 999px;
                      background: #f0fdfa;
                      color: #0284c7;
                      font-weight: 500;
                      box-shadow: 0 1px 6px 0 rgba(56,189,248,0.04);
                      border: 1.5px solid #e0e7ef;
                      margin-bottom: 0;
                      transition: background 0.18s, color 0.18s, border 0.18s, box-shadow 0.18s, transform 0.18s;
                      cursor: pointer;
                      outline: none;
                    }
                    .chip-scroll .chip:focus-visible, .minimal-filter-group .chip:focus-visible {
                      border: 1.5px solid #38bdf8;
                      box-shadow: 0 0 0 2px #bae6fd;
                    }
                    .chip-scroll .chip:hover, .minimal-filter-group .chip:hover {
                      background: #e0f2fe;
                      color: #0284c7;
                      border: 1.5px solid #38bdf8;
                      transform: translateY(-2px) scale(1.07);
                      box-shadow: 0 2px 12px 0 rgba(56,189,248,0.10);
                    }
                    .chip-scroll .chip.active, .minimal-filter-group .chip.active, .chip-teal {
                      background: linear-gradient(90deg, #38bdf8 0%, #0ea5e9 100%) !important;
                      color: #fff !important;
                      border: none !important;
                      font-weight: 700;
                      box-shadow: 0 4px 16px 0 rgba(56,189,248,0.13);
                      transform: translateY(-2px) scale(1.10);
                      letter-spacing: 0.01em;
                    }
                    .chip-scroll {
                      display: flex;
                      flex-wrap: wrap;
                      gap: 8px;
                      margin-bottom: 2px;
                    }
                    .minimal-filter-group {
                      gap: 8px;
                    }
                    .chip-scroll .chip:hover, .minimal-filter-group .chip:hover {
                      background: #e0f2fe;
                      color: #0284c7;
                      border: 1px solid #bae6fd;
                    }
                    .chip-teal {
                      background: #d1fae5 !important;
                      color: #059669 !important;
                      border: 1px solid #bbf7d0 !important;
                      font-weight: 600;
                    }
                    .chip-mint {
                      background: #e0fdf4 !important;
                      color: #059669 !important;
                      border: 1px solid #bbf7d0 !important;
                      font-weight: 600;
                    }
                    .chip-peach {
                      background: #fef3c7 !important;
                      color: #b45309 !important;
                      border: 1px solid #fde68a !important;
                      font-weight: 600;
                    }
                    .chip-cyan {
                      background: #e0f2fe !important;
                      color: #0284c7 !important;
                      border: 1px solid #bae6fd !important;
                      font-weight: 600;
                    }
                    .chip-premium {
                      background: #f3e8ff !important;
                      color: #7c3aed !important;
                      border: 1px solid #ddd6fe !important;
                      font-weight: 600;
                    }
                    .chip-neutral {
                      background: transparent !important;
                      color: #64748b !important;
                      border: 1px solid #e0e7ef !important;
                      font-weight: 500;
                    }
                    .chip-scroll {
                      display: flex;
                      flex-wrap: wrap;
                      gap: 4px;
                    }
                    .minimal-filter-group {
                      gap: 4px;
                    }
                    .chip-teal {
                      background: #d1fae5;
                      color: #059669;
                    }
                    .chip-mint {
                      background: #e0fdf4;
                      color: #059669;
                    }
                    .chip-peach {
                      background: #fef3c7;
                      color: #b45309;
                    }
                    .chip-cyan {
                      background: #e0f2fe;
                      color: #0284c7;
                    }
                    .chip-premium {
                      background: #f3e8ff;
                      color: #7c3aed;
                      font-weight: 700;
                    }
                    .filter-summary {
                      gap: 7px;
                      padding-top: 2px;
                      border-top: none;
                    }
                /* Best-in-class admin strip refinement */
                .admin-strip.glass-premium {
                  background: linear-gradient(120deg, #fafdff 85%, #e0f7fa 100%);
                  border: none;
                  box-shadow: 0 2px 12px 0 rgba(56, 189, 248, 0.09);
                  gap: 22px;
                  padding: 18px 28px;
                  border-radius: 18px;
                  margin-bottom: 22px;
                  align-items: center;
                  min-height: 80px;
                  max-width: 900px;
                  margin-left: auto;
                  margin-right: auto;
                }
                .best-admin-illus {
                  background: none;
                  border-radius: 14px;
                  width: 48px;
                  height: 48px;
                  box-shadow: 0 1px 6px 0 rgba(56, 189, 248, 0.08);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                .best-admin-title-wrap {
                  display: flex;
                  flex-direction: column;
                  gap: 2px;
                  min-width: 220px;
                }
                .best-admin-title {
                  font-size: 1.08rem;
                  font-weight: 800;
                  color: #0f172a;
                  letter-spacing: 0.01em;
                  display: flex;
                  align-items: center;
                  gap: 7px;
                }
                .best-admin-badge {
                  background: linear-gradient(90deg, #14b8a6 0%, #38bdf8 100%);
                  color: #fff;
                  font-size: 0.7em;
                  font-weight: 800;
                  border-radius: 8px;
                  padding: 2px 8px;
                  margin-left: 6px;
                  letter-spacing: 0.08em;
                  box-shadow: none;
                }
                .best-admin-subtitle {
                  font-size: 0.98rem;
                  color: #0284c7;
                  font-weight: 600;
                  margin-bottom: 0;
                }
                .best-admin-meta-row {
                  display: flex;
                  gap: 7px;
                  margin-top: 4px;
                }
                .best-admin-chip {
                  font-size: 0.95em;
                  padding: 5px 12px;
                  border-radius: 999px;
                  background: #e0fdf4;
                  color: #059669;
                  border: none;
                  box-shadow: none;
                }
                .chip-cyan.best-admin-chip {
                  background: #e0f2fe;
                  color: #0284c7;
                }
                .chip-premium {
                  background: #f3e8ff;
                  color: #7c3aed;
                  font-weight: 600;
                  font-size: 0.93em;
                  padding: 5px 12px;
                }
                .best-admin-cta-wrap {
                  display: flex;
                  flex-direction: column;
                  align-items: flex-end;
                  gap: 7px;
                  margin-left: 18px;
                }
                .best-admin-btn {
                  min-width: 140px;
                  min-height: 38px;
                  font-size: 1.01rem;
                  border-radius: 999px;
                  box-shadow: 0 2px 8px 0 rgba(56,189,248,0.09);
                  font-weight: 700;
                  padding: 8px 22px;
                }
                .best-admin-badge-premium {
                  font-size: 0.95em;
                  font-weight: 700;
                  letter-spacing: 0.08em;
                  text-transform: uppercase;
                  color: #0284c7;
                  background: #f0f9ff;
                  border: 1px solid #bae6fd;
                  border-radius: 999px;
                  padding: 6px 16px;
                  box-shadow: 0 1px 4px 0 rgba(56,189,248,0.05);
                  transition: background 0.18s;
                }
            /* Reduce visual noise in admin strip */
            .admin-strip.glass-premium {
              background: linear-gradient(120deg, #fafdff 80%, #e0f2fe 100%);
              border: 1px solid #e0e7ef;
              box-shadow: 0 2px 12px 0 rgba(56, 189, 248, 0.06);
              gap: 24px;
              padding: 24px 32px;
            }
            .admin-title {
              color: #0f172a;
              font-weight: 800;
              letter-spacing: 0.01em;
            }
            .admin-badge {
              background: #38bdf8;
              color: #fff;
              font-size: 0.7em;
              font-weight: 800;
              border-radius: 8px;
              padding: 2px 10px;
              margin-left: 6px;
              letter-spacing: 0.08em;
              box-shadow: none;
            }
            .admin-meta-row .chip {
              font-size: 0.98em;
              padding: 6px 16px;
              border-radius: 999px;
              background: #e0fdf4;
              color: #059669;
              border: none;
              box-shadow: none;
            }
            .chip-cyan {
              background: #e0f2fe;
              color: #0284c7;
            }
            .admin-cta-wrap {
              background: none;
              border: none;
              box-shadow: none;
              padding: 0;
            }
            .admin-create-btn-premium {
              background: linear-gradient(90deg, #38bdf8 0%, #0ea5e9 100%);
              color: #fff;
              font-weight: 700;
              font-size: 1.1rem;
              border: none;
              border-radius: 999px;
              padding: 13px 30px;
              box-shadow: 0 2px 8px 0 rgba(56,189,248,0.10);
              display: flex; align-items: center; gap: 8px;
              transition: background 0.2s, box-shadow 0.2s, transform 0.18s;
              cursor: pointer;
              position: relative;
              overflow: hidden;
            }
            .admin-create-btn-premium:hover {
              background: linear-gradient(90deg, #0ea5e9 0%, #38bdf8 100%);
              box-shadow: 0 4px 16px 0 rgba(56,189,248,0.16);
              transform: translateY(-2px) scale(1.03);
            }
            .admin-cta-badge-premium {
              font-size: 0.95em;
              font-weight: 700;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              color: #0284c7;
              background: #f0f9ff;
              border: 1px solid #bae6fd;
              border-radius: 999px;
              padding: 8px 22px;
              box-shadow: none;
              transition: background 0.18s;
            }
        /* Minimal Discover Panel Redesign */
        .minimal-tabs .tab-item {
          background: none;
          border: none;
          box-shadow: none;
          padding: 10px 18px;
          border-radius: 16px;
          font-size: 1.08rem;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.18s, color 0.18s;
        }
        .minimal-tabs .tab-item.active {
          background: #e0f2fe;
          color: #0284c7;
          box-shadow: 0 2px 8px rgba(56,189,248,0.08);
        }
        .tab-icon {
          display: inline-flex;
          align-items: center;
          font-size: 1.2em;
        }
        .minimal-sort {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .minimal-search {
          background: #f1f5f9;
          border-radius: 999px;
          padding: 2px 12px;
          display: flex;
          align-items: center;
          box-shadow: 0 1px 4px rgba(56,189,248,0.04);
          border: 1px solid #e0e7ef;
        }
        .minimal-search .input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 1.08rem;
          flex: 1;
          padding: 8px 0;
          color: #0f172a;
        }
        .minimal-search .voice-btn {
          background: none;
          border: none;
          margin-left: 6px;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .minimal-filter-group {
          gap: 6px;
          align-items: center;
        }
        .chip-scroll {
          gap: 6px;
        }
        .filter-summary {
          gap: 10px;
          padding-top: 2px;
          border-top: none;
        }
    .library-page {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      max-width: 1180px;
      margin: 0 auto;
      padding: var(--space-3);
      border-radius: var(--radius-xl);
      background:
        radial-gradient(1000px 260px at 10% -5%, rgba(20, 184, 166, 0.12), transparent 60%),
        radial-gradient(900px 260px at 95% 0%, rgba(2, 132, 199, 0.09), transparent 58%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.75), rgba(248, 250, 252, 0.84));
    }
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-5);
      padding: var(--space-6);
      border-radius: var(--radius-xl);
      border: 1px solid rgba(148, 163, 184, 0.28);
      background: linear-gradient(140deg, #ffffff, #f8fafc 65%, #f0fdfa);
      box-shadow: 0 14px 34px rgba(2, 6, 23, 0.06);
    }
    .page-header h1 {
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(1.8rem, 3vw, 2.55rem);
      letter-spacing: -0.01em;
      line-height: 1.05;
      color: #0f172a;
    }
    .page-header p {
      margin-top: 10px;
      max-width: 700px;
      color: #475569;
      font-size: var(--text-sm);
      line-height: 1.7;
    }
    .header-kicker {
      display: inline-flex;
      align-items: center;
      font-size: 10px;
      letter-spacing: 0.08em;
      font-weight: 800;
      color: #0f766e;
      background: linear-gradient(90deg, rgba(204, 251, 241, 0.95), rgba(186, 230, 253, 0.9));
      border: 1px solid rgba(13, 148, 136, 0.25);
      border-radius: 999px;
      padding: 5px 12px;
      margin-bottom: 12px;
      text-transform: uppercase;
    }
    .lib-stats {
      display: flex;
      gap: var(--space-2);
      flex-wrap: wrap;
      justify-content: flex-end;
      max-width: 330px;
    }
    .quick-note {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-4) var(--space-5);
      border-radius: var(--radius-md);
      border: 1px solid rgba(13, 148, 136, 0.2);
      background: linear-gradient(90deg, rgba(240, 253, 250, 0.95), rgba(236, 253, 245, 0.9));
      color: #0f766e;
      font-size: var(--text-sm);
    }
    .admin-strip.glass-premium {
      display: flex;
      align-items: flex-start;
      gap: 36px;
      padding: 36px 48px;
      border-radius: 28px;
      border: 1.5px solid #e0e7ef;
      background: linear-gradient(120deg, #f8fafc 80%, #e0f2fe 100%);
      box-shadow: 0 6px 32px 0 rgba(56, 189, 248, 0.10);
      margin-bottom: 36px;
      animation: glassIn 0.7s cubic-bezier(.4,2,.6,1) 1;
    }
    @keyframes glassIn {
      0% { opacity: 0; transform: scale(0.96) translateY(32px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .admin-illus-wrap {
      display: flex; align-items: center; justify-content: center;
      background: #f1f5f9;
      border-radius: 16px; width: 72px; height: 72px;
      box-shadow: 0 2px 8px 0 rgba(56, 189, 248, 0.10);
      margin-right: 8px;
    }
    .admin-illus {
      width: 56px; height: 56px;
      display: block;
    }
    @keyframes rocketFloat {
      0% { transform: translateY(0); }
      100% { transform: translateY(-8px) scale(1.04); }
    }
    .admin-title {
      font-size: 1.45rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.01em;
      display: flex; align-items: center; gap: 10px;
    }
    .admin-badge {
      background: linear-gradient(90deg, #14b8a6 0%, #38bdf8 100%);
      color: #fff;
      font-size: 0.7em;
      font-weight: 800;
      border-radius: 8px;
      padding: 2px 10px;
      margin-left: 6px;
      letter-spacing: 0.08em;
      box-shadow: 0 2px 8px 0 rgba(56,189,248,0.10);
    }
    .admin-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .admin-subtitle {
      font-size: 1.05rem;
      color: #64748b;
      font-weight: 500;
      margin-bottom: 2px;
    }
    .admin-flow {
      font-size: 0.95em;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .admin-flow .dot {
      color: #14b8a6;
      font-size: 1.1em;
      margin: 0 4px;
    }
    .admin-meta-row {
      display: flex;
      gap: 10px;
      margin-top: 4px;
    }
    .admin-cta-wrap {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 10px;
      margin-left: 24px;
    }
    .admin-create-btn-icon {
      display: inline-flex;
      align-items: center;
      margin-right: 10px;
    }
    .btn-gradient.admin-create-btn-premium {
      background: linear-gradient(90deg, #0ea5e9 0%, #38bdf8 100%);
      color: #fff;
      font-weight: 700;
      font-size: 1.08rem;
      border: none;
      border-radius: 999px;
      padding: 13px 30px;
      box-shadow: 0 2px 8px 0 rgba(56,189,248,0.10);
      display: flex; align-items: center; gap: 8px;
      transition: background 0.2s, box-shadow 0.2s, transform 0.18s;
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }
    .btn-gradient.admin-create-btn-premium:hover {
      background: linear-gradient(90deg, #0284c7 0%, #0ea5e9 100%);
      box-shadow: 0 4px 16px 0 rgba(56,189,248,0.16);
      transform: translateY(-2px) scale(1.03);
    }
    .btn-gradient.admin-create-btn-premium:active {
      background: linear-gradient(90deg, #0ea5e9 0%, #38bdf8 100%);
      transform: scale(0.98);
    }
    @keyframes rocketWiggle {
      0% { transform: rotate(-8deg) scale(1); }
      100% { transform: rotate(8deg) scale(1.08); }
    }
    .admin-cta-badge-premium {
      font-size: 0.85em;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #0284c7;
      background: #e0f2fe;
      border: 1px solid #bae6fd;
      border-radius: 999px;
      padding: 6px 18px;
      box-shadow: 0 2px 8px 0 rgba(56, 189, 248, 0.10);
      transition: background 0.18s;
    }
    .admin-icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #fdba74, #fb923c);
      color: #7c2d12;
      font-size: 1.1rem;
      box-shadow: 0 8px 20px rgba(249, 115, 22, 0.25);
    }
    .admin-title {
      font-size: var(--text-base);
      font-weight: 800;
      color: #9a3412;
      letter-spacing: 0.01em;
    }
    .admin-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 3px;
      margin-right: var(--space-2);
    }
    .admin-subtitle {
      font-size: var(--text-xs);
      color: #b45309;
      font-weight: 600;
    }
    .admin-flow {
      font-size: 11px;
      color: #475569;
      font-weight: 600;
    }
    .admin-cta-wrap {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: 7px;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(240, 253, 250, 0.95), rgba(204, 251, 241, 0.85));
      border: 1px solid rgba(13, 148, 136, 0.32);
    }
    .admin-cta-badge {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #0f766e;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(13, 148, 136, 0.3);
      border-radius: 999px;
      padding: 4px 8px;
    }
    .admin-create-btn {
      font-size: var(--text-sm);
      padding: 11px 18px;
      font-weight: 800;
      box-shadow: 0 8px 20px rgba(13, 148, 136, 0.25);
      animation: adminCtaPulse 2.2s ease-in-out infinite;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      position: relative;
      overflow: hidden;
    }
    .admin-create-btn:hover {
      transform: translateY(-1px) scale(1.01);
      box-shadow: 0 12px 22px rgba(13, 148, 136, 0.32);
    }
    .admin-create-btn::after {
      content: '';
      position: absolute;
      inset: 0;
      transform: translateX(-120%);
      background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.3), transparent);
      transition: transform 420ms ease;
    }
    .admin-create-btn:hover::after {
      transform: translateX(120%);
    }
    .admin-create-btn-arrow {
      display: inline-flex;
      transition: transform 220ms ease;
    }
    .admin-create-btn:hover .admin-create-btn-arrow {
      transform: translateX(3px);
    }
    .surface-panel {
      border-radius: var(--radius-xl);
      border: 1px solid rgba(148, 163, 184, 0.22);
      background: linear-gradient(180deg, #ffffff, #fcfdff);
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
      padding: var(--space-5);
    }

    /* Featured */
    .featured-banner {
      background: linear-gradient(130deg, #0f766e, #115e59 40%, #164e63 100%);
      border-radius: var(--radius-xl);
      padding: var(--space-8);
      display: grid;
      grid-template-columns: 1fr 180px;
      gap: var(--space-8);
      align-items: center;
      overflow: hidden;
      position: relative;
      box-shadow: 0 18px 34px rgba(15, 118, 110, 0.28);
    }

    .featured-banner::before {
      content: '';
      position: absolute;
      width: 260px;
      height: 260px;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(255,255,255,0.22), rgba(255,255,255,0.03));
      right: -60px;
      top: -80px;
      pointer-events: none;
    }

    .featured-banner::after {
      content: '';
      position: absolute;
      width: 160px;
      height: 160px;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(45, 212, 191, 0.25), rgba(45, 212, 191, 0.02));
      right: 140px;
      bottom: -90px;
      pointer-events: none;
    }

    .fb-content { display: flex; flex-direction: column; gap: var(--space-4); position: relative; z-index: 1; }
    .fb-kickers { display: flex; gap: var(--space-2); flex-wrap: wrap; }
    .fb-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 700; color: white; }
    .fb-desc { font-size: var(--text-sm); color: rgba(240, 253, 250, 0.9); line-height: 1.75; max-width: 560px; }
    .fb-meta { display: flex; align-items: center; gap: var(--space-3); font-size: var(--text-sm); color: rgba(255,255,255,0.7); flex-wrap: wrap; }
    .fb-meta-highlight { font-weight: 700; color: rgba(255,255,255,0.95); }
    .fb-cta-row { display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap; }
    .fb-save {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.35);
      color: #f8fafc;
      backdrop-filter: blur(8px);
    }
    .fb-save:hover {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border-color: rgba(255, 255, 255, 0.55);
    }

    .fb-visual {
      display: flex; align-items: center; justify-content: center;
    }

    .fb-play-wrap {
      width: 80px; height: 80px; border-radius: var(--radius-full);
      background: rgba(255,255,255,0.15); backdrop-filter: blur(8px);
      border: 2px solid rgba(255,255,255,0.3);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all var(--transition-base);
      appearance: none;
    }
    .fb-play-wrap:hover { background: rgba(255,255,255,0.25); transform: scale(1.05); }

    .fb-play-btn { font-size: 1.75rem; color: white; margin-left: 4px; }
    .featured-empty { grid-template-columns: 1fr; }

    /* Tabs row */
    .lib-tabs-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
    .discover-panel {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding: 0;
      border-radius: 0;
      background: transparent;
      border: none;
      box-shadow: none;
    }
    .discover-top {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    .enhanced-tabs {
      background: rgba(255, 255, 255, 0.8);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      padding: 4px;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
    }
    .enhanced-tabs .tab-item {
      border-radius: var(--radius-md);
      padding: 10px 16px;
      transition: transform var(--transition-base), background var(--transition-base), box-shadow var(--transition-base);
    }
    .enhanced-tabs .tab-item.active {
      background: linear-gradient(135deg, rgba(20, 184, 166, 0.18), rgba(34, 211, 238, 0.15));
      color: #0f766e;
      font-weight: 700;
      box-shadow: 0 6px 16px rgba(13, 148, 136, 0.16);
    }
    .enhanced-tabs .tab-item:hover {
      transform: translateY(-1px);
    }
    .discover-panel .stagger-item {
      opacity: 0;
      transform: translateY(4px);
      animation: staggerReveal 480ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    .discover-panel .stagger-item:nth-child(1) { animation-delay: 20ms; }
    .discover-panel .stagger-item:nth-child(2) { animation-delay: 60ms; }
    .discover-panel .stagger-item:nth-child(3) { animation-delay: 100ms; }
    .discover-panel .stagger-item:nth-child(4) { animation-delay: 140ms; }
    .discover-panel .stagger-item:nth-child(5) { animation-delay: 180ms; }
    .discover-panel .stagger-item:nth-child(6) { animation-delay: 220ms; }
    .discover-panel .stagger-item:nth-child(7) { animation-delay: 260ms; }
    .discover-panel .stagger-item:nth-child(8) { animation-delay: 300ms; }
    .discover-panel .stagger-item:nth-child(9) { animation-delay: 340ms; }
    .lib-sort {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex-wrap: wrap;
    }
    .sort-label {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      font-weight: 600;
    }
    .sort-select {
      border: 1px solid var(--color-border-light);
      background: var(--color-surface);
      border-radius: var(--radius-md);
      padding: 6px 10px;
      font-size: var(--text-xs);
      color: var(--color-text);
    }
    .density-toggle {
      display: inline-flex;
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md);
      overflow: hidden;
      background: var(--color-surface);
    }
    .density-btn {
      border: none;
      background: transparent;
      padding: 6px 10px;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      cursor: pointer;
      transition: all var(--transition-base);
    }
    .density-btn.active {
      background: var(--teal-100);
      color: var(--teal-700);
      font-weight: 700;
    }

    /* Filters */
    .lib-filters { display: flex; flex-direction: column; gap: var(--space-3); }
    .input-icon-wrap {
      position: relative;
    }
    .voice-btn {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: 1px solid var(--teal-200);
      background: #ecfeff;
      cursor: pointer;
      transition: transform var(--transition-base), box-shadow var(--transition-base), background var(--transition-base);
    }
    .voice-btn:hover {
      transform: translateY(-50%) scale(1.04);
      box-shadow: 0 6px 16px rgba(15, 118, 110, 0.18);
    }
    .voice-btn-listening {
      background: #dcfce7;
      border-color: #22c55e;
      animation: voicePulse 1.1s ease-in-out infinite;
    }
    .input-icon-wrap .input {
      padding-right: 46px;
    }
    .voice-hint {
      font-size: var(--text-xs);
      color: #0f766e;
      font-weight: 600;
    }
    .voice-live {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: fit-content;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(220, 252, 231, 0.9);
      border: 1px solid rgba(34, 197, 94, 0.35);
    }
    .voice-live-label {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #166534;
    }
    .voice-transcript {
      font-size: var(--text-xs);
      color: #065f46;
      background: rgba(236, 253, 245, 0.85);
      border: 1px dashed rgba(16, 185, 129, 0.45);
      border-radius: var(--radius-md);
      padding: 6px 10px;
      width: fit-content;
      max-width: 100%;
      font-weight: 600;
    }
    .voice-wave {
      display: inline-flex;
      align-items: flex-end;
      gap: 2px;
      height: 14px;
    }
    .voice-wave i {
      display: block;
      width: 3px;
      height: 5px;
      border-radius: 999px;
      background: linear-gradient(180deg, #14b8a6, #22c55e);
      animation: voiceBars 850ms ease-in-out infinite;
      transform-origin: center bottom;
    }
    .voice-wave i:nth-child(2) { animation-delay: 60ms; }
    .voice-wave i:nth-child(3) { animation-delay: 120ms; }
    .voice-wave i:nth-child(4) { animation-delay: 180ms; }
    .voice-wave i:nth-child(5) { animation-delay: 240ms; }
    .discover-hint {
      font-size: var(--text-xs);
      color: #0f766e;
      font-weight: 600;
      opacity: 0.9;
    }
    .filter-row { display: flex; gap: var(--space-6); flex-wrap: wrap; }
    .filter-group { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
    .filter-label { font-size: var(--text-xs); font-weight: 600; color: var(--color-text-muted); white-space: nowrap; }
    .filter-group .chip { cursor: pointer; }
    .filter-summary { display: flex; align-items: center; gap: var(--space-3); }
    .filter-summary {
      flex-wrap: wrap;
      padding-top: 4px;
      border-top: 1px dashed rgba(148, 163, 184, 0.4);
    }
    .chip-scroll {
      display: flex;
      gap: var(--space-2);
      overflow-x: auto;
      padding-bottom: 2px;
      scrollbar-width: thin;
    }
    .reset-btn {
      border-color: rgba(239, 68, 68, 0.32);
      color: #b91c1c;
      background: rgba(254, 226, 226, 0.65);
    }
    .reset-btn:hover {
      background: rgba(254, 202, 202, 0.8);
      border-color: rgba(239, 68, 68, 0.45);
    }

    /* ===== Engagement / Progression Strip ===== */
    .eng-dash {
      display: flex; flex-direction: column; gap: 14px;
      padding: 20px 24px 22px;
      background: linear-gradient(135deg, #f8f7ff 0%, #f0f9ff 100%);
      border: 1px solid #e0e7ff;
      border-radius: 20px;
      position: relative; overflow: hidden;
    }
    .eng-dash::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4);
      border-radius: 20px 20px 0 0;
    }

    .eng-dash-head {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
    }
    .eng-dash-kicker {
      display: flex; align-items: center; gap: 5px;
      font-size: 10px; font-weight: 800; letter-spacing: .1em; color: #6366f1; text-transform: uppercase;
    }
    .eng-dash-title { font-size: 1rem; font-weight: 700; color: #1e293b; margin: 4px 0 0; }
    .eng-dash-chips { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .chip-success { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
    .chip-fire    { background: #fff7ed; color: #9a3412; border-color: #fed7aa; }

    /* Horizontal scroll strip */
    .eng-scroll {
      display: flex; flex-direction: row;
      gap: 12px;
      overflow-x: auto;
      padding-bottom: 6px;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
    }
    .eng-scroll::-webkit-scrollbar { height: 4px; }
    .eng-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 2px; }
    .eng-scroll::-webkit-scrollbar-thumb { background: #c7d2fe; border-radius: 2px; }

    /* Scroll-arrow wrapper */
    .eng-scroll-wrap {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0;
    }
    .eng-scroll-wrap .eng-scroll {
      flex: 1;
      min-width: 0;
      mask-image: linear-gradient(to right, transparent 0%, black 3%, black 97%, transparent 100%);
      -webkit-mask-image: linear-gradient(to right, transparent 0%, black 3%, black 97%, transparent 100%);
    }
    .eng-scroll-btn {
      flex-shrink: 0;
      width: 32px; height: 32px;
      border-radius: 50%;
      border: 1.5px solid #e0e7ff;
      background: #fff;
      color: #6366f1;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: background 150ms, box-shadow 150ms, transform 150ms;
      z-index: 1;
    }
    .eng-scroll-btn:hover { background: #f0f0ff; box-shadow: 0 2px 8px rgba(99,102,241,.2); transform: scale(1.08); }
    .eng-scroll-btn--l { margin-right: 6px; }
    .eng-scroll-btn--r { margin-left: 6px; }

    /* Empty state */
    .eng-empty {
      display: flex; align-items: center; gap: 14px;
      padding: 16px 18px;
      background: rgba(255,255,255,.7);
      border: 1.5px dashed #c7d2fe;
      border-radius: 14px;
    }
    .eng-empty-icon { font-size: 1.8rem; flex-shrink: 0; }
    .eng-empty-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .eng-empty-text strong { font-size: 0.85rem; font-weight: 700; color: #1e293b; }
    .eng-empty-text span { font-size: 0.75rem; color: #64748b; }
    .eng-empty-cta {
      flex-shrink: 0;
      padding: 8px 14px; border-radius: 9px;
      background: #6366f1; color: #fff;
      border: none; cursor: pointer;
      font-size: 0.75rem; font-weight: 600;
      transition: background 150ms, transform 150ms;
    }
    .eng-empty-cta:hover { background: #4f46e5; transform: translateY(-1px); }

    /* Completed collapsible section */
    .eng-completed-section { margin-top: 4px; }
    .eng-completed-summary {
      list-style: none;
      display: flex; align-items: center; gap: 6px;
      cursor: pointer;
      font-size: 0.75rem; font-weight: 600; color: #059669;
      padding: 6px 2px;
      user-select: none;
    }
    .eng-completed-summary::-webkit-details-marker { display: none; }
    .eng-completed-chevron { margin-left: auto; color: #94a3b8; transition: transform 200ms; }
    .eng-completed-section[open] .eng-completed-chevron { transform: rotate(180deg); }
    .eng-scroll--completed { margin-top: 8px; }

    /* Skeleton cards */
    .eng-skel {
      flex-shrink: 0; width: 240px; height: 220px; border-radius: 16px;
      scroll-snap-align: start;
      background: linear-gradient(90deg, #e8edf5 25%, #f1f5f9 50%, #e8edf5 75%);
      background-size: 300% 100%;
      animation: shimmer 1.3s ease-in-out infinite;
    }

    /* Card shell — fixed-width vertical card for horizontal strip */
    .eng-card {
      flex-shrink: 0;
      width: 248px;
      display: flex;
      flex-direction: column;
      border-radius: 16px;
      background: #fff;
      border: 1.5px solid #e8edf5;
      box-shadow: 0 2px 8px rgba(30,41,59,.06);
      transition: box-shadow .18s, transform .18s;
      overflow: hidden;
      scroll-snap-align: start;
    }
    .eng-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 28px rgba(30,41,59,.11);
    }

    /* Thumb area — colored banner at top */
    .eng-card-thumb {
      position: relative;
      height: 72px;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #14b8a6, #22d3ee);
    }
    .eng-card-thumb--video    { background: linear-gradient(135deg, #6d28d9, #8b5cf6); }
    .eng-card-thumb--podcast  { background: linear-gradient(135deg, #c2410c, #f97316); }
    .eng-card-thumb--exercise { background: linear-gradient(135deg, #be185d, #ec4899); }
    .eng-card-thumb--template { background: linear-gradient(135deg, #0369a1, #06b6d4); }
    .eng-card-thumb-icon { font-size: 2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,.2)); }

    .eng-status-badge {
      position: absolute; top: 8px; right: 8px;
      font-size: 0.58rem; font-weight: 700; padding: 2px 8px;
      border-radius: 999px; border: 1px solid rgba(255,255,255,.4);
      backdrop-filter: blur(4px);
    }
    .eng-status-badge--not_started { background: rgba(255,255,255,.85); color: #64748b; }
    .eng-status-badge--in_progress { background: rgba(99,102,241,.9); color: #fff; border-color: rgba(255,255,255,.3); }
    .eng-status-badge--completed   { background: rgba(16,185,129,.9); color: #fff; border-color: rgba(255,255,255,.3); }

    /* Card body */
    .eng-card-body {
      flex: 1; display: flex; flex-direction: column; gap: 8px;
      padding: 12px 14px 4px;
    }

    .eng-type-pill {
      font-size: 0.6rem; font-weight: 700; padding: 2px 7px;
      border-radius: 999px; border: 1px solid transparent;
    }
    .eng-type-pill--article  { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    .eng-type-pill--video    { background: #fef3c7; color: #92400e; border-color: #fde68a; }
    .eng-type-pill--podcast  { background: #f3e8ff; color: #6b21a8; border-color: #e9d5ff; }
    .eng-type-pill--exercise { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
    .eng-type-pill--template { background: #f0f9ff; color: #0369a1; border-color: #bae6fd; }

    .eng-title {
      font-size: .875rem; font-weight: 700; color: #0f172a;
      line-height: 1.35;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }

    .eng-meta {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      font-size: 0.7rem; color: #94a3b8;
    }
    .eng-cat    { color: #64748b; font-weight: 500; }
    .eng-streak { font-size: 0.68rem; font-weight: 700; color: #ea580c; }

    /* Progress zone — contextual section */
    .eng-progress-zone { display: flex; flex-direction: column; gap: 6px; }

    /* Suggestion line — NOT_STARTED */
    .eng-suggestion {
      display: flex; align-items: center; gap: 6px;
      font-size: 0.72rem; font-weight: 500;
      padding: 6px 10px; border-radius: 8px;
    }
    .eng-suggestion--start {
      background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0;
    }
    .eng-suggestion--continue {
      background: #eef2ff; color: #4338ca; border: 1px dashed #c7d2fe;
    }
    .eng-suggestion--almost {
      background: #fef3c7; color: #92400e; border: 1px dashed #fde68a;
    }

    /* Progress block — IN_PROGRESS */
    .eng-progress-block { display: flex; flex-direction: column; gap: 5px; }
    .eng-progress-header {
      display: flex; align-items: center; justify-content: space-between;
    }
    .eng-progress-label {
      display: flex; align-items: center; gap: 4px;
      font-size: 0.7rem; font-weight: 600; color: #6366f1;
    }
    .eng-progress-pct {
      font-size: 0.72rem; font-weight: 800; color: #4338ca;
    }

    /* Progress label variants */
    .eng-progress-label { display: flex; align-items: center; gap: 4px; font-size: 0.68rem; font-weight: 600; }
    .eng-progress-label--not_started { color: #94a3b8; }
    .eng-progress-label--in_progress { color: #6366f1; }
    .eng-progress-label--completed   { color: #059669; }

    .eng-progress-pct { font-size: 0.75rem; font-weight: 800; color: #475569; }
    .pct--done { color: #059669; }

    /* Draggable range slider */
    .eng-slider {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 5px;
      border-radius: 999px;
      background: linear-gradient(to right, var(--fill-color, #6366f1) var(--pct, 0%), #e2e8f0 var(--pct, 0%));
      cursor: pointer;
      outline: none;
      transition: height .15s;
    }
    .eng-slider:hover { height: 7px; }
    .eng-slider--not_started { --fill-color: #94a3b8; }
    .eng-slider--in_progress { --fill-color: #6366f1; }
    .eng-slider--completed   { --fill-color: #10b981; }

    .eng-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px; height: 16px;
      border-radius: 50%;
      background: #fff;
      border: 2.5px solid var(--fill-color, #6366f1);
      box-shadow: 0 1px 6px rgba(0,0,0,.15);
      cursor: grab;
      transition: transform .12s, box-shadow .12s;
    }
    .eng-slider::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.25); box-shadow: 0 2px 10px rgba(0,0,0,.2); }
    .eng-slider::-moz-range-thumb {
      width: 16px; height: 16px;
      border-radius: 50%;
      background: #fff;
      border: 2.5px solid var(--fill-color, #6366f1);
      box-shadow: 0 1px 6px rgba(0,0,0,.15);
      cursor: grab;
    }

    /* Hint line */
    .eng-progress-hint {
      font-size: 0.65rem; color: #6366f1; font-weight: 500;
    }

    /* Completed banner */
    .eng-completed-banner {
      display: flex; align-items: center; gap: 6px;
      font-size: 0.72rem; font-weight: 700; color: #065f46;
      background: #d1fae5; border: 1px solid #a7f3d0;
      padding: 6px 10px; border-radius: 8px;
    }
    .eng-completed-opens {
      font-size: 0.68rem; font-weight: 500; color: #059669;
    }

    /* Activity dots */
    .eng-activity {
      display: flex; align-items: center; gap: 3px; padding-top: 2px;
    }
    .eng-dot { width: 8px; height: 8px; border-radius: 2px; background: #e8edf5; transition: background .2s; }
    .eng-dot--on { background: #6366f1; }
    .eng-activity-label { font-size: 0.63rem; color: #94a3b8; margin-left: 3px; }
    .eng-last-opened { font-size: 0.63rem; color: #94a3b8; margin-left: 4px; }

    /* Notes */
    .eng-notes { margin-top: -2px; }
    .eng-notes-input {
      width: 100%; padding: 6px 8px; font-size: 12px; border-radius: 7px;
      border: 1px solid #c7d2fe; background: #f5f3ff; resize: none; outline: none;
      font-family: inherit; color: #1e293b; box-sizing: border-box;
    }
    .eng-notes-input:focus { border-color: #6366f1; }
    .eng-notes-text {
      font-size: 11px; color: #475569; cursor: pointer; padding: 4px 7px;
      border-radius: 7px; background: #f8fafc; border: 1px dashed #e2e8f0;
    }
    .eng-notes-text:hover { border-color: #a5b4fc; background: #f5f3ff; }

    /* Actions footer — flush bottom */
    .eng-actions {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 14px 12px;
      border-top: 1px solid #f1f5f9;
      margin-top: auto;
    }

    /* CTA button — base */
    .eng-btn-open {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 6px 14px; height: 32px;
      font-size: 0.72rem; font-weight: 700;
      border-radius: 9px; border: none;
      cursor: pointer; font-family: inherit;
      transition: box-shadow .15s, transform .15s;
      flex: 1;
    }
    .eng-btn-open:active { transform: scale(0.97); }

    .eng-btn-open--not_started {
      background: #f8fafc; color: #475569; border: 1.5px solid #e2e8f0;
    }
    .eng-btn-open--not_started:hover { background: #e2e8f0; color: #1e293b; }
    .eng-btn-open--in_progress {
      background: linear-gradient(135deg, #6366f1, #818cf8);
      color: #fff; box-shadow: 0 2px 8px rgba(99,102,241,.3);
    }
    .eng-btn-open--in_progress:hover { box-shadow: 0 4px 14px rgba(99,102,241,.45); transform: translateY(-1px); }
    .eng-btn-open--completed {
      background: linear-gradient(135deg, #059669, #34d399);
      color: #fff; box-shadow: 0 2px 8px rgba(16,185,129,.25);
    }
    .eng-btn-open--completed:hover { box-shadow: 0 4px 14px rgba(16,185,129,.4); transform: translateY(-1px); }

    .eng-icon-btns { display: flex; align-items: center; gap: 3px; }
    .eng-icon-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 7px;
      border: 1.5px solid transparent; background: transparent;
      color: #94a3b8; cursor: pointer; transition: all .14s;
    }
    .eng-icon-btn--note:hover, .eng-icon-btn--note.on { background: #eef2ff; color: #6366f1; border-color: #c7d2fe; }
    .eng-icon-btn--done:hover { background: #ecfdf5; color: #059669; border-color: #a7f3d0; }
    .eng-icon-btn--del:hover  { background: #fff1f2; color: #e11d48; border-color: #fecdd3; }
    .eng-icon-btn:disabled { opacity: .4; cursor: not-allowed; }

    .btn-xs { padding: 4px 8px; font-size: 11px; line-height: 1; }

    /* ============ ADMIN BAR (redesigned) ============ */
    .admin-bar {
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 20px 24px;
      margin-bottom: 20px;
      border-radius: 18px;
      background: linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%);
      border: 1px solid #ccfbf1;
      box-shadow: 0 2px 8px rgba(15, 118, 110, 0.06);
      position: relative;
      overflow: hidden;
    }
    .admin-bar::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: linear-gradient(180deg, #14b8a6 0%, #22d3ee 100%);
    }

    .admin-bar-left {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      flex: 1;
      min-width: 0;
    }

    .admin-bar-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #14b8a6 0%, #0891b2 100%);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 6px 16px -4px rgba(20, 184, 166, 0.45);
    }

    .admin-bar-text { min-width: 0; flex: 1; }

    .admin-bar-kicker {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 9px 3px 7px;
      border-radius: 999px;
      background: rgba(20, 184, 166, 0.1);
      color: #0f766e;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      margin-bottom: 6px;
      border: 1px solid rgba(20, 184, 166, 0.2);
    }

    .admin-bar-title {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 1.15rem;
      font-weight: 600;
      color: #0f172a;
      margin: 0 0 4px;
      letter-spacing: -0.01em;
      line-height: 1.3;
    }

    .admin-bar-sub {
      font-size: 0.85rem;
      color: #64748b;
      margin: 0;
      line-height: 1.5;
      max-width: 560px;
    }

    .admin-bar-actions {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-shrink: 0;
    }

    .admin-bar-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 10px 18px;
      border-radius: 10px;
      border: 1.5px solid transparent;
      font-weight: 600;
      font-size: 0.88rem;
      font-family: inherit;
      cursor: pointer;
      transition: all 180ms ease;
      white-space: nowrap;
      position: relative;
      overflow: hidden;
    }
    .admin-bar-btn:disabled { cursor: not-allowed; opacity: 0.6; }

    .admin-bar-btn-primary {
      background: linear-gradient(135deg, #14b8a6, #0891b2);
      color: #fff;
      box-shadow: 0 6px 16px -4px rgba(20, 184, 166, 0.4);
    }
    .admin-bar-btn-primary::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%);
      transform: translateX(-120%);
      transition: transform 600ms ease;
    }
    .admin-bar-btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #0d9488, #0e7490);
      transform: translateY(-1px);
      box-shadow: 0 10px 22px -4px rgba(20, 184, 166, 0.5);
    }
    .admin-bar-btn-primary:hover:not(:disabled)::before { transform: translateX(120%); }

    .admin-bar-btn-ghost {
      background: #fff;
      color: #475569;
      border-color: #e2e8f0;
    }
    .admin-bar-btn-ghost:hover:not(:disabled) {
      border-color: #14b8a6;
      color: #0f766e;
      background: #f0fdfa;
    }

    .admin-bar-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(20, 184, 166, 0.25);
      border-top-color: #14b8a6;
      border-radius: 50%;
      animation: admin-bar-spin 0.7s linear infinite;
    }
    @keyframes admin-bar-spin { to { transform: rotate(360deg); } }

    /* Hide legacy admin strip */
    .admin-strip,
    .best-admin-illus,
    .best-admin-title,
    .best-admin-title-wrap,
    .best-admin-subtitle,
    .best-admin-meta-row,
    .best-admin-chip,
    .best-admin-cta-wrap,
    .best-admin-btn,
    .best-admin-badge-premium,
    .admin-cta-badge-premium,
    .admin-create-btn-premium { display: none !important; }

    @media (max-width: 768px) {
      .admin-bar { flex-direction: column; align-items: stretch; padding: 18px 20px; }
      .admin-bar-actions { flex-direction: column; align-items: stretch; }
      .admin-bar-btn { justify-content: center; }
    }

    @media (prefers-reduced-motion: reduce) {
      .admin-bar-btn-primary, .admin-bar-spinner { transition: none; animation: none; transform: none !important; }
    }

    /* ============ SPOTLIGHT CAROUSEL (interactive) ============ */
    .sp-stage {
      position: relative;
      border-radius: 22px;
      perspective: 1200px;
    }

    /* Auto-rotate timer bar */
    .sp-timer {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      border-radius: 22px 22px 0 0;
      overflow: hidden;
      background: transparent;
      z-index: 3;
      pointer-events: none;
    }
    .sp-timer-fill {
      height: 100%;
      width: 0;
      background: linear-gradient(90deg, #14b8a6, #22d3ee, #0ea5e9);
      background-size: 200% 100%;
      animation: sp-fill 8s linear infinite, sp-shift 3s ease infinite;
    }
    .sp-timer-fill.paused { animation-play-state: paused; }
    .sp-timer-fill.single { display: none; }
    @keyframes sp-fill { from { width: 0; } to { width: 100%; } }
    @keyframes sp-shift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }

    .sp-viewport {
      overflow: hidden;
      border-radius: 22px;
    }
    .sp-track {
      display: flex;
      transition: transform 600ms cubic-bezier(0.2, 0.9, 0.2, 1);
      will-change: transform;
    }

    .sp-slide {
      flex: 0 0 100%;
      display: grid;
      grid-template-columns: minmax(280px, 44%) 1fr;
      gap: 0;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 22px;
      overflow: hidden;
      cursor: pointer;
      position: relative;
      transform-style: preserve-3d;
      transform: perspective(1200px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg));
      transition: transform 240ms ease-out, border-color 220ms ease, box-shadow 220ms ease;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
    }
    .sp-slide:hover {
      border-color: rgba(20, 184, 166, 0.35);
      box-shadow: 0 24px 48px -12px rgba(15, 23, 42, 0.22);
    }
    .sp-slide:focus-visible {
      outline: none;
      border-color: #14b8a6;
      box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.25);
    }

    /* Radial glow that follows cursor */
    .sp-glow {
      position: absolute;
      inset: 0;
      pointer-events: none;
      border-radius: inherit;
      opacity: 0;
      transition: opacity 200ms ease;
      background: radial-gradient(
        420px circle at var(--mx, 50%) var(--my, 50%),
        rgba(20, 184, 166, 0.22),
        rgba(34, 211, 238, 0.10) 35%,
        transparent 65%
      );
      z-index: 1;
      mix-blend-mode: screen;
    }
    .sp-slide:hover .sp-glow { opacity: 1; }

    /* Thumbnail */
    .sp-thumb {
      position: relative;
      aspect-ratio: 16 / 10;
      width: 100%;
      overflow: hidden;
      background: #f1f5f9;
      z-index: 2;
    }
    .sp-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .sp-slide:hover .sp-thumb img { transform: scale(1.06); }

    .sp-thumb-fallback {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #14b8a6, #22d3ee);
      background-size: 200% 200%;
      animation: sp-bg-shift 8s ease infinite;
    }
    @keyframes sp-bg-shift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
    .sp-thumb-fallback.sp-thumb-video    { background-image: linear-gradient(135deg, #8b5cf6, #6366f1, #ec4899); background-size: 200% 200%; }
    .sp-thumb-fallback.sp-thumb-podcast  { background-image: linear-gradient(135deg, #f97316, #f59e0b, #ef4444); background-size: 200% 200%; }
    .sp-thumb-fallback.sp-thumb-exercise { background-image: linear-gradient(135deg, #ec4899, #f43f5e, #b91c1c); background-size: 200% 200%; }
    .sp-thumb-fallback.sp-thumb-template { background-image: linear-gradient(135deg, #06b6d4, #0ea5e9, #3b82f6); background-size: 200% 200%; }
    .sp-thumb-emoji {
      font-size: 4rem;
      filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.3));
      animation: sp-float 4s ease-in-out infinite;
    }
    @keyframes sp-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

    /* Shine sweep on hover */
    .sp-shine {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        115deg,
        transparent 30%,
        rgba(255, 255, 255, 0.35) 48%,
        rgba(255, 255, 255, 0.55) 50%,
        rgba(255, 255, 255, 0.35) 52%,
        transparent 70%
      );
      transform: translateX(-120%);
      transition: transform 900ms cubic-bezier(0.2, 0.8, 0.2, 1);
      pointer-events: none;
      mix-blend-mode: overlay;
    }
    .sp-slide:hover .sp-shine { transform: translateX(120%); }

    /* Stats overlay bottom of thumbnail */
    .sp-stats-overlay {
      position: absolute;
      bottom: 10px;
      right: 10px;
      display: flex;
      gap: 6px;
      z-index: 2;
    }
    .sp-stat {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 9px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: #fff;
      font-size: 0.72rem;
      font-weight: 600;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .sp-stat svg:first-child { color: #fbbf24; }

    /* Play button with pulse rings */
    .sp-play {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 62px;
      height: 62px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.96);
      color: #0f766e;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding-left: 4px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
      transition: transform 240ms ease, background 240ms ease;
      z-index: 2;
    }
    .sp-play-ring,
    .sp-play-ring-2 {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.8);
      pointer-events: none;
      animation: sp-ring 2.2s ease-out infinite;
    }
    .sp-play-ring-2 { animation-delay: 1.1s; }
    @keyframes sp-ring {
      0% { transform: scale(1); opacity: 0.8; }
      100% { transform: scale(1.8); opacity: 0; }
    }
    .sp-play:hover {
      transform: translate(-50%, -50%) scale(1.12);
      background: #fff;
      color: #0d9488;
    }
    .sp-play:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }

    /* Live badge top-left */
    .sp-badge-live {
      position: absolute;
      top: 12px;
      left: 12px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px 4px 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.96);
      color: #15803d;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      backdrop-filter: blur(6px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 2;
    }
    .sp-live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6);
      animation: sp-pulse 2s infinite;
    }
    @keyframes sp-pulse {
      0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6); }
      70% { box-shadow: 0 0 0 7px rgba(34, 197, 94, 0); }
      100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }

    /* Body */
    .sp-body {
      position: relative;
      padding: 0;
      display: flex;
      min-width: 0;
      z-index: 2;
    }
    .sp-accent-stripe {
      width: 4px;
      background: linear-gradient(180deg, #14b8a6 0%, #22d3ee 50%, #0ea5e9 100%);
      background-size: 100% 300%;
      animation: sp-stripe 6s ease infinite;
      flex-shrink: 0;
    }
    @keyframes sp-stripe { 0%, 100% { background-position: 0 0%; } 50% { background-position: 0 100%; } }
    .sp-body-inner {
      padding: 28px 32px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      justify-content: center;
      min-width: 0;
      flex: 1;
    }

    .sp-kicker {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px 4px 8px;
      border-radius: 999px;
      background: linear-gradient(135deg, rgba(20, 184, 166, 0.14), rgba(34, 211, 238, 0.14));
      color: #0f766e;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      align-self: flex-start;
      border: 1px solid rgba(20, 184, 166, 0.25);
    }
    .sp-kicker svg { color: #f59e0b; animation: sp-sparkle 2.4s ease-in-out infinite; }
    @keyframes sp-sparkle { 0%, 100% { transform: scale(1) rotate(0); } 50% { transform: scale(1.2) rotate(15deg); } }

    .sp-title {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 1.6rem;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
      line-height: 1.2;
      letter-spacing: -0.015em;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .sp-slide:hover .sp-title {
      background: linear-gradient(135deg, #0f172a 0%, #0f766e 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .sp-desc {
      font-size: 0.92rem;
      color: #64748b;
      line-height: 1.55;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .sp-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 14px;
      margin-top: 2px;
    }
    .sp-meta-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.82rem;
      font-weight: 500;
      color: #475569;
    }
    .sp-meta-item svg { color: #0891b2; flex-shrink: 0; }
    .sp-meta-item.sp-meta-muted { color: #94a3b8; font-size: 0.78rem; }

    .sp-meta-type {
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.75rem !important;
      font-weight: 600;
      background: #f1f5f9;
      color: #475569 !important;
    }
    .sp-meta-type.mt-article  { background: #f0fdfa; color: #0f766e !important; }
    .sp-meta-type.mt-video    { background: #f3e8ff; color: #6d28d9 !important; }
    .sp-meta-type.mt-podcast  { background: #ffedd5; color: #c2410c !important; }
    .sp-meta-type.mt-exercise { background: #fce7f3; color: #be185d !important; }
    .sp-meta-type.mt-template { background: #cffafe; color: #0e7490 !important; }

    .sp-actions {
      display: flex;
      gap: 10px;
      margin-top: 6px;
    }
    .sp-btn {
      position: relative;
      overflow: hidden;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      border: 1.5px solid transparent;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 180ms ease;
      font-family: inherit;
    }
    .sp-btn-primary {
      background: linear-gradient(135deg, #14b8a6, #0891b2);
      color: #fff;
      box-shadow: 0 4px 12px -2px rgba(20, 184, 166, 0.45);
    }
    .sp-btn-primary::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%);
      transform: translateX(-120%);
      transition: transform 600ms ease;
    }
    .sp-btn-primary:hover {
      background: linear-gradient(135deg, #0d9488, #0e7490);
      transform: translateY(-2px);
      box-shadow: 0 8px 20px -2px rgba(20, 184, 166, 0.55);
    }
    .sp-btn-primary:hover::before { transform: translateX(120%); }

    .sp-btn-ghost {
      background: #fff;
      color: #475569;
      border-color: #e2e8f0;
    }
    .sp-btn-ghost:hover {
      border-color: #14b8a6;
      color: #0f766e;
      background: #f0fdfa;
    }
    .sp-btn-ghost.saved {
      color: #0f766e;
      background: #f0fdfa;
      border-color: #ccfbf1;
    }

    /* Navigation arrows */
    .sp-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 4;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1px solid rgba(226, 232, 240, 0.9);
      background: rgba(255, 255, 255, 0.95);
      color: #0f172a;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.15);
      backdrop-filter: blur(8px);
      transition: all 180ms ease;
      opacity: 0.9;
    }
    .sp-nav:hover {
      opacity: 1;
      background: #fff;
      color: #0f766e;
      transform: translateY(-50%) scale(1.08);
      box-shadow: 0 12px 24px rgba(20, 184, 166, 0.25);
    }
    .sp-nav-prev { left: -12px; }
    .sp-nav-next { right: -12px; }

    /* Dots + counter */
    .sp-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-top: 14px;
    }
    .sp-dots {
      display: inline-flex;
      gap: 6px;
      align-items: center;
      padding: 6px 10px;
      border-radius: 999px;
      background: #fff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
    }
    .sp-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      border: none;
      background: #cbd5e1;
      cursor: pointer;
      transition: all 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
      padding: 0;
    }
    .sp-dot:hover { background: #94a3b8; transform: scale(1.2); }
    .sp-dot.active {
      width: 22px;
      border-radius: 999px;
      background: linear-gradient(90deg, #14b8a6, #22d3ee);
    }

    .sp-counter {
      font-size: 0.8rem;
      color: #64748b;
      font-weight: 500;
    }
    .sp-counter strong {
      color: #0f172a;
      font-weight: 700;
    }
    .sp-counter-sep { color: #cbd5e1; margin: 0 2px; }

    /* Hide legacy featured banner styles */
    .featured-banner { display: none !important; }

    @media (max-width: 768px) {
      .sp-slide { grid-template-columns: 1fr; transform: none !important; }
      .sp-thumb { aspect-ratio: 16 / 9; }
      .sp-body-inner { padding: 20px; }
      .sp-title { font-size: 1.25rem; }
      .sp-nav-prev { left: 6px; }
      .sp-nav-next { right: 6px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .sp-track, .sp-slide, .sp-thumb img, .sp-play, .sp-live-dot, .sp-btn-primary,
      .sp-timer-fill, .sp-thumb-fallback, .sp-thumb-emoji, .sp-play-ring,
      .sp-play-ring-2, .sp-kicker svg, .sp-shine, .sp-accent-stripe, .sp-dot {
        transition: none !important;
        animation: none !important;
        transform: none !important;
      }
    }

    /* ============ COMMAND BAR (redesigned toolbar) ============ */
    .lib-cmdbar {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 18px 20px;
      border-radius: 18px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.03);
    }

    /* Row 1: Search + Actions */
    .lcb-primary {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    /* Search wrap holds the input + dropdown */
    .lcb-search-wrap {
      position: relative;
      flex: 1;
      min-width: 260px;
    }

    .lcb-search-kbd {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
      font-size: 0.65rem;
      font-weight: 600;
      color: #64748b;
      padding: 3px 6px;
      border-radius: 6px;
      background: #fff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 0 #e2e8f0;
      pointer-events: none;
      opacity: 0.75;
      transition: opacity 160ms ease;
    }
    .lcb-search-wrap.focused .lcb-search-kbd,
    .lcb-search-wrap.has-query .lcb-search-kbd { opacity: 0; }

    /* Dropdown */
    .lcb-dd {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      right: 0;
      z-index: 50;
      background: #fff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 20px 40px -12px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(15, 23, 42, 0.06);
      max-height: 480px;
      overflow-y: auto;
      animation: lcb-dd-in 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
      overscroll-behavior: contain;
    }
    @keyframes lcb-dd-in {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .lcb-dd-section { padding: 10px 10px 4px; }
    .lcb-dd-section + .lcb-dd-section { border-top: 1px solid #f1f5f9; }

    .lcb-dd-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px 4px;
    }
    .lcb-dd-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.66rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #64748b;
      text-transform: uppercase;
    }
    .lcb-dd-label svg { color: #14b8a6; }
    .lcb-dd-clear {
      font-size: 0.7rem;
      font-weight: 600;
      color: #64748b;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      font-family: inherit;
    }
    .lcb-dd-clear:hover { background: #f1f5f9; color: #0f172a; }

    .lcb-dd-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 10px;
      background: transparent;
      border: none;
      cursor: pointer;
      width: 100%;
      text-align: left;
      font-family: inherit;
      transition: background 140ms ease;
    }
    .lcb-dd-item-slim { padding: 6px 10px; }
    .lcb-dd-item:hover,
    .lcb-dd-item.active {
      background: linear-gradient(135deg, #f0fdfa, #ecfeff);
    }
    .lcb-dd-item.active .lcb-dd-arrow { color: #14b8a6; transform: translateX(2px); }

    .lcb-dd-thumb {
      width: 44px; height: 44px;
      border-radius: 10px;
      overflow: hidden;
      flex-shrink: 0;
      background: linear-gradient(135deg, #14b8a6, #22d3ee);
      display: flex; align-items: center; justify-content: center;
      position: relative;
    }
    .lcb-dd-thumb.tt-video    { background: linear-gradient(135deg, #8b5cf6, #6366f1); }
    .lcb-dd-thumb.tt-podcast  { background: linear-gradient(135deg, #f97316, #f59e0b); }
    .lcb-dd-thumb.tt-exercise { background: linear-gradient(135deg, #ec4899, #f43f5e); }
    .lcb-dd-thumb.tt-template { background: linear-gradient(135deg, #06b6d4, #0ea5e9); }
    .lcb-dd-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .lcb-dd-thumb-emoji { font-size: 1.2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25)); }

    .lcb-dd-body { flex: 1; min-width: 0; }
    .lcb-dd-title {
      font-size: 0.88rem;
      font-weight: 600;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .lcb-dd-title :global(mark),
    .lcb-dd-title mark {
      background: rgba(20, 184, 166, 0.22);
      color: inherit;
      padding: 0 2px;
      border-radius: 3px;
      font-weight: 700;
    }
    .lcb-dd-sub {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.72rem;
      color: #64748b;
      margin-top: 2px;
    }
    .lcb-dd-type {
      padding: 1px 7px;
      border-radius: 999px;
      background: #f0fdfa;
      color: #0f766e;
      font-weight: 600;
    }
    .lcb-dd-arrow {
      color: #cbd5e1;
      flex-shrink: 0;
      transition: color 140ms ease, transform 140ms ease;
    }
    .lcb-dd-item-icon {
      width: 26px; height: 26px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #f1f5f9;
      color: #64748b;
      flex-shrink: 0;
    }
    .lcb-dd-item-text {
      flex: 1;
      font-size: 0.85rem;
      color: #334155;
    }
    .lcb-dd-item-enter {
      font-size: 0.72rem;
      color: #94a3b8;
      font-family: ui-monospace, monospace;
    }

    .lcb-dd-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 4px 8px 8px;
    }
    .lcb-dd-chip {
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid #e2e8f0;
      background: #fff;
      font-size: 0.78rem;
      color: #475569;
      cursor: pointer;
      font-family: inherit;
      transition: all 160ms ease;
    }
    .lcb-dd-chip:hover {
      border-color: #14b8a6;
      background: #f0fdfa;
      color: #0f766e;
    }

    .lcb-dd-empty {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 16px;
      color: #64748b;
      font-size: 0.86rem;
    }
    .lcb-dd-empty svg { color: #cbd5e1; flex-shrink: 0; }

    .lcb-dd-view-all {
      display: block;
      width: 100%;
      margin-top: 4px;
      padding: 10px;
      border: none;
      border-top: 1px solid #f1f5f9;
      background: transparent;
      color: #0f766e;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      font-family: inherit;
      transition: background 140ms ease;
    }
    .lcb-dd-view-all:hover { background: #f0fdfa; }

    .lcb-dd-tip {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 14px;
      border-top: 1px solid #f1f5f9;
      font-size: 0.7rem;
      color: #94a3b8;
    }
    .lcb-dd-tip-kbd {
      display: inline-block;
      font-family: ui-monospace, monospace;
      font-size: 0.65rem;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 5px;
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
      margin-right: 2px;
    }

    .lcb-search {
      position: relative;
      display: flex;
      align-items: center;
      padding: 0 12px 0 42px;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      background: #f8fafc;
      transition: all 180ms ease;
      height: 44px;
    }
    .lcb-search:hover { background: #fff; border-color: #cbd5e1; }
    .lcb-search:focus-within {
      background: #fff;
      border-color: #14b8a6;
      box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
    }
    .lcb-search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      pointer-events: none;
    }
    .lcb-search:focus-within .lcb-search-icon { color: #14b8a6; }
    .lcb-search-input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 0.92rem;
      color: #0f172a;
      font-family: inherit;
      padding: 0;
    }
    .lcb-search-input::placeholder { color: #94a3b8; }
    .lcb-search-input::-webkit-search-cancel-button { appearance: none; }
    .lcb-search-clear,
    .lcb-voice-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: #64748b;
      cursor: pointer;
      transition: all 160ms ease;
      flex-shrink: 0;
    }
    .lcb-search-clear:hover { background: #f1f5f9; color: #0f172a; }
    .lcb-voice-btn { color: #0891b2; }
    .lcb-voice-btn:hover { background: #ecfeff; color: #0e7490; }
    .lcb-voice-lang {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 4px 7px;
      margin-right: 2px;
      border: 1px solid #cffafe;
      border-radius: 999px;
      background: #ecfeff;
      color: #0e7490;
      font-size: 0.64rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      cursor: pointer;
      font-family: inherit;
      height: 22px;
      flex-shrink: 0;
      transition: all 140ms ease;
    }
    .lcb-voice-lang:hover { background: #a5f3fc; color: #155e75; transform: translateY(-1px); }
    .lcb-voice-lang svg { color: #0891b2; opacity: 0.6; }
    .lcb-voice-btn.listening {
      background: #fee2e2;
      color: #dc2626;
      animation: lcb-pulse 1.2s ease-in-out infinite;
    }
    @keyframes lcb-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.5); }
      50% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
    }

    .lcb-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .lcb-sort-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
      height: 44px;
      padding: 0 32px 0 14px;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      background: #fff;
      cursor: pointer;
      transition: all 180ms ease;
    }
    .lcb-sort-wrap:hover { border-color: #cbd5e1; background: #f8fafc; }
    .lcb-sort-wrap:focus-within {
      border-color: #14b8a6;
      box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
    }
    .lcb-sort-label {
      font-size: 0.72rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-right: 8px;
    }
    .lcb-sort-select {
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      border: none;
      background: transparent;
      outline: none;
      font-size: 0.88rem;
      font-weight: 600;
      color: #0f172a;
      font-family: inherit;
      cursor: pointer;
      padding: 0;
    }
    .lcb-sort-chevron {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #64748b;
      pointer-events: none;
    }

    .lcb-density {
      display: inline-flex;
      align-items: center;
      height: 44px;
      padding: 3px;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      background: #f8fafc;
      gap: 2px;
    }
    .lcb-density-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 100%;
      border: none;
      border-radius: 9px;
      background: transparent;
      color: #64748b;
      cursor: pointer;
      transition: all 160ms ease;
    }
    .lcb-density-btn:hover { color: #0f172a; }
    .lcb-density-btn.active {
      background: #fff;
      color: #0f766e;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
    }

    /* Row 2: Tabs (underline style) */
    .lcb-tabs {
      display: flex;
      gap: 4px;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
      margin: 0 -20px;
      padding: 0 20px;
    }
    .lcb-tabs::-webkit-scrollbar { display: none; }

    .lcb-tab {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px 12px;
      border: none;
      background: transparent;
      color: #64748b;
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      white-space: nowrap;
      transition: color 160ms ease;
      font-family: inherit;
      border-radius: 8px 8px 0 0;
    }
    .lcb-tab::after {
      content: '';
      position: absolute;
      left: 14px;
      right: 14px;
      bottom: -1px;
      height: 2.5px;
      border-radius: 3px 3px 0 0;
      background: transparent;
      transition: background 180ms ease;
    }
    .lcb-tab:hover { color: #0f172a; background: #f8fafc; }
    .lcb-tab.active { color: #0f766e; }
    .lcb-tab.active::after {
      background: linear-gradient(90deg, #14b8a6, #22d3ee);
    }
    .lcb-tab-icon {
      display: inline-flex;
      align-items: center;
      opacity: 0.7;
      transition: opacity 160ms ease;
    }
    .lcb-tab.active .lcb-tab-icon { opacity: 1; }
    .lcb-tab-icon :ng-deep svg { width: 16px; height: 16px; }

    /* Row 3: Filters */
    .lcb-filters {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .lcb-filter-block {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .lcb-cat-block { align-items: flex-start; }

    .lcb-filter-lbl {
      font-size: 0.7rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      flex-shrink: 0;
      min-width: 72px;
      padding-top: 7px;
    }

    /* Category chip rail */
    .lcb-chip-rail {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      flex: 1;
    }
    .lcb-chip {
      display: inline-flex;
      align-items: center;
      padding: 6px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 999px;
      background: #fff;
      color: #475569;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 160ms ease;
      font-family: inherit;
      white-space: nowrap;
    }
    .lcb-chip:hover {
      border-color: #14b8a6;
      color: #0f766e;
      background: #f0fdfa;
    }
    .lcb-chip.active {
      background: linear-gradient(135deg, #14b8a6, #0891b2);
      border-color: transparent;
      color: #fff;
      font-weight: 600;
      box-shadow: 0 4px 10px -2px rgba(20, 184, 166, 0.35);
    }
    .lcb-chip-ghost {
      background: transparent;
      color: #64748b;
      border-style: dashed;
    }
    .lcb-chip-ghost:hover {
      background: #f8fafc;
      color: #0f172a;
      border-color: #cbd5e1;
    }

    /* Level segmented control */
    .lcb-segment {
      display: inline-flex;
      align-items: center;
      padding: 3px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #f8fafc;
      gap: 2px;
    }
    .lcb-seg-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 7px 14px;
      border: none;
      border-radius: 7px;
      background: transparent;
      color: #64748b;
      font-weight: 600;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 160ms ease;
      font-family: inherit;
      white-space: nowrap;
    }
    .lcb-seg-btn:hover { color: #0f172a; }
    .lcb-seg-btn.active {
      background: #fff;
      color: #0f766e;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
    }

    /* Filter footer */
    .lcb-filter-footer {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      padding-top: 12px;
      border-top: 1px dashed #e2e8f0;
      font-size: 0.82rem;
    }
    .lcb-count {
      color: #64748b;
      font-weight: 500;
    }
    .lcb-count strong {
      color: #0f172a;
      font-weight: 700;
      font-size: 0.95rem;
      margin-right: 2px;
    }
    .lcb-filter-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px 4px 8px;
      border-radius: 999px;
      background: #f0fdfa;
      color: #0f766e;
      font-size: 0.76rem;
      font-weight: 600;
      border: 1px solid #ccfbf1;
    }
    .lcb-filter-pill svg { color: #14b8a6; }

    .lcb-clear-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-left: auto;
      padding: 6px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
      color: #64748b;
      font-weight: 600;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 160ms ease;
      font-family: inherit;
    }
    .lcb-clear-btn:hover {
      color: #dc2626;
      border-color: #fecaca;
      background: #fef2f2;
    }

    /* Hide legacy toolbar styles that no longer apply */
    .discover-panel, .discover-top, .lib-tabs-row, .lib-filters, .filter-summary { display: none !important; }

    @media (max-width: 768px) {
      .lcb-primary { flex-direction: column; align-items: stretch; gap: 10px; }
      .lcb-actions { flex-wrap: wrap; }
      .lcb-filter-lbl { min-width: auto; padding-top: 0; width: 100%; }
      .lcb-filter-block { flex-direction: column; align-items: stretch; }
      .lcb-segment { width: 100%; justify-content: space-between; }
      .lcb-seg-btn { flex: 1; }
    }

    @media (prefers-reduced-motion: reduce) {
      .lcb-search, .lcb-chip, .lcb-seg-btn, .lcb-tab, .lcb-tab::after, .lcb-voice-btn { transition: none; animation: none; }
    }

    /* Resources grid */
    .resources-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: var(--space-4, 1rem);
      align-items: stretch;
    }

    .skeleton-card {
      border-radius: var(--radius-lg, 1rem);
      overflow: hidden;
      background: #fff;
      border: 1px solid var(--color-border, #e2e8f0);
      min-height: 280px;
      display: flex;
      flex-direction: column;
    }
    .skeleton-card::before {
      content: '';
      display: block;
      height: 96px;
      background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 37%, #e2e8f0 63%);
      background-size: 400% 100%;
      animation: shimmer 1.2s ease-in-out infinite;
    }
    .skeleton-card::after {
      content: '';
      flex: 1;
      margin: 14px 16px;
      background:
        linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%) 0 0/55% 10px no-repeat,
        linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%) 0 20px/100% 14px no-repeat,
        linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%) 0 44px/90% 11px no-repeat,
        linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%) 0 64px/70% 11px no-repeat;
      background-size: 220% 10px, 400% 14px, 360% 11px, 280% 11px;
      animation: shimmer 1.2s ease-in-out infinite;
    }

    /* Empty & error states */
    .lib-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: var(--space-3);
      padding: var(--space-10) var(--space-6);
      border-radius: var(--radius-lg, 1rem);
      background: #fff;
      border: 1px solid var(--color-border, #e2e8f0);
    }
    .lib-state-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(20, 184, 166, 0.12), rgba(34, 211, 238, 0.12));
      color: var(--color-primary, #14b8a6);
    }
    .lib-state.error-state {
      border-left: 4px solid #f59e0b;
    }
    .lib-state.error-state .lib-state-icon {
      background: rgba(245, 158, 11, 0.12);
      color: #f59e0b;
    }
    .lib-state-title {
      font-family: var(--font-display, 'Fraunces', serif);
      font-size: var(--text-lg, 1.125rem);
      font-weight: 600;
      color: var(--color-text, #0f172a);
      margin: 0;
    }
    .lib-state-body {
      font-size: var(--text-sm, 0.875rem);
      color: var(--color-text-muted, #64748b);
      max-width: 420px;
      margin: 0;
    }
    .lib-state-actions { display: flex; gap: var(--space-2); flex-wrap: wrap; justify-content: center; }

    /* Legacy empty-state kept minimal for any remaining refs */
    .empty-state { display: none; }

    .ui-feedback {
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      border: 1px solid var(--teal-200);
      background: linear-gradient(90deg, rgba(240, 253, 250, 0.95), rgba(236, 253, 245, 0.95));
      color: var(--teal-800);
      font-size: var(--text-sm);
      font-weight: 600;
    }
    .ui-feedback-error {
      border-color: #fecaca;
      background: #fee2e2;
      color: #991b1b;
    }


    @media (max-width: 768px) {
      .library-page {
        padding: var(--space-2);
      }
      .page-header {
        flex-direction: column;
        padding: var(--space-4);
      }
      .lib-stats {
        justify-content: flex-start;
      }
      .featured-banner { grid-template-columns: 1fr; }
      .fb-visual { display: none; }
      .filter-row { flex-direction: column; }
      .filter-summary { justify-content: flex-start; }
      .fb-title { font-size: 2rem; line-height: 1.1; }
      .fb-cta-row { width: 100%; }
      .fb-cta-row .btn { width: 100%; }
      .admin-strip {
        grid-template-columns: 1fr;
        align-items: flex-start;
      }
      .admin-cta-wrap { width: 100%; justify-content: space-between; }
      .lib-tabs-row { flex-direction: column; align-items: stretch; }
      .lib-sort { justify-content: space-between; }
      .chip-scroll { max-width: 100%; }
      .surface-panel {
        padding: var(--space-4);
      }
    }

    @keyframes shimmer {
      0% { background-position: 100% 0; }
      100% { background-position: 0 0; }
    }

    @keyframes staggerReveal {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes adminCtaPulse {
      0% { box-shadow: 0 8px 20px rgba(13, 148, 136, 0.22); }
      50% { box-shadow: 0 12px 24px rgba(13, 148, 136, 0.36); }
      100% { box-shadow: 0 8px 20px rgba(13, 148, 136, 0.22); }
    }

    @keyframes voicePulse {
      0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.35); }
      70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
      100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }

    @keyframes voiceBars {
      0%, 100% { transform: scaleY(0.5); opacity: 0.7; }
      50% { transform: scaleY(1.6); opacity: 1; }
    }

    .ai-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px;
      z-index: 50;
    }

    .ai-modal {
      width: min(720px, 96vw);
      max-height: 82vh;
      overflow: auto;
      background: linear-gradient(180deg, #ffffff, #f8fafc);
      border: 1px solid rgba(148, 163, 184, 0.35);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.35);
      padding: 16px 16px 14px 16px;
    }

    .ai-modal-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 6px;
    }

    .ai-modal-title {
      font-weight: 800;
      color: #0f172a;
      font-size: 1.05rem;
    }

    .ai-modal-subtitle {
      color: #334155;
      font-weight: 700;
      margin-bottom: 10px;
    }

    .ai-provider-chip {
      display: inline-flex;
      margin-bottom: 10px;
    }

    .ai-modal-summary {
      color: #0f172a;
      line-height: 1.75;
      margin: 0 0 10px 0;
    }

    .ai-modal-points {
      margin: 0;
      padding-left: 18px;
      color: #334155;
      line-height: 1.7;
    }

    /* ================== KEYBOARD SHORTCUTS OVERLAY ================== */
    .kbd-overlay {
      position: fixed; inset: 0;
      background: rgba(2, 6, 23, 0.66);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      z-index: 1100;
      animation: aia-fade 180ms ease-out;
    }
    .kbd-modal {
      width: 100%;
      max-width: 640px;
      max-height: 85vh;
      overflow-y: auto;
      background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
      color: #e2e8f0;
      border-radius: 20px;
      border: 1px solid rgba(34, 211, 238, 0.2);
      box-shadow: 0 32px 64px -12px rgba(0, 0, 0, 0.5);
      padding: 24px 28px;
      animation: aia-rise 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .kbd-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      padding-bottom: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 16px;
    }
    .kbd-kicker {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      color: #67e8f9;
      margin-bottom: 4px;
    }
    .kbd-title {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 1.25rem;
      font-weight: 600;
      color: #f8fafc;
      margin: 0;
      letter-spacing: -0.01em;
    }
    .kbd-close {
      width: 34px; height: 34px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.04);
      color: #cbd5e1;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 180ms ease;
      flex-shrink: 0;
    }
    .kbd-close:hover { background: rgba(255, 255, 255, 0.12); color: #fff; transform: rotate(90deg); }

    .kbd-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px 24px;
    }
    .kbd-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .kbd-section-title {
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #64748b;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .kbd-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-size: 0.82rem;
    }
    .kbd-desc { color: #cbd5e1; }
    .kbd-keys { display: inline-flex; gap: 4px; flex-shrink: 0; }
    .kbd-row kbd {
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 5px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #f1f5f9;
      box-shadow: 0 1px 0 rgba(0, 0, 0, 0.4);
      min-width: 18px;
      text-align: center;
    }

    .kbd-footer {
      margin-top: 18px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      text-align: center;
    }
    .kbd-hint {
      font-size: 0.72rem;
      color: #64748b;
    }
    .kbd-hint kbd {
      font-family: ui-monospace, monospace;
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #cbd5e1;
      font-size: 0.68rem;
      font-weight: 700;
      margin: 0 2px;
    }

    @media (max-width: 640px) {
      .kbd-grid { grid-template-columns: 1fr; }
      .kbd-modal { padding: 20px; }
    }

    /* ================== AI ATELIER ================== */
    .aia-overlay {
      position: fixed; inset: 0;
      background: rgba(2, 6, 23, 0.68);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      z-index: 1000;
      animation: aia-fade 240ms ease-out;
    }
    @keyframes aia-fade { from { opacity: 0; } to { opacity: 1; } }

    .aia {
      position: relative;
      width: 100%;
      max-width: 720px;
      max-height: 90vh;
      overflow-y: auto;
      background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
      color: #e2e8f0;
      border-radius: 24px;
      border: 1px solid rgba(34, 211, 238, 0.15);
      box-shadow: 0 40px 80px -20px rgba(2, 6, 23, 0.8), 0 0 0 1px rgba(34, 211, 238, 0.1) inset;
      padding: 36px 40px 32px;
      animation: aia-rise 360ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    @keyframes aia-rise {
      from { opacity: 0; transform: translateY(20px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .aia-bg { position: absolute; inset: 0; border-radius: 24px; overflow: hidden; pointer-events: none; }
    .aia-mesh {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.4;
    }
    .aia-mesh-1 { width: 340px; height: 340px; background: #14b8a6; top: -100px; left: -80px; animation: aia-float-1 20s ease-in-out infinite; }
    .aia-mesh-2 { width: 280px; height: 280px; background: #22d3ee; top: 40%; right: -60px; animation: aia-float-2 24s ease-in-out infinite; }
    .aia-mesh-3 { width: 220px; height: 220px; background: #8b5cf6; bottom: -60px; left: 30%; animation: aia-float-3 22s ease-in-out infinite; }
    @keyframes aia-float-1 { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(60px, 40px); } }
    @keyframes aia-float-2 { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(-50px, 30px); } }
    @keyframes aia-float-3 { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(40px, -50px); } }

    .aia-grid {
      position: absolute; inset: 0;
      background-image:
        linear-gradient(rgba(34, 211, 238, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(34, 211, 238, 0.05) 1px, transparent 1px);
      background-size: 30px 30px;
      mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
      -webkit-mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
    }

    .aia > :not(.aia-bg):not(.aia-close) { position: relative; z-index: 1; }
    .aia-close {
      position: absolute;
      top: 18px; right: 18px;
      z-index: 2;
      width: 36px; height: 36px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.05);
      color: #cbd5e1;
      cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      backdrop-filter: blur(8px);
      transition: all 180ms ease;
    }
    .aia-close:hover:not(:disabled) { background: rgba(255, 255, 255, 0.12); color: #fff; transform: rotate(90deg); }
    .aia-close:disabled { opacity: 0.3; cursor: not-allowed; }

    .aia-head { text-align: center; margin-bottom: 28px; }
    .aia-kicker {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 12px 5px 8px;
      border-radius: 999px;
      background: rgba(34, 211, 238, 0.1);
      color: #67e8f9;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      border: 1px solid rgba(34, 211, 238, 0.2);
      margin-bottom: 14px;
    }
    .aia-kicker-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #22d3ee;
      box-shadow: 0 0 12px #22d3ee, 0 0 0 0 rgba(34, 211, 238, 0.7);
      animation: aia-pulse 1.8s infinite;
    }
    @keyframes aia-pulse {
      0% { box-shadow: 0 0 12px #22d3ee, 0 0 0 0 rgba(34, 211, 238, 0.7); }
      70% { box-shadow: 0 0 12px #22d3ee, 0 0 0 8px rgba(34, 211, 238, 0); }
      100% { box-shadow: 0 0 12px #22d3ee, 0 0 0 0 rgba(34, 211, 238, 0); }
    }

    .aia-title {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 2rem;
      font-weight: 600;
      line-height: 1.1;
      margin: 0 0 8px;
      letter-spacing: -0.025em;
      color: #f8fafc;
    }
    .aia-title span { display: block; }
    .aia-title-accent {
      background: linear-gradient(135deg, #22d3ee, #a78bfa);
      background-size: 200% 100%;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      font-style: italic;
      animation: aia-gradient 5s ease infinite;
    }
    @keyframes aia-gradient { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }

    .aia-sub {
      font-size: 0.95rem;
      color: #94a3b8;
      margin: 0;
      max-width: 480px;
      margin-inline: auto;
      line-height: 1.55;
    }

    /* ============ STEP 1: BRIEF ============ */
    .aia-step { display: flex; flex-direction: column; gap: 22px; }

    .aia-field { display: flex; flex-direction: column; gap: 10px; }
    .aia-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.78rem;
      font-weight: 600;
      color: #cbd5e1;
      letter-spacing: 0.02em;
    }
    .aia-label-value {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 1.4rem;
      font-weight: 600;
      color: #22d3ee;
      line-height: 1;
    }
    .aia-label-hint { color: #64748b; font-weight: 500; font-size: 0.7rem; }

    /* Slider */
    .aia-slider-wrap { position: relative; padding: 4px 2px; }
    .aia-slider {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 6px;
      border-radius: 999px;
      background: linear-gradient(90deg, #22d3ee 0%, #22d3ee var(--slider-fill, 0%), rgba(255,255,255,0.08) var(--slider-fill, 0%), rgba(255,255,255,0.08) 100%);
      outline: none;
      cursor: pointer;
    }
    .aia-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px; height: 20px;
      border-radius: 50%;
      background: #fff;
      border: 3px solid #22d3ee;
      cursor: grab;
      box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.15), 0 4px 10px rgba(0,0,0,0.35);
      transition: transform 140ms ease;
    }
    .aia-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
    .aia-slider::-webkit-slider-thumb:active { cursor: grabbing; }
    .aia-slider::-moz-range-thumb {
      width: 20px; height: 20px;
      border-radius: 50%;
      background: #fff;
      border: 3px solid #22d3ee;
      cursor: grab;
      box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.15);
    }
    .aia-slider-ticks {
      display: flex;
      justify-content: space-between;
      padding: 6px 2px 0;
      font-size: 0.7rem;
      font-weight: 600;
      color: #475569;
    }
    .aia-slider-ticks .active { color: #22d3ee; }

    /* Segmented level */
    .aia-segment {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      padding: 4px;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .aia-seg {
      padding: 9px 8px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: #94a3b8;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 180ms ease;
      font-family: inherit;
    }
    .aia-seg:hover { color: #e2e8f0; }
    .aia-seg.active {
      background: linear-gradient(135deg, #22d3ee, #0891b2);
      color: #0f172a;
      box-shadow: 0 4px 12px rgba(34, 211, 238, 0.3);
    }

    /* Focus grid — compact, handles 20 chips on desktop (5 cols), collapses gracefully */
    .aia-focus-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
      gap: 6px;
      max-height: 280px;
      overflow-y: auto;
      padding: 2px 4px 2px 0;
    }
    .aia-focus-grid::-webkit-scrollbar { width: 6px; }
    .aia-focus-grid::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 999px; }
    .aia-focus {
      position: relative;
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 8px 10px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 9px;
      background: rgba(255, 255, 255, 0.03);
      color: #cbd5e1;
      cursor: pointer;
      transition: all 180ms ease;
      font-family: inherit;
      font-size: 0.78rem;
      font-weight: 500;
      min-width: 0;
    }
    .aia-focus:hover { background: rgba(255, 255, 255, 0.06); border-color: rgba(34, 211, 238, 0.3); }
    .aia-focus.active {
      background: rgba(34, 211, 238, 0.12);
      border-color: #22d3ee;
      color: #67e8f9;
      box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.15);
    }
    .aia-focus-emoji { font-size: 1rem; line-height: 1; flex-shrink: 0; }
    .aia-focus-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .aia-focus-check {
      width: 18px; height: 18px;
      border-radius: 50%;
      background: #22d3ee;
      color: #0f172a;
      padding: 3px;
      flex-shrink: 0;
      animation: aia-pop 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    @keyframes aia-pop { from { transform: scale(0); } to { transform: scale(1); } }

    /* Launchpad */
    .aia-launchpad {
      padding-top: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    .aia-launch {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 14px 28px;
      border: none;
      border-radius: 14px;
      background: linear-gradient(135deg, #14b8a6 0%, #22d3ee 50%, #8b5cf6 100%);
      background-size: 200% 100%;
      color: #fff;
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: 0.01em;
      cursor: pointer;
      box-shadow: 0 10px 30px -5px rgba(34, 211, 238, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
      transition: all 220ms ease;
      font-family: inherit;
      animation: aia-gradient-shift 6s ease infinite;
    }
    @keyframes aia-gradient-shift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
    .aia-launch:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 38px -5px rgba(34, 211, 238, 0.65);
    }
    .aia-launch-ring {
      position: absolute;
      inset: -6px;
      border-radius: 18px;
      border: 1.5px solid rgba(34, 211, 238, 0.5);
      pointer-events: none;
      animation: aia-launch-ring 2.4s ease-out infinite;
    }
    @keyframes aia-launch-ring {
      0% { opacity: 0.8; transform: scale(1); }
      100% { opacity: 0; transform: scale(1.15); }
    }
    .aia-launch-hint {
      font-size: 0.8rem;
      color: #64748b;
      margin: 0;
    }
    .aia-launch-hint strong { color: #cbd5e1; font-weight: 700; }

    /* ============ STEP 2: GENERATING ============ */
    .aia-step-gen {
      align-items: center;
      text-align: center;
      padding: 20px 0;
    }

    .aia-brain {
      position: relative;
      width: 140px;
      height: 140px;
      margin-bottom: 10px;
    }
    .aia-brain-core {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 60px; height: 60px;
      border-radius: 50%;
      background: radial-gradient(circle, #22d3ee, #0891b2 60%, transparent 70%);
      box-shadow: 0 0 40px rgba(34, 211, 238, 0.6);
      animation: aia-core 2.2s ease-in-out infinite;
    }
    @keyframes aia-core { 0%, 100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -50%) scale(1.12); } }
    .aia-brain-icon {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      color: #fff;
      z-index: 2;
    }
    .aia-brain-orbit {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 1.5px dashed rgba(34, 211, 238, 0.25);
      animation: aia-orbit-spin 10s linear infinite;
    }
    .aia-orbit-1 { animation-duration: 8s; }
    .aia-orbit-2 { inset: -18px; border-color: rgba(167, 139, 250, 0.25); animation-duration: 11s; animation-direction: reverse; }
    .aia-orbit-3 { inset: -36px; border-color: rgba(20, 184, 166, 0.2); animation-duration: 14s; }
    @keyframes aia-orbit-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
    .aia-orbit-node {
      position: absolute;
      top: -4px; left: 50%;
      transform: translateX(-50%);
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #22d3ee;
      box-shadow: 0 0 12px #22d3ee;
    }
    .aia-orbit-2 .aia-orbit-node { background: #a78bfa; box-shadow: 0 0 12px #a78bfa; }
    .aia-orbit-3 .aia-orbit-node { background: #5eead4; box-shadow: 0 0 12px #5eead4; }

    .aia-gen-status { display: flex; flex-direction: column; gap: 6px; }
    .aia-gen-label {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 1.3rem;
      font-weight: 600;
      color: #f8fafc;
      letter-spacing: -0.01em;
    }
    .aia-gen-message {
      font-size: 0.9rem;
      color: #67e8f9;
      font-weight: 500;
      animation: aia-message-in 300ms ease;
      min-height: 1.2em;
    }
    @keyframes aia-message-in {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .aia-gen-progress {
      width: 100%;
      max-width: 340px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 4px;
    }
    .aia-gen-track {
      height: 4px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      overflow: hidden;
    }
    .aia-gen-fill {
      height: 100%;
      width: 30%;
      border-radius: inherit;
      background: linear-gradient(90deg, #14b8a6, #22d3ee, #a78bfa);
      background-size: 200% 100%;
      animation: aia-fill-slide 2.2s linear infinite, aia-gradient-shift 3s ease infinite;
    }
    @keyframes aia-fill-slide {
      0% { transform: translateX(-100%); width: 30%; }
      50% { width: 60%; }
      100% { transform: translateX(400%); width: 30%; }
    }
    .aia-gen-dots { display: flex; gap: 4px; justify-content: center; }
    .aia-gen-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: rgba(34, 211, 238, 0.3);
      animation: aia-gen-dot 1.4s ease-in-out infinite;
    }
    .aia-gen-dot:nth-child(1) { animation-delay: 0s; }
    .aia-gen-dot:nth-child(2) { animation-delay: 0.15s; }
    .aia-gen-dot:nth-child(3) { animation-delay: 0.3s; }
    .aia-gen-dot:nth-child(4) { animation-delay: 0.45s; }
    .aia-gen-dot:nth-child(5) { animation-delay: 0.6s; }
    @keyframes aia-gen-dot {
      0%, 100% { background: rgba(34, 211, 238, 0.3); transform: scale(0.9); }
      50% { background: #22d3ee; transform: scale(1.3); }
    }

    .aia-gen-checklist {
      list-style: none;
      padding: 0;
      margin: 12px 0 0;
      width: 100%;
      max-width: 340px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      text-align: left;
    }
    .aia-gen-checklist li {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.82rem;
      color: #64748b;
      transition: color 300ms ease;
    }
    .aia-check-box {
      width: 16px; height: 16px;
      border-radius: 5px;
      border: 1.5px solid rgba(255,255,255,0.15);
      background: rgba(255, 255, 255, 0.03);
      flex-shrink: 0;
      transition: all 280ms ease;
      position: relative;
    }
    .aia-gen-checklist li.done { color: #67e8f9; }
    .aia-gen-checklist li.done .aia-check-box {
      background: #22d3ee;
      border-color: #22d3ee;
      box-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
    }
    .aia-gen-actions {
      margin-top: 18px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      width: 100%;
      max-width: 340px;
    }
    .aia-gen-hint {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.72rem;
      color: #64748b;
      margin: 0;
      text-align: center;
    }
    .aia-gen-hint svg { color: #94a3b8; flex-shrink: 0; }

    .aia-gen-checklist li.done .aia-check-box::after {
      content: '';
      position: absolute;
      left: 4px; top: 1px;
      width: 5px; height: 9px;
      border: solid #0f172a;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    /* ============ STEP 3: DONE ============ */
    .aia-step-done { align-items: center; text-align: center; padding: 10px 0; }

    .aia-success { position: relative; margin-bottom: 10px; }
    .aia-success-ring {
      width: 88px; height: 88px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981, #14b8a6);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 40px rgba(20, 184, 166, 0.5), 0 0 0 6px rgba(20, 184, 166, 0.15);
      animation: aia-success-pop 500ms cubic-bezier(0.2, 1.4, 0.4, 1);
    }
    @keyframes aia-success-pop {
      0% { transform: scale(0); opacity: 0; }
      60% { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }

    .aia-confetti-burst {
      position: absolute;
      inset: -40px;
      display: flex;
      justify-content: space-between;
      pointer-events: none;
    }
    .aia-confetti-burst span {
      font-size: 1.4rem;
      animation: aia-confetti 1.6s ease-out forwards;
    }
    .aia-confetti-burst span:nth-child(1) { animation-delay: 0s; transform-origin: bottom right; }
    .aia-confetti-burst span:nth-child(2) { animation-delay: 0.1s; }
    .aia-confetti-burst span:nth-child(3) { animation-delay: 0.2s; }
    .aia-confetti-burst span:nth-child(4) { animation-delay: 0.3s; }
    .aia-confetti-burst span:nth-child(5) { animation-delay: 0.4s; transform-origin: bottom left; }
    @keyframes aia-confetti {
      0% { opacity: 0; transform: translateY(0) scale(0.5); }
      50% { opacity: 1; transform: translateY(-30px) scale(1.2) rotate(20deg); }
      100% { opacity: 0; transform: translateY(-80px) scale(0.8) rotate(-15deg); }
    }

    .aia-done-title {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 1.6rem;
      font-weight: 600;
      color: #f8fafc;
      margin: 8px 0 4px;
    }
    .aia-done-sub { font-size: 0.85rem; color: #94a3b8; margin: 0 0 10px; }

    .aia-done-gallery {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      max-width: 480px;
      margin: 16px 0 4px;
      max-height: 280px;
      overflow-y: auto;
      padding: 4px;
    }
    .aia-done-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      opacity: 0;
      transform: translateY(10px);
      animation: aia-done-card-in 380ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
      text-align: left;
    }
    @keyframes aia-done-card-in {
      to { opacity: 1; transform: translateY(0); }
    }
    .aia-done-type {
      width: 38px; height: 38px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      flex-shrink: 0;
      background: linear-gradient(135deg, #14b8a6, #22d3ee);
    }
    .aia-dt-video    { background: linear-gradient(135deg, #8b5cf6, #6366f1); }
    .aia-dt-podcast  { background: linear-gradient(135deg, #f97316, #f59e0b); }
    .aia-dt-exercise { background: linear-gradient(135deg, #ec4899, #f43f5e); }
    .aia-dt-template { background: linear-gradient(135deg, #06b6d4, #0ea5e9); }
    .aia-done-body { flex: 1; min-width: 0; }
    .aia-done-name {
      font-size: 0.88rem;
      font-weight: 600;
      color: #f1f5f9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .aia-done-meta { display: flex; gap: 6px; margin-top: 4px; }
    .aia-done-chip {
      font-size: 0.68rem;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(34, 211, 238, 0.15);
      color: #67e8f9;
      font-weight: 600;
    }
    .aia-done-chip-muted { background: rgba(255,255,255,0.06); color: #94a3b8; }

    .aia-done-actions {
      display: flex;
      gap: 10px;
      margin-top: 18px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .aia-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      transition: all 180ms ease;
      font-family: inherit;
    }
    .aia-btn-primary {
      background: linear-gradient(135deg, #22d3ee, #14b8a6);
      color: #0f172a;
      box-shadow: 0 6px 16px -4px rgba(34, 211, 238, 0.45);
    }
    .aia-btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 22px -4px rgba(34, 211, 238, 0.6);
    }
    .aia-btn-ghost {
      background: rgba(255, 255, 255, 0.04);
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .aia-btn-ghost:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }

    /* ============ ERROR STATE ============ */
    .aia-step-error { align-items: center; text-align: center; padding: 10px 0; }
    .aia-error-icon {
      width: 72px; height: 72px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 10px;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    /* ================== AI SUMMARY THEATER ================== */
    .ast-overlay {
      position: fixed; inset: 0;
      background: rgba(2, 6, 23, 0.72);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      z-index: 1000;
      animation: aia-fade 220ms ease-out;
    }

    .ast {
      position: relative;
      width: 100%;
      max-width: 640px;
      max-height: 90vh;
      background: #fff;
      border-radius: 22px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 40px 80px -20px rgba(2, 6, 23, 0.7);
      animation: aia-rise 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    .ast-bg {
      position: absolute;
      top: 0; left: 0; right: 0; height: 160px;
      overflow: hidden;
      pointer-events: none;
    }
    .ast-wave {
      position: absolute;
      border-radius: 50%;
      filter: blur(60px);
      opacity: 0.55;
    }
    .ast-wave-1 {
      width: 300px; height: 300px;
      background: #22d3ee;
      top: -120px; left: -80px;
      animation: aia-float-1 16s ease-in-out infinite;
    }
    .ast-wave-2 {
      width: 240px; height: 240px;
      background: #a78bfa;
      top: -80px; right: -60px;
      animation: aia-float-2 18s ease-in-out infinite;
    }

    .ast-head {
      position: relative;
      padding: 22px 24px 16px;
      border-bottom: 1px solid rgba(226, 232, 240, 0.7);
      display: flex;
      align-items: flex-start;
      gap: 14px;
      z-index: 1;
    }
    .ast-head-badge {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }
    .ast-brain-pulse {
      width: 40px; height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, #22d3ee, #a78bfa);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 6px 16px -4px rgba(167, 139, 250, 0.5);
      animation: ast-brain-pulse 2.4s ease-in-out infinite;
    }
    @keyframes ast-brain-pulse {
      0%, 100% { transform: scale(1); box-shadow: 0 6px 16px -4px rgba(167, 139, 250, 0.5); }
      50% { transform: scale(1.05); box-shadow: 0 10px 24px -4px rgba(167, 139, 250, 0.7); }
    }

    .ast-kicker {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #8b5cf6;
      margin-bottom: 4px;
    }
    .ast-title {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 1.2rem;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
      line-height: 1.3;
      letter-spacing: -0.01em;
    }
    .ast-close {
      width: 32px; height: 32px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      color: #64748b;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 160ms ease;
      flex-shrink: 0;
    }
    .ast-close:hover { background: #fff; color: #0f172a; transform: rotate(90deg); }

    .ast-body {
      padding: 20px 24px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 20px;
      position: relative;
      z-index: 1;
    }

    .ast-section { display: flex; flex-direction: column; gap: 8px; }
    .ast-section-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #64748b;
      text-transform: uppercase;
    }
    .ast-section-label svg { color: #8b5cf6; }

    .ast-summary-text {
      font-size: 0.95rem;
      line-height: 1.65;
      color: #0f172a;
      margin: 0;
      padding: 14px 16px;
      border-radius: 12px;
      background: linear-gradient(135deg, #f8fafc, #f0f9ff);
      border: 1px solid #e0f2fe;
      cursor: pointer;
      min-height: 80px;
      position: relative;
    }
    .ast-summary-text.done { cursor: default; }
    .ast-skel-wrap { display: flex; flex-direction: column; gap: 9px; padding: 4px 0 8px; }
    .ast-skel-line {
      height: 13px; border-radius: 6px;
      background: linear-gradient(90deg, rgba(148,163,184,0.13) 25%, rgba(148,163,184,0.28) 50%, rgba(148,163,184,0.13) 75%);
      background-size: 200% 100%;
      animation: ast-skel-shimmer 1.5s ease-in-out infinite;
    }
    @keyframes ast-skel-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    .ast-caret {
      display: inline-block;
      width: 2px;
      height: 1.1em;
      background: #8b5cf6;
      vertical-align: text-bottom;
      margin-left: 2px;
      animation: ast-caret 0.8s step-end infinite;
    }
    @keyframes ast-caret { 50% { opacity: 0; } }

    .ast-points {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .ast-point {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      opacity: 0;
      transform: translateX(-8px);
      transition: opacity 300ms ease, transform 300ms ease, background 200ms ease;
    }
    .ast-point.revealed {
      opacity: 1;
      transform: translateX(0);
      background: linear-gradient(135deg, #f0fdfa, #ecfeff);
      border-color: #ccfbf1;
    }
    .ast-point-check {
      width: 20px; height: 20px;
      border-radius: 50%;
      background: #e2e8f0;
      color: transparent;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 260ms cubic-bezier(0.2, 1.4, 0.4, 1);
      margin-top: 1px;
    }
    .ast-point.revealed .ast-point-check {
      background: linear-gradient(135deg, #14b8a6, #22d3ee);
      color: #fff;
      transform: scale(1.1);
    }
    .ast-point-text {
      font-size: 0.88rem;
      color: #334155;
      line-height: 1.5;
      flex: 1;
    }

    .ast-provider {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.78rem;
      color: #64748b;
      padding-top: 4px;
    }
    .ast-provider strong { color: #0f172a; font-weight: 600; }
    .ast-provider-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: linear-gradient(135deg, #22d3ee, #a78bfa);
      box-shadow: 0 0 8px rgba(167, 139, 250, 0.5);
    }
    .ast-provider-time { color: #94a3b8; }
    .ast-provider-cache {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      margin-left: 6px;
      border-radius: 999px;
      background: #ecfeff;
      color: #0e7490;
      font-size: 0.7rem;
      font-weight: 600;
      border: 1px solid #cffafe;
    }

    .ast-footer {
      padding: 14px 24px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      background: #fff;
    }
    .ast-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 10px;
      border: 1px solid transparent;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 160ms ease;
      font-family: inherit;
    }
    .ast-btn-ghost {
      background: #fff;
      color: #475569;
      border-color: #e2e8f0;
    }
    .ast-btn-ghost:hover:not(:disabled) { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }
    .ast-btn-ghost.copied { color: #0f766e; border-color: #ccfbf1; background: #f0fdfa; }
    .ast-btn-ghost.speaking {
      color: #dc2626;
      border-color: #fecaca;
      background: #fef2f2;
      animation: ast-speak-pulse 1.4s ease-in-out infinite;
    }
    @keyframes ast-speak-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.35); }
      50% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
    }
    .ast-btn-primary {
      background: linear-gradient(135deg, #22d3ee, #a78bfa);
      color: #fff;
      box-shadow: 0 4px 12px -2px rgba(167, 139, 250, 0.4);
    }
    .ast-btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 18px -2px rgba(167, 139, 250, 0.55);
    }
    .ast-btn svg.spin { animation: aia-orbit-spin 0.8s linear infinite; }

    /* ── Similar resources — "Aller plus loin" ───────── */
    .ast-sim-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-top: 4px;
    }

    /* Header row */
    .ast-sim-header {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .ast-sim-header-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px; height: 22px;
      border-radius: 7px;
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      color: #fff;
      flex-shrink: 0;
    }
    .ast-sim-header-text {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #475569;
      flex: 1;
    }
    .ast-sim-header-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px; height: 20px;
      padding: 0 6px;
      border-radius: 999px;
      background: #f1f5f9;
      color: #64748b;
      font-size: 0.68rem;
      font-weight: 700;
    }

    /* List + items */
    .ast-sim-list { display: flex; flex-direction: column; gap: 5px; }

    .ast-sim-item {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 9px 11px 9px 9px;
      border-radius: 12px;
      border: 1.5px solid #f1f5f9;
      background: #fafbfc;
      cursor: pointer;
      text-align: left;
      font-family: inherit;
      width: 100%;
      opacity: 0;
      transform: translateX(-8px);
      animation: ast-sim-in 280ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
      transition: border-color 150ms ease, background 150ms ease, box-shadow 150ms ease;
    }
    @keyframes ast-sim-in { to { opacity: 1; transform: translateX(0); } }

    .ast-sim-item:hover {
      border-color: rgba(20, 184, 166, 0.4);
      background: linear-gradient(100deg, #f0fdfa, #f8fafc);
      box-shadow: 0 2px 10px rgba(20, 184, 166, 0.1);
    }

    /* Thumb */
    .ast-sim-thumb {
      width: 42px; height: 42px;
      border-radius: 10px;
      overflow: hidden;
      flex-shrink: 0;
      background: linear-gradient(135deg, #14b8a6, #22d3ee);
      display: flex; align-items: center; justify-content: center;
    }
    .ast-sim-t-video    { background: linear-gradient(135deg, #7c3aed, #8b5cf6) !important; }
    .ast-sim-t-podcast  { background: linear-gradient(135deg, #ea580c, #f97316) !important; }
    .ast-sim-t-exercise { background: linear-gradient(135deg, #db2777, #ec4899) !important; }
    .ast-sim-t-template { background: linear-gradient(135deg, #0284c7, #06b6d4) !important; }
    .ast-sim-thumb img  { width: 100%; height: 100%; object-fit: cover; display: block; }
    .ast-sim-emoji      { font-size: 1.25rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); }

    /* Body */
    .ast-sim-body { flex: 1; min-width: 0; }
    .ast-sim-title {
      font-size: 0.84rem;
      font-weight: 600;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 4px;
    }
    .ast-sim-tags {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-wrap: nowrap;
    }
    .ast-sim-badge {
      font-size: 0.62rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 999px;
      background: #ccfbf1;
      color: #0f766e;
      letter-spacing: 0.02em;
      flex-shrink: 0;
    }
    .ast-sim-b-video    { background: #ede9fe; color: #6d28d9; }
    .ast-sim-b-podcast  { background: #ffedd5; color: #c2410c; }
    .ast-sim-b-exercise { background: #fce7f3; color: #9d174d; }
    .ast-sim-b-template { background: #e0f2fe; color: #0369a1; }
    .ast-sim-level {
      font-size: 0.68rem;
      color: #94a3b8;
      font-weight: 500;
      flex-shrink: 0;
    }
    .ast-sim-cat {
      font-size: 0.67rem;
      color: #cbd5e1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }
    .ast-sim-cat::before { content: '· '; }

    /* CTA arrow */
    .ast-sim-cta {
      display: inline-flex; align-items: center; justify-content: center;
      width: 26px; height: 26px;
      border-radius: 8px;
      background: #f1f5f9;
      color: #94a3b8;
      flex-shrink: 0;
      transition: background 150ms ease, color 150ms ease, transform 150ms ease;
    }
    .ast-sim-item:hover .ast-sim-cta {
      background: #14b8a6;
      color: #fff;
      transform: translateX(2px);
    }

    /* Skeleton */
    .ast-sim-skel {
      height: 62px;
      border-radius: 12px;
      background: linear-gradient(90deg, #f1f5f9 25%, #e8edf5 50%, #f1f5f9 75%);
      background-size: 300% 100%;
      animation: shimmer 1.3s ease-in-out infinite;
    }

    @media (max-width: 640px) {
      .aia-overlay, .ast-overlay { padding: 0; }
      .aia { border-radius: 0; max-height: 100vh; padding: 28px 20px; }
      .ast { border-radius: 0; max-height: 100vh; }
      .aia-title { font-size: 1.6rem; }
      .aia-segment { grid-template-columns: 1fr 1fr; }
    }

    @media (prefers-reduced-motion: reduce) {
      .aia-mesh, .aia-kicker-dot, .aia-brain-core, .aia-brain-orbit, .aia-title-accent,
      .aia-launch, .aia-launch-ring, .aia-gen-fill, .aia-gen-dot, .aia-success-ring,
      .aia-confetti-burst span, .aia-done-card, .ast-brain-pulse, .ast-wave, .ast-caret,
      .ast-point, .ast-point-check, .ast-btn svg.spin { animation: none !important; transform: none !important; }
    }
  `]
})
export class LibraryComponent implements OnInit, OnDestroy, DoCheck {
  private successAnimMap: Record<string, boolean> = {};

  getResourceStreak(resourceId: string): number {
    const engagement = this.resourceEngagement[resourceId];
    if (!engagement || !engagement.openedDays.length) return 0;
    // Sort days descending
    const days = [...engagement.openedDays].sort((a, b) => b.localeCompare(a));
    let streak = 1;
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1]);
      const curr = new Date(days[i]);
      const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  showSuccessAnimFor(resourceId: string): boolean {
    return !!this.successAnimMap[resourceId];
  }

  private triggerSuccessAnim(resourceId: string): void {
    this.successAnimMap[resourceId] = true;
    setTimeout(() => {
      this.successAnimMap[resourceId] = false;
    }, 1200);
  }
  private readonly resourceApi = inject(ResourceApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly authService = inject(AuthService);
  private readonly userApi = inject(UserApiService);

  resources: Resource[] = [];
  bookmarkIndexByResourceId = new Map<string, string>();
  bookmarkDataByResourceId = new Map<string, BookmarkApiResponse>();
  bookmarkPendingIds = new Set<string>();
  backendEngagements = new Map<string, EngagementApiResponse>();
  engagementsLoading = false;
  editingNotesId: string | null = null;
  editingNotesValue = '';
  localProgress = new Map<string, number>();
  isAdmin = false;
  isAiGenerating = false;
  isSummarizingById: Record<string, boolean> = {};

  // ============ AI Atelier state ============
  showAiAtelier = false;
  aiAtelierStep: 'brief' | 'generating' | 'done' | 'error' = 'brief';
  aiBrief = { count: 5, level: 'MIX' as 'MIX' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED', focus: [] as string[] };
  readonly aiSliderTicks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  readonly aiFocusOptions = [
    // Tech & Engineering
    { value: 'web-dev',        emoji: '💻', label: 'Dév. web' },
    { value: 'architecture',   emoji: '🏗️', label: 'Architecture' },
    { value: 'cloud-devops',   emoji: '☁️', label: 'Cloud & DevOps' },
    { value: 'ai-ml',          emoji: '🤖', label: 'IA & ML' },
    { value: 'cybersecurity',  emoji: '🔒', label: 'Cybersécurité' },
    { value: 'data-analytics', emoji: '📊', label: 'Data & Analytics' },
    // Business & Career
    { value: 'leadership',     emoji: '💼', label: 'Leadership' },
    { value: 'product',        emoji: '🎯', label: 'Product' },
    { value: 'entrepreneurship', emoji: '🚀', label: 'Entrepreneuriat' },
    { value: 'communication',  emoji: '🗣️', label: 'Communication' },
    { value: 'productivity',   emoji: '⚡', label: 'Productivité' },
    { value: 'soft-skills',    emoji: '🧠', label: 'Soft skills' },
    // Creative & Media
    { value: 'design-ux',      emoji: '🎨', label: 'Design & UX' },
    { value: 'writing',        emoji: '✍️', label: 'Rédaction' },
    { value: 'media-prod',     emoji: '🎬', label: 'Production média' },
    // Domain-specific
    { value: 'finance',        emoji: '💰', label: 'Finance' },
    { value: 'marketing',      emoji: '📈', label: 'Marketing' },
    { value: 'education',      emoji: '📚', label: 'Éducation' },
    { value: 'healthcare',     emoji: '🏥', label: 'Santé' },
    { value: 'legal',          emoji: '⚖️', label: 'Juridique' },
  ];
  aiStatusMessages = [
    'Analyse du catalogue existant…',
    'Identification des lacunes et opportunités…',
    'Génération des ressources adaptées…',
    'Vérification, déduplication et publication…',
    'Finalisation…',
  ];
  aiStatusIndex = 0;
  private aiStatusTimer: ReturnType<typeof setInterval> | null = null;
  aiLastResult: AiGenerateResourcesResponse | null = null;
  aiGeneratedPreviews: ResourceApiResponse[] = [];
  aiError = '';
  aiCancelRequested = false;
  private aiGenerationSub: { unsubscribe(): void } | null = null;
  /** User-facing model label shown during generation (e.g. "llama3:8b") */
  aiModelLabel = 'llama3:8b';

  /** Set of resource IDs just created by the AI Atelier. Auto-cleared after 90s. */
  recentlyCreatedIds = new Set<string>();
  private recentlyCreatedClearTimer: ReturnType<typeof setTimeout> | null = null;

  // ============ Live search dropdown ============
  searchFocused = false;
  searchHintIndex = -1;
  recentSearches: string[] = [];
  private readonly recentSearchKey = 'library.recentSearches.v1';
  private searchBlurTimer: ReturnType<typeof setTimeout> | null = null;
  readonly hotSuggestions = [
    'system design',
    'react',
    'leadership',
    'GDPR',
    'finance personnelle',
    'productivité',
    'IA & ML',
    'cybersécurité',
  ];
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('engScrollEl') engScrollRef?: ElementRef<HTMLElement>;

  get isMac(): boolean {
    try { return /(Mac|iPhone|iPad)/i.test(navigator.platform || navigator.userAgent); }
    catch { return false; }
  }

  showShortcuts = false;

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(ev: KeyboardEvent): void {
    const inField = !!(ev.target as HTMLElement)?.closest('input, textarea, [contenteditable="true"]');

    // ⌘K / Ctrl+K → focus search (works even while in a field, Linear-style)
    const cmdK = (ev.key === 'k' || ev.key === 'K') && (ev.metaKey || ev.ctrlKey);
    // / → focus search (only if not in a field)
    const slash = ev.key === '/' && !inField;
    if (cmdK || slash) {
      ev.preventDefault();
      const input = this.searchInputRef?.nativeElement;
      if (input) { input.focus(); input.select(); }
      return;
    }

    // ? → toggle shortcuts overlay (only if not in a field)
    if (ev.key === '?' && !inField) {
      ev.preventDefault();
      this.showShortcuts = !this.showShortcuts;
      return;
    }

    // Esc → close shortcuts overlay if open
    if (ev.key === 'Escape' && this.showShortcuts) {
      ev.preventDefault();
      this.showShortcuts = false;
      return;
    }

    // Admin-only triggers (only when no modal is open and not in a field)
    if (inField || this.showResourceForm || this.showAiAtelier || this.showSummaryModal || this.showShortcuts) return;

    if (ev.key === 'g' || ev.key === 'G') {
      if (this.isAdmin) { ev.preventDefault(); this.openAiAtelier(); }
      return;
    }
    if (ev.key === 'n' || ev.key === 'N') {
      if (this.isAdmin) { ev.preventDefault(); this.openCreateResourceForm(); }
      return;
    }
  }
  get showSearchDropdown(): boolean {
    return this.searchFocused;
  }
  /** Top 6 matching resources shown in the live dropdown. */
  get searchSuggestions(): Resource[] {
    const q = this.searchQuery.trim();
    if (!q) return [];
    return this.displayedResources.slice(0, 6);
  }

  trackSearchSuggestionById = (_: number, r: Resource) => r.id;

  onSearchFocus(): void {
    if (this.searchBlurTimer) { clearTimeout(this.searchBlurTimer); this.searchBlurTimer = null; }
    this.searchFocused = true;
    this.searchHintIndex = -1;
    if (this.recentSearches.length === 0) this.loadRecentSearches();
  }

  onSearchBlur(): void {
    // Delay close so a click on a dropdown item still fires
    this.searchBlurTimer = setTimeout(() => {
      this.searchFocused = false;
      this.searchHintIndex = -1;
    }, 120);
  }

  onSearchEnter(): void {
    const items = this.getActiveSearchItems();
    if (this.searchHintIndex >= 0 && this.searchHintIndex < items.length) {
      const sel = items[this.searchHintIndex];
      if (typeof sel === 'string') {
        this.applySearch(sel);
      } else {
        this.openResourceFromSearch(sel as Resource);
      }
      return;
    }
    const q = this.searchQuery.trim();
    if (q) {
      this.pushRecentSearch(q);
      this.forceSearch();
    }
  }

  onSearchEscape(): void {
    if (this.searchQuery) {
      this.clearSearchInput();
      return;
    }
    this.searchFocused = false;
    this.searchHintIndex = -1;
  }

  moveSearchHint(delta: number): void {
    if (!this.showSearchDropdown) return;
    const items = this.getActiveSearchItems();
    if (items.length === 0) return;
    const next = (this.searchHintIndex + delta + items.length) % items.length;
    this.searchHintIndex = next;
  }

  private getActiveSearchItems(): (Resource | string)[] {
    if (this.searchQuery.trim().length > 0) return this.searchSuggestions;
    return [...this.recentSearches];
  }

  applySearch(query: string): void {
    this.searchQuery = query;
    this.onSearchChange(query);
    this.pushRecentSearch(query);
    this.forceSearch();
    this.searchFocused = false;
  }

  openResourceFromSearch(r: Resource): void {
    this.pushRecentSearch(this.searchQuery.trim());
    this.searchFocused = false;
    this.openResource(r);
  }

  clearSearchInput(): void {
    this.searchQuery = '';
    this.onSearchChange('');
    this.searchHintIndex = -1;
  }

  /** Bold the matching query terms inside a title for the dropdown rendering. */
  highlightQuery(text: string): string {
    const q = this.searchQuery.trim();
    if (!text) return '';
    if (!q) return this.escapeHtml(text);
    const terms = q.split(/\s+/).filter((t) => t.length >= 2);
    if (terms.length === 0) return this.escapeHtml(text);
    const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const re = new RegExp(`(${escaped})`, 'gi');
    return this.escapeHtml(text).replace(re, '<mark>$1</mark>');
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private loadRecentSearches(): void {
    try {
      const raw = localStorage.getItem(this.recentSearchKey);
      if (raw) this.recentSearches = (JSON.parse(raw) as string[]).slice(0, 5);
    } catch { this.recentSearches = []; }
  }

  private pushRecentSearch(q: string): void {
    if (!q || q.length < 2) return;
    const lower = q.toLowerCase();
    this.recentSearches = [q, ...this.recentSearches.filter((r) => r.toLowerCase() !== lower)].slice(0, 5);
    try { localStorage.setItem(this.recentSearchKey, JSON.stringify(this.recentSearches)); } catch { /* ignore */ }
  }

  clearRecentSearches(): void {
    this.recentSearches = [];
    try { localStorage.removeItem(this.recentSearchKey); } catch { /* ignore */ }
  }

  // ============ AI Summary Theater state ============
  showSummaryModal = false;
  summaryResourceTitle = '';
  private summaryFullText = '';
  summaryText = '';
  summaryPoints: string[] = [];
  summaryProvider = '';
  summaryGeneratedAt = '';
  summaryTypewriter = '';
  summaryRevealDone = false;
  summaryRevealedPoints = 0;
  summaryCopied = false;
  summaryRegenerating = false;

  // TTS (browser speech synthesis) for the summary
  isSpeakingSummary = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  get ttsSupported(): boolean {
    try { return typeof window !== 'undefined' && !!window.speechSynthesis; }
    catch { return false; }
  }
  similarResources: ResourceApiResponse[] = [];
  similarLoading = false;
  private summaryCurrentResourceId: string | null = null;
  private summaryTypewriterTimer: ReturnType<typeof setTimeout> | null = null;
  private summarySseSource: EventSource | null = null;
  private summarySseFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  /** Base URL for resource-service API, used by the SSE EventSource (can't use HttpParams). */
  get resourceApiBase(): string { return (environment as any).resourceApiUrl || ''; }
  private summaryPointsTimer: ReturnType<typeof setTimeout> | null = null;
  private summaryCopyTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingCreatedResource: ResourceApiResponse | null = null;
  private readonly progressStorageKey = 'library-resource-progress-v1';
  private readonly engagementStorageKey = 'library-resource-engagement-v1';
  private speechRecognition: any = null;
  voiceLang: 'fr-FR' | 'en-US' = 'fr-FR';
  private readonly voiceLangKey = 'library.voiceLang.v1';

  // Stats auto-update: pulse flags toggled on value change via DoCheck
  statPulse = { res: false, vid: false, saved: false, cat: false };
  private _prevStats = { res: -1, vid: -1, saved: -1, cat: -1 };
  private _statPulseTimers: Record<string, ReturnType<typeof setTimeout> | null> = { res: null, vid: null, saved: null, cat: null };
  private passiveRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private voiceBadgeTimeoutId: number | null = null;
  private audioContext: AudioContext | null = null;
  private searchDebounceId: number | null = null;

  // Resource management modal
  showResourceForm = false;
  editingResource: ResourceApiResponse | null = null;

  isLoading = false;
  loadError = '';
  uiMessage = '';
  uiMessageType: 'success' | 'error' = 'success';
  searchQuery = '';
  voiceSearchSupported = false;
  isVoiceListening = false;
  lastVoiceQuery = '';
  voiceInterimText = '';
  totalPages = 1;
  totalElements = 0;
  currentPage = 0;
  heroStats: ResourceStatsResponse | null = null;
  resourceProgress: Record<string, number> = {};
  resourceEngagement: Record<string, ResourceEngagement> = {};
  readonly pageSize = 12;

  activeTab = signal('all');
  activeCat = signal<{ id: string; name: string }>({ id: 'all', name: 'All' });
  activeLevel = signal('ALL');
  sortBy = signal<'relevance' | 'title-asc' | 'title-desc' | 'rating-desc'>('relevance');
  viewDensity = signal<'comfortable' | 'compact'>('comfortable');
  categories: { id: string; name: string }[] = [{ id: 'all', name: 'All' }];
  displayedCategories: { id: string; name: string }[] = [{ id: 'all', name: 'All' }];
  showAllCategories = false;
  readonly maxVisibleCategories = 10;
  private _categoriesLoaded = false;
  readonly loadingPlaceholders = [1, 2, 3, 4];

  tabs = [
    { key: 'all',      label: 'All',        icon: '📚' },
    { key: 'article',  label: 'Articles',   icon: '📄' },
    { key: 'video',    label: 'Videos',     icon: '🎬' },
    { key: 'podcast',  label: 'Podcasts',   icon: '🎙️' },
    { key: 'exercise', label: 'Exercises',  icon: '💪' },
    { key: 'template', label: 'Templates',  icon: '📋' },
  ];

  get activeTabLabel(): string {
    const tab = this.tabs.find(t => t.key === this.activeTab());
    return tab ? tab.label.replace(/[^\w\s]/g, '').trim() : 'Resource';
  }

  get savedResources() { return this.resources.filter(r => r.saved); }

  get bookmarkCount(): number { return this.bookmarkIndexByResourceId.size; }

  get savedEngagements(): EngagementApiResponse[] {
    const result: EngagementApiResponse[] = [];
    const now = new Date().toISOString();
    for (const [resourceId] of this.bookmarkIndexByResourceId) {
      const eng = this.backendEngagements.get(resourceId);
      if (eng) {
        result.push(eng);
      } else {
        const bk = this.bookmarkDataByResourceId.get(resourceId);
        if (bk?.resource) {
          result.push({
            id: '', resourceId,
            resourceTitle: bk.resource.title,
            resourceUrl: bk.resource.url ?? '',
            resourceType: bk.resource.type,
            resourceThumbUrl: bk.resource.thumbUrl ?? null,
            resourceCategoryName: bk.resource.categoryName ?? null,
            status: 'NOT_STARTED',
            progressPct: 0, openCount: 0, notes: null,
            firstOpenedAt: null, lastOpenedAt: null,
            createdAt: now, updatedAt: now,
            activityDays: [], streakDays: 0,
          } as EngagementApiResponse);
        }
      }
    }
    // Fix 3: IN_PROGRESS first, NOT_STARTED second, COMPLETED last
    const priority: Record<string, number> = { IN_PROGRESS: 0, NOT_STARTED: 1, COMPLETED: 2 };
    result.sort((a, b) => (priority[a.status] ?? 1) - (priority[b.status] ?? 1));
    return result;
  }

  get inProgressEngagements(): EngagementApiResponse[] {
    return this.savedEngagements.filter(e => e.status !== 'COMPLETED');
  }

  get completedEngagements(): EngagementApiResponse[] {
    return this.savedEngagements.filter(e => e.status === 'COMPLETED');
  }

  scrollEng(dir: number): void {
    const el = this.engScrollRef?.nativeElement;
    if (!el) return;
    el.scrollBy({ left: dir * 260, behavior: 'smooth' });
  }

  scrollToGrid(): void {
    const el = document.querySelector('.lib-cmdbar') as HTMLElement | null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  trackEngById = (_: number, e: EngagementApiResponse) => e.resourceId;

  formatRelTime(iso: string | null): string {
    return iso ? this.formatRelativeTime(iso) : '';
  }

  openEngagement(eng: EngagementApiResponse): void {
    if (!eng.resourceUrl || !this.hasRealResourceUrl(eng.resourceUrl)) {
      this.showMessage('URL non disponible pour cette ressource.', 'error');
      return;
    }
    window.open(eng.resourceUrl, '_blank', 'noopener,noreferrer');

    const doOpen = () => {
      this.resourceApi.recordOpen(eng.resourceId).subscribe({
        next: (updated: EngagementApiResponse) => {
          // Auto-advance: each session = +20%, capped at 90% until manually marked complete
          const autoPct = Math.min(90, updated.openCount * 20);
          if (autoPct > (updated.progressPct ?? 0)) {
            const status = autoPct > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';
            this.resourceApi.updateEngagement(eng.resourceId, { progressPct: autoPct, status }).subscribe({
              next: (final: EngagementApiResponse) => this.backendEngagements.set(final.resourceId, final),
              error: () => this.backendEngagements.set(updated.resourceId, updated),
            });
          } else {
            this.backendEngagements.set(updated.resourceId, updated);
          }
        },
        error: () => {},
      });
    };

    // If placeholder (no real engagement record yet), ensure first
    if (!eng.id) {
      this.resourceApi.ensureEngagement(eng.resourceId).subscribe({
        next: (created: EngagementApiResponse) => { this.backendEngagements.set(created.resourceId, created); doOpen(); },
        error: () => doOpen(),
      });
    } else {
      doOpen();
    }
  }

  removeBookmarkByEngagement(eng: EngagementApiResponse): void {
    if (this.bookmarkPendingIds.has(eng.resourceId)) return;
    this.bookmarkPendingIds.add(eng.resourceId);
    const bookmarkId = this.bookmarkIndexByResourceId.get(eng.resourceId);
    if (!bookmarkId || bookmarkId === '__pending__') { this.bookmarkPendingIds.delete(eng.resourceId); return; }
    this.resourceApi.removeBookmark(bookmarkId).subscribe({
      next: () => {
        this.bookmarkIndexByResourceId.delete(eng.resourceId);
        this.backendEngagements.delete(eng.resourceId);
        const r = this.resources.find(x => x.id === eng.resourceId);
        if (r) r.saved = false;
        this.bookmarkPendingIds.delete(eng.resourceId);
      },
      error: () => this.bookmarkPendingIds.delete(eng.resourceId),
    });
  }

  get hasActiveFilters(): boolean {
    return this.activeTab() !== 'all' || this.activeCat().id !== 'all' || this.activeLevel() !== 'ALL' || this.searchQuery.trim().length > 0 || this.showSavedOnly;
  }

  get activeFilterCount(): number {
    let n = 0;
    if (this.activeTab() !== 'all') n++;
    if (this.activeCat().id !== 'all') n++;
    if (this.activeLevel() !== 'ALL') n++;
    if (this.searchQuery.trim().length > 0) n++;
    return n;
  }

  get activeFilterSummary(): string {
    const tabFr: Record<string, string> = {
      all: 'Tout', article: 'Articles', video: 'Vidéos',
      podcast: 'Podcasts', exercise: 'Exercices', template: 'Templates',
    };
    const levelFr: Record<string, string> = {
      BEGINNER: 'Débutant', INTERMEDIATE: 'Intermédiaire', ADVANCED: 'Avancé',
    };
    const parts: string[] = [];
    if (this.activeTab() !== 'all') parts.push(tabFr[this.activeTab()] ?? this.activeTab());
    if (this.activeCat().id !== 'all') parts.push(this.activeCat().name);
    if (this.activeLevel() !== 'ALL') parts.push(levelFr[this.activeLevel()] ?? this.activeLevel());
    if (this.searchQuery.trim().length > 0) parts.push(`"${this.searchQuery.trim()}"`);
    return parts.join(' · ');
  }

  get sectionTitleFr(): string {
    const map: Record<string, string> = {
      all: 'Toutes les ressources', article: 'Articles', video: 'Vidéos',
      podcast: 'Podcasts', exercise: 'Exercices', template: 'Templates',
    };
    const base = map[this.activeTab()] ?? 'Ressources';
    return this.activeCat().id !== 'all' ? `${base} · ${this.activeCat().name}` : base;
  }

  retryLoad(): void {
    this.loadError = '';
    this.reloadResources();
  }


  get displayedResources() {
    let res = [...this.resources];
    if (this.showSavedOnly) {
      res = res.filter(r => r.saved);
    }

    const search = this.normalizeSearchText(this.searchQuery.trim());
    if (search.length > 0) {
      const rawTerms = search.split(/\s+/).filter(Boolean);
      // Expand each term with its synonym group: a resource matches a term if
      // ANY of the term's synonyms is found in the haystack.
      const expandedTerms: string[][] = rawTerms.map((t) => this.expandWithSynonyms(t));
      res = res.filter((r) => {
        const haystack = this.normalizeSearchText([
          r.title,
          r.description,
          r.category,
          r.level,
          r.type,
          ...(r.tags || []),
        ]
          .filter(Boolean)
          .join(' '));
        const tokens = this.tokenizeSearchText(haystack);
        return expandedTerms.every((group) =>
          group.some((term) => this.matchesSearchTerm(term, haystack, tokens))
        );
      });
    }

    // Tab/category/level are now backend-filtered; only apply client-side for saved-only view
    if (this.showSavedOnly) {
      if (this.activeTab() !== 'all') res = res.filter(r => r.type === this.activeTab());
      if (this.activeCat().id !== 'all') res = res.filter(r => r.category === this.activeCat().name);
      if (this.activeLevel() !== 'ALL') res = res.filter(r => r.level === this.activeLevel().toLowerCase());
    }

    const sortKey = this.sortBy();
    if (sortKey === 'title-asc') {
      res.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortKey === 'title-desc') {
      res.sort((a, b) => b.title.localeCompare(a.title));
    } else if (sortKey === 'rating-desc') {
      res.sort((a, b) => b.rating - a.rating);
    }

    return res;
  }

  get featuredResource(): Resource | null {
    if (this.displayedResources.length > 0) {
      const withRealUrl = this.displayedResources.find((r) => this.hasRealResourceUrl(r.url));
      return withRealUrl || this.displayedResources[0];
    }
    if (this.resources.length > 0) {
      const withRealUrl = this.resources.find((r) => this.hasRealResourceUrl(r.url));
      return withRealUrl || this.resources[0];
    }
    return null;
  }

  ngOnInit(): void {
    this.resolveRole();
    this.loadStoredProgress();
    this.loadStoredEngagement();
    this.initVoiceSearch();

    // Apply any filters coming from the URL (shareable state).
    this.applyQueryParams();

    this.reloadResources();
    this.loadHeroStats();
    this.startSpotlightTimer();
    this.loadRecentSearches();
    this.startPassiveRefresh();
  }

  private loadHeroStats(): void {
    this.resourceApi.getStats().subscribe({
      next: (stats) => {
        this.heroStats = stats;
        this._newThisWeekCount = stats.newThisWeek;
      },
      error: () => { /* non-critical — hero falls back to page-level counts */ }
    });
  }

  /** Reads ?tab=&cat=&level=&sort=&q= from the URL and applies them silently. */
  private applyQueryParams(): void {
    const p = this.route.snapshot.queryParamMap;
    const tab = p.get('tab');
    const cat = p.get('cat');
    const level = p.get('level');
    const sort = p.get('sort');
    const q = p.get('q');
    if (tab && this.tabs.some(t => t.key === tab)) this.activeTab.set(tab);
    if (level && ['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(level)) this.activeLevel.set(level);
    if (sort && ['relevance', 'title-asc', 'title-desc', 'rating-desc'].includes(sort)) {
      this.sortBy.set(sort as any);
    }
    if (q) this.searchQuery = q;
    if (cat && cat !== 'all') {
      // Category resolved by id or name once categories are loaded; queue a pending cat.
      this._pendingCatFromUrl = cat;
    }
  }
  private _pendingCatFromUrl: string | null = null;
  private _urlSyncTimer: number | null = null;

  /** Writes the current filter state to URL query params (replaceUrl = true → no history spam). */
  private syncUrlFromState(): void {
    const params: Record<string, string | null> = {
      tab: this.activeTab() === 'all' ? null : this.activeTab(),
      cat: this.activeCat().id === 'all' ? null : this.activeCat().id,
      level: this.activeLevel() === 'ALL' ? null : this.activeLevel(),
      sort: this.sortBy() === 'relevance' ? null : this.sortBy(),
      q: (this.searchQuery || '').trim() || null,
    };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Stats auto-update: detects value changes and pulses the affected number. */
  ngDoCheck(): void {
    if (!this.resources) return;
    const cur = {
      res: this.resources.length,
      vid: this.videoCount,
      saved: this.bookmarkCount,
      cat: this.realCategoriesCount,
    };
    (['res', 'vid', 'saved', 'cat'] as const).forEach((k) => {
      if (this._prevStats[k] !== -1 && this._prevStats[k] !== cur[k]) {
        this.triggerStatPulse(k);
      }
      this._prevStats[k] = cur[k];
    });
  }

  private triggerStatPulse(key: 'res' | 'vid' | 'saved' | 'cat'): void {
    this.statPulse[key] = true;
    if (this._statPulseTimers[key]) clearTimeout(this._statPulseTimers[key]!);
    this._statPulseTimers[key] = setTimeout(() => {
      this.statPulse[key] = false;
      this._statPulseTimers[key] = null;
    }, 1000);
  }

  /**
   * Passive refresh: quietly re-pulls resources every 60s when the page is visible
   * and the user isn't mid-edit (no modal open). Ensures stats stay accurate even
   * if another admin creates/deletes in parallel.
   */
  private startPassiveRefresh(): void {
    this.stopPassiveRefresh();
    this.passiveRefreshTimer = setInterval(() => {
      if (document.hidden) return;
      if (this.showResourceForm || this.showAiAtelier || this.showSummaryModal) return;
      // Light reload: only if we're on the default view (no search in progress)
      if ((this.searchQuery || '').trim().length > 0) return;
      this.reloadResources();
    }, 60_000);
  }
  private stopPassiveRefresh(): void {
    if (this.passiveRefreshTimer) {
      clearInterval(this.passiveRefreshTimer);
      this.passiveRefreshTimer = null;
    }
  }

  ngOnDestroy(): void {
    if (this.speechRecognition && this.isVoiceListening) {
      this.speechRecognition.stop();
    }
    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
      this.searchDebounceId = null;
    }
    if (this.voiceBadgeTimeoutId) {
      clearTimeout(this.voiceBadgeTimeoutId);
      this.voiceBadgeTimeoutId = null;
    }
    this.stopSpotlightTimer();
    this.stopAiStatusCycle();
    this.clearSummaryTimers();
    if (this.summaryCopyTimer) { clearTimeout(this.summaryCopyTimer); this.summaryCopyTimer = null; }
    if (this.recentlyCreatedClearTimer) { clearTimeout(this.recentlyCreatedClearTimer); this.recentlyCreatedClearTimer = null; }
    if (this.searchBlurTimer) { clearTimeout(this.searchBlurTimer); this.searchBlurTimer = null; }
    this.stopPassiveRefresh();
    (['res','vid','saved','cat'] as const).forEach((k) => {
      if (this._statPulseTimers[k]) { clearTimeout(this._statPulseTimers[k]!); this._statPulseTimers[k] = null; }
    });
  }

  private _loadingTimer?: ReturnType<typeof setTimeout>;
  reloadResources(): void {
    clearTimeout(this._loadingTimer);
    this._loadingTimer = setTimeout(() => { this.isLoading = true; }, 150);
    this.loadError = '';

    const trimmedQuery = this.searchQuery.trim();
    const activeLevel = this.activeLevel();
    const emptyPage: PageResponse<ResourceApiResponse> = { content: [], totalElements: 0, totalPages: 1 };

    const activeTab = this.activeTab();
    const activeCatId = this.activeCat().id;
    const hasFilters = activeTab !== 'all' || activeCatId !== 'all' || activeLevel !== 'ALL';

    const resources$ = trimmedQuery.length > 0
      ? this.resourceApi.searchResources(trimmedQuery, this.currentPage, this.pageSize).pipe(catchError(() => of(emptyPage)))
      : (hasFilters
        ? this.resourceApi.filterResources(
            activeTab !== 'all' ? activeTab : undefined,
            undefined,
            activeLevel !== 'ALL' ? activeLevel : undefined,
            activeCatId !== 'all' ? activeCatId : undefined,
            this.currentPage, this.pageSize
          ).pipe(catchError(() => of(emptyPage)))
        : this.resourceApi.getResources(this.currentPage, this.pageSize).pipe(catchError(() => of(emptyPage))));

    const categories$ = this._categoriesLoaded
      ? of([] as CategoryApiResponse[])
      : this.resourceApi.getCategories().pipe(catchError(() => of([] as CategoryApiResponse[])));

    const bookmarks$ = this.authService.isAuthenticated()
      ? this.resourceApi.getBookmarks().pipe(catchError(() => of([] as BookmarkApiResponse[])))
      : of([] as BookmarkApiResponse[]);

    const engagements$ = this.authService.isAuthenticated()
      ? this.resourceApi.getEngagements().pipe(catchError(() => of([] as EngagementApiResponse[])))
      : of([] as EngagementApiResponse[]);

    forkJoin({
      resources: resources$,
      categories: categories$,
      bookmarks: bookmarks$,
      engagements: engagements$,
    })
      .pipe(
        timeout(15000),
        catchError(() => {
          this.loadError = 'Unable to load resources. Check your connection.';
          return of({ resources: emptyPage, categories: [] as CategoryApiResponse[], bookmarks: [] as BookmarkApiResponse[], engagements: [] as EngagementApiResponse[] });
        }),
        finalize(() => { clearTimeout(this._loadingTimer); this.isLoading = false; })
      )
      .subscribe({
        next: ({ resources, categories, bookmarks, engagements }: {
          resources: PageResponse<ResourceApiResponse>;
          categories: CategoryApiResponse[];
          bookmarks: BookmarkApiResponse[];
          engagements: EngagementApiResponse[];
        }) => {
          this.bookmarkIndexByResourceId = new Map(
            bookmarks.map((bookmark: BookmarkApiResponse) => [bookmark.resourceId, bookmark.id])
          );
          this.bookmarkDataByResourceId = new Map(
            bookmarks.map((bookmark: BookmarkApiResponse) => [bookmark.resourceId, bookmark])
          );
          this.backendEngagements = new Map(
            (engagements || []).map((e: EngagementApiResponse) => [e.resourceId, e])
          );
          // Sync: create engagement records for bookmarks that don't have one yet
          for (const [resourceId] of this.bookmarkIndexByResourceId) {
            if (!this.backendEngagements.has(resourceId)) {
              this.resourceApi.ensureEngagement(resourceId).subscribe({
                next: (eng: EngagementApiResponse) => this.backendEngagements.set(eng.resourceId, eng),
                error: () => {},
              });
            }
          }

          if (categories.length > 0) {
            this._categoriesLoaded = true;
            // Dédupliquer les catégories par nom
            const uniqueCategoriesMap = new Map<string, { id: string, name: string }>();
            for (const c of categories) {
              if (!uniqueCategoriesMap.has(c.name)) {
                uniqueCategoriesMap.set(c.name, { id: c.id, name: c.name });
              }
            }
            this.categories = [{ id: 'all', name: 'All' }, ...Array.from(uniqueCategoriesMap.values())];
            this.displayedCategories = this.categories.slice(0, this.maxVisibleCategories);
            // Apply pending category from URL if any (once categories are loaded)
            if (this._pendingCatFromUrl) {
              const match = this.categories.find((c) => c.id === this._pendingCatFromUrl);
              if (match) this.activeCat.set(match);
              this._pendingCatFromUrl = null;
            }
          }
          this.resources = resources.content.map((resource: ResourceApiResponse) => this.toUiResource(resource));
          // Count resources created in the last 7 days (for hero "+X cette semaine" badge)
          const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          this._newThisWeekCount = (resources.content || []).reduce((n, r: any) => {
            const ts = r?.createdAt ? Date.parse(r.createdAt) : NaN;
            return isFinite(ts) && ts >= weekAgo ? n + 1 : n;
          }, 0);
          this.ensureProgressForSavedResources();

          if (this.pendingCreatedResource) {
            const createdUi = this.toUiResource(this.pendingCreatedResource);
            const exists = this.resources.some((r) => r.id === createdUi.id);
            if (!exists) {
              this.resources = [createdUi, ...this.resources];
            } else {
              this.pendingCreatedResource = null;
            }
          }

          if (this.searchQuery.trim().length > 0) {
            this.currentPage = 0;
            this.totalElements = this.resources.length;
            this.totalPages = 1;
          } else {
            this.totalElements = resources.totalElements ?? resources.page?.totalElements ?? this.resources.length;
            this.totalPages = resources.totalPages ?? resources.page?.totalPages ?? 1;
          }

          if (this.totalPages < 1) {
            this.totalPages = 1;
          }

          if (this.currentPage >= this.totalPages) {
            this.currentPage = this.totalPages - 1;
          }
        },
        error: () => {
          if (this.resources.length === 0) {
            this.totalElements = 0;
            this.totalPages = 1;
          }
          this.loadError = 'Unable to load resources from backend.';
        },
      });
  }

  private resolveRole(): void {
    if (!this.authService.isAuthenticated()) {
      this.isAdmin = false;
      return;
    }

    this.userApi.getCurrentUser().pipe(
      catchError(() => {
        this.isAdmin = this.hasAdminRealmRole();
        return of(null);
      })
    ).subscribe(profile => {
      if (!profile) {
        return;
      }

      const role = (profile.role || '').toUpperCase();
      this.isAdmin = role === 'ADMIN';
    });
  }

  private hasAdminRealmRole(): boolean {
    const roles = this.authService.getUserRoles().map(role => String(role).trim().toUpperCase());
    return roles.includes('ADMIN') || roles.includes('ROLE_ADMIN');
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.currentPage = 0;

    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
      this.searchDebounceId = null;
    }

    // Sync URL ~300ms after typing stops (cheaper than on every keystroke)
    if (this._urlSyncTimer) clearTimeout(this._urlSyncTimer);
    this._urlSyncTimer = window.setTimeout(() => this.syncUrlFromState(), 300);

    if (!value.trim()) {
      this.reloadResources();
      return;
    }

    this.searchDebounceId = window.setTimeout(() => {
      this.reloadResources();
      this.searchDebounceId = null;
    }, 250);
  }

  forceSearch(): void {
    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
      this.searchDebounceId = null;
    }
    this.currentPage = 0;
    this.reloadResources();
  }

  toggleVoiceSearch(): void {
    if (!this.voiceSearchSupported || !this.speechRecognition) {
      this.showMessage('La recherche vocale n\'est pas supportée dans ce navigateur.', 'error');
      return;
    }

    if (this.isVoiceListening) {
      this.speechRecognition.stop();
      return;
    }

    // Apply latest language choice before each start (so toggles take effect).
    this.speechRecognition.lang = this.voiceLang;
    this.voiceInterimText = '';
    this.speechRecognition.start();
  }

  toggleVoiceLang(): void {
    this.voiceLang = this.voiceLang === 'fr-FR' ? 'en-US' : 'fr-FR';
    try { localStorage.setItem(this.voiceLangKey, this.voiceLang); } catch { /* ignore */ }
    if (this.speechRecognition) {
      this.speechRecognition.lang = this.voiceLang;
    }
  }

  get voiceLangShort(): string {
    return this.voiceLang === 'en-US' ? 'EN' : 'FR';
  }

  setTab(key: string): void {
    this.activeTab.set(key);
    this.currentPage = 0;
    this.syncUrlFromState();
    this.reloadResources();
  }

  setCat(c: { id: string; name: string }): void {
    this.activeCat.set(c);
    this.currentPage = 0;
    this.syncUrlFromState();
    this.reloadResources();
  }

  setSort(sort: 'relevance' | 'title-asc' | 'title-desc' | 'rating-desc'): void {
    this.sortBy.set(sort);
    this.syncUrlFromState();
  }

  setViewDensity(density: 'comfortable' | 'compact'): void {
    this.viewDensity.set(density);
  }

  toggleCategoryView(): void {
    this.showAllCategories = !this.showAllCategories;
    if (this.showAllCategories) {
      this.displayedCategories = this.categories;
    } else {
      this.displayedCategories = this.categories.slice(0, this.maxVisibleCategories);
    }
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.activeTab.set('all');
    this.activeCat.set({ id: 'all', name: 'All' });
    this.activeLevel.set('ALL');
    this.showAllCategories = false;
    this.displayedCategories = this.categories.slice(0, this.maxVisibleCategories);
    this.showSavedOnly = false;
    this.showCategoriesPicker = false;
    this.activeStat = 'all';
    this.currentPage = 0;
    this.reloadResources();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.reloadResources();
  }

  clearLastVoiceQuery(): void {
    this.lastVoiceQuery = '';
  }

  clearCategory(): void {
    this.activeCat.set({ id: 'all', name: 'All' });
    this.currentPage = 0;
    this.reloadResources();
  }

  clearLevel(): void {
    this.activeLevel.set('ALL');
    this.currentPage = 0;
    this.reloadResources();
  }

  setLevel(level: string): void {
    this.activeLevel.set(level);
    this.currentPage = 0;
    this.syncUrlFromState();
    this.reloadResources();
  }

  previousPage(): void {
    if (this.currentPage === 0 || this.isLoading) return;
    this.currentPage--;
    this.reloadResources();
  }

  nextPage(): void {
    if (this.currentPage + 1 >= this.totalPages || this.isLoading) return;
    this.currentPage++;
    this.reloadResources();
  }

  onGridPageChange(page: number): void {
    if (page < 0 || page >= this.totalPages || this.isLoading) return;
    this.currentPage = page;
    this.reloadResources();
  }

  get recentlyCreatedSet(): Set<string> {
    return this.recentlyCreatedIds;
  }

  toggleSaved(resource: Resource): void {
    if (!this.authService.isAuthenticated()) {
      this.authService.login();
      return;
    }

    if (this.bookmarkPendingIds.has(resource.id)) return;
    this.bookmarkPendingIds.add(resource.id);

    const bookmarkId = this.bookmarkIndexByResourceId.get(resource.id);
    if (bookmarkId) {
      // Optimistic: mark unsaved immediately
      resource.saved = false;
      this.resourceApi.removeBookmark(bookmarkId).subscribe({
        next: () => {
          this.bookmarkIndexByResourceId.delete(resource.id);
          this.bookmarkPendingIds.delete(resource.id);
        },
        error: () => {
          // Revert on failure
          resource.saved = true;
          this.bookmarkPendingIds.delete(resource.id);
        },
      });
      return;
    }

    // Optimistic: mark saved immediately + add engagement card right away
    resource.saved = true;
    this.bookmarkIndexByResourceId.set(resource.id, '__pending__');
    if (!this.backendEngagements.has(resource.id)) {
      this.backendEngagements.set(resource.id, {
        id: '', resourceId: resource.id,
        resourceTitle: resource.title,
        resourceUrl: resource.url ?? '',
        resourceType: (resource.type ?? 'article').toUpperCase(),
        resourceThumbUrl: resource.thumbnailUrl ?? null,
        resourceCategoryName: resource.category,
        status: 'NOT_STARTED', progressPct: 0, openCount: 0,
        notes: null, firstOpenedAt: null, lastOpenedAt: null,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        activityDays: [], streakDays: 0,
      });
    }
    this.resourceApi.addBookmark(resource.id).subscribe({
      next: (bookmark: BookmarkApiResponse) => {
        this.bookmarkIndexByResourceId.set(resource.id, bookmark.id);
        this.bookmarkPendingIds.delete(resource.id);
        this.ensureResourceEngagement(resource.id);
        // Sync real engagement data in background — card is already visible
        this.resourceApi.ensureEngagement(resource.id).subscribe({
          next: (eng: EngagementApiResponse) => this.backendEngagements.set(eng.resourceId, eng),
          error: () => {},
        });
      },
      error: (err: any) => {
        if (err?.status === 409) {
          // Already bookmarked on server — reconcile
          this.bookmarkPendingIds.delete(resource.id);
          this.ensureResourceEngagement(resource.id);
          this.resourceApi.ensureEngagement(resource.id).subscribe({
            next: (eng: EngagementApiResponse) => this.backendEngagements.set(eng.resourceId, eng),
            error: () => {},
          });
        } else {
          // Revert on failure
          resource.saved = false;
          this.bookmarkIndexByResourceId.delete(resource.id);
          this.backendEngagements.delete(resource.id);
          this.bookmarkPendingIds.delete(resource.id);
        }
      },
    });
  }

  typeIcon(type: string): string {
    const icons: Record<string, string> = {
      article: '📄', video: '🎬', podcast: '🎙️', exercise: '💪', template: '📋'
    };
    return icons[type] || '📄';
  }

  spotlightThumbError = false;
  spotlightThumbErrors: boolean[] = [];

  get videoCount(): number {
    return this.resources.filter(r => r.type === 'video').length;
  }

  get videoPercent(): number {
    if (this.resources.length === 0) return 0;
    return Math.round((this.videoCount / this.resources.length) * 100);
  }

  get heroVideoPercent(): number {
    if (this.heroStats && this.heroStats.totalCount > 0) {
      return Math.round((this.heroStats.videoCount / this.heroStats.totalCount) * 100);
    }
    return this.videoPercent;
  }

  /** Real categories (excluding the "all" UI pseudo-category if present). */
  get realCategoriesCount(): number {
    return this.categories.filter((c: any) => c?.id && c.id !== 'all').length;
  }

  /**
   * Best-effort count of resources created in the last 7 days.
   * Falls back to 0 if createdAt isn't surfaced on the UI model (it isn't today),
   * so we look up the original API payload cached on the resource via bookmark index or
   * derive from the last-load timestamp approximation. For now we use a session-level counter.
   */
  get newThisWeekCount(): number {
    return this._newThisWeekCount;
  }
  private _newThisWeekCount = 0;

  /** Tracks the currently active quick-filter stat ('all' | 'video' | 'saved' | 'categories'). */
  activeStat: 'all' | 'video' | 'saved' | 'categories' = 'all';
  showSavedOnly = false;
  showCategoriesPicker = false;

  applyStatFilter(which: 'all' | 'video' | 'saved' | 'categories'): void {
    this.activeStat = which;
    // Clear transient overlays
    this.showSavedOnly = false;
    this.showCategoriesPicker = false;

    if (which === 'all') {
      this.resetFilters();
      return;
    }
    if (which === 'video') {
      this.setTab('video');
      this.scrollToResults();
      return;
    }
    if (which === 'saved') {
      // No built-in "saved" tab — toggle a dedicated saved-only filter
      this.showSavedOnly = true;
      this.setTab('all');
      this.activeCat.set({ id: 'all', name: 'All' });
      this.activeLevel.set('ALL');
      this.searchQuery = '';
      this.scrollToResults();
      return;
    }
    if (which === 'categories') {
      this.showCategoriesPicker = true;
      // Scroll so the toolbar category chips are visible
      this.scrollToResults();
      return;
    }
  }

  private scrollToResults(): void {
    try {
      const el = document.querySelector('.results-section, .resources-list, .lib-cmdbar');
      if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch { /* ignore */ }
  }
  spotlightIndex = 0;
  spotlightPaused = false;
  private spotlightTimer: ReturnType<typeof setInterval> | null = null;
  private readonly spotlightIntervalMs = 8000;

  get spotlightResources(): Resource[] {
    if (!this.resources || this.resources.length === 0) return [];
    const scored = this.resources.map((r) => ({
      r,
      score:
        (r.thumbnailUrl ? 3 : 0) +
        (this.hasRealResourceUrl(r.url) ? 2 : 0) +
        (r.rating || 0) * 0.2,
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.min(3, scored.length)).map((x) => x.r);
  }

  trackSpotlightById = (_: number, r: Resource) => r.id;

  onSpotlightEnter(): void { this.spotlightPaused = true; }

  onSpotlightLeave(stage?: HTMLElement): void {
    this.spotlightPaused = false;
    if (stage) {
      stage.querySelectorAll<HTMLElement>('.sp-slide').forEach((el) => {
        el.style.removeProperty('--tilt-x');
        el.style.removeProperty('--tilt-y');
        el.style.removeProperty('--mx');
        el.style.removeProperty('--my');
      });
    }
  }

  onSpotlightMove(ev: MouseEvent, card: HTMLElement): void {
    const rect = card.getBoundingClientRect();
    const x = (ev.clientX - rect.left) / rect.width;
    const y = (ev.clientY - rect.top) / rect.height;
    const tiltX = (y - 0.5) * -6;
    const tiltY = (x - 0.5) * 6;
    card.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
    card.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
    card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
  }

  goToSpotlight(i: number): void {
    const total = this.spotlightResources.length;
    if (total === 0) return;
    this.spotlightIndex = ((i % total) + total) % total;
    this.restartSpotlightTimer();
  }

  nextSpotlight(): void { this.goToSpotlight(this.spotlightIndex + 1); }
  prevSpotlight(): void { this.goToSpotlight(this.spotlightIndex - 1); }

  private startSpotlightTimer(): void {
    this.stopSpotlightTimer();
    this.spotlightTimer = setInterval(() => {
      if (this.spotlightPaused) return;
      if (this.spotlightResources.length <= 1) return;
      this.spotlightIndex = (this.spotlightIndex + 1) % this.spotlightResources.length;
    }, this.spotlightIntervalMs);
  }

  private stopSpotlightTimer(): void {
    if (this.spotlightTimer) {
      clearInterval(this.spotlightTimer);
      this.spotlightTimer = null;
    }
  }

  private restartSpotlightTimer(): void {
    this.stopSpotlightTimer();
    this.startSpotlightTimer();
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      article: 'Article', video: 'Vidéo', podcast: 'Podcast', exercise: 'Exercice', template: 'Modèle'
    };
    return labels[type] ?? type;
  }

  levelLabel(level: string): string {
    const labels: Record<string, string> = {
      beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé'
    };
    return labels[level] ?? level;
  }

  openResource(resource: Resource): void {
    if (!resource?.id) {
      this.showMessage('This resource is not available yet.', 'error');
      return;
    }

    if (resource.url) {
      if (!this.hasRealResourceUrl(resource.url)) {
        this.showMessage('This is a demo placeholder link. Upload or edit the resource URL to open real content.', 'error');
        return;
      }
      window.open(resource.url, '_blank', 'noopener,noreferrer');
      this.advanceProgressOnOpen(resource);
      if (resource.saved && this.authService.isAuthenticated()) {
        this.resourceApi.recordOpen(resource.id).subscribe({
          next: (eng: EngagementApiResponse) => this.backendEngagements.set(eng.resourceId, eng),
          error: () => {},
        });
      }
      return;
    }

    this.resourceApi.getResourceById(resource.id).subscribe({
      next: (fullResource: ResourceApiResponse) => {
        if (!fullResource.url) {
          this.showMessage('No URL configured for this resource.', 'error');
          return;
        }
        if (!this.hasRealResourceUrl(fullResource.url)) {
          this.showMessage('This is a demo placeholder link. Upload or edit the resource URL to open real content.', 'error');
          return;
        }
        window.open(fullResource.url, '_blank', 'noopener,noreferrer');
        this.advanceProgressOnOpen(resource);
        if (resource.saved && this.authService.isAuthenticated()) {
          this.resourceApi.recordOpen(resource.id).subscribe({
            next: (eng: EngagementApiResponse) => this.backendEngagements.set(eng.resourceId, eng),
            error: () => {},
          });
        }
      },
      error: () => {
        this.showMessage('Unable to open resource right now.', 'error');
      },
    });
  }

  hasRealResourceUrl(url?: string | null): boolean {
    if (!url) {
      return false;
    }
    return !url.toLowerCase().includes('example.com');
  }

  // Resource management methods
  openCreateResourceForm(): void {
    this.editingResource = null;
    this.showResourceForm = true;
  }

  // ============ AI ATELIER (multi-step generate) ============
  openAiAtelier(): void {
    if (!this.isAdmin) return;
    this.aiAtelierStep = 'brief';
    this.aiError = '';
    this.aiGeneratedPreviews = [];
    this.aiLastResult = null;
    this.showAiAtelier = true;
  }

  closeAiAtelier(): void {
    if (this.aiAtelierStep === 'generating') return; // don't close mid-generation
    const wasDone = this.aiAtelierStep === 'done';
    this.showAiAtelier = false;
    this.stopAiStatusCycle();
    // If the user closes after a successful generation, bring them straight to the results.
    if (wasDone && this.recentlyCreatedIds.size > 0) {
      // Sort by relevance (default) + reset filters so new items surface at the top.
      this.setSort('relevance');
      this.resetFilters();
      setTimeout(() => this.scrollToResults(), 150);
    }
  }

  private markRecentlyCreated(ids: string[]): void {
    if (this.recentlyCreatedClearTimer) {
      clearTimeout(this.recentlyCreatedClearTimer);
      this.recentlyCreatedClearTimer = null;
    }
    this.recentlyCreatedIds = new Set(ids);
    this.recentlyCreatedClearTimer = setTimeout(() => {
      this.recentlyCreatedIds = new Set();
      this.recentlyCreatedClearTimer = null;
    }, 90_000);
  }

  isRecentlyCreated(id: string): boolean {
    return this.recentlyCreatedIds.has(id);
  }

  resetAiAtelier(): void {
    this.aiAtelierStep = 'brief';
    this.aiError = '';
    this.aiGeneratedPreviews = [];
    this.aiLastResult = null;
  }

  toggleAiFocus(value: string): void {
    const i = this.aiBrief.focus.indexOf(value);
    if (i >= 0) {
      this.aiBrief.focus.splice(i, 1);
    } else {
      this.aiBrief.focus.push(value);
    }
  }

  runAiGeneration(): void {
    if (!this.isAdmin || this.isAiGenerating) return;
    this.aiAtelierStep = 'generating';
    this.aiError = '';
    this.aiStatusIndex = 0;
    this.aiCancelRequested = false;
    this.startAiStatusCycle();

    const payload: { count: number; level?: string; industry?: string } = { count: this.aiBrief.count };
    if (this.aiBrief.level && this.aiBrief.level !== 'MIX') {
      payload.level = this.aiBrief.level;
    }
    // Map first selected focus to the backend industry enum (best-effort).
    // Multiple focuses selected → use the first for industry; others still steer title flavor server-side.
    const focusToIndustry: Record<string, string> = {
      // Tech family
      'web-dev':        'TECHNOLOGY',
      'architecture':   'ENGINEERING',
      'cloud-devops':   'ENGINEERING',
      'ai-ml':          'TECHNOLOGY',
      'cybersecurity':  'TECHNOLOGY',
      'data-analytics': 'TECHNOLOGY',
      // Business / career
      'leadership':      'CONSULTING',
      'product':         'CONSULTING',
      'entrepreneurship': 'CONSULTING',
      'communication':   'OTHER',
      'productivity':    'OTHER',
      'soft-skills':     'OTHER',
      // Creative / media
      'design-ux':   'MEDIA',
      'writing':     'MEDIA',
      'media-prod':  'MEDIA',
      // Domain
      'finance':    'FINANCE',
      'marketing':  'MARKETING',
      'education':  'EDUCATION',
      'healthcare': 'HEALTHCARE',
      'legal':      'LEGAL',
    };
    const mappedIndustry = this.aiBrief.focus.map(f => focusToIndustry[f]).find(Boolean);
    if (mappedIndustry) payload.industry = mappedIndustry;

    this.isAiGenerating = true;
    this.aiGenerationSub = this.resourceApi
      .generateAiResources(payload)
      .pipe(finalize(() => { this.isAiGenerating = false; this.aiGenerationSub = null; }))
      .subscribe({
        next: (res: AiGenerateResourcesResponse) => {
          if (this.aiCancelRequested) return;
          this.stopAiStatusCycle();
          // Ensure we show the final "done" checks
          this.aiStatusIndex = this.aiStatusMessages.length - 1;
          this.aiLastResult = res;
          this.aiGeneratedPreviews = res?.resources?.slice(0, 8) || [];
          // Remember the IDs to highlight them in the library for 90s
          this.markRecentlyCreated((res?.resources || []).map((r) => r.id).filter(Boolean));
          // Small delay to let last checkboxes tick in before swapping view
          setTimeout(() => {
            this.aiAtelierStep = 'done';
            this.currentPage = 0;
            this.reloadResources();
          }, 700);
        },
        error: (err) => {
          this.stopAiStatusCycle();
          if (this.aiCancelRequested) {
            this.aiAtelierStep = 'brief';
            this.aiCancelRequested = false;
            return;
          }
          this.aiError = err?.error?.message || err?.message || 'Une erreur est survenue.';
          this.aiAtelierStep = 'error';
        },
      });
  }

  /** Cancels an in-flight AI generation (best-effort: drops the HTTP subscription). */
  cancelAiGeneration(): void {
    if (!this.isAiGenerating || this.aiCancelRequested) return;
    this.aiCancelRequested = true;
    this.stopAiStatusCycle();
    if (this.aiGenerationSub) {
      try { this.aiGenerationSub.unsubscribe(); } catch { /* ignore */ }
      this.aiGenerationSub = null;
    }
    this.isAiGenerating = false;
    this.aiAtelierStep = 'brief';
  }

  private startAiStatusCycle(): void {
    this.stopAiStatusCycle();
    this.aiStatusTimer = setInterval(() => {
      if (this.aiStatusIndex < this.aiStatusMessages.length - 1) {
        this.aiStatusIndex++;
      }
    }, 1400);
  }

  private stopAiStatusCycle(): void {
    if (this.aiStatusTimer) {
      clearInterval(this.aiStatusTimer);
      this.aiStatusTimer = null;
    }
  }

  // ============ AI SUMMARY THEATER ============
  onResourceSummarize(resource: Resource): void {
    if (!resource?.id) return;
    if (this.isSummarizingById[resource.id]) return;

    this.summaryCurrentResourceId = resource.id;
    this.summaryResourceTitle = resource.title;
    this.resetSummaryContent();
    this.isSummarizingById[resource.id] = true;

    this.streamSummaryViaSSE(resource.id, () => {
      this.loadSimilarResources(resource.id);
    });
  }

  /** Opens an SSE stream, shows tokens live, then finalizes with keypoints reveal. */
  private streamSummaryViaSSE(resourceId: string, onDoneCallback?: () => void, refresh = false): void {
    // Close any previous stream and cancel any pending fallback timer
    if (this.summarySseSource) { try { this.summarySseSource.close(); } catch { /* ignore */ } this.summarySseSource = null; }
    if (this.summarySseFallbackTimer) { clearTimeout(this.summarySseFallbackTimer); this.summarySseFallbackTimer = null; }

    const url = `${this.resourceApiBase}/api/resources/${resourceId}/ai/summary/stream${refresh ? '?refresh=true' : ''}`;
    const src = new EventSource(url);
    this.summarySseSource = src;
    // Open the modal immediately so the user sees tokens arrive live.
    this.showSummaryModal = true;
    this.summaryTypewriter = '';
    this.summaryRevealDone = false;

    // Safety-net: if no content arrives within 8s (SSE stuck silently), fall back to HTTP GET.
    this.summarySseFallbackTimer = setTimeout(() => {
      this.summarySseFallbackTimer = null;
      if (!this.summaryTypewriter && !this.summaryRevealDone && this.showSummaryModal) {
        try { src.close(); } catch { /* ignore */ }
        if (this.summarySseSource === src) this.summarySseSource = null;
        this.resourceApi.summarizeResource(resourceId, refresh).subscribe({
          next: (res) => {
            this.applySummaryResponse(res);
            this.startSummaryReveal();
            this.isSummarizingById[resourceId] = false;
            this.summaryRegenerating = false;
            if (onDoneCallback) onDoneCallback();
          },
          error: () => {
            this.isSummarizingById[resourceId] = false;
            this.summaryRegenerating = false;
            this.showMessage('Résumé IA impossible, réessaie.', 'error');
          },
        });
      }
    }, 8000);

    const clearFallbackTimer = () => {
      if (this.summarySseFallbackTimer) { clearTimeout(this.summarySseFallbackTimer); this.summarySseFallbackTimer = null; }
    };

    src.addEventListener('token', (ev: MessageEvent) => {
      clearFallbackTimer();
      try {
        const token = typeof ev.data === 'string' ? ev.data : String(ev.data);
        // Strip surrounding quotes Spring's SSE sends when serializing strings.
        const clean = token.startsWith('"') && token.endsWith('"') ? token.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n') : token;
        this.summaryTypewriter += clean;
      } catch { /* ignore */ }
    });

    src.addEventListener('done', (ev: MessageEvent) => {
      clearFallbackTimer();
      try {
        const payload: AiResourceSummaryResponse = JSON.parse(ev.data);
        this.applySummaryResponse(payload);
        // Replace the accumulated streamed text with the properly parsed summary (extracted from JSON).
        this.summaryTypewriter = this.summaryFullText || this.summaryTypewriter;
        this.summaryRevealDone = true;
        // Animate the keypoints after the stream completes
        this.summaryRevealedPoints = 0;
        this.startPointsReveal();
      } catch {
        // If payload parsing fails, keep the raw streamed text
        this.summaryFullText = this.summaryTypewriter;
        this.summaryRevealDone = true;
      }
      this.isSummarizingById[resourceId] = false;
      this.summaryRegenerating = false;
      try { src.close(); } catch { /* ignore */ }
      this.summarySseSource = null;
      if (onDoneCallback) onDoneCallback();
    });

    src.addEventListener('error', () => {
      clearFallbackTimer();
      // If the stream dies before any token arrived, fall back to the GET endpoint.
      const hadAnyToken = (this.summaryTypewriter || '').length > 0;
      try { src.close(); } catch { /* ignore */ }
      this.summarySseSource = null;
      if (!hadAnyToken) {
        this.resourceApi.summarizeResource(resourceId, refresh).subscribe({
          next: (res) => {
            this.applySummaryResponse(res);
            this.startSummaryReveal();
            this.isSummarizingById[resourceId] = false;
            this.summaryRegenerating = false;
            if (onDoneCallback) onDoneCallback();
          },
          error: () => {
            this.isSummarizingById[resourceId] = false;
            this.summaryRegenerating = false;
            this.showMessage('Résumé IA impossible, réessaie.', 'error');
          },
        });
      } else {
        this.summaryRevealDone = true;
        this.isSummarizingById[resourceId] = false;
        this.summaryRegenerating = false;
      }
    });
  }

  private loadSimilarResources(resourceId: string): void {
    this.similarResources = [];
    this.similarLoading = true;
    this.resourceApi
      .relatedResources(resourceId, 4)
      .pipe(finalize(() => (this.similarLoading = false)))
      .subscribe({
        next: (list) => { this.similarResources = list || []; },
        error: () => { this.similarResources = []; },
      });
  }

  openSimilarResource(apiRes: ResourceApiResponse): void {
    if (apiRes.url) {
      window.open(apiRes.url, '_blank', 'noopener,noreferrer');
      if (this.authService.isAuthenticated()) {
        this.resourceApi.recordOpen(apiRes.id).subscribe({ error: () => {} });
      }
    }
  }

  regenerateSummary(): void {
    if (!this.summaryCurrentResourceId || this.summaryRegenerating) return;
    this.summaryRegenerating = true;
    this.resetSummaryContent();
    this.resourceApi
      .summarizeResource(this.summaryCurrentResourceId, true)
      .pipe(finalize(() => (this.summaryRegenerating = false)))
      .subscribe({
        next: (res: AiResourceSummaryResponse) => {
          this.applySummaryResponse(res);
          this.startSummaryReveal();
        },
        error: (err) => {
          this.showMessage('Régénération impossible : ' + (err?.error?.message || 'Erreur inconnue'), 'error');
        },
      });
  }

  private applySummaryResponse(res: AiResourceSummaryResponse): void {
    this.summaryProvider = res?.provider || '';
    this.summaryFullText = res?.summary || '';
    this.summaryText = this.summaryFullText;
    this.summaryPoints = res?.keyPoints || [];
    this.summaryGeneratedAt = this.formatSummaryTime(res?.generatedAt);
  }

  private formatSummaryTime(iso?: string): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  private startSummaryReveal(): void {
    this.clearSummaryTimers();
    this.summaryTypewriter = '';
    this.summaryRevealDone = false;
    this.summaryRevealedPoints = 0;

    const step = (i: number) => {
      if (!this.showSummaryModal) return;
      if (i >= this.summaryFullText.length) {
        this.summaryRevealDone = true;
        this.startPointsReveal();
        return;
      }
      this.summaryTypewriter = this.summaryFullText.slice(0, i + 1);
      // Faster for short texts, pause on sentence endings
      const ch = this.summaryFullText[i];
      const delay = ch === '.' || ch === '!' || ch === '?' ? 120 : (ch === ',' ? 60 : 18);
      this.summaryTypewriterTimer = setTimeout(() => step(i + 1), delay);
    };
    step(0);
  }

  private startPointsReveal(): void {
    const total = this.summaryPoints.length;
    if (total === 0) return;
    const tick = () => {
      if (!this.showSummaryModal) return;
      if (this.summaryRevealedPoints >= total) return;
      this.summaryRevealedPoints++;
      if (this.summaryRevealedPoints < total) {
        this.summaryPointsTimer = setTimeout(tick, 260);
      }
    };
    this.summaryPointsTimer = setTimeout(tick, 260);
  }

  skipSummaryReveal(): void {
    if (this.summaryRevealDone) return;
    this.clearSummaryTimers();
    this.summaryTypewriter = this.summaryFullText;
    this.summaryRevealDone = true;
    this.summaryRevealedPoints = this.summaryPoints.length;
  }

  toggleSpeakSummary(): void {
    if (!this.ttsSupported) return;
    const synth = window.speechSynthesis;
    if (this.isSpeakingSummary) {
      synth.cancel();
      this.isSpeakingSummary = false;
      this.currentUtterance = null;
      return;
    }
    const parts = [this.summaryFullText, ...(this.summaryPoints || [])].filter(Boolean).join('. ');
    if (!parts.trim()) return;
    const u = new SpeechSynthesisUtterance(parts);
    // Detect language simply: if summary contains many French common words, use fr; otherwise en.
    u.lang = this.detectSummaryLang();
    u.rate = 1.0;
    u.pitch = 1.0;
    u.onend = () => { this.isSpeakingSummary = false; this.currentUtterance = null; };
    u.onerror = () => { this.isSpeakingSummary = false; this.currentUtterance = null; };
    this.currentUtterance = u;
    this.isSpeakingSummary = true;
    synth.speak(u);
  }

  private detectSummaryLang(): string {
    const txt = (this.summaryFullText || '').toLowerCase();
    const frHints = [' le ', ' la ', ' les ', ' un ', ' une ', ' des ', ' et ', ' pour ', ' avec ', ' dans ', ' qui ', ' que ', ' est '];
    const hits = frHints.reduce((n, w) => n + (txt.includes(w) ? 1 : 0), 0);
    return hits >= 2 ? 'fr-FR' : 'en-US';
  }

  copySummary(): void {
    const text = [this.summaryFullText, ...this.summaryPoints.map((p) => `• ${p}`)].join('\n\n');
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      this.summaryCopied = true;
      if (this.summaryCopyTimer) clearTimeout(this.summaryCopyTimer);
      this.summaryCopyTimer = setTimeout(() => (this.summaryCopied = false), 1800);
    });
  }

  closeSummaryModal(): void {
    this.showSummaryModal = false;
    this.clearSummaryTimers();
    this.resetSummaryContent();
    this.summaryResourceTitle = '';
    this.summaryCurrentResourceId = null;
    // Close any ongoing SSE stream
    if (this.summarySseSource) {
      try { this.summarySseSource.close(); } catch { /* ignore */ }
      this.summarySseSource = null;
    }
    // Stop any ongoing TTS playback
    if (this.ttsSupported && this.isSpeakingSummary) {
      try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
      this.isSpeakingSummary = false;
      this.currentUtterance = null;
    }
  }

  private resetSummaryContent(): void {
    this.summaryFullText = '';
    this.summaryText = '';
    this.summaryPoints = [];
    this.summaryProvider = '';
    this.summaryGeneratedAt = '';
    this.summaryTypewriter = '';
    this.summaryRevealDone = false;
    this.summaryRevealedPoints = 0;
    this.summaryCopied = false;
  }

  private clearSummaryTimers(): void {
    if (this.summaryTypewriterTimer) { clearTimeout(this.summaryTypewriterTimer); this.summaryTypewriterTimer = null; }
    if (this.summaryPointsTimer) { clearTimeout(this.summaryPointsTimer); this.summaryPointsTimer = null; }
    if (this.summarySseFallbackTimer) { clearTimeout(this.summarySseFallbackTimer); this.summarySseFallbackTimer = null; }
  }

  onResourceEdit(resource: Resource): void {
    // Get full resource data for editing
    this.resourceApi.getResourceById(resource.id).subscribe({
      next: (fullResource: ResourceApiResponse) => {
        this.editingResource = fullResource;
        this.showResourceForm = true;
      },
      error: () => {
        this.showMessage('Failed to load resource for editing.', 'error');
      },
    });
  }

  onResourceDelete(resource: Resource): void {
    this.resourceApi.deleteResource(resource.id).subscribe({
      next: () => {
        this.resources = this.resources.filter(r => r.id !== resource.id);
        this.showMessage(`Resource "${resource.title}" deleted.`);
        this.reloadResources();
      },
      error: (err) => {
        this.showMessage('Failed to delete resource: ' + (err.error?.message || 'Unknown error'), 'error');
      },
    });
  }

  onFormClosed(event: any): void {
    this.showResourceForm = false;
    this.editingResource = null;
    
    if (event?.success) {
      this.showMessage('Resource saved successfully.');
      this._categoriesLoaded = false; // force refresh in case a new category was created
      if (event?.mode === 'create') {
        this.currentPage = 0;
        this.searchQuery = '';
        this.activeTab.set('all');
        this.activeCat.set({ id: 'all', name: 'All' });
        this.activeLevel.set('ALL');
        this.showAllCategories = false;
        if (event?.resource) {
          this.pendingCreatedResource = event.resource as ResourceApiResponse;
          const createdUi = this.toUiResource(this.pendingCreatedResource);
          const exists = this.resources.some((r) => r.id === createdUi.id);
          if (!exists) {
            this.resources = [createdUi, ...this.resources];
            this.totalElements += 1;
          }
        }
      }
      this.reloadResources();
    }
  }

  getResourceProgress(resourceId: string): number {
    const be = this.backendEngagements.get(resourceId);
    if (be) return be.progressPct;
    return this.resourceProgress[resourceId] ?? 0;
  }

  getEngagementStatus(resourceId: string): string {
    return this.backendEngagements.get(resourceId)?.status ?? 'NOT_STARTED';
  }

  getEngagementOpenCount(resourceId: string): number {
    const be = this.backendEngagements.get(resourceId);
    if (be) return be.openCount;
    return this.resourceEngagement[resourceId]?.openCount ?? 0;
  }

  getEngagementStreak(resourceId: string): number {
    return this.backendEngagements.get(resourceId)?.streakDays ?? this.getResourceStreak(resourceId);
  }

  getActivityDays(resourceId: string): string[] {
    const be = this.backendEngagements.get(resourceId);
    if (be?.activityDays) return [...be.activityDays];
    return this.resourceEngagement[resourceId]?.openedDays ?? [];
  }

  getEngagementNotes(resourceId: string): string | null {
    return this.backendEngagements.get(resourceId)?.notes ?? null;
  }

  getLastOpened(resourceId: string): string | null {
    const be = this.backendEngagements.get(resourceId);
    const iso = be?.lastOpenedAt ?? this.resourceEngagement[resourceId]?.lastOpenedAt ?? null;
    return iso ? this.formatRelativeTime(iso) : null;
  }

  get last7Days(): string[] {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }

  get engCompletedCount(): number {
    return this.savedEngagements.filter(e => e.status === 'COMPLETED').length;
  }

  get engMaxStreak(): number {
    const streaks = this.savedEngagements.map(e => e.streakDays);
    return streaks.length ? Math.max(0, ...streaks) : 0;
  }

  getRingOffset(resourceId: string): number {
    const pct = this.getResourceProgress(resourceId);
    return 163.4 * (1 - pct / 100);
  }

  getRingColor(resourceId: string): string {
    const status = this.getEngagementStatus(resourceId);
    if (status === 'COMPLETED') return '#10b981';
    if (status === 'IN_PROGRESS') return '#6366f1';
    return '#cbd5e1';
  }

  statusLabel(status: string): string {
    if (status === 'COMPLETED') return 'Terminé';
    if (status === 'IN_PROGRESS') return 'En cours';
    return 'Non commencé';
  }

  startEditNotes(resourceId: string, current: string | null): void {
    this.editingNotesId = resourceId;
    this.editingNotesValue = current ?? '';
  }

  cancelNotes(): void {
    this.editingNotesId = null;
    this.editingNotesValue = '';
  }

  saveNotes(resourceId: string): void {
    const notes = this.editingNotesValue.trim() || null;
    this.editingNotesId = null;
    this.editingNotesValue = '';
    this.resourceApi.updateEngagement(resourceId, { notes: notes ?? '' }).subscribe({
      next: (eng: EngagementApiResponse) => this.backendEngagements.set(eng.resourceId, eng),
      error: () => {},
    });
  }

  markComplete(resourceId: string): void {
    this.resourceApi.updateEngagement(resourceId, { status: 'COMPLETED', progressPct: 100 }).subscribe({
      next: (eng: EngagementApiResponse) => this.backendEngagements.set(eng.resourceId, eng),
      error: () => {},
    });
  }

  getLocalProgress(resourceId: string): number {
    if (this.localProgress.has(resourceId)) return this.localProgress.get(resourceId)!;
    const eng = this.backendEngagements.get(resourceId);
    if (!eng) return 0;
    if (eng.status === 'COMPLETED') return 100;
    // If manually set, use stored value; otherwise derive from openCount
    if (eng.progressPct > 0) return eng.progressPct;
    return Math.min(90, eng.openCount * 20);
  }

  onProgressInput(resourceId: string, value: number): void {
    this.localProgress.set(resourceId, value);
  }

  onProgressChange(resourceId: string, value: number): void {
    this.localProgress.set(resourceId, value);
    const status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' =
      value === 0 ? 'NOT_STARTED' : value === 100 ? 'COMPLETED' : 'IN_PROGRESS';

    const doUpdate = () => {
      const existing = this.backendEngagements.get(resourceId);
      if (existing) {
        this.backendEngagements.set(resourceId, { ...existing, progressPct: value, status });
      }
      this.resourceApi.updateEngagement(resourceId, { progressPct: value, status }).subscribe({
        next: (eng: EngagementApiResponse) => {
          this.backendEngagements.set(eng.resourceId, eng);
          this.localProgress.delete(eng.resourceId);
        },
        error: () => this.localProgress.delete(resourceId),
      });
    };

    const existing = this.backendEngagements.get(resourceId);
    if (!existing?.id) {
      this.resourceApi.ensureEngagement(resourceId).subscribe({
        next: (eng: EngagementApiResponse) => { this.backendEngagements.set(eng.resourceId, eng); doUpdate(); },
        error: () => this.localProgress.delete(resourceId),
      });
    } else {
      doUpdate();
    }
  }

  getResourceEngagementLabel(resourceId: string): string {
    const count = this.getEngagementOpenCount(resourceId);
    if (count >= 5) return 'High engagement';
    if (count >= 3) return 'Steady progress';
    if (count >= 1) return 'Getting started';
    return 'Not started';
  }

  getResourceEngagementMeta(resourceId: string): string {
    const engagement = this.resourceEngagement[resourceId];
    if (!engagement) {
      return 'Open this resource to start tracking engagement.';
    }
    const sessions = engagement.openCount;
    const days = engagement.openedDays.length;
    const last = this.formatRelativeTime(engagement.lastOpenedAt);
    return `${sessions} sessions • ${days} active day${days > 1 ? 's' : ''} • Last open ${last}`;
  }

  private showMessage(message: string, type: 'success' | 'error' = 'success'): void {
    this.uiMessage = message;
    this.uiMessageType = type;
    setTimeout(() => {
      this.uiMessage = '';
    }, 3000);
  }

  private initVoiceSearch(): void {
    const speechApi = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!speechApi) {
      this.voiceSearchSupported = false;
      return;
    }

    // Restore last-used language (fr-FR or en-US) or default from browser.
    try {
      const stored = localStorage.getItem(this.voiceLangKey);
      if (stored === 'fr-FR' || stored === 'en-US') {
        this.voiceLang = stored;
      } else {
        const nav = (navigator.language || '').toLowerCase();
        this.voiceLang = nav.startsWith('en') ? 'en-US' : 'fr-FR';
      }
    } catch { this.voiceLang = 'fr-FR'; }

    this.voiceSearchSupported = true;
    this.speechRecognition = new speechApi();
    this.speechRecognition.lang = this.voiceLang;
    this.speechRecognition.interimResults = true;
    this.speechRecognition.maxAlternatives = 1;

    this.speechRecognition.onstart = () => {
      this.isVoiceListening = true;
      this.playVoiceCue('start');
    };

    this.speechRecognition.onend = () => {
      this.isVoiceListening = false;
      this.voiceInterimText = '';
      this.playVoiceCue('stop');
    };

    this.speechRecognition.onerror = () => {
      this.isVoiceListening = false;
      this.voiceInterimText = '';
      this.showMessage('Audio non capté. Réessayez en vous rapprochant du micro.', 'error');
    };

    this.speechRecognition.onresult = (event: any) => {
      let interim = '';
      let finalTranscript = '';
      const results = event?.results;

      if (!results) {
        return;
      }

      for (let i = event.resultIndex; i < results.length; i++) {
        const phrase = results[i]?.[0]?.transcript?.trim();
        if (!phrase) {
          continue;
        }
        if (results[i].isFinal) {
          finalTranscript = `${finalTranscript} ${phrase}`.trim();
        } else {
          interim = `${interim} ${phrase}`.trim();
        }
      }

      this.voiceInterimText = interim;

      if (!finalTranscript) {
        return;
      }

      this.searchQuery = finalTranscript;
      this.lastVoiceQuery = finalTranscript;
      this.forceSearch();
      this.showMessage(`Dicté (${this.voiceLangShort}) : « ${finalTranscript} »`);
      if (this.voiceBadgeTimeoutId) {
        clearTimeout(this.voiceBadgeTimeoutId);
      }
      this.voiceBadgeTimeoutId = window.setTimeout(() => {
        this.lastVoiceQuery = '';
        this.voiceBadgeTimeoutId = null;
      }, 9000);
    };
  }

  private ensureProgressForSavedResources(): void {
    let changed = false;
    for (const resource of this.resources) {
      if (!resource.saved) {
        continue;
      }

      const engagement = this.ensureResourceEngagement(resource.id);
      if (this.resourceProgress[resource.id] === undefined || !engagement) {
        this.resourceProgress[resource.id] = this.computeProgressFromEngagement(resource.id);
        changed = true;
        continue;
      }

      const nextProgress = this.computeProgressFromEngagement(resource.id);
      if (this.resourceProgress[resource.id] !== nextProgress) {
        this.resourceProgress[resource.id] = nextProgress;
        changed = true;
      }
    }

    if (changed) {
      this.persistProgress();
    }
  }

  private ensureResourceEngagement(resourceId: string): ResourceEngagement | null {
    if (this.resourceEngagement[resourceId]) {
      return this.resourceEngagement[resourceId];
    }

    const nowIso = new Date().toISOString();
    const legacy = this.resourceProgress[resourceId] ?? 0;
    const seededOpenCount = legacy > 0 ? Math.max(0, Math.round((legacy - 12) / 12)) : 0;

    this.resourceEngagement[resourceId] = {
      bookmarkedAt: nowIso,
      openCount: seededOpenCount,
      openedDays: [],
      lastOpenedAt: null
    };

    this.resourceProgress[resourceId] = this.computeProgressFromEngagement(resourceId);
    this.persistEngagement();
    this.persistProgress();
    return this.resourceEngagement[resourceId];
  }

  private advanceProgressOnOpen(resource: Resource): void {
    if (!resource.saved) {
      return;
    }

    const engagement = this.ensureResourceEngagement(resource.id);
    if (!engagement) {
      return;
    }

    const now = new Date();
    const isoNow = now.toISOString();
    const dayKey = isoNow.slice(0, 10);

    engagement.openCount += 1;
    engagement.lastOpenedAt = isoNow;
    if (!engagement.openedDays.includes(dayKey)) {
      engagement.openedDays = [...engagement.openedDays, dayKey].slice(-14);
    }

    this.resourceProgress[resource.id] = this.computeProgressFromEngagement(resource.id);
    this.persistEngagement();
    this.persistProgress();
  }

  private updateResourceProgress(resourceId: string, value: number): void {
    const normalized = Math.max(0, Math.min(100, Math.round(value)));
    this.resourceProgress[resourceId] = normalized;
    this.persistProgress();
  }

  private loadStoredProgress(): void {
    try {
      const raw = localStorage.getItem(this.progressStorageKey);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, number>;
      if (parsed && typeof parsed === 'object') {
        this.resourceProgress = parsed;
      }
    } catch {
      this.resourceProgress = {};
    }
  }

  private loadStoredEngagement(): void {
    try {
      const raw = localStorage.getItem(this.engagementStorageKey);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, ResourceEngagement>;
      if (!parsed || typeof parsed !== 'object') {
        return;
      }
      this.resourceEngagement = parsed;
    } catch {
      this.resourceEngagement = {};
    }
  }

  private persistProgress(): void {
    localStorage.setItem(this.progressStorageKey, JSON.stringify(this.resourceProgress));
  }

  private persistEngagement(): void {
    localStorage.setItem(this.engagementStorageKey, JSON.stringify(this.resourceEngagement));
  }

  private computeProgressFromEngagement(resourceId: string): number {
    const engagement = this.resourceEngagement[resourceId];
    if (!engagement) {
      return this.resourceProgress[resourceId] ?? 0;
    }

    const bookmarkBase = 12;
    const openScore = Math.min(55, engagement.openCount * 11);
    const consistencyScore = Math.min(23, engagement.openedDays.length * 4);
    const momentumBonus = engagement.openCount >= 5 ? 10 : engagement.openCount >= 3 ? 5 : 0;

    return Math.max(0, Math.min(100, bookmarkBase + openScore + consistencyScore + momentumBonus));
  }

  private formatRelativeTime(isoDate: string | null): string {
    if (!isoDate) {
      return 'never';
    }

    const diff = Date.now() - new Date(isoDate).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) {
      return 'just now';
    }
    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  private normalizeSearchText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private tokenizeSearchText(value: string): string[] {
    return value.split(/[^a-z0-9]+/).filter(Boolean);
  }

  /**
   * Bilingual (FR/EN) synonym groups. Each group lists words that should match
   * each other. Stored normalized (lowercase, no accents) to line up with
   * normalizeSearchText() output.
   */
  private readonly SYNONYM_GROUPS: string[][] = [
    // Tech & Engineering
    ['dev', 'developpement', 'development', 'developer', 'programmation', 'programming', 'coder', 'coding', 'code'],
    ['web', 'frontend', 'front', 'backend', 'back', 'fullstack', 'site', 'webapp'],
    ['api', 'rest', 'graphql', 'grpc', 'endpoint', 'webservice', 'microservices'],
    ['ia', 'ai', 'intelligence', 'artificielle', 'llm', 'gpt', 'machine', 'learning', 'ml'],
    ['cybersecurity', 'cyber', 'securite', 'security', 'hacking', 'pentest', 'owasp', 'vulnerabilite'],
    ['cloud', 'aws', 'azure', 'gcp', 'devops', 'kubernetes', 'k8s', 'docker', 'terraform'],
    ['database', 'db', 'bdd', 'sql', 'nosql', 'postgres', 'postgresql', 'mongo', 'mongodb', 'donnees', 'data'],
    ['framework', 'react', 'angular', 'vue', 'svelte', 'nextjs', 'nuxt'],
    ['mobile', 'ios', 'android', 'flutter', 'kotlin', 'swift'],
    ['test', 'testing', 'qa', 'quality'],
    ['architecture', 'patterns', 'ddd'],
    ['performance', 'optimization', 'optimisation', 'speed', 'rapidite', 'vitesse'],
    // Business & Leadership
    ['manager', 'management', 'leadership', 'leader', 'coaching', 'mentoring'],
    ['equipe', 'team', 'collaboration', 'teamwork'],
    ['communication', 'presentation', 'pitch', 'expression', 'oral'],
    ['productivite', 'productivity', 'organisation', 'efficacite', 'focus'],
    ['carriere', 'career', 'emploi', 'job'],
    ['entretien', 'interview', 'embauche', 'recrutement', 'hiring'],
    ['cv', 'resume', 'linkedin'],
    ['negociation', 'negotiation', 'deal'],
    ['entrepreneur', 'entrepreneuriat', 'entrepreneurship', 'startup', 'founder', 'fondateur'],
    ['product', 'produit', 'pm', 'roadmap'],
    ['feedback', 'retour', 'review'],
    // Finance
    ['finance', 'argent', 'money', 'budget', 'financier'],
    ['investir', 'investment', 'investing', 'investissement', 'placement', 'bourse', 'etf', 'actions', 'trading'],
    ['crypto', 'cryptomonnaie', 'bitcoin', 'ethereum', 'blockchain', 'defi', 'nft'],
    ['epargne', 'savings', 'retraite', 'retirement'],
    ['fintech', 'banque', 'banking', 'paiement', 'payment'],
    // Marketing
    ['marketing', 'growth', 'acquisition', 'branding', 'brand'],
    ['seo', 'referencement'],
    ['content', 'contenu', 'redaction', 'copywriting', 'writing', 'ecrire', 'blog'],
    ['email', 'newsletter', 'emailing', 'mailing'],
    ['instagram', 'tiktok', 'linkedin', 'twitter', 'youtube', 'social'],
    ['publicite', 'ads', 'advertising'],
    // Design
    ['design', 'ux', 'ui', 'graphique', 'interface'],
    ['figma', 'sketch', 'adobe', 'photoshop', 'illustrator'],
    ['typographie', 'typography', 'police', 'font'],
    // Learning & Pedagogy
    ['apprendre', 'learn', 'learning', 'tutoriel', 'tutorial', 'cours', 'formation', 'training', 'guide', 'howto'],
    ['debutant', 'beginner', 'novice', 'intro', 'introduction', 'bases', 'fundamentals', 'fondamentaux'],
    ['intermediaire', 'intermediate', 'moyen'],
    ['avance', 'advanced', 'expert', 'pro', 'approfondi', 'masterclass'],
    ['etude', 'study', 'revision', 'memorisation', 'memory'],
    ['methode', 'method', 'technique', 'approche'],
    // Media & Content
    ['video', 'youtube', 'film', 'streaming', 'live'],
    ['podcast', 'audio', 'emission', 'spotify'],
    ['article', 'blog', 'post', 'lecture'],
    ['livre', 'book', 'bouquin', 'ebook', 'ouvrage'],
    // Health & Wellbeing
    ['sante', 'health', 'medical', 'medecine', 'wellness'],
    ['sport', 'fitness', 'exercice', 'musculation', 'entrainement'],
    ['nutrition', 'alimentation', 'regime', 'diet', 'food'],
    ['sommeil', 'sleep', 'repos', 'rest'],
    ['stress', 'anxiete', 'anxiety', 'burnout', 'mental'],
    ['meditation', 'mindfulness', 'zen'],
    // Legal
    ['droit', 'legal', 'law', 'juridique'],
    ['contrat', 'contract', 'accord', 'agreement'],
    ['rgpd', 'gdpr', 'privacy'],
    ['brevet', 'patent', 'trademark'],
    // Soft skills & mindset
    ['critique', 'raisonnement'],
    ['creativite', 'creativity', 'innovation', 'creative'],
    ['resilience', 'perseverance'],
    ['confiance', 'confidence'],
    // Generic intent
    ['meilleur', 'best', 'top', 'excellent'],
    ['gratuit', 'free'],
    ['rapide', 'quick', 'fast', 'express'],
    ['facile', 'easy', 'simple', 'accessible'],
    ['complet', 'complete', 'comprehensive', 'full'],
    ['pratique', 'practice', 'concret', 'concrete'],
    ['comment', 'how', 'howto'],
    ['pourquoi', 'why'],
  ];

  /** Reverse-lookup synonym index built lazily on first use. */
  private _synonymIndex: Map<string, string[]> | null = null;
  private getSynonymIndex(): Map<string, string[]> {
    if (this._synonymIndex) return this._synonymIndex;
    const idx = new Map<string, string[]>();
    const norm = (s: string) => this.normalizeSearchText(s);
    for (const group of this.SYNONYM_GROUPS) {
      const normalized = group.map(norm);
      for (const word of normalized) {
        const others = normalized.filter((w) => w !== word);
        const existing = idx.get(word);
        if (!existing) {
          idx.set(word, others);
        } else {
          const merged = new Set([...existing, ...others]);
          idx.set(word, Array.from(merged));
        }
      }
    }
    this._synonymIndex = idx;
    return idx;
  }

  /** Returns [term, ...synonyms]. Also expands on prefix/substring match. */
  private expandWithSynonyms(term: string): string[] {
    if (!term) return [];
    const idx = this.getSynonymIndex();
    const set = new Set<string>([term]);
    const direct = idx.get(term);
    if (direct) direct.forEach((s) => set.add(s));
    if (!direct && term.length >= 3) {
      for (const [key, values] of idx) {
        if (key.startsWith(term) || term.startsWith(key)) {
          set.add(key);
          values.forEach((v) => set.add(v));
          break;
        }
      }
    }
    return Array.from(set);
  }

  private matchesSearchTerm(term: string, haystack: string, tokens: string[]): boolean {
    if (haystack.includes(term)) {
      return true;
    }

    for (const token of tokens) {
      if (token.startsWith(term) || term.startsWith(token)) {
        return true;
      }

      const lengthGap = Math.abs(token.length - term.length);
      if (lengthGap > 2) {
        continue;
      }

      const maxDistance = term.length <= 4 ? 1 : 2;
      if (this.levenshteinDistance(term, token) <= maxDistance) {
        return true;
      }
    }

    return false;
  }

  private levenshteinDistance(a: string, b: string): number {
    if (a === b) {
      return 0;
    }
    if (!a.length) {
      return b.length;
    }
    if (!b.length) {
      return a.length;
    }

    const previous: number[] = new Array(b.length + 1);
    const current: number[] = new Array(b.length + 1);

    for (let j = 0; j <= b.length; j++) {
      previous[j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
      current[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
        current[j] = Math.min(
          previous[j] + 1,
          current[j - 1] + 1,
          previous[j - 1] + substitutionCost
        );
      }
      for (let j = 0; j <= b.length; j++) {
        previous[j] = current[j];
      }
    }

    return previous[b.length];
  }

  private playVoiceCue(type: 'start' | 'stop'): void {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        return;
      }

      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }

      const context = this.audioContext;
      if (!context) {
        return;
      }

      if (context.state === 'suspended') {
        context.resume();
      }

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = type === 'start' ? 880 : 520;
      gain.gain.value = 0.001;

      oscillator.connect(gain);
      gain.connect(context.destination);

      const now = context.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

      oscillator.start(now);
      oscillator.stop(now + 0.12);
    } catch {
      // Ignore audio cue failures to keep voice search functional.
    }
  }

  private toUiResource(resource: ResourceApiResponse): Resource {
    const mappedType = this.mapType(resource.type);
    const explicitThumb = resource.thumbUrl ?? undefined;
    const derivedThumb = !explicitThumb && mappedType === 'video'
      ? this.extractVideoThumbnail(resource.url)
      : undefined;
    return {
      id: resource.id,
      title: resource.title,
      url: resource.url,
      thumbnailUrl: explicitThumb ?? derivedThumb,
      type: mappedType,
      category: resource.categoryName || 'General',
      duration: '--',
      level: this.mapLevel(resource.level),
      tags: [resource.industry, (resource.categoryName || 'General'), this.mapLevel(resource.level).toUpperCase()],
      saved: this.bookmarkIndexByResourceId.has(resource.id),
      views: 0,
      rating: 4.7,
      description: resource.description || 'No description provided.',
    };
  }

  /** Extract a preview thumbnail URL from known video providers (YouTube, Vimeo). */
  private extractVideoThumbnail(url?: string | null): string | undefined {
    if (!url) return undefined;
    // YouTube: https://www.youtube.com/watch?v=ID, https://youtu.be/ID, /embed/ID, /shorts/ID
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (yt && yt[1]) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`;
    // Vimeo URLs have numeric IDs but need an API hit for thumbs — skip for now.
    return undefined;
  }

  mapType(type: string): Resource['type'] {
    const normalized = (type || '').toUpperCase();
    if (normalized === 'VIDEO') return 'video';
    if (normalized === 'PODCAST') return 'podcast';
    if (normalized === 'QUIZ') return 'exercise';
    if (normalized === 'BOOK') return 'template';
    return 'article';
  }

  mapLevel(level: string): Resource['level'] {
    const normalized = (level || '').toUpperCase();
    if (normalized === 'BEGINNER') return 'beginner';
    if (normalized === 'ADVANCED') return 'advanced';
    return 'intermediate';
  }
}
