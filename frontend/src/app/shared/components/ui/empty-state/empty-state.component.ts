import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * <app-empty-state> — friendly empty / first-run / error placeholder.
 *
 * Examples:
 *   <app-empty-state title="No interviews yet"
 *                    description="Schedule your first mock interview to get started.">
 *     <app-button>Start an interview</app-button>
 *   </app-empty-state>
 *
 *   <app-empty-state variant="error" title="Couldn't load data"
 *                    description="Check your connection and try again.">
 *   </app-empty-state>
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ui-empty" [attr.data-variant]="variant">
      <div class="ui-empty__icon" *ngIf="icon" [innerHTML]="icon" aria-hidden="true"></div>
      <div class="ui-empty__icon ui-empty__icon--default" *ngIf="!icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9h.01M15 9h.01M9 15h6" />
        </svg>
      </div>
      <h3 class="ui-empty__title">{{ title }}</h3>
      <p class="ui-empty__description" *ngIf="description">{{ description }}</p>
      <div class="ui-empty__actions"><ng-content></ng-content></div>
    </div>
  `,
  styles: [`
    .ui-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: var(--space-12) var(--space-6);
      gap: var(--space-3);
      color: var(--color-text);
      animation: ui-empty-in var(--duration-slow) var(--ease-out);
    }
    @keyframes ui-empty-in {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .ui-empty__icon {
      width: 64px;
      height: 64px;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-primary-light);
      color: var(--color-primary);
      margin-bottom: var(--space-2);
    }
    .ui-empty__icon svg { width: 28px; height: 28px; }

    .ui-empty__title {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: var(--weight-semibold);
      letter-spacing: -0.01em;
      margin: 0;
      color: var(--color-text);
    }
    .ui-empty__description {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      max-width: 38ch;
      line-height: var(--leading-relaxed);
      margin: 0;
    }
    .ui-empty__actions {
      display: flex;
      gap: var(--space-3);
      margin-top: var(--space-3);
    }
    .ui-empty__actions:empty { display: none; }

    /* Error variant */
    .ui-empty[data-variant="error"] .ui-empty__icon {
      background: var(--error-50);
      color: var(--error-500);
    }
    .ui-empty[data-variant="success"] .ui-empty__icon {
      background: var(--success-50);
      color: var(--success-500);
    }
  `],
})
export class EmptyStateComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() icon = '';
  @Input() variant: 'default' | 'error' | 'success' = 'default';
}
