/**
 * Design-system primitives — import from one place:
 *   import { ButtonComponent, CardComponent, BadgeComponent } from '@app/shared/components/ui';
 *
 * All are standalone, so just add them to a feature component's `imports: [...]`.
 */
export * from './button/button.component';
export * from './card/card.component';
export * from './input/input.component';
export * from './badge/badge.component';
export * from './empty-state/empty-state.component';
export * from './skeleton/skeleton.component';
