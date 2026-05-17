import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CommunityApiService,
  CommunityPost,
  UserProfileResponse,
} from '../../core/services/community-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="profile-page animate-fade">

      <!-- Loading -->
      <div *ngIf="isLoading" class="spinner-wrap">
        <div class="spinner-circle"></div>
      </div>

      <!-- Error -->
      <div *ngIf="!isLoading && loadError" class="error-wrap">
        <div class="error-icon">😕</div>
        <div class="error-title">User not found</div>
        <div class="error-sub">This profile may not exist or is unavailable.</div>
        <button class="btn btn-secondary btn-sm" type="button" (click)="goBack()">← Back to Community</button>
      </div>

      <!-- Content -->
      <div *ngIf="!isLoading && !loadError && profile" class="profile-layout">

        <!-- Left: Profile Card -->
        <div class="profile-left">

          <div class="card profile-card">
            <!-- Avatar -->
            <div class="avatar-wrap">
              <div class="avatar-circle">{{ getInitial(profile.displayName) }}</div>
            </div>

            <div class="profile-name">{{ profile.displayName }}</div>
            <div class="profile-sub">Community Member</div>

            <!-- Karma badge -->
            <div class="karma-pill">⚡ {{ profile.totalKarma }} karma</div>

            <!-- Stats row -->
            <div class="stats-row">
              <div class="stat-item">
                <div class="stat-value">{{ profile.postsCount }}</div>
                <div class="stat-label">Posts</div>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <div class="stat-value">{{ profile.followersCount }}</div>
                <div class="stat-label">Followers</div>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <div class="stat-value">{{ profile.followingCount }}</div>
                <div class="stat-label">Following</div>
              </div>
            </div>

            <!-- Follow / Unfollow button -->
            <div *ngIf="keycloakId !== currentUserKeycloakId" class="follow-btn-wrap">
              <button
                class="btn btn-sm follow-btn"
                [class.btn-primary]="!isFollowing"
                [class.btn-outline]="isFollowing"
                type="button"
                [disabled]="followLoading"
                (click)="toggleFollow()"
              >
                <span *ngIf="followLoading" class="spinner-inline"></span>
                {{ isFollowing ? '✓ Following' : 'Follow' }}
              </button>
            </div>

            <div class="card-divider"></div>

            <!-- Activity stats -->
            <div class="activity-card">
              <div class="activity-row">
                <span class="activity-icon">💬</span>
                <span class="activity-label">Comments written</span>
                <span class="activity-value">{{ profile.commentsCount }}</span>
              </div>
              <div class="activity-row">
                <span class="activity-icon">👍</span>
                <span class="activity-label">Upvotes received</span>
                <span class="activity-value">{{ profile.upvotesReceived }}</span>
              </div>
            </div>
          </div>

        </div>

        <!-- Right: Recent Posts -->
        <div class="profile-right">
          <div class="recent-header">Recent Posts</div>

          <div *ngIf="!profile.recentPosts || !profile.recentPosts.length" class="no-posts">
            This user hasn't posted yet.
          </div>

          <div
            *ngFor="let post of profile.recentPosts"
            class="card mini-post-card"
            (click)="goToCommunity()"
          >
            <div class="mini-post-top">
              <span class="post-type-badge" [class]="typeChip(post.type)">{{ typeLabel(post.type) }}</span>
              <span class="mini-post-time">{{ formatRelativeTime(post.createdAt) }}</span>
            </div>
            <div class="mini-post-title">{{ post.title }}</div>
            <div class="mini-post-content">{{ truncateContent(post.content) }}</div>
            <div class="mini-post-meta">
              <span>▲ {{ post.upvotes }} score</span>
              <span>👁 {{ post.viewCount }} views</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .profile-page {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
    }

    .spinner-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-16, 80px) 0;
    }

    .spinner-circle {
      width: 40px;
      height: 40px;
      border: 3px solid var(--color-border-light);
      border-top-color: #1D9E75;
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
    }

    .spinner-inline {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
      margin-right: 4px;
      vertical-align: middle;
    }

    .error-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-12, 60px) 0;
      text-align: center;
    }

    .error-icon { font-size: 2.5rem; }
    .error-title { font-size: var(--text-xl); font-weight: 700; color: var(--color-text); }
    .error-sub { font-size: var(--text-sm); color: var(--color-text-muted); }

    .profile-layout {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: var(--space-6);
      align-items: start;
    }

    .profile-left { display: flex; flex-direction: column; gap: var(--space-4); }

    .profile-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      text-align: center;
    }

    .avatar-wrap { margin-bottom: var(--space-1); }

    .avatar-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: #1D9E75;
      color: white;
      font-size: 32px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .profile-name {
      font-size: 20px;
      font-weight: 700;
      color: var(--color-text);
    }

    .profile-sub {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin-top: -4px;
    }

    .karma-pill {
      display: inline-block;
      background: #E1F5EE;
      color: #085041;
      font-size: var(--text-xs);
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 999px;
    }

    .stats-row {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      width: 100%;
      justify-content: center;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .stat-value {
      font-size: var(--text-lg);
      font-weight: 700;
      color: var(--color-text);
    }

    .stat-label {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .stat-divider {
      width: 1px;
      height: 28px;
      background: var(--color-border-light);
    }

    .follow-btn-wrap { width: 100%; }

    .follow-btn {
      width: 100%;
      border: 0.5px solid #1D9E75;
    }

    .btn-outline {
      background: transparent;
      color: #1D9E75;
    }

    .card-divider {
      width: 100%;
      height: 1px;
      background: var(--color-border-light);
    }

    .activity-card {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .activity-row {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .activity-icon { font-size: 1rem; }

    .activity-label {
      flex: 1;
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      text-align: left;
    }

    .activity-value {
      font-size: var(--text-sm);
      font-weight: 700;
      color: var(--color-text);
    }

    .profile-right { display: flex; flex-direction: column; gap: var(--space-4); }

    .recent-header {
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
      color: var(--color-text);
    }

    .no-posts {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      padding: var(--space-4) 0;
    }

    .mini-post-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      cursor: pointer;
      transition: box-shadow 0.15s ease;
    }

    .mini-post-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.10); }

    .mini-post-top {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .mini-post-time {
      margin-left: auto;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .post-type-badge {
      font-size: var(--text-xs) !important;
      padding: 3px 8px !important;
    }

    .mini-post-title {
      font-size: var(--text-base);
      font-weight: 700;
      color: var(--color-text);
    }

    .mini-post-content {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .mini-post-meta {
      display: flex;
      gap: var(--space-4);
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .profile-layout { grid-template-columns: 1fr; }
    }
  `]
})
export class UserProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private communityApi = inject(CommunityApiService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  keycloakId = '';
  currentUserKeycloakId = '';

  profile: UserProfileResponse | null = null;
  isLoading = true;
  loadError = false;

  isFollowing = false;
  followLoading = false;

  ngOnInit(): void {
    this.currentUserKeycloakId = this.authService.getKeycloakId();
    this.keycloakId = this.route.snapshot.paramMap.get('keycloakId') ?? '';

    if (!this.keycloakId) {
      this.isLoading = false;
      this.loadError = true;
      this.cdr.markForCheck();
      return;
    }

    const profile$ = this.communityApi.getUserProfile(this.keycloakId);

    if (this.keycloakId !== this.currentUserKeycloakId) {
      forkJoin({
        profile: profile$,
        followStatus: this.communityApi.checkIsFollowing(this.keycloakId),
      }).subscribe({
        next: ({ profile, followStatus }) => {
          this.profile = profile;
          this.isFollowing = followStatus.following;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadError = true;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
    } else {
      profile$.subscribe({
        next: (profile) => {
          this.profile = profile;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadError = true;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
    }
  }

  toggleFollow(): void {
    this.followLoading = true;
    this.cdr.markForCheck();

    const request$ = this.isFollowing
      ? this.communityApi.unfollowUser(this.keycloakId)
      : this.communityApi.followUser(this.keycloakId);

    request$.subscribe({
      next: () => {
        this.isFollowing = !this.isFollowing;
        if (this.profile) {
          this.profile = {
            ...this.profile,
            followersCount: this.isFollowing
              ? this.profile.followersCount + 1
              : Math.max(0, this.profile.followersCount - 1),
          };
        }
        this.followLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.followLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/community']);
  }

  goToCommunity(): void {
    this.router.navigate(['/community']);
  }

  getInitial(name: string): string {
    return name ? name[0].toUpperCase() : '?';
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      DISCUSSION: 'Discussion',
      QUESTION: 'Question',
      SUCCESS_STORY: 'Success Story',
      TIP: 'Tip',
      PRACTICE_REQUEST: '🤝 Partner',
    };
    return labels[type] || type.replaceAll('_', ' ');
  }

  typeChip(type: string): string {
    const chips: Record<string, string> = {
      SUCCESS_STORY: 'chip chip-teal',
      DISCUSSION: 'chip chip-cyan',
      QUESTION: 'chip chip-sky',
      TIP: 'chip chip-sand',
      PRACTICE_REQUEST: 'chip chip-teal',
    };
    return chips[type] || 'chip chip-neutral';
  }

  truncateContent(content: string): string {
    return content.length > 160 ? content.slice(0, 160) + '…' : content;
  }

  formatRelativeTime(dateValue: string): string {
    if (!dateValue) return '';
    const diff = Date.now() - new Date(dateValue).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateValue).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}
