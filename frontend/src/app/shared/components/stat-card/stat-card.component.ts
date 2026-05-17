import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stat-card" [class]="'stat-card--' + color">
      <div class="stat-icon" [innerHTML]="icon"></div>
      <div class="stat-body">
        <div class="stat-value">{{ value }}</div>
        <div class="stat-label">{{ label }}</div>
        <div class="stat-change" *ngIf="change" [class.positive]="changePositive" [class.negative]="!changePositive">
          <i class="bi" [class.bi-arrow-up]="changePositive" [class.bi-arrow-down]="!changePositive"></i> {{ change }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stat-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-5);
      display: flex;
      align-items: flex-start;
      gap: var(--space-4);
      transition: box-shadow var(--transition-base), transform var(--transition-base);
    }

    .stat-card:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-1px);
    }

    .stat-icon {
      font-size: 1.5rem;
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-card--teal .stat-icon  { background: var(--teal-50); }
    .stat-card--cyan .stat-icon  { background: var(--cyan-50); }
    .stat-card--mint .stat-icon  { background: var(--mint-50); }
    .stat-card--peach .stat-icon { background: var(--peach-50); }
    .stat-card--purple .stat-icon{ background: var(--purple-100); }
    .stat-card--sand .stat-icon  { background: var(--sand-50); }
    .stat-card--sky .stat-icon   { background: var(--sky-50); }

    .stat-body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .stat-value {
      font-family: var(--font-display);
      font-size: var(--text-2xl);
      font-weight: var(--weight-semibold);
      color: var(--color-text);
      line-height: 1.1;
    }

    .stat-label {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      white-space: nowrap;
    }

    .stat-change {
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      margin-top: var(--space-1);
    }
    .stat-change.positive { color: var(--success-600); }
    .stat-change.negative { color: var(--error-500); }
  `]
})
export class StatCardComponent {
  @Input() icon = '<i class="bi bi-bar-chart-fill"></i>';
  @Input() value = '0';
  @Input() label = 'Stat';
  @Input() color: 'teal' | 'cyan' | 'mint' | 'peach' | 'purple' | 'sand' | 'sky' = 'teal';
  @Input() change?: string;
  @Input() changePositive = true;
}
