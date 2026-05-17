import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CardElevation = 'flat' | 'raised' | 'floating';
export type CardDensity = 'cozy' | 'compact' | 'spacious';

/**
 * <app-card> — design-system surface primitive.
 *
 * Examples:
 *   <app-card>...content...</app-card>
 *   <app-card elevation="floating" density="spacious">...</app-card>
 *   <app-card [interactive]="true">...</app-card>   <!-- adds hover lift -->
 *
 * For a card header row, use <app-card-header>; for footer, <app-card-footer>.
 * Both are simple slots that handle padding/separator.
 */
@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="ui-card"
      [class.is-interactive]="interactive"
      [class.is-bordered]="bordered"
      [attr.data-elevation]="elevation"
      [attr.data-density]="density"
    >
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .ui-card {
      background: var(--surface-1, var(--color-surface));
      border: 1px solid transparent;
      border-radius: var(--radius-lg);
      transition:
        background var(--duration-fast) var(--ease-out),
        border-color var(--duration-fast) var(--ease-out),
        box-shadow var(--duration-base) var(--ease-out),
        transform var(--duration-base) var(--ease-out);
      overflow: hidden;
    }

    /* Elevation variants */
    .ui-card[data-elevation="flat"]     { box-shadow: none; border-color: var(--color-border); }
    .ui-card[data-elevation="raised"]   { box-shadow: var(--shadow-sm); }
    .ui-card[data-elevation="floating"] { box-shadow: var(--shadow-lg); }

    /* When the design wants borders + shadow together */
    .ui-card.is-bordered { border-color: var(--color-border); }

    /* Density (padding) */
    .ui-card[data-density="compact"]  { padding: var(--space-3); }
    .ui-card[data-density="cozy"]     { padding: var(--space-5); }
    .ui-card[data-density="spacious"] { padding: var(--space-8); }

    /* Interactive — hover lift, used for clickable cards */
    .ui-card.is-interactive {
      cursor: pointer;
    }
    .ui-card.is-interactive:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
      border-color: var(--color-primary-mid);
    }
    .ui-card.is-interactive:active {
      transform: translateY(0);
      transition-duration: var(--duration-instant);
    }
  `],
})
export class CardComponent {
  @Input() elevation: CardElevation = 'raised';
  @Input() density: CardDensity = 'cozy';
  @Input() bordered = false;
  @Input() interactive = false;
}
