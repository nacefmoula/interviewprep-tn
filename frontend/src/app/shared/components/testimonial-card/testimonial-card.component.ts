import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-testimonial-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="testimonial-card">
      <div class="quote-mark">"</div>
      <p class="testimonial-text">{{ text }}</p>
      <div class="testimonial-footer">
        <div class="avatar-placeholder avatar-md" style="font-size:0.8rem; flex-shrink:0;">{{ initials }}</div>
        <div class="testimonial-author">
          <div class="author-name">{{ name }}</div>
          <div class="author-role">{{ role }}</div>
        </div>
        <div class="stars" style="margin-left:auto;">
          <i class="bi bi-star-fill" *ngFor="let s of stars"></i>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .testimonial-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      padding: var(--space-6);
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
      position: relative;
      transition: box-shadow var(--transition-base);
    }

    .testimonial-card:hover { box-shadow: var(--shadow-lg); }

    .quote-mark {
      font-family: var(--font-display);
      font-size: 4rem;
      line-height: 1;
      color: var(--teal-200);
      position: absolute;
      top: 1rem;
      left: 1.5rem;
      pointer-events: none;
    }

    .testimonial-text {
      font-size: var(--text-base);
      color: var(--color-text);
      line-height: var(--leading-relaxed);
      font-style: italic;
      padding-top: var(--space-6);
    }

    .testimonial-footer {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .author-name {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--color-text);
    }

    .author-role {
      font-size: var(--text-xs);
      color: var(--teal-600);
      font-weight: var(--weight-medium);
    }

    .stars {
      color: var(--warning-500);
      font-size: var(--text-sm);
      letter-spacing: 1px;
    }
  `]
})
export class TestimonialCardComponent {
  @Input() name = '';
  @Input() initials = '';
  @Input() role = '';
  @Input() text = '';
  @Input() rating = 5;

  get stars() { return Array(this.rating).fill(0); }
}
