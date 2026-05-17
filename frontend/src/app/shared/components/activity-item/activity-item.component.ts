import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-activity-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="activity-item">
      <div class="activity-icon" [innerHTML]="icon"></div>
      <div class="activity-body">
        <div class="activity-text">{{ text }}</div>
        <div class="activity-time">{{ time }}</div>
      </div>
    </div>
  `,
  styles: [`
    .activity-item {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--color-border-light);
    }

    .activity-item:last-child { border-bottom: none; }

    .activity-icon {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: var(--neutral-50);
      border: 1px solid var(--color-border-light);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .activity-text {
      font-size: var(--text-sm);
      color: var(--color-text);
      line-height: var(--leading-snug);
    }

    .activity-time {
      font-size: var(--text-xs);
      color: var(--color-text-light);
      margin-top: 2px;
    }
  `]
})
export class ActivityItemComponent {
  @Input() icon = '📌';
  @Input() text = '';
  @Input() time = '';
}
