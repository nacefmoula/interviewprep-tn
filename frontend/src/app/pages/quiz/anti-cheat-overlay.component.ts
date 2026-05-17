// src/app/shared/components/anti-cheat-overlay/anti-cheat-overlay.component.ts

import {
  Component, Input, Output, EventEmitter, OnInit, OnDestroy,
  signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheatType } from '../../core/services/anti-cheat.service';

export type OverlayMode = 'WARNING' | 'TERMINATED';

const CHEAT_LABELS: Record<CheatType, string> = {
  WINDOW_BLUR:        'Changement de fenêtre détecté',
  TAB_HIDDEN:         'Navigation hors du quiz détectée',
  CLIPBOARD_IMAGE:    'Capture d\'écran détectée dans le presse-papiers',
  PRINT_ATTEMPT:      'Tentative d\'impression détectée',
  DEVTOOLS_OPEN:      'Outils développeur ouverts',
  CONTEXT_MENU:       'Tentative d\'inspection du contenu',
  COPY_ATTEMPT:       'Copie du contenu du quiz détectée',
  SUSPICIOUS_PROCESS: 'Logiciel suspect détecté',
};

const CHEAT_ICONS: Record<CheatType, string> = {
  WINDOW_BLUR:        '🪟',
  TAB_HIDDEN:         '🗂️',
  CLIPBOARD_IMAGE:    '📸',
  PRINT_ATTEMPT:      '🖨️',
  DEVTOOLS_OPEN:      '🔧',
  CONTEXT_MENU:       '🖱️',
  COPY_ATTEMPT:       '📋',
  SUSPICIOUS_PROCESS: '⚠️',
};

@Component({
  selector: 'app-anti-cheat-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="aco-backdrop">
      <div class="aco-card" [class.aco-warn]="mode==='WARNING'" [class.aco-dead]="mode==='TERMINATED'">

        <!-- Bande couleur haut -->
        <div class="aco-topbar" [class.aco-topbar-warn]="mode==='WARNING'" [class.aco-topbar-dead]="mode==='TERMINATED'"></div>

        <!-- Icône -->
        <div class="aco-icon-wrap">
          <div class="aco-icon-bg" [class.aco-ibg-warn]="mode==='WARNING'" [class.aco-ibg-dead]="mode==='TERMINATED'">
            <div class="aco-ring r1" [class.aco-ring-warn]="mode==='WARNING'" [class.aco-ring-dead]="mode==='TERMINATED'"></div>
            <div class="aco-ring r2" [class.aco-ring-warn]="mode==='WARNING'" [class.aco-ring-dead]="mode==='TERMINATED'"></div>
            <span class="aco-emoji">{{ mode === 'WARNING' ? '⚠️' : '🚫' }}</span>
          </div>
        </div>

        <!-- Titre + sous-titre -->
        <div class="aco-title" [class.aco-title-warn]="mode==='WARNING'" [class.aco-title-dead]="mode==='TERMINATED'">
          {{ mode === 'WARNING' ? 'Avertissement' : 'Quiz Terminé' }}
        </div>
        <div class="aco-subtitle">
          {{ mode === 'WARNING' ? 'Comportement suspect détecté' : 'Tentative de triche confirmée' }}
        </div>

        <!-- Badge détection -->
        <div class="aco-detection" [class.aco-det-warn]="mode==='WARNING'" [class.aco-det-dead]="mode==='TERMINATED'">
          <span class="aco-det-icon">{{ cheatIcon() }}</span>
          <span class="aco-det-text">{{ cheatLabel() }}</span>
        </div>

        <!-- Message WARNING -->
        <div class="aco-message" *ngIf="mode==='WARNING'">
          <p>
            Cette infraction a été <strong>enregistrée</strong>.
            Toute nouvelle sortie du quiz entraînera sa <strong>terminaison immédiate</strong>
            avec un score de <strong>0%</strong>.
          </p>
          <div class="aco-rules">
            <div class="aco-rule"><span class="aco-rule-dot"></span>Restez dans cette fenêtre</div>
            <div class="aco-rule"><span class="aco-rule-dot"></span>N'utilisez pas d'autres applications</div>
            <div class="aco-rule"><span class="aco-rule-dot"></span>N'ouvrez pas les outils développeur</div>
            <div class="aco-rule"><span class="aco-rule-dot"></span>Ne faites pas de captures d'écran</div>
          </div>
        </div>

        <!-- Message TERMINATED -->
        <div class="aco-message" *ngIf="mode==='TERMINATED'">
          <p>
            Vous avez quitté le quiz une <strong>seconde fois</strong>.
            Le quiz est définitivement terminé avec un score de
            <strong class="aco-zero">0%</strong>.
          </p>
          <p>Cet incident a été <strong>enregistré</strong> dans votre dossier de formation.</p>
        </div>

        <!-- Compte à rebours -->
        <div class="aco-countdown" *ngIf="mode==='WARNING'">
          <div class="aco-cd-ring">
            <svg viewBox="0 0 60 60" width="60" height="60">
              <circle cx="30" cy="30" r="25" fill="none" stroke="#CCFBF1" stroke-width="5"/>
              <circle cx="30" cy="30" r="25" fill="none"
                stroke="#14B8A6" stroke-width="5" stroke-linecap="round"
                stroke-dasharray="157"
                [style.stroke-dashoffset]="157 - (countdown() / COUNTDOWN_MAX * 157)"
                transform="rotate(-90 30 30)"
                style="transition:stroke-dashoffset 0.9s linear"/>
            </svg>
            <span class="aco-cd-num">{{ countdown() }}</span>
          </div>
          <div class="aco-cd-label">Reprise dans {{ countdown() }}s</div>
        </div>

        <!-- Actions -->
        <div class="aco-actions">
          <button class="aco-btn-resume" *ngIf="mode==='WARNING'"
            (click)="onResume.emit()"
            [disabled]="countdown() > 0">
            {{ countdown() > 0 ? '⏳ Patientez… ' + countdown() + 's' : '✓ Reprendre le quiz' }}
          </button>
          <button class="aco-btn-quit" *ngIf="mode==='TERMINATED'"
            (click)="onQuit.emit()">
            Voir mes résultats →
          </button>
        </div>

        <!-- Badge enregistré -->
        <div class="aco-recorded">
          <span class="aco-rec-dot"></span>
          <span>Infraction enregistrée · {{ timestamp | date:'HH:mm:ss' }}</span>
        </div>

      </div>
    </div>
  `,
  styles: [`

/* ── BACKDROP ── */
.aco-backdrop {
  position: fixed; inset: 0; z-index: 99999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(15, 118, 110, 0.18);
  backdrop-filter: blur(10px);
  animation: acoIn .3s ease-out;
}
@keyframes acoIn { from { opacity: 0; } to { opacity: 1; } }

/* ── CARD ── */
.aco-card {
  max-width: 460px; width: 92%;
  background: #fff;
  border-radius: 20px;
  border: 1.5px solid #CCFBF1;
  box-shadow: 0 24px 80px rgba(20, 184, 166, 0.18), 0 4px 24px rgba(0,0,0,0.08);
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  text-align: center; position: relative; overflow: hidden;
  padding: 0 28px 28px;
  animation: acoCardIn .4s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes acoCardIn { from { transform: scale(0.88); opacity: 0; } to { transform: none; opacity: 1; } }

.aco-warn { border-color: #99F6E4; box-shadow: 0 24px 80px rgba(20,184,166,.2), 0 4px 24px rgba(0,0,0,.08); }
.aco-dead { border-color: #B5D4F4; box-shadow: 0 24px 80px rgba(55,138,221,.15), 0 4px 24px rgba(0,0,0,.08); }

/* ── BANDE HAUT ── */
.aco-topbar {
  width: 100%; height: 6px; margin: 0 -28px; border-radius: 20px 20px 0 0;
  position: relative; left: 0; top: 0; align-self: stretch;
}
.aco-topbar-warn { background: linear-gradient(90deg, #14B8A6, #2DD4BF, #99F6E4); }
.aco-topbar-dead { background: linear-gradient(90deg, #378ADD, #85B7EB, #B5D4F4); }

/* ── ICÔNE ── */
.aco-icon-wrap { margin-top: 20px; }
.aco-icon-bg {
  position: relative; width: 76px; height: 76px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.aco-ibg-warn { background: #E8FDF7; border: 2px solid #CCFBF1; }
.aco-ibg-dead { background: #E6F1FB; border: 2px solid #B5D4F4; }

.aco-ring {
  position: absolute; border-radius: 50%;
  animation: acoRing 2s ease-out infinite;
}
.r1 { width: 76px; height: 76px; }
.r2 { width: 56px; height: 56px; animation-delay: .45s; }
.aco-ring-warn { border: 1.5px solid rgba(20,184,166,.35); }
.aco-ring-dead { border: 1.5px solid rgba(55,138,221,.35); }
@keyframes acoRing { 0%{transform:scale(.85);opacity:.8} 100%{transform:scale(1.45);opacity:0} }

.aco-emoji {
  font-size: 2rem; z-index: 1;
  animation: acoShake .5s ease .2s;
}
@keyframes acoShake {
  0%,100%{transform:none} 20%{transform:rotate(-14deg)} 40%{transform:rotate(14deg)}
  60%{transform:rotate(-9deg)} 80%{transform:rotate(9deg)}
}

/* ── TITRES ── */
.aco-title {
  font-size: 1.4rem; font-weight: 800; letter-spacing: -.02em;
  font-family: 'SF Pro Display','Segoe UI',system-ui,sans-serif;
  margin-top: 4px;
}
.aco-title-warn { color: #0F766E; }
.aco-title-dead { color: #185FA5; }
.aco-subtitle   { font-size: .82rem; color: #64748b; margin-top: -8px; }

/* ── DÉTECTION ── */
.aco-detection {
  display: flex; align-items: center; gap: 10px;
  border-radius: 10px; padding: 10px 16px; width: 100%;
  border: 1px solid;
}
.aco-det-warn { background: #E8FDF7; border-color: #CCFBF1; }
.aco-det-dead { background: #E6F1FB; border-color: #B5D4F4; }
.aco-det-icon { font-size: 1.2rem; }
.aco-det-text { font-size: .82rem; font-weight: 600; color: #0F766E; }
.aco-dead .aco-det-text { color: #185FA5; }

/* ── MESSAGE ── */
.aco-message { text-align: left; width: 100%; }
.aco-message p { font-size: .84rem; color: #475569; line-height: 1.65; margin: 0 0 10px; }
.aco-message strong { color: #0F766E; }
.aco-dead .aco-message strong { color: #185FA5; }
.aco-zero { color: #378ADD !important; font-size: 1.1rem; }

.aco-rules {
  background: #E8FDF7; border: 1px solid #CCFBF1;
  border-radius: 10px; padding: 12px 14px;
  display: flex; flex-direction: column; gap: 7px;
}
.aco-rule {
  display: flex; align-items: center; gap: 8px;
  font-size: .8rem; color: #0F766E; font-weight: 500;
}
.aco-rule-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #14B8A6; flex-shrink: 0;
}

/* ── COMPTE À REBOURS ── */
.aco-countdown {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.aco-cd-ring {
  position: relative; width: 60px; height: 60px;
  display: flex; align-items: center; justify-content: center;
}
.aco-cd-ring svg { position: absolute; inset: 0; }
.aco-cd-num   { font-size: 1.1rem; font-weight: 800; color: #14B8A6; position: relative; z-index: 1; }
.aco-cd-label { font-size: .7rem; color: #64748b; }

/* ── ACTIONS ── */
.aco-actions { width: 100%; }
.aco-btn-resume {
  width: 100%; padding: 13px 24px; border: none; border-radius: 10px;
  background: #14B8A6; color: white;
  font-size: .9rem; font-weight: 700; cursor: pointer; transition: all .2s;
}
.aco-btn-resume:hover:not(:disabled) { background: #0D9488; transform: translateY(-1px); }
.aco-btn-resume:disabled {
  background: #CCFBF1; color: #0F766E; cursor: not-allowed;
  opacity: .8;
}

.aco-btn-quit {
  width: 100%; padding: 13px 24px; border: 1.5px solid #B5D4F4; border-radius: 10px;
  background: #E6F1FB; color: #185FA5;
  font-size: .9rem; font-weight: 700; cursor: pointer; transition: all .2s;
}
.aco-btn-quit:hover { background: #B5D4F4; border-color: #85B7EB; }

/* ── BADGE ENREGISTRÉ ── */
.aco-recorded {
  display: flex; align-items: center; gap: 7px;
  font-size: .64rem; color: #94a3b8;
}
.aco-rec-dot {
  width: 6px; height: 6px; border-radius: 50%; background: #14B8A6;
  animation: acoRecBlink 1.2s steps(1) infinite;
}
@keyframes acoRecBlink { 0%,100%{opacity:1} 50%{opacity:.2} }

  `]
})
export class AntiCheatOverlayComponent implements OnInit, OnDestroy {

  @Input() mode: OverlayMode = 'WARNING';
  @Input() cheatType: CheatType = 'WINDOW_BLUR';
  @Input() timestamp: Date = new Date();

  @Output() onResume = new EventEmitter<void>();
  @Output() onQuit   = new EventEmitter<void>();

  readonly COUNTDOWN_MAX = 10;
  countdown = signal(this.COUNTDOWN_MAX);

  private countdownTimer: any = null;

  cheatLabel = computed(() => CHEAT_LABELS[this.cheatType] ?? 'Comportement suspect détecté');
  cheatIcon  = computed(() => CHEAT_ICONS[this.cheatType]  ?? '⚠️');

  ngOnInit() {
    if (this.mode === 'WARNING') {
      this.countdown.set(this.COUNTDOWN_MAX);
      this.countdownTimer = setInterval(() => {
        const c = this.countdown() - 1;
        if (c <= 0) {
          this.countdown.set(0);
          clearInterval(this.countdownTimer);
        } else {
          this.countdown.set(c);
        }
      }, 1000);
    }
  }

  ngOnDestroy() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }
}