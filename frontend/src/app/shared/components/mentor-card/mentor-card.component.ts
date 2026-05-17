import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Mentor } from '../../../core/models/models';

@Component({
  selector: 'app-mentor-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mentor-card">
      <div class="mentor-header">
        <div class="mentor-avatar-wrap">
          <div class="avatar-placeholder avatar-xl"
            style="font-size:1.1rem; width:56px; height:56px;">{{ mentor.initials }}</div>
          <span class="availability-dot" [class.online]="mentor.available"></span>
        </div>
        <div class="mentor-meta">
          <div class="mentor-name">{{ mentor.name }}</div>
          <div class="mentor-title">{{ mentor.title }}</div>
          <div class="mentor-company">{{ mentor.company }}</div>
        </div>
      </div>

      <div class="mentor-tags">
        <span *ngFor="let exp of mentor.expertise.slice(0,3)" class="chip chip-teal">{{ exp }}</span>
      </div>

      <div class="mentor-stats">
        <!-- Rating row — shows real data if available, fallback to mock -->
        <div class="mentor-stat">
          <div class="stars">
            <span *ngFor="let s of [1,2,3,4,5]" class="star"
              [class.filled]="s <= displayRating()">★</span>
          </div>
          <span class="mentor-stat-val">
            {{ displayRating() }} ({{ displayReviews() }} reviews)
          </span>
        </div>
        <!-- Session count — shows real completed sessions if available -->
        <div class="mentor-stat">
          <span>🎓</span>
          <span class="mentor-stat-val">{{ displaySessions() }} sessions completed</span>
        </div>
      </div>

      <p class="mentor-bio">{{ mentor.bio }}</p>

      <!-- Rating widget -->
      <div class="rating-widget">
        <div class="rating-label">Rate this mentor:</div>
        <div class="star-picker">
          <span *ngFor="let s of [1,2,3,4,5]"
            class="star-pick"
            [class.selected]="s <= hoveredStar() || s <= selectedStar()"
            [class.hovered]="s <= hoveredStar()"
            (mouseenter)="hoveredStar.set(s)"
            (mouseleave)="hoveredStar.set(0)"
            (click)="selectedStar.set(s)">★</span>
        </div>
        <textarea class="input rating-comment"
          placeholder="Leave a comment (optional)..."
          rows="2"
          [value]="ratingComment()"
          (input)="ratingComment.set($any($event.target).value)">
        </textarea>
        <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
          <button class="btn btn-ghost btn-sm"
            *ngIf="hasExistingRating()"
            [disabled]="submittingRating()"
            (click)="unrate()">
            Remove
          </button>
          <button class="btn btn-primary btn-sm"
            [disabled]="selectedStar() === 0 || submittingRating()"
            (click)="submitRating()">
            {{ submittingRating() ? 'Saving...' : (hasExistingRating() ? 'Update Rating' : 'Submit Rating') }}
          </button>
        </div>
      </div>

      <div class="mentor-footer">
        <div class="mentor-price">
          <span class="price-amount">\${{ mentor.price }}</span>
          <span class="price-period">/session</span>
        </div>
        <button class="btn btn-primary btn-sm"
          [disabled]="!mentor.available || requested || requesting"
          (click)="onRequest()">
          {{
            !mentor.available ? 'Unavailable' :
            requested ? '✓ Requested' :
            requesting ? 'Sending...' :
            'Request Mentor'
          }}
        </button>
      </div>

      <div class="mentor-next" *ngIf="mentor.available">
        <span>🗓️</span>
        <span>Next: {{ mentor.nextAvailable }}</span>
      </div>
    </div>
  `,
  styles: [`
    .mentor-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-4); transition: box-shadow var(--transition-base), transform var(--transition-base); }
    .mentor-card:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px); }
    .mentor-header { display: flex; gap: var(--space-3); align-items: flex-start; }
    .mentor-avatar-wrap { position: relative; flex-shrink: 0; }
    .availability-dot { position: absolute; bottom: 2px; right: 2px; width: 12px; height: 12px; border-radius: var(--radius-full); background: var(--neutral-300); border: 2px solid white; }
    .availability-dot.online { background: var(--success-500); }
    .mentor-name { font-size: var(--text-base); font-weight: var(--weight-semibold); color: var(--color-text); }
    .mentor-title { font-size: var(--text-sm); color: var(--color-text-muted); }
    .mentor-company { font-size: var(--text-xs); color: var(--teal-600); font-weight: var(--weight-medium); }
    .mentor-tags { display: flex; flex-wrap: wrap; gap: var(--space-1); }
    .mentor-stats { display: flex; flex-direction: column; gap: var(--space-2); }
    .mentor-stat { display: flex; align-items: center; gap: var(--space-2); }
    .mentor-stat-val { font-size: var(--text-sm); color: var(--color-text-muted); }

    .star { color: var(--neutral-300); font-size: 1rem; }
    .star.filled { color: #f59e0b; }

    .mentor-bio { font-size: var(--text-sm); color: var(--color-text-muted); line-height: var(--leading-relaxed); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .mentor-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
    .price-amount { font-size: var(--text-xl); font-weight: var(--weight-semibold); font-family: var(--font-display); color: var(--color-text); }
    .price-period { font-size: var(--text-sm); color: var(--color-text-muted); }
    .mentor-next { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-xs); color: var(--teal-700); background: var(--teal-50); padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); }

    .rating-widget { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-3); background: var(--teal-50); border-radius: var(--radius-md); border: 1px solid var(--teal-200); }
    .rating-label { font-size: var(--text-sm); font-weight: 600; color: var(--color-text); }
    .star-picker { display: flex; gap: 4px; }
    .star-pick { font-size: 1.5rem; cursor: pointer; color: var(--neutral-300); transition: color 0.1s; }
    .star-pick.selected, .star-pick.hovered { color: #f59e0b; }
    .rating-comment { resize: none; font-size: var(--text-sm); }
    .rating-done { font-size: var(--text-sm); color: var(--teal-700); font-weight: 600; text-align: center; padding: var(--space-2); }
  `]
})
export class MentorCardComponent implements OnChanges {
  @Input() mentor!: Mentor;
  @Input() requested = false;
  @Input() requesting = false;
  @Output() requestClicked = new EventEmitter<string>();
  @Output() rateSubmitted = new EventEmitter<{ mentorId: string; stars: number; comment: string }>();
  @Output() unrateClicked = new EventEmitter<string>();

  hoveredStar = signal(0);
  selectedStar = signal(0);
  ratingComment = signal('');
  submittingRating = signal(false);
  hasExistingRating = signal(false);

  displayRating(): number {
    return this.mentor.averageRating ?? this.mentor.rating ?? 0;
  }

  displayReviews(): number {
    return this.mentor.totalRatings ?? this.mentor.reviews ?? 0;
  }

  displaySessions(): number {
    return this.mentor.completedSessions ?? this.mentor.sessions ?? 0;
  }

  onRequest() {
    if (!this.requested && !this.requesting && this.mentor.available) {
      this.requestClicked.emit(this.mentor.id);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mentor']) {
      const stars = this.mentor?.myRatingStars ?? 0;
      const comment = this.mentor?.myRatingComment ?? '';
      this.selectedStar.set(typeof stars === 'number' ? stars : 0);
      this.ratingComment.set(comment || '');
      this.hasExistingRating.set(!!this.mentor?.myRatingStars);
    }
  }

  submitRating() {
    if (this.selectedStar() === 0) return;
    this.submittingRating.set(true);
    this.rateSubmitted.emit({
      mentorId: this.mentor.id,
      stars: this.selectedStar(),
      comment: this.ratingComment()
    });
    setTimeout(() => this.submittingRating.set(false), 800);
  }

  unrate() {
    this.unrateClicked.emit(this.mentor.id);
  }
}