import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * <app-button> — design-system button primitive.
 *
 * Examples:
 *   <app-button>Save</app-button>
 *   <app-button variant="secondary" size="sm">Cancel</app-button>
 *   <app-button variant="danger" [loading]="submitting">Delete</app-button>
 *   <app-button variant="ghost" [iconOnly]="true" aria-label="Close">✕</app-button>
 */
@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      class="ui-btn"
      [class.is-loading]="loading"
      [class.is-icon-only]="iconOnly"
      [class.is-block]="block"
      [attr.data-variant]="variant"
      [attr.data-size]="size"
      [attr.aria-busy]="loading || null"
    >
      <span class="ui-btn__spinner" *ngIf="loading" aria-hidden="true"></span>
      <span class="ui-btn__content"><ng-content></ng-content></span>
    </button>
  `,
  styles: [`
    .ui-btn {
      --btn-bg: var(--color-primary);
      --btn-bg-hover: var(--color-primary-hover);
      --btn-fg: var(--color-text-inverse);
      --btn-border: transparent;
      --btn-shadow: var(--shadow-teal);

      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      font-family: var(--font-body);
      font-weight: var(--weight-semibold);
      letter-spacing: -0.005em;
      border: 1px solid var(--btn-border);
      background: var(--btn-bg);
      color: var(--btn-fg);
      cursor: pointer;
      transition:
        background var(--duration-fast) var(--ease-out),
        border-color var(--duration-fast) var(--ease-out),
        color var(--duration-fast) var(--ease-out),
        transform var(--duration-fast) var(--ease-out),
        box-shadow var(--duration-fast) var(--ease-out);
      box-shadow: var(--shadow-xs);
      user-select: none;
      white-space: nowrap;
      position: relative;
    }
    .ui-btn:hover:not(:disabled) {
      background: var(--btn-bg-hover);
      transform: translateY(-1px);
      box-shadow: var(--btn-shadow);
    }
    .ui-btn:active:not(:disabled) {
      transform: translateY(0);
      transition-duration: var(--duration-instant);
    }
    .ui-btn:focus-visible {
      outline: var(--ring-width) solid var(--ring-color);
      outline-offset: var(--ring-offset);
    }
    .ui-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    /* Sizes */
    .ui-btn[data-size="sm"] { padding: 0.4rem 0.75rem; font-size: var(--text-sm); border-radius: var(--radius-sm); min-height: 32px; }
    .ui-btn[data-size="md"] { padding: 0.55rem 1.05rem; font-size: var(--text-sm); border-radius: var(--radius-md); min-height: 40px; }
    .ui-btn[data-size="lg"] { padding: 0.75rem 1.5rem; font-size: var(--text-base); border-radius: var(--radius-md); min-height: 48px; }

    /* Variants */
    .ui-btn[data-variant="secondary"] {
      --btn-bg: var(--color-surface);
      --btn-bg-hover: var(--color-bg-alt);
      --btn-fg: var(--color-text);
      --btn-border: var(--color-border);
      --btn-shadow: var(--shadow-sm);
    }
    .ui-btn[data-variant="ghost"] {
      --btn-bg: transparent;
      --btn-bg-hover: var(--color-bg-alt);
      --btn-fg: var(--color-text);
      --btn-border: transparent;
      --btn-shadow: none;
      box-shadow: none;
    }
    .ui-btn[data-variant="ghost"]:hover:not(:disabled) {
      box-shadow: none;
    }
    .ui-btn[data-variant="danger"] {
      --btn-bg: var(--error-500);
      --btn-bg-hover: #dc2626;
      --btn-fg: #ffffff;
      --btn-shadow: 0 4px 14px rgba(239, 68, 68, 0.3);
    }
    .ui-btn[data-variant="success"] {
      --btn-bg: var(--success-500);
      --btn-bg-hover: var(--success-600);
      --btn-fg: #ffffff;
      --btn-shadow: 0 4px 14px rgba(34, 197, 94, 0.28);
    }

    /* Icon-only */
    .ui-btn.is-icon-only {
      padding: 0;
      aspect-ratio: 1;
      width: 40px;
    }
    .ui-btn.is-icon-only[data-size="sm"] { width: 32px; }
    .ui-btn.is-icon-only[data-size="lg"] { width: 48px; }

    /* Block (full-width) */
    .ui-btn.is-block { width: 100%; }

    /* Loading state — spinner overlays content */
    .ui-btn__content {
      display: inline-flex;
      align-items: center;
      gap: inherit;
      transition: opacity var(--duration-fast) var(--ease-out);
    }
    .ui-btn.is-loading .ui-btn__content { opacity: 0; }
    .ui-btn__spinner {
      position: absolute;
      width: 1em;
      height: 1em;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: ui-btn-spin 0.7s linear infinite;
    }
    @keyframes ui-btn-spin { to { transform: rotate(360deg); } }
  `],
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() iconOnly = false;
  @Input() block = false;
}
