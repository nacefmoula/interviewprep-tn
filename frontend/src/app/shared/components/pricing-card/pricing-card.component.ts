import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PricingPlan } from '../../../core/models/models';

@Component({
  selector: 'app-pricing-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pricing-card" [class.recommended]="plan.recommended">
      <div class="recommended-badge" *ngIf="plan.recommended"><i class="bi bi-star-fill"></i> Most Popular</div>
      <div class="plan-name">{{ plan.name }}</div>
      <div class="plan-price">
        <span class="price-currency" *ngIf="plan.price > 0">$</span>
        <span class="price-amount">{{ plan.price === 0 ? 'Free' : plan.price }}</span>
        <span class="price-period" *ngIf="plan.price > 0">/ {{ plan.period }}</span>
      </div>
      <p class="plan-desc">{{ plan.description }}</p>
      <button class="btn btn-lg" [class]="plan.recommended ? 'btn-primary' : 'btn-secondary'" style="width:100%;">
        {{ plan.ctaLabel }}
      </button>
      <div class="plan-features">
        <div class="feature-item" *ngFor="let f of plan.features" [class.included]="f.included" [class.excluded]="!f.included">
          <span class="feature-check"><i class="bi" [class.bi-check-lg]="f.included" [class.bi-dash]="!f.included"></i></span>
          <span class="feature-text">{{ f.text }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pricing-card {
      background: var(--color-surface);
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius-xl);
      padding: var(--space-8);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      position: relative;
      transition: box-shadow var(--transition-base), transform var(--transition-base);
    }

    .pricing-card:hover {
      box-shadow: var(--shadow-xl);
      transform: translateY(-4px);
    }

    .pricing-card.recommended {
      border-color: var(--teal-400);
      background: linear-gradient(160deg, var(--teal-50) 0%, var(--neutral-0) 60%);
      box-shadow: 0 0 0 4px rgba(20,184,166,0.08), var(--shadow-lg);
    }

    .recommended-badge {
      position: absolute;
      top: -14px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, var(--teal-500), var(--cyan-400));
      color: white;
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      padding: 4px 16px;
      border-radius: var(--radius-full);
      white-space: nowrap;
      box-shadow: var(--shadow-teal);
    }

    .plan-name {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: var(--weight-semibold);
      color: var(--color-text);
    }

    .plan-price {
      display: flex;
      align-items: baseline;
      gap: var(--space-1);
    }

    .price-currency {
      font-size: var(--text-xl);
      color: var(--color-text-muted);
      font-weight: var(--weight-medium);
    }

    .price-amount {
      font-family: var(--font-display);
      font-size: var(--text-5xl);
      font-weight: var(--weight-bold);
      color: var(--color-text);
      line-height: 1;
    }

    .price-period {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .plan-desc {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      line-height: var(--leading-relaxed);
    }

    .plan-features {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      margin-top: var(--space-2);
    }

    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      font-size: var(--text-sm);
    }

    .feature-check {
      width: 18px;
      height: 18px;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      font-weight: 700;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .feature-item.included .feature-check {
      background: var(--teal-100);
      color: var(--teal-700);
    }

    .feature-item.excluded .feature-check {
      background: var(--neutral-100);
      color: var(--neutral-400);
    }

    .feature-text { flex: 1; line-height: var(--leading-snug); }
    .feature-item.excluded .feature-text { color: var(--color-text-light); }
    .feature-item.included .feature-text { color: var(--color-text); }
  `]
})
export class PricingCardComponent {
  @Input() plan!: PricingPlan;
}
