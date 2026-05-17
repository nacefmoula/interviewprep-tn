// src/app/core/services/anti-cheat.service.ts
// ═══════════════════════════════════════════════════════════════
//  SERVICE ANTI-TRICHE ANGULAR
//
//  Détecte en temps réel :
//  ✅ Changement de fenêtre / onglet (visibilitychange + blur)
//  ✅ Alt-Tab, Win+D, minimisation (blur event)
//  ✅ Capture écran détectée via clipboard (Ctrl+V d'image)
//  ✅ Déviation du focus (click hors iframe, new window)
//  ✅ Tentative d'impression (Ctrl+P)
//  ✅ DevTools ouverts (taille fenêtre + console timing)
//  ✅ Communique avec le microservice Python pour analyse avancée
// ═══════════════════════════════════════════════════════════════

import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { firstValueFrom } from 'rxjs'; // À ajouter en haut du fichier

export type CheatType =
  | 'WINDOW_BLUR'          // Alt-Tab / clic autre fenêtre
  | 'TAB_HIDDEN'           // Changement d'onglet
  | 'CLIPBOARD_IMAGE'      // Screenshot collé dans le presse-papiers
  | 'PRINT_ATTEMPT'        // Ctrl+P
  | 'DEVTOOLS_OPEN'        // Outils développeur ouverts
  | 'CONTEXT_MENU'         // Clic droit (possible inspection)
  | 'COPY_ATTEMPT'         // Ctrl+C sur du contenu quiz
  | 'SUSPICIOUS_PROCESS';  // Processus suspect (via Python)

export interface CheatEvent {
  type: CheatType;
  timestamp: Date;
  details?: string;
  attemptId?: string;
}

@Injectable({ providedIn: 'root' })
export class AntiCheatService implements OnDestroy {

  // Observable — le composant écoute pour réagir
  readonly cheatDetected$ = new Subject<CheatEvent>();

  private listeners: (() => void)[] = [];
  private active = false;
  private attemptId = '';

  // Seuils
  private readonly PYTHON_URL = ''; // Disabled in public deployment: Python anti-cheat service is not exposed
  private devtoolsCheckInterval: any = null;

  constructor(
    private ngZone: NgZone,
    private http: HttpClient,
  ) {}

  // ── Démarrer la surveillance ──────────────────────────────────

  start(attemptId: string) {
    if (this.active) this.stop();
    this.active = true;
    this.attemptId = attemptId;
    this.attachListeners();
    this.startDevToolsDetection();
    console.log('[AntiCheat] Surveillance démarrée pour attempt:', attemptId);
  }

  stop() {
    this.active = false;
    this.attemptId = '';
    this.listeners.forEach(fn => fn());
    this.listeners = [];
    if (this.devtoolsCheckInterval) {
      clearInterval(this.devtoolsCheckInterval);
      this.devtoolsCheckInterval = null;
    }
  }

  ngOnDestroy() { this.stop(); }

  // ── Attacher tous les event listeners ─────────────────────────

  private attachListeners() {

    // 1. Changement d'onglet (Page Visibility API)
    const onVisibility = () => {
      if (document.hidden) {
        this.emit('TAB_HIDDEN', 'L\'utilisateur a changé d\'onglet');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.listeners.push(() => document.removeEventListener('visibilitychange', onVisibility));

    // 2. Perte de focus fenêtre (Alt-Tab, clic sur autre appli)
    let blurTimeout: any;
    const onBlur = () => {
      // Délai court pour éviter les faux positifs (ex: clic sur input)
      blurTimeout = setTimeout(() => {
        if (!document.hasFocus()) {
          this.emit('WINDOW_BLUR', 'L\'utilisateur a quitté la fenêtre du quiz');
        }
      }, 300);
    };
    const onFocus = () => clearTimeout(blurTimeout);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    this.listeners.push(() => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    });

    // 3. Tentative d'impression
    const onKeydown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'p') {
        e.preventDefault();
        this.emit('PRINT_ATTEMPT', 'Tentative d\'impression (Ctrl+P)');
      }
      // Ctrl+C = copie de contenu quiz
      if (ctrl && e.key === 'c') {
        const sel = window.getSelection()?.toString() ?? '';
        if (sel.length > 10) {
          this.emit('COPY_ATTEMPT', `Copie de texte détectée (${sel.length} caractères)`);
        }
      }
      // F12 = DevTools
      if (e.key === 'F12') {
        e.preventDefault();
        this.emit('DEVTOOLS_OPEN', 'Ouverture DevTools (F12)');
      }
      // Ctrl+Shift+I / Ctrl+Shift+J = DevTools
      if (ctrl && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
        e.preventDefault();
        this.emit('DEVTOOLS_OPEN', 'Raccourci DevTools détecté');
      }
      // Ctrl+U = voir source
      if (ctrl && e.key === 'u') {
        e.preventDefault();
        this.emit('COPY_ATTEMPT', 'Tentative de voir le code source (Ctrl+U)');
      }
    };
    document.addEventListener('keydown', onKeydown);
    this.listeners.push(() => document.removeEventListener('keydown', onKeydown));

    // 4. Clic droit (menu contextuel)
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      this.emit('CONTEXT_MENU', 'Menu contextuel bloqué (clic droit)');
    };
    document.addEventListener('contextmenu', onContextMenu);
    this.listeners.push(() => document.removeEventListener('contextmenu', onContextMenu));

    // 5. Presse-papiers — détection d'image (screenshot Ctrl+C → Snipping Tool → Ctrl+V)
    const onPaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const hasImage = items.some(item => item.type.startsWith('image/'));
      if (hasImage) {
        e.preventDefault();
        this.emit('CLIPBOARD_IMAGE', 'Image détectée dans le presse-papiers (possible screenshot)');
      }
    };
    // On force le type EventListener pour éviter le conflit de signature
document.addEventListener('paste', onPaste as any);
this.listeners.push(() => document.removeEventListener('paste', onPaste as any));

    // 6. beforeprint (Ctrl+P via navigateur)
    const onBeforePrint = () => this.emit('PRINT_ATTEMPT', 'Impression navigateur détectée');
    window.addEventListener('beforeprint', onBeforePrint);
    this.listeners.push(() => window.removeEventListener('beforeprint', onBeforePrint));
  }

  // ── Détection DevTools par taille de fenêtre ─────────────────
  // DevTools ouverts = différence entre outerWidth et innerWidth > seuil

  private startDevToolsDetection() {
    const THRESHOLD = 160;
    let wasOpen = false;

    this.devtoolsCheckInterval = setInterval(() => {
      const widthDiff  = window.outerWidth  - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      const isOpen = widthDiff > THRESHOLD || heightDiff > THRESHOLD;

      if (isOpen && !wasOpen) {
        wasOpen = true;
        this.emit('DEVTOOLS_OPEN', `DevTools détectés (diff fenêtre: ${widthDiff}×${heightDiff}px)`);
      } else if (!isOpen) {
        wasOpen = false;
      }
    }, 2000);
  }

  // ── Émettre un événement de triche ───────────────────────────

  private emit(type: CheatType, details?: string) {
    if (!this.active) return;

    const event: CheatEvent = {
      type,
      details,
      timestamp: new Date(),
      attemptId: this.attemptId,
    };

    // Émettre dans la zone Angular
    this.ngZone.run(() => this.cheatDetected$.next(event));

    // Notifier le backend Python si disponible
    this.notifyPython(event);

    console.warn('[AntiCheat] Événement détecté:', type, details);
  }

  // ── Notification backend Python ───────────────────────────────

  private notifyPython(event: CheatEvent) {
    if (!this.PYTHON_URL) {
      return;
    }

    this.http.post(`${this.PYTHON_URL}/event`, {
      attemptId: event.attemptId,
      type: event.type,
      details: event.details,
      timestamp: event.timestamp.toISOString(),
    }).subscribe({
      error: () => {} // Silencieux si Python indisponible
    });
  }

  // ── API publique pour vérification manuelle ────────────────────

 /** Demande au backend Python de vérifier les processus actifs */
async checkProcesses(): Promise<{ suspicious: boolean; processes: string[] }> {
  if (!this.PYTHON_URL) {
    return { suspicious: false, processes: [] };
  }

  try {
    const request = this.http.post<{ suspicious: boolean; processes: string[] }>(
      `${this.PYTHON_URL}/check-processes`, 
      {}
    );
    
    // On remplace .toPromise() par firstValueFrom()
    return await firstValueFrom(request);
  } catch (error) {
    // Si le serveur Python est éteint ou erreur 500
    return { suspicious: false, processes: [] };
  }
}
}