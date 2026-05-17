import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Badge } from '../../../core/models/models';

@Component({
  selector: 'app-badge-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="badge-card" [class.earned]="badge.earned" [class.locked]="!badge.earned">
      <div class="badge-icon" [innerHTML]="badge.icon"></div>
      <div class="badge-name">{{ badge.name }}</div>
      <div class="badge-desc">{{ badge.description }}</div>
      <div class="badge-xp">+{{ badge.xpReward }} XP</div>
      <div class="badge-earned-date" *ngIf="badge.earned && badge.earnedDate">
        Earned {{ badge.earnedDate }}
      </div>
      <div class="badge-locked-label" *ngIf="!badge.earned"><i class="bi bi-lock-fill"></i> Locked</div>
    </div>
  `,
  styles: [`
    .badge-card {
      background: var(--color-surface);
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-4);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: var(--space-2);
      transition: all var(--transition-base);
    }

    .badge-card.earned {
      border-color: var(--teal-200);
      background: linear-gradient(135deg, var(--teal-50) 0%, var(--neutral-0) 100%);
    }

    .badge-card.earned:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
      border-color: var(--teal-300);
    }

    .badge-card.locked {
      opacity: 0.55;
      filter: grayscale(0.4);
    }

    .badge-icon {
      font-size: 2.25rem;
      line-height: 1;
    }

    .badge-name {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--color-text);
    }

    .badge-desc {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      line-height: var(--leading-snug);
    }

    .badge-xp {
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      color: var(--teal-600);
      background: var(--teal-50);
      padding: 2px 8px;
      border-radius: var(--radius-full);
    }

    .badge-earned-date {
      font-size: 0.65rem;
      color: var(--color-text-light);
    }

    .badge-locked-label {
      font-size: var(--text-xs);
      color: var(--color-text-light);
    }
  `]
})
export class BadgeCardComponent {
  @Input() badge!: Badge;
}
