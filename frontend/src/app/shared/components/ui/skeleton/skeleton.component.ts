import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * <app-skeleton> — shimmering placeholder for loading content.
 *
 * Examples:
 *   <app-skeleton width="80%" height="20px"></app-skeleton>
 *   <app-skeleton variant="circle" width="48px" height="48px"></app-skeleton>
 *   <app-skeleton variant="card" height="140px"></app-skeleton>
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="ui-skel"
      [attr.data-variant]="variant"
      [style.width]="width"
      [style.height]="height"
      [style.border-radius]="radius"
      [attr.aria-hidden]="true"
    ></span>
  `,
  styles: [`
    .ui-skel {
      display: block;
      background: linear-gradient(
        90deg,
        var(--color-bg-alt) 0%,
        var(--color-border-light) 50%,
        var(--color-bg-alt) 100%
      );
      background-size: 200% 100%;
      animation: ui-skel-shimmer 1.4s var(--ease-in-out) infinite;
      border-radius: var(--radius-sm);
    }
    @keyframes ui-skel-shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .ui-skel[data-variant="circle"] { border-radius: 50%; }
    .ui-skel[data-variant="card"]   { border-radius: var(--radius-lg); }
    .ui-skel[data-variant="text"]   { border-radius: var(--radius-sm); height: 0.9em; }

    @media (prefers-reduced-motion: reduce) {
      .ui-skel { animation: none; opacity: 0.6; }
    }
  `],
})
export class SkeletonComponent {
  @Input() variant: 'rect' | 'circle' | 'card' | 'text' = 'rect';
  @Input() width = '100%';
  @Input() height = '1rem';
  @Input() radius = '';
}
