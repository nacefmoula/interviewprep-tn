import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md';
export type BadgeShape = 'rounded' | 'pill';

/**
 * <app-badge> — semantic status pill.
 *
 * Examples:
 *   <app-badge variant="success">Active</app-badge>
 *   <app-badge variant="warning" [dot]="true">Pending</app-badge>
 *   <app-badge variant="primary" shape="rounded">PRO</app-badge>
 */
@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="ui-badge"
      [attr.data-variant]="variant"
      [attr.data-size]="size"
      [attr.data-shape]="shape"
    >
      <span class="ui-badge__dot" *ngIf="dot" aria-hidden="true"></span>
      <ng-content></ng-content>
    </span>
  `,
  styles: [`
    .ui-badge {
      --bdg-bg: var(--neutral-100);
      --bdg-fg: var(--neutral-700);
      --bdg-dot: var(--neutral-500);

      display: inline-flex;
      align-items: center;
      gap: 0.4em;
      background: var(--bdg-bg);
      color: var(--bdg-fg);
      font-family: var(--font-body);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.005em;
      line-height: 1;
      white-space: nowrap;
    }

    /* Sizes */
    .ui-badge[data-size="sm"] { padding: 0.2rem 0.5rem; font-size: 0.6875rem; }
    .ui-badge[data-size="md"] { padding: 0.25rem 0.65rem; font-size: var(--text-xs); }

    /* Shapes */
    .ui-badge[data-shape="rounded"] { border-radius: var(--radius-sm); }
    .ui-badge[data-shape="pill"]    { border-radius: var(--radius-full); }

    /* Dot */
    .ui-badge__dot {
      width: 0.45em;
      height: 0.45em;
      border-radius: 50%;
      background: var(--bdg-dot);
    }

    /* Variants */
    .ui-badge[data-variant="primary"] {
      --bdg-bg: var(--color-primary-light);
      --bdg-fg: var(--teal-700);
      --bdg-dot: var(--color-primary);
    }
    .ui-badge[data-variant="success"] {
      --bdg-bg: var(--success-50);
      --bdg-fg: var(--success-600);
      --bdg-dot: var(--success-500);
    }
    .ui-badge[data-variant="warning"] {
      --bdg-bg: var(--warning-50);
      --bdg-fg: var(--warning-600);
      --bdg-dot: var(--warning-500);
    }
    .ui-badge[data-variant="danger"] {
      --bdg-bg: var(--error-50);
      --bdg-fg: var(--error-500);
      --bdg-dot: var(--error-500);
    }
    .ui-badge[data-variant="info"] {
      --bdg-bg: var(--sky-100);
      --bdg-fg: var(--sky-700, #0369a1);
      --bdg-dot: #0284c7;
    }

    /* Dark mode — slightly more saturated backgrounds work better on dark */
    [data-theme="dark"] .ui-badge[data-variant="success"] { --bdg-fg: #4ade80; }
    [data-theme="dark"] .ui-badge[data-variant="warning"] { --bdg-fg: #fbbf24; }
    [data-theme="dark"] .ui-badge[data-variant="danger"]  { --bdg-fg: #f87171; }
    [data-theme="dark"] .ui-badge[data-variant="primary"] { --bdg-fg: #5eead4; }
  `],
})
export class BadgeComponent {
  @Input() variant: BadgeVariant = 'neutral';
  @Input() size: BadgeSize = 'md';
  @Input() shape: BadgeShape = 'pill';
  @Input() dot = false;
}
