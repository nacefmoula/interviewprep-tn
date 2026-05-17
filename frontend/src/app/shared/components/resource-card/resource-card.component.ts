import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Resource } from '../../../core/models/models';
import { ResourceApiService } from '../../../core/services/resource-api.service';

@Component({
  selector: 'app-resource-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article
      class="rc"
      [class.rc--new]="highlight"
      [class.rc--saved]="resource.saved"
      (mouseenter)="onCardHover()"
      (click)="onOpen()"
      (keydown.enter)="onOpen()"
      tabindex="0"
      role="button"
      [attr.aria-label]="'Ouvrir : ' + resource.title">

      <!-- ══════════════ MEDIA ZONE ══════════════ -->
      <div class="rc__media" [ngClass]="typeHeaderClass">

        <!-- Real thumbnail (stored URL or smart-derived) -->
        <img
          *ngIf="resolvedThumbUrl && !thumbError"
          class="rc__thumb"
          [src]="resolvedThumbUrl"
          [alt]="resource.title"
          loading="lazy"
          (error)="onThumbError()"
        />

        <!-- Fallback: gradient + big emoji + source hint -->
        <div *ngIf="!resolvedThumbUrl || thumbError" class="rc__fallback">
          <span class="rc__fallback-icon" aria-hidden="true">{{ typeIcon }}</span>
          <span class="rc__source-hint" *ngIf="sourceDomain" aria-hidden="true">
            <img
              class="rc__source-favicon"
              [src]="'https://www.google.com/s2/favicons?domain=' + sourceDomain + '&sz=32'"
              alt=""
              loading="lazy"
              (error)="faviconError = true"
              *ngIf="!faviconError"
            />
            {{ sourceDomain }}
          </span>
        </div>

        <!-- Scrim: image → card bg gradient at bottom -->
        <div class="rc__scrim" aria-hidden="true"></div>

        <!-- "Nouveau" ribbon -->
        <span class="rc__ribbon" *ngIf="highlight" aria-hidden="true">✦ Nouveau</span>

        <!-- Quality AI badge -->
        <span
          class="rc__quality"
          *ngIf="qualityScore !== null"
          [ngClass]="qualityClass"
          [title]="qualityTooltip"
          aria-hidden="true">
          <svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          {{ qualityScore.toFixed(1) }}
        </span>

        <!-- Bookmark -->
        <button
          type="button"
          class="rc__bm"
          [class.rc__bm--on]="resource.saved"
          [class.rc__bm--pending]="bookmarkPending"
          [disabled]="bookmarkPending"
          (click)="onToggleSaved(); $event.stopPropagation()"
          [title]="bookmarkPending ? 'En cours…' : (resource.saved ? 'Retirer des favoris' : 'Enregistrer')">
          <span *ngIf="bookmarkPending" class="rc__bm-spin" aria-hidden="true"></span>
          <svg *ngIf="!bookmarkPending" viewBox="0 0 24 24" width="14" height="14" [attr.fill]="resource.saved ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>

        <!-- Admin (hover) -->
        <div class="rc__admin" *ngIf="isAdmin" (click)="$event.stopPropagation()">
          <button type="button" class="rc__admin-btn" (click)="onEdit()" title="Modifier">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button type="button" class="rc__admin-btn rc__admin-btn--del" (click)="onDelete()" title="Supprimer">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>

        <!-- Progress bar -->
        <div class="rc__prog" *ngIf="resource.saved && progress > 0" role="progressbar" [attr.aria-valuenow]="progress" aria-valuemin="0" aria-valuemax="100">
          <div class="rc__prog-fill" [style.width.%]="progress"></div>
        </div>
      </div>

      <!-- ══════════════ BODY ══════════════ -->
      <div class="rc__body">

        <!-- Chips -->
        <div class="rc__chips">
          <span class="rc__chip" [ngClass]="typeChipClass">{{ typeLabel }}</span>
          <span class="rc__chip rc__chip--level">{{ levelLabel }}</span>
          <span class="rc__chip rc__chip--pct" *ngIf="resource.saved && progress > 0">{{ progress }}% fait</span>
        </div>

        <!-- Title -->
        <h3 class="rc__title">{{ displayTitle }}</h3>

        <!-- Description -->
        <p class="rc__desc">{{ displayDescription }}</p>

        <!-- Tags -->
        <div class="rc__tags" *ngIf="resource.tags?.length">
          <span *ngFor="let t of resource.tags.slice(0,3)" class="rc__tag">{{ t }}</span>
        </div>

        <!-- Meta -->
        <div class="rc__meta">
          <span class="rc__meta-item" [title]="'Durée : ' + resource.duration">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {{ resource.duration }}
          </span>
          <span class="rc__meta-item" [title]="'Note : ' + resource.rating">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="#f59e0b"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            {{ resource.rating }}
          </span>
          <span class="rc__meta-item" [title]="resource.views + ' vues'">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {{ resource.views >= 1000 ? (resource.views / 1000 | number:'1.1-1') + 'k' : resource.views }}
          </span>
        </div>
      </div>

      <!-- ══════════════ FOOTER ══════════════ -->
      <div class="rc__footer" (click)="$event.stopPropagation()">

        <!-- Translate button -->
        <button
          type="button"
          class="rc__tr-btn"
          [class.rc__tr-btn--on]="isTranslated"
          [disabled]="isTranslating"
          (click)="toggleTranslation()"
          [title]="isTranslated ? 'Voir original · ' + translateLabel : 'Traduire vers ' + oppositeLangLabel">
          <span *ngIf="isTranslating" class="rc__spin rc__spin--indigo"></span>
          <ng-container *ngIf="!isTranslating">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <span>{{ isTranslated ? 'Original' : translateLabel }}</span>
            <span *ngIf="isTranslated" class="rc__tr-dot"></span>
          </ng-container>
        </button>

        <div class="rc__footer-r">
          <!-- AI Summarize -->
          <button
            type="button"
            class="rc__ai-btn"
            [class.rc__ai-btn--loading]="summarizing"
            [disabled]="summarizing"
            (click)="onSummarize()"
            title="Résumer avec l'IA">
            <span *ngIf="summarizing" class="rc__spin rc__spin--white"></span>
            <ng-container *ngIf="!summarizing">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                <path d="M12 2l1.8 5.4 5.2.8-3.8 3.7.9 5.1L12 14.5l-4.1 2.5.9-5.1L5 8.2l5.2-.8z"/>
                <circle cx="5" cy="5" r="1.2"/>
                <circle cx="19" cy="4" r="0.9"/>
                <circle cx="20" cy="18" r="1.1"/>
              </svg>
              <span>Résumer</span>
            </ng-container>
            <span *ngIf="summarizing" class="rc__ai-loading-txt">IA…</span>
          </button>

          <!-- Open CTA -->
          <button type="button" class="rc__cta" (click)="onOpen()">
            Ouvrir
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      </div>

    </article>
  `,
  styles: [`
    :host { display: block; height: 100%; }

    /* ── Shell ───────────────────────────────────────── */
    .rc {
      position: relative;
      background: #ffffff;
      border-radius: 18px;
      border: 1px solid #eaeff6;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100%;
      cursor: pointer;
      box-shadow:
        0 1px 2px rgba(15,23,42,0.04),
        0 2px 8px rgba(15,23,42,0.04);
      transition:
        box-shadow   220ms cubic-bezier(.22,.68,0,1.2),
        transform    220ms cubic-bezier(.22,.68,0,1.2),
        border-color 220ms ease;
      outline: none;
    }
    .rc:hover {
      box-shadow:
        0 4px 12px rgba(15,23,42,0.08),
        0 12px 32px rgba(15,23,42,0.10);
      transform: translateY(-4px);
      border-color: rgba(20,184,166,0.5);
    }
    .rc:focus-visible {
      outline: 2px solid #14b8a6;
      outline-offset: 3px;
    }
    .rc--new {
      border-color: #14b8a6;
      animation: new-glow 2.6s ease-in-out 3;
    }
    @keyframes new-glow {
      0%,100% { box-shadow: 0 0 0 3px rgba(20,184,166,0.15), 0 2px 8px rgba(15,23,42,0.05); }
      50%      { box-shadow: 0 0 0 7px rgba(20,184,166,0.10), 0 8px 24px rgba(20,184,166,0.20); }
    }

    /* ── Media zone ──────────────────────────────────── */
    .rc__media {
      position: relative;
      height: 164px;
      flex-shrink: 0;
      overflow: hidden;
    }

    /* Per-type gradients (fallback + thumbnail tint) */
    .rc__media         { background: linear-gradient(145deg, #0f766e 0%, #14b8a6 55%, #5eead4 100%); }
    .rc__media.h-video    { background: linear-gradient(145deg, #4c1d95 0%, #7c3aed 55%, #a78bfa 100%); }
    .rc__media.h-podcast  { background: linear-gradient(145deg, #9a3412 0%, #ea580c 55%, #fb923c 100%); }
    .rc__media.h-exercise { background: linear-gradient(145deg, #9d174d 0%, #db2777 55%, #f9a8d4 100%); }
    .rc__media.h-template { background: linear-gradient(145deg, #075985 0%, #0284c7 55%, #38bdf8 100%); }

    /* Thumbnail image */
    .rc__thumb {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 320ms cubic-bezier(.22,.68,0,1.2);
    }
    .rc:hover .rc__thumb { transform: scale(1.04); }

    /* Fallback content */
    .rc__fallback {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .rc__fallback-icon {
      font-size: 2.8rem;
      filter: drop-shadow(0 3px 10px rgba(0,0,0,0.28));
      transition: transform 280ms cubic-bezier(.22,.68,0,1.2);
    }
    .rc:hover .rc__fallback-icon { transform: scale(1.15) rotate(-5deg); }

    /* Source domain hint (inside fallback) */
    .rc__source-hint {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.18);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.28);
      color: rgba(255,255,255,0.92);
      font-size: 0.67rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .rc__source-favicon {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      object-fit: contain;
      flex-shrink: 0;
    }

    /* Scrim overlay (transparent → card bg) */
    .rc__scrim {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        transparent 45%,
        rgba(255,255,255,0.06) 75%,
        rgba(255,255,255,0.18) 100%
      );
      pointer-events: none;
    }

    /* "Nouveau" ribbon */
    .rc__ribbon {
      position: absolute;
      top: 10px; left: 10px;
      z-index: 3;
      padding: 3px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.22);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.35);
      color: #fff;
      font-size: 0.6rem;
      font-weight: 800;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      pointer-events: none;
      animation: ribbon-pop 380ms cubic-bezier(.2,1.4,.4,1) 1;
    }
    @keyframes ribbon-pop { from { opacity:0; transform:scale(.7); } to { opacity:1; transform:scale(1); } }

    /* Quality badge */
    .rc__quality {
      position: absolute;
      bottom: 10px; left: 10px;
      z-index: 3;
      display: inline-flex; align-items: center; gap: 3px;
      padding: 3px 8px;
      border-radius: 999px;
      background: rgba(15,23,42,0.52);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.16);
      color: #fff;
      font-size: 0.62rem;
      font-weight: 800;
      pointer-events: none;
    }
    .rc__quality svg { color: #fde68a; flex-shrink: 0; }
    .rc__quality.q-top { background: rgba(5,150,105,0.75); }
    .rc__quality.q-low { background: rgba(185,28,28,0.72); }

    /* Bookmark button */
    .rc__bm {
      position: absolute;
      top: 10px; right: 10px;
      z-index: 3;
      width: 32px; height: 32px;
      display: inline-flex; align-items: center; justify-content: center;
      border: none; border-radius: 50%;
      background: rgba(255,255,255,0.20);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: rgba(255,255,255,0.88);
      cursor: pointer;
      transition: background 160ms ease, color 160ms ease, transform 160ms ease;
    }
    .rc__bm:hover { background: rgba(255,255,255,0.36); transform: scale(1.12); }
    .rc__bm--on { background: rgba(255,255,255,0.92) !important; color: #0d9488 !important; }
    .rc__bm--pending { opacity: 0.7; cursor: not-allowed; }
    .rc__bm-spin {
      display: inline-block;
      width: 12px; height: 12px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .6s linear infinite;
    }

    /* Admin cluster */
    .rc__admin {
      position: absolute;
      top: 10px; left: 10px;
      z-index: 4;
      display: flex; gap: 5px;
      opacity: 0;
      transition: opacity 160ms ease;
    }
    .rc:hover .rc__admin { opacity: 1; }
    @media (hover: none) { .rc__admin { opacity: 1; } }
    .rc__admin-btn {
      width: 28px; height: 28px;
      display: inline-flex; align-items: center; justify-content: center;
      border: none; border-radius: 8px;
      background: rgba(255,255,255,0.20);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: rgba(255,255,255,0.92);
      cursor: pointer;
      transition: background 140ms ease;
    }
    .rc__admin-btn:hover { background: rgba(255,255,255,0.36); }
    .rc__admin-btn--del:hover { background: rgba(220,38,38,0.72) !important; }

    /* Progress bar */
    .rc__prog {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 4px;
      background: rgba(255,255,255,0.22);
    }
    .rc__prog-fill {
      height: 100%;
      background: rgba(255,255,255,0.88);
      border-radius: 0 4px 4px 0;
      transition: width 500ms cubic-bezier(.4,0,.2,1);
    }

    /* ── Body ─────────────────────────────────────────── */
    .rc__body {
      padding: 14px 16px 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1 1 auto;
      min-width: 0;
    }

    /* Chips */
    .rc__chips {
      display: flex; flex-wrap: wrap; gap: 5px; align-items: center;
    }
    .rc__chip {
      display: inline-flex; align-items: center;
      padding: 2px 9px;
      border-radius: 999px;
      font-size: 0.63rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    /* Type chips */
    .rc__chip--article  { background: #ccfbf1; color: #0f766e; }
    .rc__chip--video    { background: #ede9fe; color: #6d28d9; }
    .rc__chip--podcast  { background: #ffedd5; color: #c2410c; }
    .rc__chip--exercise { background: #fce7f3; color: #9d174d; }
    .rc__chip--template { background: #e0f2fe; color: #0369a1; }
    /* Level chip */
    .rc__chip--level    { background: #f1f5f9; color: #475569; }
    /* Progress chip */
    .rc__chip--pct      {
      background: linear-gradient(90deg, #ccfbf1, #a5f3fc);
      color: #0f766e;
    }

    /* Title */
    .rc__title {
      font-size: 0.96rem;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.35;
      margin: 0;
      letter-spacing: -0.01em;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Description */
    .rc__desc {
      font-size: 0.81rem;
      color: #64748b;
      line-height: 1.6;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Tags */
    .rc__tags { display: flex; flex-wrap: wrap; gap: 4px; }
    .rc__tag {
      font-size: 0.62rem;
      font-weight: 500;
      color: #94a3b8;
      background: #f8fafc;
      border: 1px solid #e8edf5;
      padding: 1px 7px;
      border-radius: 6px;
    }
    .rc__tag::before { content: '#'; opacity: 0.6; }

    /* Meta */
    .rc__meta {
      display: flex; gap: 12px; align-items: center;
      padding-top: 4px;
      border-top: 1px solid #f1f5f9;
      margin-top: 2px;
    }
    .rc__meta-item {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 0.71rem;
      color: #94a3b8;
      font-weight: 500;
    }
    .rc__meta-item svg { flex-shrink: 0; }

    /* ── Footer ───────────────────────────────────────── */
    .rc__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 10px 14px 14px;
      margin-top: auto;
    }
    .rc__footer-r { display: flex; align-items: center; gap: 6px; flex: 1; justify-content: flex-end; }

    /* ── Translate button ─────────────────────────────── */
    .rc__tr-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 0 11px;
      height: 30px;
      border-radius: 9px;
      border: 1.5px solid #e2e8f0;
      background: #f8fafc;
      color: #64748b;
      font-family: inherit;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      cursor: pointer;
      transition: background 140ms ease, color 140ms ease, border-color 140ms ease, transform 120ms ease;
      flex-shrink: 0;
    }
    .rc__tr-btn:hover:not(:disabled) {
      background: #eef2ff;
      color: #4f46e5;
      border-color: #c7d2fe;
      transform: translateY(-1px);
    }
    .rc__tr-btn--on {
      background: #eef2ff;
      color: #4338ca;
      border-color: #a5b4fc;
    }
    .rc__tr-btn--on:hover:not(:disabled) {
      background: #e0e7ff;
      border-color: #818cf8;
    }
    .rc__tr-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .rc__tr-btn:active:not(:disabled) { transform: scale(0.95); }
    .rc__tr-dot {
      display: inline-block;
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #4f46e5;
      flex-shrink: 0;
    }

    /* ── AI Summarize button ───────────────────────────── */
    .rc__ai-btn {
      position: relative;
      display: inline-flex; align-items: center; gap: 5px;
      padding: 0 13px;
      height: 30px;
      border-radius: 9px;
      border: none;
      background: linear-gradient(130deg, #7c3aed 0%, #a855f7 60%, #c026d3 100%);
      color: #fff;
      font-family: inherit;
      font-size: 0.71rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      cursor: pointer;
      overflow: hidden;
      transition: box-shadow 150ms ease, transform 140ms ease;
      box-shadow: 0 2px 10px rgba(124,58,237,0.35);
      flex-shrink: 0;
    }
    .rc__ai-btn::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(110deg, transparent 38%, rgba(255,255,255,0.28) 52%, transparent 66%);
      transform: translateX(-120%);
      transition: transform 0.55s ease;
    }
    .rc__ai-btn:hover:not(:disabled)::after {
      transform: translateX(120%);
    }
    .rc__ai-btn:hover:not(:disabled) {
      box-shadow: 0 4px 18px rgba(124,58,237,0.5);
      transform: translateY(-1px);
    }
    .rc__ai-btn:active:not(:disabled) { transform: scale(0.95); }
    .rc__ai-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
    .rc__ai-loading-txt { font-size: 0.7rem; font-weight: 700; }

    /* Primary CTA */
    .rc__cta {
      display: inline-flex; align-items: center; justify-content: center; gap: 5px;
      padding: 0 18px;
      height: 34px;
      border-radius: 10px;
      border: none;
      background: #14b8a6;
      color: #fff;
      font-family: inherit;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      letter-spacing: 0.01em;
      flex-grow: 1;
      transition: background 130ms ease, transform 120ms ease, box-shadow 130ms ease;
      box-shadow: 0 2px 8px rgba(20,184,166,0.30);
    }
    .rc__cta:hover {
      background: #0d9488;
      box-shadow: 0 4px 14px rgba(20,184,166,0.40);
      transform: translateY(-1px);
    }
    .rc__cta:active { transform: scale(0.96); }

    /* Spinners */
    .rc__spin {
      display: inline-block;
      width: 11px; height: 11px;
      border-radius: 50%;
      animation: spin .65s linear infinite;
      flex-shrink: 0;
    }
    .rc__spin--indigo {
      border: 2px solid rgba(99,102,241,0.2);
      border-top-color: #6366f1;
    }
    .rc__spin--white {
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (prefers-reduced-motion: reduce) {
      .rc, .rc__thumb, .rc__fallback-icon, .rc__bm, .rc__cta, .rc__tr-btn, .rc__ai-btn {
        transition: none !important; animation: none !important; transform: none !important;
      }
      .rc__ai-btn::after { display: none; }
    }
  `]
})
export class ResourceCardComponent implements OnInit {
  @Input() resource!: Resource;
  @Input() isAdmin = false;
  @Input() compact = false;
  @Input() progress = 0;
  @Input() summarizing = false;
  @Input() highlight = false;
  @Input() bookmarkPending = false;
  @Output() toggleSaved = new EventEmitter<void>();
  @Output() edit = new EventEmitter<Resource>();
  @Output() delete = new EventEmitter<Resource>();
  @Output() open = new EventEmitter<Resource>();
  @Output('summarize') summarizeClicked = new EventEmitter<Resource>();

  thumbError = false;
  faviconError = false;

  /**
   * Returns the best image URL for this resource:
   * 1. Backend-stored thumbnailUrl
   * 2. YouTube video thumbnail derived from URL (no API key needed)
   * 3. GitHub repo social preview derived from URL
   * 4. null → triggers gradient fallback
   */
  get resolvedThumbUrl(): string | null {
    if (this.resource.thumbnailUrl && !this.thumbError) return this.resource.thumbnailUrl;
    const url = this.resource.url;
    if (!url) return null;
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, '');

      // YouTube: works for both youtube.com/watch?v=ID and youtu.be/ID
      if (host === 'youtube.com' || host === 'youtu.be') {
        const vid = host === 'youtu.be'
          ? u.pathname.replace(/^\//, '').split('?')[0]
          : u.searchParams.get('v');
        if (vid) return `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
      }

      // GitHub: public repo social preview (always available)
      if (host === 'github.com') {
        const parts = u.pathname.split('/').filter(p => p.length > 0);
        if (parts.length >= 2) {
          return `https://opengraph.githubassets.com/1/${parts[0]}/${parts[1]}`;
        }
      }

    } catch { /* malformed URL → fallback */ }
    return null;
  }

  private resourceApi = inject(ResourceApiService);
  isTranslating = false;
  isTranslated = false;
  private translatedCache: { title: string; description: string; lang: string } | null = null;

  qualityScore: number | null = null;
  qualityComment = '';
  qualityProvider = '';
  private qualityLoaded = false;

  ngOnInit(): void {}

  onCardHover(): void {
    if (this.qualityLoaded || !this.resource?.id || this.resource.id === 'preview') return;
    this.qualityLoaded = true;
    this.resourceApi.qualityScore(this.resource.id).subscribe({
      next: (res) => {
        if (res && typeof res.overall === 'number') {
          this.qualityScore = res.overall;
          this.qualityComment = res.comment || '';
          this.qualityProvider = res.provider || '';
        }
      },
      error: () => {},
    });
  }

  get qualityClass(): string {
    if (this.qualityScore === null) return '';
    if (this.qualityScore >= 4.2) return 'q-top';
    if (this.qualityScore >= 3.0) return '';
    return 'q-low';
  }

  get qualityTooltip(): string {
    const by = this.qualityProvider === 'ollama' ? ' · llama3' : '';
    return `Qualité IA ${this.qualityScore?.toFixed(1)}/5${by}${this.qualityComment ? ' — ' + this.qualityComment : ''}`;
  }

  /** Extract a clean domain name from the resource URL for the source hint. */
  get sourceDomain(): string {
    try {
      const url = this.resource?.url;
      if (!url) return '';
      const host = new URL(url).hostname.replace(/^www\./, '');
      const knownLabels: Record<string, string> = {
        'youtube.com': 'YouTube', 'youtu.be': 'YouTube',
        'github.com': 'GitHub', 'dev.to': 'DEV.to',
        'medium.com': 'Medium', 'freecodecamp.org': 'freeCodeCamp',
        'udemy.com': 'Udemy', 'coursera.org': 'Coursera',
        'spotify.com': 'Spotify', 'goodreads.com': 'Goodreads',
        'codewars.com': 'Codewars', 'leetcode.com': 'LeetCode',
        'hackerrank.com': 'HackerRank', 'pluralsight.com': 'Pluralsight',
      };
      return knownLabels[host] ?? host;
    } catch { return ''; }
  }

  private detectLang(): 'fr' | 'en' {
    const t = (this.resource?.title || '') + ' ' + (this.resource?.description || '');
    const frHints = [' le ', ' la ', ' les ', ' un ', ' une ', ' des ', ' et ', ' pour ', ' avec ', 'é', 'è', 'ê', 'à', 'ç'];
    const hits = frHints.reduce((n, w) => n + (t.toLowerCase().includes(w) ? 1 : 0), 0);
    return hits >= 2 ? 'fr' : 'en';
  }

  get oppositeLangLabel(): string { return this.detectLang() === 'fr' ? "l'anglais" : 'le français'; }
  get translateLabel(): string { return this.detectLang() === 'fr' ? 'EN' : 'FR'; }

  get displayTitle(): string {
    return this.isTranslated && this.translatedCache ? this.translatedCache.title : this.resource.title;
  }

  get displayDescription(): string {
    return this.isTranslated && this.translatedCache ? this.translatedCache.description : this.resource.description;
  }

  toggleTranslation(): void {
    if (this.isTranslating) return;
    if (this.isTranslated) { this.isTranslated = false; return; }
    if (this.translatedCache) { this.isTranslated = true; return; }
    const target: 'fr' | 'en' = this.detectLang() === 'fr' ? 'en' : 'fr';
    this.isTranslating = true;
    this.resourceApi.translateResource(this.resource.id, target).subscribe({
      next: (res) => {
        this.translatedCache = { title: res.title, description: res.description, lang: res.lang };
        this.isTranslated = true;
        this.isTranslating = false;
      },
      error: () => { this.isTranslating = false; },
    });
  }

  get typeIcon(): string {
    const m: Record<string, string> = { article: '📄', video: '🎬', podcast: '🎙️', exercise: '💪', template: '📋' };
    return m[this.resource?.type] ?? '📄';
  }

  get typeLabel(): string {
    const m: Record<Resource['type'], string> = { article: 'Article', video: 'Vidéo', podcast: 'Podcast', exercise: 'Exercice', template: 'Modèle' };
    return m[this.resource.type] ?? this.resource.type;
  }

  get levelLabel(): string {
    const m: Record<Resource['level'], string> = { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé' };
    return m[this.resource.level] ?? this.resource.level;
  }

  get typeChipClass(): string {
    return `rc__chip--${this.resource.type}`;
  }

  get typeHeaderClass(): string {
    return `h-${this.resource.type}`;
  }

  onThumbError() { this.thumbError = true; }
  onToggleSaved() { this.toggleSaved.emit(); }
  onEdit() { this.edit.emit(this.resource); }
  onDelete() {
    if (confirm(`Supprimer « ${this.resource.title} » ?`)) this.delete.emit(this.resource);
  }
  onOpen() { this.open.emit(this.resource); }
  onSummarize() { this.summarizeClicked.emit(this.resource); }
}
