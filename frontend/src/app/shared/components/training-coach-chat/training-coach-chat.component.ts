import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { TrainingCoachApiService, TrainingCoachMessage } from '../../../core/services/training-coach-api.service';

@Component({
  selector: 'app-training-coach-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card coach-card">
      <div class="coach-header">
        <div>
          <div class="coach-title">AI Training Coach</div>
          <div class="coach-subtitle">CV/profile coaching + practice drills</div>
        </div>
        <div class="coach-actions">
          <button
            class="chip"
            [class.chip-neutral]="!readAloudEnabled"
            [class.chip-teal]="readAloudEnabled"
            type="button"
            (click)="toggleReadAloud()"
            [attr.aria-pressed]="readAloudEnabled"
            [disabled]="isSending"
          >
            Read aloud: {{ readAloudEnabled ? 'On' : 'Off' }}
          </button>
          <button class="chip chip-neutral" type="button" (click)="clear()" [disabled]="isSending">Clear</button>
        </div>
      </div>

      <div #messagesEl class="coach-messages" role="log" aria-live="polite">
        <div class="coach-empty" *ngIf="messages.length === 0">
          Ask me to review your bio, skills, or to suggest practice tasks.
        </div>

        <div *ngFor="let m of messages; trackBy: trackByIndex" class="coach-row" [class.is-user]="m.role === 'user'" [class.is-assistant]="m.role === 'assistant'">
          <div class="coach-avatar">
            <div class="avatar-placeholder avatar-sm">{{ m.role === 'user' ? 'You' : 'AI' }}</div>
          </div>
          <div class="coach-body">
            <div class="coach-meta">{{ m.role === 'user' ? 'You' : 'Coach' }}</div>
            <div class="coach-bubble">{{ m.content }}</div>
          </div>
        </div>

        <div class="coach-row is-assistant is-pending" *ngIf="isSending">
          <div class="coach-avatar">
            <div class="avatar-placeholder avatar-sm">AI</div>
          </div>
          <div class="coach-body">
            <div class="coach-meta">Coach</div>
            <div class="coach-bubble pending">Thinking…</div>
          </div>
        </div>

        <div class="coach-error" *ngIf="errorMessage" role="status">
          <span class="chip chip-error">Error</span>
          <span class="coach-error-text">{{ errorMessage }}</span>
        </div>
      </div>

      <form class="coach-input" (ngSubmit)="send()">
        <input
          class="input"
          name="message"
          [(ngModel)]="draft"
          [disabled]="isSending || isListening"
          placeholder="e.g. Improve my bio for a Backend role"
          autocomplete="off"
        />
        <button
          class="btn btn-secondary"
          type="button"
          (click)="toggleListening()"
          [disabled]="isSending"
          [attr.aria-pressed]="isListening"
        >
          {{ isListening ? 'Stop' : 'Mic' }}
        </button>
        <button class="btn btn-primary" type="submit" [disabled]="isSending || !draft.trim()">
          {{ isSending ? 'Sending…' : 'Send' }}
        </button>
      </form>

      <div class="coach-voice" *ngIf="isListening || listeningHint">
        <span class="chip chip-sand" *ngIf="isListening">Listening…</span>
        <span class="coach-voice-text">{{ listeningHint }}</span>
      </div>
    </div>
  `,
  styles: [`
    .coach-card { display: flex; flex-direction: column; gap: var(--space-3); }

    .coach-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .coach-actions {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
    }

    .coach-title { font-weight: var(--weight-semibold); color: var(--color-text); }
    .coach-subtitle { font-size: var(--text-sm); color: var(--color-text-muted); }

    .coach-messages {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      max-height: 320px;
      overflow: auto;
      padding: var(--space-2);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md);
      background: var(--color-surface);
    }

    .coach-empty { font-size: var(--text-sm); color: var(--color-text-muted); }

    .coach-row {
      display: flex;
      gap: var(--space-2);
      align-items: flex-end;
    }

    .coach-row.is-user {
      flex-direction: row-reverse;
    }

    .coach-avatar { flex: 0 0 auto; }

    .coach-body {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      max-width: min(680px, 85%);
    }

    .coach-row.is-user .coach-body { align-items: flex-end; }

    .coach-meta {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      padding: 0 var(--space-1);
    }

    .coach-bubble {
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border-light);
      background: var(--neutral-0);
      color: var(--color-text);
      white-space: pre-wrap;
      word-break: break-word;
      line-height: var(--leading-snug);
      font-size: var(--text-sm);
      box-shadow: var(--shadow-xs);
    }

    .coach-row.is-user .coach-bubble {
      background: var(--teal-50);
      border-color: var(--teal-100);
      color: var(--teal-800);
    }

    .coach-bubble.pending {
      background: var(--neutral-100);
      color: var(--color-text-muted);
      font-style: italic;
    }

    .coach-error {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      background: var(--error-50);
      border: 1px solid var(--color-border-light);
      color: var(--error-500);
      font-size: var(--text-sm);
    }

    .coach-error-text { color: var(--color-text); }

    .coach-input {
      display: flex;
      gap: var(--space-2);
      align-items: center;
    }

    .coach-input .input { flex: 1; }

    .coach-voice {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .coach-voice-text { color: var(--color-text-muted); }

    @media (max-width: 768px) {
      .coach-messages { max-height: 260px; }
      .coach-input { flex-direction: column; align-items: stretch; }
    }
  `]
})
export class TrainingCoachChatComponent implements AfterViewInit {
  private api = inject(TrainingCoachApiService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('messagesEl') private messagesEl?: ElementRef<HTMLDivElement>;

  private recognition?: any;

  draft = '';
  isSending = false;
  errorMessage = '';

  readAloudEnabled = false;

  isListening = false;
  listeningHint = '';

  messages: TrainingCoachMessage[] = [];

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  trackByIndex(index: number): number {
    return index;
  }

  private scrollToBottom(): void {
    const el = this.messagesEl?.nativeElement;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }

  private formatError(err: any): string {
    const status: number | undefined = err?.status;

    // Prefer provider-specific message if present.
    const providerRaw = err?.error?.error?.metadata?.raw;
    const providerMessage = err?.error?.error?.message;

    if (status === 429) {
      return (
        'AI is temporarily rate-limited (429). Try again in a minute, or set your API key in infra/.env and/or switch to another model.'
      );
    }

    if (status === 401) {
      return 'You are not authenticated (401). Please login again.';
    }

    if (typeof providerRaw === 'string' && providerRaw.trim()) {
      return providerRaw;
    }

    if (typeof providerMessage === 'string' && providerMessage.trim()) {
      return providerMessage;
    }

    const fallback = err?.error?.message;
    if (typeof fallback === 'string' && fallback.trim()) return fallback;

    return 'AI request failed.';
  }

  send(): void {
    this.sendText(this.draft.trim());
  }

  private sendText(text: string): void {
    if (!text || this.isSending) return;

    this.errorMessage = '';
    this.messages = [...this.messages, { role: 'user', content: text }];
    this.draft = '';
    this.isSending = true;
    this.cdr.markForCheck();
    this.scrollToBottom();

    const history = this.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-12);

    this.api.chat(text, history)
      .pipe(
        catchError((err) => {
          this.errorMessage = this.formatError(err);
          return of(null);
        }),
        finalize(() => {
          this.isSending = false;
          this.cdr.markForCheck();
          this.scrollToBottom();
        })
      )
      .subscribe((res) => {
        if (!res) return;
        this.messages = [...this.messages, { role: 'assistant', content: res.reply }];
        this.cdr.markForCheck();
        this.scrollToBottom();

        if (this.readAloudEnabled) {
          this.speak(res.reply);
        }
      });
  }

  toggleReadAloud(): void {
    this.readAloudEnabled = !this.readAloudEnabled;
    if (!this.readAloudEnabled) {
      this.cancelSpeech();
    }
    this.cdr.markForCheck();
  }

  toggleListening(): void {
    if (this.isListening) {
      this.stopListening();
      return;
    }
    this.startListening();
  }

  private startListening(): void {
    if (typeof window === 'undefined') return;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      this.errorMessage = 'Voice input is not supported in this browser. Try Chrome or Edge.';
      this.cdr.markForCheck();
      return;
    }

    if (!(window as any).isSecureContext) {
      this.errorMessage = 'Voice input requires a secure context (HTTPS or localhost).';
      this.cdr.markForCheck();
      return;
    }

    this.cancelSpeech();

    this.errorMessage = '';
    this.listeningHint = '';
    this.isListening = true;

    const recognition = new SR();
    recognition.lang = (navigator?.language || 'en-US');
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = String(event.results[i][0]?.transcript ?? '');
        if (event.results[i].isFinal) finalText += t;
        else interim += t;
      }

      this.listeningHint = (finalText || interim).trim();
      this.cdr.markForCheck();

      if (finalText && finalText.trim()) {
        this.stopListening();
        this.sendText(finalText.trim());
      }
    };

    recognition.onerror = (e: any) => {
      const code = String(e?.error ?? '').trim();
      const suffix = code ? ` (${code})` : '';

      if (code === 'not-allowed' || code === 'service-not-allowed') {
        this.errorMessage = `Microphone permission denied${suffix}. Please allow mic access and try again.`;
      } else if (code === 'audio-capture') {
        this.errorMessage = `No microphone detected${suffix}. Check your audio input device and OS permissions.`;
      } else if (code === 'no-speech') {
        this.errorMessage = `No speech detected${suffix}. Try again and speak closer to the mic.`;
      } else if (code === 'network') {
        this.errorMessage = `Speech recognition service unavailable${suffix}. This browser feature depends on an online speech service; on Linux it often fails in Chromium. Try Google Chrome, ensure you're on HTTPS/localhost, and retry.`;
      } else if (code === 'aborted') {
        this.errorMessage = `Voice input stopped${suffix}.`;
      } else {
        this.errorMessage = `Voice input failed${suffix}.`;
      }
      this.stopListening();
      this.cdr.markForCheck();
    };

    recognition.onend = () => {
      this.isListening = false;
      this.cdr.markForCheck();
    };

    this.recognition = recognition;
    try {
      recognition.start();
    } catch {
      this.isListening = false;
      this.errorMessage = 'Could not start voice input. Check microphone permissions and try again.';
    }
    this.cdr.markForCheck();
  }

  private stopListening(): void {
    const r = this.recognition;
    this.recognition = undefined;
    this.isListening = false;
    try {
      r?.stop?.();
    } catch {
      // ignore
    }
    this.cdr.markForCheck();
  }

  private speak(text: string): void {
    if (typeof window === 'undefined') return;
    const synth: SpeechSynthesis | undefined = (window as any).speechSynthesis;
    const Utterance: typeof SpeechSynthesisUtterance | undefined = (window as any).SpeechSynthesisUtterance;
    if (!synth || !Utterance) return;

    const clean = (text ?? '').trim();
    if (!clean) return;

    synth.cancel();
    const u = new Utterance(clean);
    u.lang = (navigator?.language || 'en-US');
    synth.speak(u);
  }

  private cancelSpeech(): void {
    const synth: SpeechSynthesis | undefined = (window as any).speechSynthesis;
    if (!synth) return;
    synth.cancel();
  }

  clear(): void {
    this.messages = [];
    this.errorMessage = '';
    this.draft = '';
    this.listeningHint = '';
    this.stopListening();
    this.cdr.markForCheck();
    this.scrollToBottom();
  }
}
