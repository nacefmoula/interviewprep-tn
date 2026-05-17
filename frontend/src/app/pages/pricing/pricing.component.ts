import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PricingCardComponent } from '../../shared/components/pricing-card/pricing-card.component';
import { MOCK_PRICING } from '../../core/data/mock-data';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterLink, PricingCardComponent],
  template: `
    <div class="pricing-page animate-fade">

      <!-- Hero -->
      <div class="pricing-hero">
        <div class="section-tag-inline">Pricing</div>
        <h1>Simple, honest pricing.</h1>
        <p>Start free. Upgrade when you're ready. Cancel anytime. No tricks, no surprise fees.</p>
        <div class="billing-toggle">
          <span [class.active]="!annual">Monthly</span>
          <div class="toggle-switch" (click)="annual = !annual" [class.on]="annual">
            <div class="toggle-knob"></div>
          </div>
          <span [class.active]="annual">Annual <span class="save-badge">Save 25%</span></span>
        </div>
      </div>

      <!-- Pricing cards -->
      <div class="pricing-cards-grid">
        <app-pricing-card *ngFor="let plan of plans" [plan]="adjustedPlan(plan)"></app-pricing-card>
      </div>

      <!-- Comparison Table -->
      <div class="comparison-section">
        <h2 class="comp-title">Everything compared</h2>
        <div class="comp-table">
          <div class="comp-header">
            <div class="comp-feature-col">Feature</div>
            <div class="comp-plan-col" *ngFor="let p of plans">{{ p.name }}</div>
          </div>

          <div class="comp-section-divider">Core Features</div>

          <div class="comp-row" *ngFor="let row of comparisonRows">
            <div class="comp-feature-col">
              <div class="comp-feat-name">{{ row.feature }}</div>
              <div class="comp-feat-desc" *ngIf="row.desc">{{ row.desc }}</div>
            </div>
            <div class="comp-plan-col" *ngFor="let val of row.values">
              <span *ngIf="$any(val) === true" class="comp-check"><i class="bi bi-check-lg"></i></span>
              <span *ngIf="$any(val) === false" class="comp-cross"><i class="bi bi-dash"></i></span>
              <span *ngIf="isString(val)" class="comp-text">{{ val }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- FAQ -->
      <div class="faq-section">
        <h2 class="comp-title">Frequently asked questions</h2>
        <div class="faq-grid">
          <div class="faq-card" *ngFor="let faq of faqs">
            <h3 class="faq-q">{{ faq.q }}</h3>
            <p class="faq-a">{{ faq.a }}</p>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="pricing-cta">
        <h2>Ready to start?</h2>
        <p>Join 50,000+ candidates already preparing smarter with InterviewPrepTN.</p>
        <div class="cta-btns">
          <a routerLink="/dashboard" class="btn btn-primary btn-lg">Create Free Account <i class="bi bi-arrow-right"></i></a>
          <a routerLink="/dashboard" class="btn btn-secondary btn-lg">Try the Platform</a>
        </div>
        <p class="cta-note">No credit card required · Free forever to get started</p>
      </div>
    </div>
  `,
  styles: [`
    .pricing-page { display: flex; flex-direction: column; gap: var(--space-16); }

    /* Hero */
    .pricing-hero {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-8) 0 0;
    }

    .section-tag-inline {
      display: inline-flex;
      font-size: var(--text-xs);
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--teal-600);
      background: var(--teal-50);
      border: 1px solid var(--teal-100);
      padding: 0.35rem 1rem;
      border-radius: var(--radius-full);
    }

    .pricing-hero h1 {
      font-family: var(--font-display);
      font-size: clamp(2rem, 4vw, 3rem);
      font-weight: var(--weight-semibold);
      color: var(--color-text);
      letter-spacing: -0.02em;
    }

    .pricing-hero p {
      font-size: var(--text-lg);
      color: var(--color-text-muted);
      max-width: 520px;
      line-height: var(--leading-relaxed);
    }

    /* Toggle */
    .billing-toggle {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--color-text-muted);
      margin-top: var(--space-2);
    }

    .billing-toggle span.active { color: var(--color-text); }

    .toggle-switch {
      width: 44px;
      height: 24px;
      background: var(--neutral-200);
      border-radius: var(--radius-full);
      cursor: pointer;
      position: relative;
      transition: background var(--transition-base);
    }

    .toggle-switch.on { background: var(--teal-500); }

    .toggle-knob {
      position: absolute;
      width: 18px; height: 18px;
      background: white;
      border-radius: var(--radius-full);
      top: 3px; left: 3px;
      transition: transform var(--transition-base);
      box-shadow: var(--shadow-sm);
    }

    .toggle-switch.on .toggle-knob { transform: translateX(20px); }

    .save-badge {
      background: var(--teal-500);
      color: white;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: var(--radius-full);
      margin-left: 4px;
    }

    /* Cards grid */
    .pricing-cards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-6);
      align-items: start;
    }

    /* Comparison */
    .comparison-section { }
    .comp-title {
      font-family: var(--font-display);
      font-size: var(--text-2xl);
      font-weight: var(--weight-semibold);
      text-align: center;
      margin-bottom: var(--space-8);
    }

    .comp-table {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      overflow: hidden;
    }

    .comp-header {
      display: grid;
      grid-template-columns: 2fr repeat(3, 1fr);
      padding: var(--space-4) var(--space-6);
      background: var(--neutral-50);
      border-bottom: 1px solid var(--color-border);
    }

    .comp-section-divider {
      background: var(--neutral-50);
      padding: var(--space-3) var(--space-6);
      font-size: var(--text-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
      border-bottom: 1px solid var(--color-border);
      border-top: 1px solid var(--color-border);
    }

    .comp-row {
      display: grid;
      grid-template-columns: 2fr repeat(3, 1fr);
      padding: var(--space-4) var(--space-6);
      border-bottom: 1px solid var(--color-border-light);
      align-items: center;
      transition: background var(--transition-fast);
    }

    .comp-row:hover { background: var(--neutral-50); }
    .comp-row:last-child { border-bottom: none; }

    .comp-feature-col { padding-right: var(--space-4); }
    .comp-plan-col {
      text-align: center;
      font-size: var(--text-sm);
      font-weight: 700;
    }

    .comp-feat-name { font-size: var(--text-sm); font-weight: var(--weight-medium); }
    .comp-feat-desc { font-size: var(--text-xs); color: var(--color-text-muted); margin-top: 2px; }

    .comp-check { color: var(--teal-500); font-size: 1.1rem; }
    .comp-cross { color: var(--neutral-300); font-size: 1.1rem; }
    .comp-text { font-size: var(--text-sm); color: var(--color-text); }

    /* FAQ */
    .faq-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-5);
    }

    .faq-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      padding: var(--space-6);
    }

    .faq-q {
      font-size: var(--text-base);
      font-weight: var(--weight-semibold);
      margin-bottom: var(--space-3);
      color: var(--color-text);
    }

    .faq-a {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      line-height: var(--leading-relaxed);
    }

    /* CTA */
    .pricing-cta {
      text-align: center;
      background: linear-gradient(135deg, var(--teal-50), var(--cyan-50));
      border: 1px solid var(--teal-100);
      border-radius: var(--radius-2xl);
      padding: var(--space-16) var(--space-8);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
    }

    .pricing-cta h2 {
      font-family: var(--font-display);
      font-size: var(--text-3xl);
      font-weight: var(--weight-semibold);
    }

    .pricing-cta p { font-size: var(--text-lg); color: var(--color-text-muted); }

    .cta-btns { display: flex; gap: var(--space-4); margin-top: var(--space-2); }

    .cta-note { font-size: var(--text-sm); color: var(--color-text-light); margin-top: var(--space-2); }

    @media (max-width: 1024px) {
      .pricing-cards-grid { grid-template-columns: 1fr; max-width: 440px; margin: 0 auto; }
      .faq-grid { grid-template-columns: repeat(2, 1fr); }
      .comp-header, .comp-row { grid-template-columns: 1.5fr repeat(3, 1fr); }
    }

    @media (max-width: 640px) {
      .faq-grid { grid-template-columns: 1fr; }
      .cta-btns { flex-direction: column; }
    }
  `]
})
export class PricingComponent {
  plans = MOCK_PRICING;
  annual = false;

  adjustedPlan(plan: any) {
    if (!this.annual || plan.price === 0) return plan;
    return { ...plan, price: Math.round(plan.price * 0.75) };
  }

  comparisonRows: {feature: string, desc?: string, values: any[]}[] = [
    { feature: 'Mock Sessions',     desc: 'AI-evaluated practice interviews',  values: ['5 / month', 'Unlimited', 'Unlimited'] },
    { feature: 'Quiz Assessments',  desc: '',                                   values: ['3 / month', 'Unlimited', 'Unlimited'] },
    { feature: 'Performance Report',desc: 'Detailed AI scoring breakdown',      values: [true, true, true] },
    { feature: 'Training Modules',  desc: 'Gamified learning paths',            values: [false, true, true] },
    { feature: 'Library Access',    desc: '500+ resources',                     values: ['Limited', 'Full', 'Full'] },
    { feature: 'Community Access',  desc: '',                                   values: [true, true, true] },
    { feature: 'Mentor Sessions',   desc: 'Paid 1:1 sessions with experts',     values: [false, true, true] },
    { feature: 'Priority Support',  desc: '',                                   values: [false, true, true] },
    { feature: 'Campus Features',   desc: 'Cohorts, workshops, admin dashboard',values: [false, false, true] },
    { feature: 'Bulk Licensing',    desc: 'For teams and universities',         values: [false, false, true] },
  ];

  isString(val: any): boolean { return typeof val === 'string'; }

  faqs = [
    { q: 'Can I try Premium before paying?', a: 'Yes! Our Free plan gives you access to 5 sessions and 3 quizzes with no credit card required. You can experience the platform before upgrading.' },
    { q: 'What happens when I hit the free limit?', a: 'You\'ll be prompted to upgrade. Your data and progress are saved. You won\'t lose anything.' },
    { q: 'Is there a student discount?', a: 'Our University plan is designed for institutions and groups. Individual student pricing is included in our Premium plan — we\'ve kept it intentionally affordable.' },
    { q: 'Can I cancel anytime?', a: 'Absolutely. You can cancel your subscription at any time from Settings. You\'ll retain access until the end of your billing period.' },
    { q: 'Are mentor sessions included?', a: 'The Premium plan gives you access to book mentor sessions, which are priced per session by the mentor (typically $60–$120/hr).' },
    { q: 'What\'s the University plan?', a: 'A bulk licensing plan for universities, bootcamps, and career centers. Includes all Premium features plus cohort management, group workshops, and an admin dashboard.' },
  ];
}
