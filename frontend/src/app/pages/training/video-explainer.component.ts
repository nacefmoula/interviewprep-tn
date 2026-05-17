// src/app/pages/training/video-explainer.component.ts
// VIDÉO IA CINÉMATIQUE — vraies scènes visuelles avec animations canvas,
// graphiques SVG animés, statistiques, icônes dynamiques, pas juste du texte

import {
  Component, Input, OnDestroy, signal, computed,
  ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoScriptResponse, VideoScene } from '../../core/services/ai.service';

const PALETTES = [
  { primary: '#14b8a6', secondary: '#0ea5e9', accent: '#38bdf8', dark: '#0a2540' },
  { primary: '#8b5cf6', secondary: '#ec4899', accent: '#a78bfa', dark: '#1a0a40' },
  { primary: '#f59e0b', secondary: '#ef4444', accent: '#fbbf24', dark: '#2a1505' },
  { primary: '#10b981', secondary: '#3b82f6', accent: '#34d399', dark: '#071a12' },
  { primary: '#f472b6', secondary: '#a78bfa', accent: '#fb7185', dark: '#200a1a' },
  { primary: '#38bdf8', secondary: '#34d399', accent: '#7dd3fc', dark: '#051520' },
  { primary: '#fb923c', secondary: '#fbbf24', accent: '#fdba74', dark: '#1a0a00' },
];

function detectSceneType(text: string): 'intro' | 'stats' | 'process' | 'concept' | 'example' | 'conclusion' {
  const t = text.toLowerCase();
  if (t.includes('introduction') || t.includes('bienvenu') || t.includes('présent')) return 'intro';
  if (/\d+%|\d+ (sur|million|milliard|fois)/.test(t) || t.includes('statistique') || t.includes('données') || t.includes('chiffre')) return 'stats';
  if (t.includes('étape') || t.includes('processus') || t.includes('fonctionne') || t.includes('comment')) return 'process';
  if (t.includes('conclu') || t.includes('résumé') || t.includes('fin') || t.includes('retenir')) return 'conclusion';
  if (t.includes('exemple') || t.includes('cas') || t.includes('illustr')) return 'example';
  return 'concept';
}

function extractStats(text: string): { value: string; label: string; pct: number }[] {
  const stats: { value: string; label: string; pct: number }[] = [];
  const rx = /(\d+(?:[.,]\d+)?)\s*%\s*([a-zA-ZÀ-ÿ\s]{3,25})/g;
  let m;
  while ((m = rx.exec(text)) !== null && stats.length < 4) {
    stats.push({ value: m[1] + '%', label: m[2].trim().slice(0, 22), pct: Math.min(100, parseFloat(m[1])) });
  }
  // Extraire des nombres sans %
  if (!stats.length) {
    const rx2 = /(\d{2,})\s+([a-zA-ZÀ-ÿ]{4,20})/g;
    while ((m = rx2.exec(text)) !== null && stats.length < 3) {
      const n = parseInt(m[1]);
      if (n < 10000) stats.push({ value: m[1], label: m[2].slice(0, 18), pct: Math.min(100, n) });
    }
  }
  return stats;
}

interface Particle { x: number; y: number; r: number; vx: number; vy: number; op: number; color: string; }

@Component({
  selector: 'app-video-explainer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="vx" [class.vx-playing]="isPlaying()">

      <!-- ══ ÉCRAN PRINCIPAL ══ -->
      <div class="vx-screen" #screenEl>
        <canvas #bgCanvas class="vx-canvas"></canvas>

        <!-- IDLE -->
        <div class="vx-idle" *ngIf="!isPlaying() && !isFinished()" (click)="play()">
          <div class="idle-glow" [style.background]="'radial-gradient(circle, ' + pal().primary + '30 0%, transparent 70%)'"></div>
          <div class="idle-rings">
            <div class="idle-ring ir1" [style.border-color]="pal().primary + '30'"></div>
            <div class="idle-ring ir2" [style.border-color]="pal().primary + '20'"></div>
          </div>
          <div class="idle-play" [style.background]="'linear-gradient(135deg,' + pal().primary + ',' + pal().secondary + ')'">▶</div>
          <div class="idle-meta">
            <div class="idle-title">{{ script.moduleTitle }}</div>
            <div class="idle-chips">
              <span class="idle-chip">🎬 {{ script.scenes.length }} scènes</span>
              <span class="idle-chip">⏱ ~{{ Math.round(script.estimatedDurationSeconds / 60) }} min</span>
              <span class="idle-chip">🎙️ Narration IA</span>
            </div>
            <div class="idle-cta" [style.color]="pal().primary">Cliquez pour démarrer</div>
          </div>
        </div>

        <!-- SCÈNE ACTIVE -->
        <div class="vx-scene" *ngIf="isPlaying() && currentScene()" [class.vx-trans]="transitioning()">

          <!-- Overlay gradient de palette -->
          <div class="scene-overlay" [style.background]="sceneOverlay()"></div>

          <!-- Numéro flottant -->
          <div class="scene-num" [style.color]="pal().primary">{{ pad(currentIdx() + 1) }}</div>

          <!-- Icône thématique flottante -->
          <div class="scene-icon-bg">{{ sceneEmoji() }}</div>

          <!-- ── INTRO scène ── -->
          <ng-container *ngIf="sceneType() === 'intro'">
            <div class="intro-scene" [class.sv]="kwVisible()">
              <div class="intro-line" [style.background]="'linear-gradient(90deg,' + pal().primary + ',' + pal().secondary + ')'"></div>
              <div class="intro-kw" [style.color]="pal().primary">{{ currentScene()!.keyWord }}</div>
              <h2 class="intro-title">{{ currentScene()!.title }}</h2>
              <p class="intro-narr">{{ displayText() }}<span class="ncursor" [class.blink]="isReading()">|</span></p>
            </div>
          </ng-container>

          <!-- ── STATS scène ── -->
          <ng-container *ngIf="sceneType() === 'stats'">
            <div class="stats-scene" [class.sv]="kwVisible()">
              <div class="stats-kw" [style.color]="pal().accent">{{ currentScene()!.keyWord }}</div>
              <h3 class="stats-title">{{ currentScene()!.title }}</h3>
              <div class="stats-grid" *ngIf="sceneStats().length > 0">
                <div class="stat-block" *ngFor="let s of sceneStats(); let i = index" [style.animation-delay]="(i * 0.25) + 's'">
                  <div class="sb-circle">
                    <svg width="90" height="90" viewBox="0 0 90 90">
                      <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="6"/>
                      <circle cx="45" cy="45" r="38" fill="none"
                        [attr.stroke]="pal().primary" stroke-width="6" stroke-linecap="round"
                        [attr.stroke-dasharray]="238.76"
                        [style.stroke-dashoffset]="238.76 - (s.pct / 100 * 238.76)"
                        transform="rotate(-90 45 45)" style="transition: stroke-dashoffset 1.5s cubic-bezier(.34,1.56,.64,1)"/>
                    </svg>
                    <span class="sb-val" [style.color]="pal().primary">{{ s.value }}</span>
                  </div>
                  <div class="sb-label">{{ s.label }}</div>
                </div>
              </div>
              <p class="stats-narr" *ngIf="!sceneStats().length">{{ displayText() }}<span class="ncursor" [class.blink]="isReading()">|</span></p>
            </div>
          </ng-container>

          <!-- ── PROCESS scène ── -->
          <ng-container *ngIf="sceneType() === 'process'">
            <div class="process-scene" [class.sv]="kwVisible()">
              <div class="proc-kw" [style.color]="pal().accent">{{ currentScene()!.keyWord }}</div>
              <h3 class="proc-title">{{ currentScene()!.title }}</h3>
              <!-- Flèches de processus -->
              <div class="proc-steps">
                <div class="proc-step" *ngFor="let step of processSteps(); let i = index" [style.animation-delay]="(i * 0.3) + 's'">
                  <div class="ps-dot" [style.background]="'linear-gradient(135deg,' + pal().primary + ',' + pal().secondary + ')'">
                    <span>{{ i + 1 }}</span>
                  </div>
                  <div class="ps-text">{{ step }}</div>
                  <div class="ps-arrow" *ngIf="i < processSteps().length - 1" [style.color]="pal().primary">→</div>
                </div>
              </div>
              <p class="proc-narr">{{ displayText() }}<span class="ncursor" [class.blink]="isReading()">|</span></p>
            </div>
          </ng-container>

          <!-- ── CONCLUSION scène ── -->
          <ng-container *ngIf="sceneType() === 'conclusion'">
            <div class="conclusion-scene" [class.sv]="kwVisible()">
              <div class="concl-star" [style.color]="pal().accent">✦</div>
              <div class="concl-kw" [style.color]="pal().primary">{{ currentScene()!.keyWord }}</div>
              <h2 class="concl-title">{{ currentScene()!.title }}</h2>
              <!-- Points clés -->
              <div class="concl-points">
                <div class="cp-item" *ngFor="let pt of conclusionPoints(); let i = index" [style.animation-delay]="(i * 0.2) + 's'">
                  <div class="cp-dot" [style.background]="pal().primary"></div>
                  <span>{{ pt }}</span>
                </div>
              </div>
            </div>
          </ng-container>

          <!-- ── CONCEPT / EXAMPLE scène (défaut) ── -->
          <ng-container *ngIf="sceneType() === 'concept' || sceneType() === 'example'">
            <div class="concept-scene" [class.sv]="kwVisible()">
              <div class="concept-kw-row">
                <div class="ckw-line" [style.background]="'linear-gradient(90deg, ' + pal().primary + ', ' + pal().secondary + ')'"></div>
                <div class="ckw-text" [style.color]="pal().primary">{{ currentScene()!.keyWord }}</div>
                <div class="ckw-line" [style.background]="'linear-gradient(90deg, ' + pal().secondary + ', ' + pal().primary + ')'"></div>
              </div>
              <h2 class="concept-title">{{ currentScene()!.title }}</h2>
              <div class="concept-narr-box">
                <div class="cnb-quote" [style.color]="pal().primary + '25'">"</div>
                <p class="cnb-text">{{ displayText() }}<span class="ncursor" [class.blink]="isReading()">|</span></p>
              </div>
              <div class="concept-visual" *ngIf="currentScene()!.visualSuggestion">
                <span>🖼️</span>
                <span class="cv-text">{{ currentScene()!.visualSuggestion }}</span>
              </div>
            </div>
          </ng-container>

          <!-- Visualisation audio universelle -->
          <div class="viz-row" *ngIf="isReading()">
            <div class="vz-bar" *ngFor="let b of audioArr; let i = index"
              [style.animation-delay]="(i * 0.06) + 's'"
              [style.background]="'linear-gradient(180deg,' + pal().primary + ',' + pal().secondary + ')'">
            </div>
          </div>

        </div>

        <!-- FIN -->
        <div class="vx-end" *ngIf="isFinished()" (click)="restart()">
          <div class="end-star" [style.color]="pal().primary">✦</div>
          <div class="end-title">Présentation terminée</div>
          <div class="end-module">{{ script.moduleTitle }}</div>
          <div class="end-stats">
            <span>{{ script.scenes.length }} scènes</span><span class="dot">·</span>
            <span>{{ formatTime(elapsedSecs()) }}</span>
          </div>
          <div class="end-cta" [style.border-color]="pal().primary + '50'" [style.color]="pal().primary">↺ Revoir</div>
        </div>
      </div>

      <!-- ══ TIMELINE ══ -->
      <div class="vx-tl">
        <div class="tl-track" (click)="onTlClick($event)" #tlTrack>
          <div class="tl-fill" [style.width]="progressPct() + '%'"
            [style.background]="'linear-gradient(90deg,' + pal().primary + ',' + pal().secondary + ')'"></div>
          <div class="tl-dot"
            *ngFor="let s of script.scenes; let i = index"
            [style.left]="(i / script.scenes.length * 100) + '%'"
            [style.background]="i <= currentIdx() ? pal().primary : '#334155'"
            (click)="jumpTo(i); $event.stopPropagation()">
          </div>
        </div>
        <div class="tl-row">
          <span class="tl-t">{{ formatTime(elapsedSecs()) }}</span>
          <span class="tl-cur" [style.color]="pal().primary">{{ currentScene()?.title || script.moduleTitle }}</span>
          <span class="tl-t">{{ formatTime(script.estimatedDurationSeconds) }}</span>
        </div>
      </div>

      <!-- ══ MINIATURES ══ -->
      <div class="vx-thumbs">
        <div class="thumb"
          *ngFor="let s of script.scenes; let i = index"
          [class.th-active]="currentIdx() === i"
          [class.th-done]="i < currentIdx()"
          [style.border-color]="currentIdx() === i ? pal().primary : 'transparent'"
          (click)="jumpTo(i)">
          <div class="th-icon">{{ getEmoji(s.title + ' ' + s.narration) }}</div>
          <div class="th-n" [style.color]="currentIdx() === i ? pal().primary : '#475569'">{{ i + 1 }}</div>
          <div class="th-title">{{ s.title | slice:0:9 }}</div>
          <div class="th-type" [style.color]="pal().accent">{{ getTypeShort(s.title + s.narration) }}</div>
        </div>
      </div>

      <!-- ══ CONTRÔLES ══ -->
      <div class="vx-ctrls">
        <div class="ctrl-row">
          <button class="cb" (click)="prevScene()" [disabled]="currentIdx() === 0 || !isPlaying()" title="Précédente">⏮</button>
          <button class="cb cb-main" (click)="togglePlay()"
            [style.background]="'linear-gradient(135deg,' + pal().primary + ',' + pal().secondary + ')'">
            {{ isPlaying() ? '⏸' : (isFinished() ? '↺' : '▶') }}
          </button>
          <button class="cb" (click)="nextScene()" [disabled]="currentIdx() >= script.scenes.length - 1 || !isPlaying()" title="Suivante">⏭</button>
          <button class="cb cb-speed" (click)="cycleSpeed()" [style.color]="pal().primary">{{ speedLabel() }}</button>
          <button class="cb" (click)="toggleMute()" title="Son">{{ muted() ? '🔇' : '🔊' }}</button>
          <span class="cb-elapsed">{{ formatTime(elapsedSecs()) }}</span>
        </div>

        <details class="script-acc">
          <summary class="acc-sum">📄 Script complet</summary>
          <div class="acc-body">
            <div class="acc-scene" *ngFor="let s of script.scenes; let i = index">
              <div class="acc-sh" [style.color]="PALETTES[i % PALETTES.length].primary">
                <span>{{ i + 1 }}</span><span>{{ s.title }}</span><span class="acc-dur">{{ s.durationSeconds }}s</span>
              </div>
              <p class="acc-narr">{{ s.narration }}</p>
              <p class="acc-vis">🖼️ {{ s.visualSuggestion }}</p>
            </div>
          </div>
        </details>
      </div>

    </div>
  `,
  styles: [`
    .vx { display:flex; flex-direction:column; background:#060d1a; border-radius:18px; overflow:hidden; border:1px solid rgba(255,255,255,0.06); font-family:'SF Pro Display','Segoe UI',system-ui,sans-serif; }

    /* ══ ÉCRAN ══ */
    .vx-screen { position:relative; height:440px; overflow:hidden; background:linear-gradient(160deg,#060d1a 0%,#0a1628 100%); }
    .vx-canvas { position:absolute; inset:0; width:100%; height:100%; }
    .scene-overlay { position:absolute; inset:0; pointer-events:none; z-index:1; transition:background 1.5s ease; }

    /* ══ IDLE ══ */
    .vx-idle { position:absolute; inset:0; z-index:10; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px; cursor:pointer; }
    .idle-glow { position:absolute; inset:0; pointer-events:none; }
    .idle-rings { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
    .idle-ring { position:absolute; border-radius:50%; border:1px solid; animation:idleR 4s ease-in-out infinite; }
    .ir1 { width:200px; height:200px; }
    .ir2 { width:320px; height:320px; animation-delay:.8s; }
    @keyframes idleR { 0%,100%{transform:scale(1);opacity:.5} 50%{transform:scale(1.05);opacity:1} }
    .idle-play { width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:28px; color:white; z-index:1; box-shadow:0 0 50px rgba(20,184,166,0.5); transition:all 0.2s; }
    .vx-idle:hover .idle-play { transform:scale(1.1); }
    .idle-meta { display:flex; flex-direction:column; align-items:center; gap:10px; z-index:1; }
    .idle-title { font-size:1.3rem; font-weight:700; color:#f1f5f9; text-align:center; }
    .idle-chips { display:flex; gap:7px; flex-wrap:wrap; justify-content:center; }
    .idle-chip { font-size:0.68rem; font-weight:600; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1); color:#94a3b8; padding:3px 10px; border-radius:999px; }
    .idle-cta { font-size:0.68rem; letter-spacing:.12em; text-transform:uppercase; animation:idleCta 2s ease-in-out infinite; }
    @keyframes idleCta { 0%,100%{opacity:.4} 50%{opacity:1} }

    /* ══ SCÈNE ══ */
    .vx-scene { position:absolute; inset:0; z-index:10; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px 36px; gap:14px; transition:opacity .6s,transform .6s; }
    .vx-trans { opacity:0; transform:scale(.97) translateY(8px); }
    .scene-num { position:absolute; top:16px; left:22px; font-size:3rem; font-weight:900; opacity:.1; line-height:1; letter-spacing:-.04em; }
    .scene-icon-bg { position:absolute; top:20px; right:26px; font-size:2rem; opacity:.3; animation:iconF 4s ease-in-out infinite; }
    @keyframes iconF { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }

    /* Transitions visibilité */
    .sv { animation:svIn .5s ease both; }
    @keyframes svIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }

    /* ══ INTRO ══ */
    .intro-scene { display:flex; flex-direction:column; align-items:center; gap:10px; text-align:center; max-width:600px; opacity:0; transform:translateY(14px); transition:all .5s .1s; }
    .intro-scene.sv { opacity:1; transform:none; }
    .intro-line { height:2px; width:80px; border-radius:1px; margin-bottom:4px; }
    .intro-kw { font-size:0.65rem; font-weight:900; letter-spacing:.2em; text-transform:uppercase; }
    .intro-title { font-size:1.8rem; font-weight:800; color:#f8fafc; line-height:1.2; margin:0; text-shadow:0 2px 30px rgba(0,0,0,.6); }
    .intro-narr { font-size:.9rem; color:#cbd5e1; line-height:1.7; font-style:italic; max-width:520px; margin:0; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07); border-radius:12px; padding:14px 18px; }

    /* ══ STATS ══ */
    .stats-scene { display:flex; flex-direction:column; align-items:center; gap:12px; max-width:600px; opacity:0; transform:translateY(14px); transition:all .5s .1s; }
    .stats-scene.sv { opacity:1; transform:none; }
    .stats-kw { font-size:.62rem; font-weight:900; letter-spacing:.2em; text-transform:uppercase; }
    .stats-title { font-size:1.3rem; font-weight:700; color:#f1f5f9; margin:0; text-align:center; }
    .stats-grid { display:flex; gap:16px; flex-wrap:wrap; justify-content:center; }
    .stat-block { display:flex; flex-direction:column; align-items:center; gap:6px; animation:stIn .6s ease both; }
    @keyframes stIn { from{opacity:0;transform:scale(.7)} to{opacity:1;transform:none} }
    .sb-circle { position:relative; width:90px; height:90px; display:flex; align-items:center; justify-content:center; }
    .sb-circle svg { position:absolute; inset:0; }
    .sb-val { font-size:1.2rem; font-weight:800; position:relative; }
    .sb-label { font-size:.62rem; color:#64748b; text-transform:uppercase; letter-spacing:.07em; max-width:80px; text-align:center; }
    .stats-narr { font-size:.88rem; color:#94a3b8; font-style:italic; text-align:center; max-width:500px; margin:0; }

    /* ══ PROCESS ══ */
    .process-scene { display:flex; flex-direction:column; align-items:center; gap:12px; max-width:640px; opacity:0; transform:translateY(14px); transition:all .5s .1s; }
    .process-scene.sv { opacity:1; transform:none; }
    .proc-kw { font-size:.62rem; font-weight:900; letter-spacing:.2em; text-transform:uppercase; }
    .proc-title { font-size:1.2rem; font-weight:700; color:#f1f5f9; margin:0; text-align:center; }
    .proc-steps { display:flex; align-items:center; gap:6px; flex-wrap:wrap; justify-content:center; }
    .proc-step { display:flex; align-items:center; gap:6px; animation:psIn .5s ease both; }
    @keyframes psIn { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:none} }
    .ps-dot { width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:.75rem; font-weight:800; color:white; flex-shrink:0; }
    .ps-text { font-size:.78rem; color:#e2e8f0; font-weight:600; max-width:90px; text-align:center; line-height:1.3; }
    .ps-arrow { font-size:1.2rem; font-weight:700; }
    .proc-narr { font-size:.82rem; color:#94a3b8; font-style:italic; text-align:center; max-width:500px; margin:0; }

    /* ══ CONCLUSION ══ */
    .conclusion-scene { display:flex; flex-direction:column; align-items:center; gap:12px; max-width:560px; text-align:center; opacity:0; transform:translateY(14px); transition:all .5s .1s; }
    .conclusion-scene.sv { opacity:1; transform:none; }
    .concl-star { font-size:2.5rem; animation:starSpin 6s ease-in-out infinite; }
    @keyframes starSpin { 0%,100%{transform:rotate(0) scale(1)} 50%{transform:rotate(180deg) scale(1.1)} }
    .concl-kw { font-size:.62rem; font-weight:900; letter-spacing:.2em; text-transform:uppercase; }
    .concl-title { font-size:1.5rem; font-weight:800; color:#f8fafc; margin:0; }
    .concl-points { display:flex; flex-direction:column; gap:7px; width:100%; text-align:left; }
    .cp-item { display:flex; align-items:center; gap:10px; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06); border-radius:8px; padding:9px 14px; font-size:.82rem; color:#e2e8f0; animation:cpIn .5s ease both; }
    @keyframes cpIn { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:none} }
    .cp-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }

    /* ══ CONCEPT/EXAMPLE ══ */
    .concept-scene { display:flex; flex-direction:column; align-items:center; gap:12px; max-width:580px; opacity:0; transform:translateY(14px); transition:all .5s .1s; }
    .concept-scene.sv { opacity:1; transform:none; }
    .concept-kw-row { display:flex; align-items:center; gap:12px; width:100%; }
    .ckw-line { flex:1; height:1.5px; border-radius:1px; }
    .ckw-text { font-size:.65rem; font-weight:900; letter-spacing:.18em; text-transform:uppercase; white-space:nowrap; }
    .concept-title { font-size:1.6rem; font-weight:800; color:#f8fafc; text-align:center; line-height:1.2; margin:0; }
    .concept-narr-box { position:relative; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07); border-radius:14px; padding:16px 20px; width:100%; }
    .cnb-quote { position:absolute; top:-6px; left:12px; font-size:3rem; font-family:Georgia,serif; line-height:1; pointer-events:none; }
    .cnb-text { font-size:.88rem; color:#cbd5e1; line-height:1.7; margin:0; font-style:italic; }
    .concept-visual { display:flex; align-items:center; gap:8px; background:rgba(255,255,255,.03); border:1px dashed rgba(255,255,255,.1); border-radius:8px; padding:8px 14px; width:100%; }
    .cv-text { font-size:.72rem; color:#475569; font-style:italic; }

    /* Cursor texte */
    .ncursor { display:inline-block; width:2px; height:1.1em; background:currentColor; vertical-align:text-bottom; margin-left:1px; }
    .ncursor.blink { animation:curBlink .7s steps(1) infinite; }
    @keyframes curBlink { 0%,100%{opacity:1} 50%{opacity:0} }

    /* Audio viz */
    .viz-row { position:absolute; bottom:12px; left:50%; transform:translateX(-50%); display:flex; align-items:flex-end; gap:3px; height:28px; }
    .vz-bar { width:4px; border-radius:2px; animation:vzD .45s ease-in-out infinite alternate; min-height:3px; }
    .vz-bar:nth-child(odd) { animation-duration:.35s; }
    .vz-bar:nth-child(3n) { animation-duration:.55s; }
    @keyframes vzD { from{height:3px} to{height:26px} }

    /* FIN */
    .vx-end { position:absolute; inset:0; z-index:10; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; cursor:pointer; }
    .end-star { font-size:3rem; animation:starSpin 6s ease-in-out infinite; }
    .end-title { font-size:1.4rem; font-weight:800; color:#f1f5f9; }
    .end-module { font-size:.85rem; color:#64748b; }
    .end-stats { display:flex; gap:8px; align-items:center; font-size:.75rem; color:#475569; }
    .dot { opacity:.4; }
    .end-cta { font-size:.75rem; border:1px solid; padding:6px 18px; border-radius:999px; margin-top:6px; transition:all .2s; }
    .vx-end:hover .end-cta { background:rgba(20,184,166,.1); }

    /* ══ TIMELINE ══ */
    .vx-tl { background:#07111f; padding:10px 18px 7px; }
    .tl-track { height:4px; background:rgba(255,255,255,.07); border-radius:2px; position:relative; cursor:pointer; margin-bottom:6px; }
    .tl-fill { height:100%; border-radius:2px; transition:width .5s linear; }
    .tl-dot { position:absolute; top:50%; transform:translate(-50%,-50%); width:9px; height:9px; border-radius:50%; cursor:pointer; border:2px solid rgba(0,0,0,.5); transition:all .15s; }
    .tl-dot:hover { transform:translate(-50%,-50%) scale(1.5); }
    .tl-row { display:flex; justify-content:space-between; align-items:center; }
    .tl-t { font-size:.62rem; color:#475569; font-variant-numeric:tabular-nums; }
    .tl-cur { font-size:.7rem; font-weight:600; max-width:55%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:center; }

    /* ══ MINIATURES ══ */
    .vx-thumbs { display:flex; gap:5px; overflow-x:auto; padding:9px 14px; background:#070f1e; border-top:1px solid rgba(255,255,255,.04); scrollbar-width:none; }
    .vx-thumbs::-webkit-scrollbar { display:none; }
    .thumb { flex-shrink:0; width:68px; background:rgba(255,255,255,.04); border:1.5px solid transparent; border-radius:10px; padding:7px 4px; cursor:pointer; transition:all .15s; text-align:center; display:flex; flex-direction:column; align-items:center; gap:2px; }
    .thumb:hover { background:rgba(255,255,255,.08); }
    .th-active { background:rgba(20,184,166,.08) !important; }
    .th-done { opacity:.5; }
    .th-icon { font-size:1.1rem; }
    .th-n { font-size:.82rem; font-weight:800; line-height:1; }
    .th-title { font-size:.5rem; color:#475569; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; }
    .th-type { font-size:.48rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; }

    /* ══ CONTRÔLES ══ */
    .vx-ctrls { background:#07111f; padding:10px 14px; border-top:1px solid rgba(255,255,255,.04); }
    .ctrl-row { display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:8px; }
    .cb { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.08); color:#94a3b8; border-radius:9px; padding:7px 14px; font-size:.95rem; cursor:pointer; transition:all .15s; }
    .cb:hover:not(:disabled) { background:rgba(255,255,255,.12); color:white; }
    .cb:disabled { opacity:.2; cursor:not-allowed; }
    .cb-main { color:white !important; border:none !important; font-size:1.2rem; padding:10px 22px; border-radius:11px; box-shadow:0 4px 20px rgba(0,0,0,.4); }
    .cb-main:hover:not(:disabled) { filter:brightness(1.15); transform:translateY(-1px); }
    .cb-speed { font-size:.62rem !important; font-weight:800; letter-spacing:.04em; border-color:rgba(56,189,248,.25) !important; }
    .cb-elapsed { font-size:.7rem; color:#475569; font-variant-numeric:tabular-nums; margin-left:4px; }

    /* Accordion */
    .script-acc { background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.06); border-radius:9px; overflow:hidden; }
    .acc-sum { padding:8px 14px; font-size:.75rem; font-weight:600; color:#64748b; cursor:pointer; list-style:none; }
    .acc-sum:hover { color:#94a3b8; }
    .acc-body { padding:0 14px 10px; display:flex; flex-direction:column; gap:10px; max-height:240px; overflow-y:auto; }
    .acc-scene { display:flex; flex-direction:column; gap:3px; }
    .acc-sh { display:flex; align-items:center; gap:7px; font-size:.75rem; font-weight:700; }
    .acc-dur { font-size:.6rem; color:#475569; margin-left:auto; }
    .acc-narr { font-size:.72rem; color:#64748b; font-style:italic; margin:0; line-height:1.4; }
    .acc-vis { font-size:.65rem; color:#374151; margin:0; }
  `]
})
export class VideoExplainerComponent implements OnDestroy, AfterViewInit, OnChanges {

  @Input({ required: true }) script!: VideoScriptResponse;
  @ViewChild('bgCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('tlTrack') tlTrackRef!: ElementRef<HTMLDivElement>;

  Math = Math;
  PALETTES = PALETTES;
  audioArr = Array(16).fill(0);

  isPlaying     = signal(false);
  isFinished    = signal(false);
  isReading     = signal(false);
  muted         = signal(false);
  transitioning = signal(false);
  kwVisible     = signal(false);
  currentIdx    = signal(0);
  elapsedSecs   = signal(0);
  displayText   = signal('');

  private speeds = [0.8, 1.0, 1.3];
  private speedIdx = signal(1);
  speedLabel = computed(() => ['0.8×', '1×', '1.3×'][this.speedIdx()]);

  currentScene  = computed(() => this.script?.scenes?.[this.currentIdx()] ?? null);
  pal           = computed(() => PALETTES[this.currentIdx() % PALETTES.length]);

  sceneType = computed(() => {
    const s = this.currentScene();
    return s ? detectSceneType(s.title + ' ' + s.narration) : 'concept';
  });

  sceneEmoji = computed(() => {
    const s = this.currentScene();
    if (!s) return '🎯';
    return {
      intro: '🎬', stats: '📊', process: '⚙️',
      concept: '💡', example: '✨', conclusion: '🏆'
    }[this.sceneType()] ?? '🎯';
  });

  sceneStats = computed(() => {
    const s = this.currentScene();
    return s ? extractStats(s.narration + ' ' + s.visualSuggestion) : [];
  });

  processSteps = computed(() => {
    const s = this.currentScene();
    if (!s) return [];
    // Extraire les étapes numérotées ou séparées par des virgules/points
    const text = s.narration;
    const steps = text.match(/\d+\.\s*([^.]+)/g);
    if (steps && steps.length >= 2) {
      return steps.slice(0, 4).map(st => st.replace(/^\d+\.\s*/, '').trim().slice(0, 30));
    }
    // Sinon séparer par virgules
    const parts = text.split(/[,;]/).filter(p => p.trim().length > 5 && p.trim().length < 50);
    return parts.slice(0, 4).map(p => p.trim().slice(0, 30));
  });

  conclusionPoints = computed(() => {
    const s = this.currentScene();
    if (!s) return [];
    const text = s.narration;
    const sentences = text.split(/[.!?]/).filter(p => p.trim().length > 20 && p.trim().length < 100);
    return sentences.slice(0, 4).map(p => p.trim());
  });

  sceneOverlay = computed(() => {
    const p = this.pal();
    return `radial-gradient(ellipse at 15% 50%, ${p.primary}12 0%, transparent 55%),
            radial-gradient(ellipse at 85% 30%, ${p.secondary}08 0%, transparent 55%)`;
  });

  progressPct = computed(() => {
    const total = this.script?.estimatedDurationSeconds ?? 1;
    return Math.min(100, Math.round((this.elapsedSecs() / total) * 100));
  });

  private ctx!: CanvasRenderingContext2D;
  private animId!: number;
  private particles: Particle[] = [];
  private elapsedTimer: any = null;
  private advanceTimer: any = null;
  private textTimer: any = null;
  private synth = window.speechSynthesis;

  ngOnChanges(c: SimpleChanges) { if (c['script'] && this.ctx) this.spawnParticles(); }
  ngAfterViewInit() { this.initCanvas(); }

  // ── Canvas ─────────────────────────────────────────────────

  private initCanvas() {
    const el = this.canvasRef?.nativeElement;
    if (!el) return;
    this.ctx = el.getContext('2d')!;
    el.width = el.offsetWidth || 700;
    el.height = el.offsetHeight || 440;
    this.spawnParticles();
    this.renderLoop();
  }

  private spawnParticles() {
    const el = this.canvasRef?.nativeElement;
    if (!el) return;
    this.particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * el.width, y: Math.random() * el.height,
      r: Math.random() * 1.6 + 0.3,
      vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2,
      op: Math.random() * 0.45 + 0.06,
      color: PALETTES[Math.floor(Math.random() * PALETTES.length)].primary,
    }));
  }

  private renderLoop() {
    const el = this.canvasRef?.nativeElement;
    if (!el || !this.ctx) return;
    const ctx = this.ctx;
    const W = el.width, H = el.height;
    const p = this.pal();
    const t = Date.now() * 0.001;

    ctx.clearRect(0, 0, W, H);

    // Grille fine
    ctx.strokeStyle = 'rgba(255,255,255,0.012)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 55) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 55) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Particules
    this.particles.forEach(pt => {
      pt.x += pt.vx; pt.y += pt.vy;
      if (pt.x < 0 || pt.x > W) pt.vx *= -1;
      if (pt.y < 0 || pt.y > H) pt.vy *= -1;
      ctx.globalAlpha = pt.op;
      ctx.fillStyle = p.primary;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Blob animé
    ctx.save(); ctx.globalAlpha = 0.055;
    const bx = W * (0.72 + Math.sin(t * 0.22) * 0.08);
    const by = H * (0.38 + Math.cos(t * 0.18) * 0.08);
    const bg = ctx.createRadialGradient(bx, by, 0, bx, by, 200);
    bg.addColorStop(0, p.primary); bg.addColorStop(1, 'transparent');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(bx, by, 200, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Hexagone tournant (coin bas gauche)
    ctx.save(); ctx.globalAlpha = 0.035; ctx.strokeStyle = p.secondary; ctx.lineWidth = 1;
    ctx.translate(W * 0.1, H * 0.72); ctx.rotate(t * 0.1);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; i === 0 ? ctx.moveTo(Math.cos(a) * 80, Math.sin(a) * 80) : ctx.lineTo(Math.cos(a) * 80, Math.sin(a) * 80); }
    ctx.closePath(); ctx.stroke();
    ctx.restore();

    // Cercles concentriques (coin haut droit)
    ctx.save(); ctx.globalAlpha = 0.025; ctx.strokeStyle = p.accent; ctx.lineWidth = 1;
    [50, 85, 120].forEach((r, i) => {
      ctx.beginPath(); ctx.arc(W * 0.9, H * 0.15, r + Math.sin(t * 0.4 + i) * 8, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.restore();

    this.animId = requestAnimationFrame(() => this.renderLoop());
  }

  // ── Contrôles ──────────────────────────────────────────────

  play() {
    this.isFinished.set(false); this.isPlaying.set(true);
    this.startElapsed(); this.playScene(this.currentIdx());
  }

  togglePlay() {
    if (this.isFinished()) { this.restart(); return; }
    if (this.isPlaying()) this.pause(); else this.resume();
  }

  pause() { this.synth.pause(); this.isReading.set(false); this.clearTimers(); }
  resume() { this.synth.resume(); this.isReading.set(true); this.startElapsed(); }

  restart() {
    this.synth.cancel(); this.clearTimers();
    this.currentIdx.set(0); this.elapsedSecs.set(0);
    this.isFinished.set(false); this.play();
  }

  nextScene() {
    if (this.currentIdx() < this.script.scenes.length - 1) {
      this.synth.cancel(); this.clearTimers();
      this.currentIdx.update(i => i + 1);
      if (this.isPlaying()) this.playScene(this.currentIdx());
    }
  }

  prevScene() {
    if (this.currentIdx() > 0) {
      this.synth.cancel(); this.clearTimers();
      this.currentIdx.update(i => i - 1);
      if (this.isPlaying()) this.playScene(this.currentIdx());
    }
  }

  jumpTo(idx: number) {
    this.synth.cancel(); this.clearTimers();
    this.currentIdx.set(idx);
    if (this.isPlaying()) this.playScene(idx);
  }

  onTlClick(e: MouseEvent) {
    const track = this.tlTrackRef?.nativeElement;
    if (!track) return;
    const pct = e.offsetX / track.offsetWidth;
    this.jumpTo(Math.max(0, Math.min(Math.floor(pct * this.script.scenes.length), this.script.scenes.length - 1)));
  }

  cycleSpeed() { this.speedIdx.update(i => (i + 1) % this.speeds.length); }

  toggleMute() {
    this.muted.update(v => !v);
    if (this.muted()) { this.synth.cancel(); this.isReading.set(false); }
    else if (this.isPlaying()) { const s = this.currentScene(); if (s) this.speakNarration(s.narration); }
  }

  // ── Lecture scène ──────────────────────────────────────────

  private playScene(idx: number) {
    const scene = this.script.scenes[idx];
    if (!scene) { this.finish(); return; }

    this.transitioning.set(true);
    this.kwVisible.set(false);
    this.displayText.set('');
    this.isReading.set(false);

    setTimeout(() => {
      this.transitioning.set(false);
      setTimeout(() => {
        this.kwVisible.set(true);
        this.animateText(scene.narration);
        if (!this.muted()) this.speakNarration(scene.narration);
        else this.scheduleAdvance(idx, scene.durationSeconds * 1000);
      }, 150);
    }, 600);
  }

  private speakNarration(text: string) {
    this.synth.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'fr-FR'; utt.rate = this.speeds[this.speedIdx()]; utt.pitch = 1.0;
    const fr = this.synth.getVoices().find(v => v.lang.startsWith('fr'));
    if (fr) utt.voice = fr;
    utt.onstart = () => this.isReading.set(true);
    utt.onend = () => { this.isReading.set(false); this.scheduleAdvance(this.currentIdx(), 1000); };
    utt.onerror = () => { this.isReading.set(false); this.scheduleAdvance(this.currentIdx(), 800); };
    this.synth.speak(utt);
  }

  private animateText(text: string) {
    clearTimeout(this.textTimer);
    let i = 0;
    const tick = () => {
      if (i >= text.length) { this.displayText.set(text); return; }
      i = Math.min(i + 4, text.length);
      this.displayText.set(text.slice(0, i));
      this.textTimer = setTimeout(tick, 22);
    };
    tick();
  }

  private scheduleAdvance(idx: number, delay: number) {
    clearTimeout(this.advanceTimer);
    this.advanceTimer = setTimeout(() => {
      if (!this.isPlaying()) return;
      if (idx < this.script.scenes.length - 1) {
        this.currentIdx.update(i => i + 1); this.playScene(this.currentIdx());
      } else { this.finish(); }
    }, delay);
  }

  private finish() { this.isPlaying.set(false); this.isFinished.set(true); this.isReading.set(false); this.clearTimers(); }
  private startElapsed() { clearInterval(this.elapsedTimer); this.elapsedTimer = setInterval(() => this.elapsedSecs.update(s => s + 1), 1000); }
  private clearTimers() { clearInterval(this.elapsedTimer); clearTimeout(this.advanceTimer); clearTimeout(this.textTimer); }

  formatTime(s: number): string { const m = Math.floor(s / 60); return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`; }
  pad(n: number): string { return n.toString().padStart(2, '0'); }

  getEmoji(text: string): string {
    return {
      intro: '🎬', stats: '📊', process: '⚙️',
      concept: '💡', example: '✨', conclusion: '🏆'
    }[detectSceneType(text)] ?? '🎯';
  }

  getTypeShort(text: string): string {
    return { intro: 'INTRO', stats: 'STATS', process: 'PROCESS', concept: 'CONCEPT', example: 'EXEMPLE', conclusion: 'FIN' }[detectSceneType(text)] ?? '';
  }

  ngOnDestroy() { this.synth.cancel(); this.clearTimers(); cancelAnimationFrame(this.animId); }
}