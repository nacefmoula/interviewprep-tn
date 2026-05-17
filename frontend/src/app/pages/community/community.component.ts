import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import {
  CommunityApiService,
  CommunityComment,
  CommunityFollow,
  CommunityPageResponse,
  CommunityPost,
  CreatePostBody,
  KarmaResponse,
  UserProfileResponse,
} from '../../core/services/community-api.service';
import { AuthService } from '../../core/auth/auth.service';

interface CommunitySuggestion {
  name: string;
  initials: string;
  title: string;
  keycloakId: string;
  following: boolean;
  loading: boolean;
}

@Component({
  selector: 'app-community',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="community-page animate-fade">
      <div class="page-header">
        <div>
          <h1>Community</h1>
          <p>Connect, share, and grow together with thousands of job seekers.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" type="button" (click)="findPracticePartner()">
            <span class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span> Find Practice Partner
          </button>
          <button class="btn btn-career" type="button" (click)="router.navigate(['/community/career'])">
            <span class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg></span> Career Match
          </button>
          <button class="btn btn-secondary" type="button" (click)="router.navigate(['/community/jobs'])">
            <span class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M8 12h8M8 16h5"/></svg></span> Job Board
          </button>
          <button class="btn btn-primary" (click)="toggleCreateForm()">
            {{ showCreateForm ? 'Close Form' : '+ Create Post' }}
          </button>
        </div>
      </div>

      <div class="card error-card" *ngIf="errorMessage">
        <i class="bi bi-exclamation-circle-fill"></i>
        <span>{{ errorMessage }}</span>
      </div>

      <div class="community-layout">

        <!-- Feed -->
        <div class="feed-column">

          <!-- Create post panel -->
          <div class="card create-post-card" *ngIf="showCreateForm">
            <div class="cp-input-row">
              <div class="avatar-placeholder avatar-md" style="font-size:0.8rem;">{{ currentUserInitials }}</div>
              <div class="cp-form-intro">
                <div class="post-author-name">Create a community post</div>
                <div class="post-author-role">Share a tip, question, discussion, or success story.</div>
              </div>
            </div>

            <div class="create-form-grid">
              <input
                class="input"
                type="text"
                name="title"
                [(ngModel)]="createPostForm.title"
                placeholder="Post title"
              />

              <select
                class="input"
                name="type"
                [(ngModel)]="createPostForm.type"
              >
                <option *ngFor="let option of typeOptions" [value]="option.value">{{ option.label }}</option>
              </select>

              <select
                class="input"
                name="industry"
                [(ngModel)]="createPostForm.industry"
              >
                <option value="">Select industry</option>
                <option *ngFor="let option of industryOptions" [value]="option.value">{{ option.label }}</option>
              </select>

              <input
                class="input"
                type="text"
                name="tags"
                [(ngModel)]="createPostForm.tags"
                placeholder="Tags separated by commas"
              />
            </div>

            <textarea
              class="input cp-textarea"
              name="content"
              [(ngModel)]="createPostForm.content"
              rows="5"
              placeholder="Share something with the community..."
            ></textarea>

            <div class="inline-error" *ngIf="createErrorMessage">{{ createErrorMessage }}</div>

            <div class="cp-actions">
              <div class="cp-type-btns">
                <button class="btn btn-ghost btn-sm" type="button" (click)="setCreateType('TIP')"><i class="bi bi-lightbulb-fill"></i> Tip</button>
                <button class="btn btn-ghost btn-sm" type="button" (click)="setCreateType('QUESTION')"><i class="bi bi-question-circle-fill"></i> Question</button>
                <button class="btn btn-ghost btn-sm" type="button" (click)="setCreateType('SUCCESS_STORY')">Success Story</button>
                <button class="btn btn-ghost btn-sm" type="button" (click)="setCreateType('DISCUSSION')">Discussion</button>
                <button class="btn btn-ghost btn-sm find-partner-btn" type="button" (click)="findPracticePartner()"><i class="bi bi-person-check-fill"></i> Find Practice Partner</button>
              </div>
              <button class="btn btn-primary btn-sm" type="button" (click)="submitPost()" [disabled]="isCreatingPost">
                <i *ngIf="isCreatingPost" class="bi bi-arrow-repeat spinner"></i>
                <span>{{ isCreatingPost ? 'Posting...' : 'Post' }}</span>
              </button>
            </div>
          </div>

          <!-- Search bar -->
          <div style="position:relative;">
            <input
              type="text"
              name="searchQuery"
              [(ngModel)]="searchQuery"
              (input)="onSearchInput()"
              placeholder="Search posts, tips, questions..."
              style="width:100%; padding:10px 16px 10px 40px;
                     border:0.5px solid var(--color-border-light);
                     border-radius:var(--radius-lg);
                     background:var(--color-surface);
                     color:var(--color-text);
                     font-size:var(--text-sm); outline:none;
                     font-family:var(--font-body);
                     box-sizing:border-box;"
            />
            <span style="position:absolute; left:14px; top:50%;
                         transform:translateY(-50%);
                         color:var(--color-text-muted); font-size:var(--text-sm);" class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></span>
            <span *ngIf="searchQuery"
                  (click)="clearSearch()"
                  style="position:absolute; right:14px; top:50%;
                         transform:translateY(-50%);
                         cursor:pointer; color:var(--color-text-muted);
                         font-size:var(--text-xs); user-select:none;">✕</span>
          </div>

          <!-- Tab bar for feed types -->
          <div class="tab-bar">
            <button
              class="tab-btn"
              [class.active]="activeTab === 'all'"
              (click)="loadTab('all')"
              type="button"
              title="All posts"
            >
              <span class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span> All Posts
            </button>
            <button
              class="tab-btn"
              [class.active]="activeTab === 'mine'"
              (click)="loadTab('mine')"
              type="button"
              title="Your posts"
            >
              <span class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> My Posts
            </button>
            <button
              class="tab-btn"
              [class.active]="activeTab === 'following'"
              (click)="loadTab('following')"
              type="button"
              title="Posts from people you follow"
            >
              <span class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span> Following
            </button>
            <button
              class="tab-btn"
              [class.active]="activeTab === 'bookmarks'"
              (click)="loadTab('bookmarks')"
              type="button"
              title="Your saved posts"
            >
              <span class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></span> Bookmarks
              <span *ngIf="bookmarkedPostIds.size > 0" class="badge">{{ bookmarkedPostIds.size }}</span>
            </button>
            <div class="tab-indicator"></div>
          </div>

          <!-- Feed filter -->
          <div class="card feed-filter-card" *ngIf="!isSearching">
            <div class="tabs">
              <button
                *ngFor="let filter of typeFilters"
                class="tab-item"
                [class.active]="selectedType === filter.value"
                (click)="setTypeFilter(filter.value)"
              >
                {{ filter.label }}
                <i *ngIf="filter.value === 'QUESTION'" class="bi bi-question-circle-fill"></i>
                <i *ngIf="filter.value === 'TIP'" class="bi bi-lightbulb-fill"></i>
                <i *ngIf="filter.value === 'PRACTICE_REQUEST'" class="bi bi-person-check-fill"></i>
              </button>
            </div>

            <div class="filter-row">
              <select
                class="input filter-select"
                name="industryFilter"
                [(ngModel)]="selectedIndustry"
                (ngModelChange)="onIndustryChange()"
              >
                <option value="">All industries</option>
                <option *ngFor="let option of industryOptions" [value]="option.value">{{ option.label }}</option>
              </select>

              <select
                class="input filter-select"
                name="sortFilter"
                [(ngModel)]="selectedSort"
                (ngModelChange)="onSortChange()"
              >
                <option value="createdAt,desc">Newest</option>
                <option value="upvotes,desc">Top</option>
              </select>
            </div>
          </div>

          <div class="card loading-card" *ngIf="isInitialLoading">
            <div class="loading-state">
              <i class="bi bi-arrow-repeat spinner"></i>
              <span>Loading community posts...</span>
            </div>
          </div>

          <!-- Empty states by tab -->
          <div class="card empty-card" *ngIf="!isInitialLoading && !posts.length && !errorMessage && activeTab === 'all' && selectedType !== 'PRACTICE_REQUEST'">
            <div class="loading-state">
              <i class="bi bi-chat-square-text"></i>
              <span>No posts found for the current filters.</span>
            </div>
          </div>

          <div class="card empty-card practice-empty-card" *ngIf="!isInitialLoading && !posts.length && !errorMessage && activeTab === 'all' && selectedType === 'PRACTICE_REQUEST'">
            <div class="practice-empty-state">
              <div class="practice-empty-icon"><span class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span></div>
              <div class="practice-empty-title">No practice partner requests yet</div>
              <div class="practice-empty-subtitle">Be the first to find a practice partner in this community</div>
              <button class="btn btn-primary btn-sm" type="button" (click)="findPracticePartner()">Post a Request</button>
            </div>
          </div>

          <div class="card empty-card" *ngIf="!isInitialLoading && !posts.length && !errorMessage && activeTab === 'mine'">
            <div class="loading-state">
              <i class="bi bi-pencil"></i>
              <span>You haven't posted anything yet. Start the conversation!</span>
            </div>
          </div>

          <div class="card empty-card" *ngIf="!isInitialLoading && !posts.length && !errorMessage && activeTab === 'following'">
            <div class="loading-state">
              <i class="bi bi-people"></i>
              <span>Follow some members to see their posts here.</span>
            </div>
          </div>

          <div class="card empty-card" *ngIf="!isInitialLoading && !posts.length && !errorMessage && activeTab === 'bookmarks'">
            <div class="loading-state">
              <i class="bi bi-bookmark"></i>
              <span>You have no bookmarked posts yet.</span>
            </div>
          </div>

          <!-- Search results label -->
          <div *ngIf="isSearching && !isInitialLoading"
               style="font-size:var(--text-xs); color:var(--color-text-muted); margin-bottom:0;">
            Showing results for "{{ searchQuery }}" — {{ totalPosts }} found
          </div>

          <!-- Posts -->
          <ng-container *ngFor="let post of posts; trackBy: trackByPostId">
          <div class="post-card card" [class.practice-request]="post.type === 'PRACTICE_REQUEST'">
            <div class="post-header">
              <div class="avatar-placeholder avatar-md" style="font-size:0.8rem;">{{ getInitials(post.authorKeycloakId) }}</div>
              <div class="post-author-info">
                <div class="post-author-name">
                  <span
                    (click)="navigateToProfile(post.authorKeycloakId)"
                    (mouseenter)="onAuthorMouseEnter($event, post.authorKeycloakId)"
                    (mouseleave)="onAuthorMouseLeave()"
                    style="cursor:pointer;"
                  >{{ getAuthorLabel(post.authorKeycloakId) }}</span>
                  <ng-container *ngIf="getAuthorKarma(post.authorKeycloakId) as karma">
                    <span class="karma-badge" [ngClass]="karmaBadgeClass(karma)">
                      @if (karma >= 50) {
                        <span class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg></span>
                      } @else if (karma >= 20) {
                        <span class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg></span>
                      } @else {
                        <span class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span>
                      }
                      {{ karma }}
                    </span>
                  </ng-container>
                </div>
                <div class="post-author-role">{{ post.authorKeycloakId }}</div>
              </div>
              <span class="post-type-badge" [class]="typeChip(post.type)">{{ typeLabel(post.type) }}</span>
              <span class="post-time">{{ formatDate(post.createdAt) }}</span>
            </div>

            <div class="post-title">{{ post.title }}</div>
            <div class="practice-partner-subtitle" *ngIf="post.type === 'PRACTICE_REQUEST'">
              This user is looking for a mock interview practice partner
            </div>
            <div class="post-content">{{ post.content }}</div>

            <div class="post-stats-row">
              <span class="chip chip-neutral" *ngIf="post.industry">{{ post.industry }}</span>
              <span class="chip chip-neutral">Score {{ post.score }}</span>
              <span class="chip chip-neutral">{{ post.viewCount }} views</span>
              <span class="chip chip-neutral">{{ post.upvotes }} upvotes</span>
              <span class="chip chip-neutral">{{ post.downvotes }} downvotes</span>
            </div>

            <div class="post-tags">
              <span *ngFor="let tag of splitTags(post.tags)" class="chip chip-neutral">#{{ tag }}</span>
            </div>

            <div class="post-footer">
              <button class="post-action-btn" type="button" (click)="upvotePost(post.id)">
                <span><i class="bi bi-hand-thumbs-up"></i></span>
                <span>{{ post.upvotes }}</span>
              </button>
              <button class="post-action-btn" type="button" (click)="downvotePost(post.id)">
                <span><i class="bi bi-hand-thumbs-down"></i></span>
                <span>{{ post.downvotes }}</span>
              </button>
              <button class="post-action-btn" type="button" (click)="toggleComments(post.id)">
                <span><i class="bi bi-chat-fill"></i></span>
                <span>{{ getCommentButtonLabel(post.id) }}</span>
              </button>
              <button
                *ngIf="post.type === 'PRACTICE_REQUEST'"
                class="post-action-btn connect-action-btn"
                type="button"
                (click)="toggleComments(post.id)"
              >
                <span class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
                <span>Connect</span>
              </button>
              <button
                class="post-action-btn bookmark-btn"
                [class.bookmarked]="bookmarkedPostIds.has(post.id)"
                [class.bookmark-pop]="bookmarkAnimating.has(post.id)"
                type="button"
                (click)="onToggleBookmark(post)"
                [title]="bookmarkedPostIds.has(post.id) ? 'Remove bookmark' : 'Add bookmark'"
              >
                @if (bookmarkedPostIds.has(post.id)) {
                  <span class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></span>
                } @else {
                  <span class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></span>
                }
              </button>
              <button class="post-action-btn" type="button" (click)="reportPost(post.id)">
                <span><i class="bi bi-flag-fill"></i></span>
                <span>Report</span>
              </button>
              <button
                *ngIf="post.authorKeycloakId === currentUserKeycloakId"
                class="post-action-btn"
                style="margin-left:auto;"
                type="button"
                (click)="startEdit(post)"
              >
                <span class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>
                <span>Edit</span>
              </button>
              <button
                *ngIf="isOwnPost(post)"
                class="post-action-btn"
                type="button"
                (click)="deletePost(post.id)"
              >
                <span><i class="bi bi-trash-fill"></i></span>
                <span>Delete</span>
              </button>
            </div>

            <!-- Inline comments -->
            <div class="post-comments" *ngIf="expandedComments[post.id]">
              <div class="loading-state loading-comments" *ngIf="loadingComments[post.id]">
                <i class="bi bi-arrow-repeat spinner"></i>
                <span>Loading comments...</span>
              </div>

              <div class="inline-error" *ngIf="commentErrors[post.id]">{{ commentErrors[post.id] }}</div>

              <div class="comment-item" *ngFor="let comment of getComments(post.id); trackBy: trackByCommentId">
                <div class="avatar-placeholder" style="width:28px;height:28px;font-size:0.65rem;flex-shrink:0;">{{ getInitials(comment.authorKeycloakId) }}</div>
                <div class="comment-content-wrap">
                  <div *ngIf="editingCommentId === comment.id; else commentViewMode">
                    <div class="comment-edit-form">
                      <textarea
                        class="comment-edit-input"
                        rows="2"
                        [(ngModel)]="editingCommentContent"
                        [name]="'edit-comment-' + comment.id"
                        [disabled]="commentEditSubmitting[comment.id]"
                      ></textarea>
                      <div *ngIf="commentEditErrors[comment.id]" class="comment-edit-error">{{ commentEditErrors[comment.id] }}</div>
                      <div class="comment-edit-actions">
                        <button class="btn-cancel-edit" type="button" (click)="cancelEditComment()">Cancel</button>
                        <button
                          class="btn-save-edit"
                          type="button"
                          (click)="submitEditComment(post.id, comment.id)"
                          [disabled]="commentEditSubmitting[comment.id]"
                        >{{ commentEditSubmitting[comment.id] ? 'Saving…' : 'Save' }}</button>
                      </div>
                    </div>
                  </div>
                  <ng-template #commentViewMode>
                    <div class="comment-body">
                      <span class="comment-author">{{ getAuthorLabel(comment.authorKeycloakId) }}</span>
                      <span class="comment-text">{{ comment.content }}</span>
                      <span *ngIf="comment.isEdited" class="edited-badge">(edited)</span>
                    </div>
                  </ng-template>
                  <div class="comment-meta">
                    <span>{{ formatDate(comment.createdAt) }}</span>
                    <button class="btn btn-ghost btn-sm" type="button" (click)="upvoteComment(post.id, comment.id)">
                      <i class="bi bi-hand-thumbs-up"></i> {{ comment.upvotes }}
                    </button>
                    <button
                      *ngIf="isOwnComment(comment) && editingCommentId !== comment.id"
                      class="btn btn-ghost btn-sm comment-edit-btn"
                      type="button"
                      title="Edit comment"
                      (click)="startEditComment(comment)"
                    >
                      <i class="bi bi-pencil-fill"></i> Edit
                    </button>
                    <button
                      *ngIf="isOwnComment(comment)"
                      class="btn btn-ghost btn-sm"
                      type="button"
                      (click)="deleteComment(post.id, comment.id)"
                    >
                      <i class="bi bi-trash-fill"></i> Delete
                    </button>
                  </div>
                </div>
              </div>

              <div class="comment-form">
                <textarea
                  class="input"
                  rows="3"
                  [name]="'comment-' + post.id"
                  [(ngModel)]="commentDrafts[post.id]"
                  placeholder="Write a comment..."
                ></textarea>
                <div class="comment-form-actions">
                  <button class="btn btn-primary btn-sm" type="button" (click)="submitComment(post.id)" [disabled]="commentSubmitting[post.id]">
                    <i *ngIf="commentSubmitting[post.id]" class="bi bi-arrow-repeat spinner"></i>
                    <span>{{ commentSubmitting[post.id] ? 'Posting...' : 'Add Comment' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Inline edit form -->
          <div *ngIf="editingPostId === post.id" class="card edit-form-card">
            <div class="edit-form-title">Edit Post</div>

            <input
              type="text"
              [name]="'editTitle-' + post.id"
              [(ngModel)]="editForm.title"
              placeholder="Title"
              class="input edit-form-field"
            />

            <textarea
              [name]="'editContent-' + post.id"
              [(ngModel)]="editForm.content"
              rows="4"
              placeholder="Content"
              class="input cp-textarea edit-form-field"
            ></textarea>

            <select
              [name]="'editType-' + post.id"
              [(ngModel)]="editForm.type"
              class="input edit-form-field"
            >
              <option value="DISCUSSION">Discussion</option>
              <option value="QUESTION">Question</option>
              <option value="SUCCESS_STORY">Success Story</option>
              <option value="TIP">Tip</option>
              <option value="PRACTICE_REQUEST">Practice Request</option>
            </select>

            <input
              type="text"
              [name]="'editTags-' + post.id"
              [(ngModel)]="editForm.tagsInput"
              placeholder="Tags (comma separated)"
              class="input edit-form-field"
            />

            <div class="inline-error" *ngIf="editError">{{ editError }}</div>

            <div class="edit-form-actions">
              <button class="btn btn-primary btn-sm" type="button" (click)="submitEdit()" [disabled]="submittingEdit">
                <i *ngIf="submittingEdit" class="bi bi-arrow-repeat spinner"></i>
                <span>{{ submittingEdit ? 'Saving...' : 'Save Changes' }}</span>
              </button>
              <button class="btn btn-secondary btn-sm" type="button" (click)="cancelEdit()">Cancel</button>
            </div>
          </div>
          </ng-container>

          <div class="load-more-wrap" *ngIf="!isInitialLoading && posts.length">
            <button class="btn btn-secondary load-more-btn" type="button" *ngIf="hasMore" (click)="loadMore()" [disabled]="isLoadingMore">
              <i *ngIf="isLoadingMore" class="bi bi-arrow-repeat spinner"></i>
              <span>{{ isLoadingMore ? 'Loading...' : 'Load More' }}</span>
            </button>
          </div>
        </div>

        <!-- Right Sidebar -->
        <div class="community-sidebar">

          <!-- Trending -->
          <div class="card trending-card">
            <div class="section-header">
              <div class="section-header-left">
                <span class="section-icon"><i class="bi bi-fire"></i></span>
                <div>
                  <h2 class="section-title">Trending Topics</h2>
                </div>
              </div>
            </div>
            <div class="trending-list">
              <div class="trending-item" *ngFor="let t of trendingTopics; let i = index">
                <span class="trending-rank">#{{ i + 1 }}</span>
                <div class="trending-body">
                  <div class="trending-tag">#{{ t.tag }}</div>
                  <div class="trending-count">{{ t.posts }} posts this week</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Who to Follow / Your Network -->
          <div class="card">
            <div class="section-header">
              <div class="section-header-left">
                <span class="section-icon"><i class="bi bi-people-fill"></i></span>
                <div>
                  <h2 class="section-title">Who to Follow</h2>
                </div>
              </div>
            </div>
            <div class="follow-list">
              <div class="follow-item" *ngFor="let person of whoToFollow">
                <div class="avatar-placeholder avatar-md" style="font-size:0.8rem;">{{ person.initials }}</div>
                <div class="follow-info">
                  <div class="follow-name">{{ person.name }}</div>
                  <div class="follow-title">{{ person.title }}</div>
                </div>
                <button class="btn btn-outline btn-sm" type="button" (click)="toggleFollow(person)" [disabled]="person.loading">
                  <i *ngIf="person.loading" class="bi bi-arrow-repeat spinner"></i>
                  <span>{{ person.following ? 'Unfollow' : 'Follow' }}</span>
                </button>
              </div>
            </div>
            <div class="your-network-divider"></div>
            <div class="your-network-stats">
              <div class="yn-row">
                <span class="yn-label"><span class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span> Your Karma</span>
                <span class="yn-value">{{ myKarma?.totalKarma ?? 0 }}</span>
              </div>
              <div class="yn-row">
                <span class="yn-label"><span class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span> Posts</span>
                <span class="yn-value">{{ myKarma?.postsCount ?? 0 }}</span>
              </div>
              <div class="yn-row">
                <span class="yn-label"><span class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg></span> Upvotes received</span>
                <span class="yn-value">{{ myKarma?.upvotesReceived ?? 0 }}</span>
              </div>
            </div>
          </div>

          <!-- Karma Leaderboard -->
          <div class="card">
            <div class="section-header">
              <div class="section-header-left">
                <span class="section-icon icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg></span>
                <div>
                  <h2 class="section-title">Karma Leaderboard</h2>
                  <div class="section-subtitle">Top contributors this week</div>
                </div>
              </div>
            </div>
            <div class="karma-empty" *ngIf="!leaderboard.length">
              No karma data yet — start posting!
            </div>
            <div class="karma-list">
              <div class="karma-item" *ngFor="let entry of leaderboard.slice(0, 5); let i = index">
                <span class="karma-rank" [class]="'rank-' + i">{{ leaderboardRank(i) }}</span>
                <div class="avatar-placeholder" style="width:32px;height:32px;font-size:0.75rem;flex-shrink:0;">
                  {{ entry.displayName[0]?.toUpperCase() || '?' }}
                </div>
                <div class="karma-user-info">
                  <div class="karma-display-name">{{ truncateDisplayName(entry.displayName) }}</div>
                </div>
                <div class="karma-score"><span class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span> {{ entry.totalKarma }}</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Hover card overlay -->
      <div
        *ngIf="hoveredAuthorId"
        (mouseenter)="onHoverCardMouseEnter()"
        (mouseleave)="onHoverCardMouseLeave()"
        [style.top.px]="hoverCardPosition.top"
        [style.left.px]="hoverCardPosition.left"
        style="position:absolute; z-index:1000; width:280px;
               background:var(--color-surface);
               border:0.5px solid var(--color-border-light);
               border-radius:var(--radius-lg);
               padding:16px; box-shadow: 0 4px 20px rgba(0,0,0,0.12);"
      >
        <div *ngIf="!hoveredProfile"
             style="text-align:center; padding:16px;
                    color:var(--color-text-muted); font-size:12px;">
          Loading...
        </div>

        <div *ngIf="hoveredProfile">
          <!-- Avatar + name row -->
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
            <div style="width:48px; height:48px; border-radius:50%;
                        background:#1D9E75; color:white;
                        display:flex; align-items:center; justify-content:center;
                        font-size:18px; font-weight:500; flex-shrink:0;">
              {{ hoveredProfile.displayName ? hoveredProfile.displayName[0].toUpperCase() : '?' }}
            </div>
            <div>
              <div style="font-size:14px; font-weight:500; color:var(--color-text);">
                {{ hoveredProfile.displayName }}
              </div>
              <div style="font-size:11px; color:var(--color-text-muted);">
                <span class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span> {{ hoveredProfile.totalKarma }} karma
              </div>
            </div>
          </div>

          <!-- Stats row -->
          <div style="display:flex; gap:16px; margin-bottom:12px;
                      font-size:12px; color:var(--color-text-muted);">
            <span><strong>{{ hoveredProfile.postsCount }}</strong> posts</span>
            <span><strong>{{ hoveredProfile.followersCount }}</strong> followers</span>
            <span><strong>{{ hoveredProfile.followingCount }}</strong> following</span>
          </div>

          <!-- Action buttons -->
          <div style="display:flex; gap:8px;"
               *ngIf="hoveredAuthorId !== currentUserKeycloakId">
            <button
              (click)="toggleFollowHovered()"
              [style.background]="isFollowingHovered ? 'transparent' : '#1D9E75'"
              [style.color]="isFollowingHovered ? '#1D9E75' : 'white'"
              style="flex:1; padding:7px 12px; border-radius:6px;
                     font-size:12px; font-weight:500; cursor:pointer;
                     border:0.5px solid #1D9E75;">
              {{ isFollowingHovered ? '✓ Following' : '+ Follow' }}
            </button>
            <button
              (click)="navigateToProfile(hoveredAuthorId!)"
              style="flex:1; padding:7px 12px; border-radius:6px;
                     font-size:12px; cursor:pointer;
                     border:0.5px solid var(--color-border-light);
                     background:transparent;
                     color:var(--color-text-muted);">
              View Profile
            </button>
          </div>

          <div *ngIf="hoveredAuthorId === currentUserKeycloakId"
               style="font-size:12px; color:var(--color-text-muted); text-align:center;">
            This is you
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .community-page { display: flex; flex-direction: column; gap: var(--space-6); position: relative; }

    .community-layout {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: var(--space-6);
      align-items: start;
    }

    .feed-column { display: flex; flex-direction: column; gap: var(--space-4); }

    /* Create post */
    .create-post-card { }
    .cp-input-row { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4); }
    .cp-input { flex: 1; }
    .cp-actions { display: flex; align-items: center; justify-content: space-between; }
    .cp-type-btns { display: flex; gap: var(--space-1); flex-wrap: wrap; }
    .cp-form-intro { display: flex; flex-direction: column; gap: 2px; }
    .create-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); margin-bottom: var(--space-3); }
    .cp-textarea { width: 100%; resize: vertical; min-height: 120px; margin-bottom: var(--space-3); }

    .feed-filter-card { display: flex; flex-direction: column; gap: var(--space-4); }
    .filter-row { display: flex; gap: var(--space-3); flex-wrap: wrap; }
    .filter-select { min-width: 180px; }
    .inline-error {
      font-size: var(--text-sm);
      color: var(--error-500);
      background: var(--error-50);
      border: 1px solid rgba(239, 68, 68, 0.18);
      border-radius: var(--radius-md);
      padding: var(--space-3);
      margin-bottom: var(--space-3);
    }
    .error-card {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      color: var(--error-500);
      border-color: rgba(239, 68, 68, 0.18);
      background: var(--error-50);
    }
    .loading-card,
    .empty-card {
      min-height: 140px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .loading-state {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      color: var(--color-text-muted);
      justify-content: center;
    }
    .spinner {
      animation: spin 0.9s linear infinite;
      display: inline-block;
    }
    .loading-comments {
      justify-content: flex-start;
    }

    .page-header-actions { display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap; }
    .btn-career { background: linear-gradient(135deg, #1D9E75, #15c481); color: white; }
    .btn-career:hover { background: linear-gradient(135deg, #17896a, #11ad72); transform: translateY(-1px); }

    /* Post card */
    .post-card { display: flex; flex-direction: column; gap: var(--space-4); }
    .post-card.practice-request { border-left: 4px solid #1D9E75; }
    .practice-badge { font-weight: 700 !important; }
    .practice-partner-subtitle {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      font-style: italic;
      margin-top: calc(var(--space-1) * -1);
    }
    .connect-action-btn { color: #1D9E75 !important; font-weight: var(--weight-semibold) !important; }
    .connect-action-btn:hover { background: #f0fdf9 !important; }
    .find-partner-btn { color: var(--teal-600); font-weight: var(--weight-semibold); }

    /* Practice Partners empty state */
    .practice-empty-card { min-height: 220px; }
    .practice-empty-state { display: flex; flex-direction: column; align-items: center; gap: var(--space-4); text-align: center; padding: var(--space-6); }
    .practice-empty-icon { font-size: 2.5rem; line-height: 1; }
    .practice-empty-title { font-size: var(--text-lg); font-weight: 700; color: var(--color-text); }
    .practice-empty-subtitle { font-size: var(--text-sm); color: var(--color-text-muted); }

    .post-header {
      display: flex; align-items: flex-start; gap: var(--space-3);
    }

    .post-author-info { flex: 1; }
    .post-author-name { font-size: var(--text-sm); font-weight: 700; }
    .post-author-role { font-size: var(--text-xs); color: var(--color-text-muted); }
    .post-time { font-size: var(--text-xs); color: var(--color-text-light); flex-shrink: 0; }

    .post-type-badge { flex-shrink: 0; font-size: var(--text-xs) !important; padding: 3px 8px !important; }

    .post-content {
      font-size: var(--text-sm);
      color: var(--color-text);
      line-height: var(--leading-relaxed);
      white-space: pre-wrap;
    }
    .post-title { font-size: var(--text-lg); font-weight: 700; color: var(--color-text); }
    .post-stats-row { display: flex; flex-wrap: wrap; gap: var(--space-2); }

    .post-tags { display: flex; flex-wrap: wrap; gap: var(--space-2); }

    .post-footer { display: flex; align-items: center; gap: var(--space-4); padding-top: var(--space-2); border-top: 1px solid var(--color-border-light); }
    .post-action-btn {
      display: flex; align-items: center; gap: var(--space-2);
      font-size: var(--text-sm); color: var(--color-text-muted);
      background: none; border: none; cursor: pointer;
      padding: var(--space-2) var(--space-3); border-radius: var(--radius-md);
      font-family: var(--font-body); font-weight: var(--weight-medium);
      transition: all var(--transition-fast);
    }
    .post-action-btn:hover { background: var(--neutral-50); color: var(--color-text); }

    /* Comments */
    .post-comments { display: flex; flex-direction: column; gap: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--color-border-light); }
    .comment-item { display: flex; align-items: flex-start; gap: var(--space-3); }
    .comment-content-wrap { display: flex; flex-direction: column; gap: var(--space-2); flex: 1; }
    .comment-body { background: var(--neutral-50); border-radius: var(--radius-md); padding: var(--space-2) var(--space-3); font-size: var(--text-sm); line-height: var(--leading-relaxed); }
    .comment-author { font-weight: 700; margin-right: var(--space-2); color: var(--color-text); }
    .comment-text { color: var(--color-text-muted); }
    .comment-meta { display: flex; align-items: center; gap: var(--space-2); color: var(--color-text-light); font-size: var(--text-xs); flex-wrap: wrap; }
    .comment-form { display: flex; flex-direction: column; gap: var(--space-3); }
    .comment-form-actions { display: flex; justify-content: flex-end; }
    .comment-edit-form { display: flex; flex-direction: column; gap: 6px; }
    .comment-edit-input { width: 100%; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: .875rem; resize: vertical; font-family: inherit; }
    .comment-edit-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 2px; }
    .btn-cancel-edit { background: none; border: none; color: #6b7280; cursor: pointer; font-size: .85rem; }
    .btn-cancel-edit:hover { color: #374151; }
    .btn-save-edit { background: #0a66c2; color: #fff; border: none; border-radius: 6px; padding: 4px 12px; cursor: pointer; font-size: .85rem; }
    .btn-save-edit:disabled { opacity: .6; cursor: not-allowed; }
    .comment-edit-error { font-size: .75rem; color: #dc2626; }
    .edited-badge { font-size: .75rem; color: #9ca3af; margin-left: 4px; }
    .comment-edit-btn { color: #9ca3af; }
    .comment-edit-btn:hover { color: #374151; }

    .section-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: var(--space-5);
      gap: var(--space-4);
    }
    .section-header-left { display: flex; align-items: flex-start; gap: var(--space-3); }
    .section-icon { font-size: 1.25rem; margin-top: 2px; }
    .section-title { font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--color-text); }

    /* Sidebar */
    .community-sidebar { display: flex; flex-direction: column; gap: var(--space-5); }

    .trending-list { display: flex; flex-direction: column; gap: var(--space-3); }
    .trending-item { display: flex; align-items: center; gap: var(--space-3); }
    .trending-rank { font-family: var(--font-display); font-size: var(--text-sm); font-weight: 700; color: var(--color-text-light); width: 20px; }
    .trending-tag { font-size: var(--text-sm); font-weight: 600; color: var(--teal-600); }
    .trending-count { font-size: var(--text-xs); color: var(--color-text-muted); }

    .follow-list { display: flex; flex-direction: column; gap: var(--space-4); }
    .follow-item { display: flex; align-items: center; gap: var(--space-3); }
    .follow-info { flex: 1; }
    .follow-name { font-size: var(--text-sm); font-weight: 600; }
    .follow-title { font-size: var(--text-xs); color: var(--color-text-muted); }

    .load-more-wrap { display: flex; justify-content: center; }
    .load-more-btn { min-width: 160px; }

    /* Inline edit form */
    .edit-form-card { border-left: 4px solid #1D9E75; display: flex; flex-direction: column; gap: var(--space-3); }
    .edit-form-title { font-size: var(--text-sm); font-weight: 700; color: var(--color-text); }
    .edit-form-field { margin-bottom: 0; }
    .edit-form-actions { display: flex; gap: var(--space-2); }

    /* Karma badge on post cards */
    .karma-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 500;
      padding: 2px 7px;
      border-radius: 12px;
      margin-left: 6px;
      vertical-align: middle;
      line-height: 1.4;
    }
    .karma-gold { background: #FAEEDA; color: #633806; }
    .karma-teal { background: #E1F5EE; color: #085041; }
    .karma-gray { background: #F1EFE8; color: #444441; }

    /* Karma Leaderboard sidebar card */
    .section-subtitle { font-size: var(--text-xs); color: var(--color-text-muted); margin-top: 2px; }
    .karma-empty { font-size: var(--text-sm); color: var(--color-text-muted); text-align: center; padding: var(--space-4) 0; }
    .karma-list { display: flex; flex-direction: column; gap: var(--space-3); }
    .karma-item { display: flex; align-items: center; gap: var(--space-2); }
    .karma-rank { font-size: var(--text-sm); font-weight: 700; width: 26px; text-align: center; flex-shrink: 0; }
    .karma-user-info { flex: 1; min-width: 0; }
    .karma-display-name { font-size: var(--text-sm); font-weight: 600; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .karma-score { font-size: var(--text-sm); font-weight: 700; color: var(--teal-600); flex-shrink: 0; }

    /* Your Network karma rows */
    .your-network-divider { height: 1px; background: var(--color-border-light); margin: var(--space-4) 0; }
    .your-network-stats { display: flex; flex-direction: column; gap: var(--space-2); }
    .yn-row { display: flex; align-items: center; justify-content: space-between; }
    .yn-label { font-size: var(--text-xs); color: var(--color-text-muted); }
    .yn-value { font-size: var(--text-sm); font-weight: 700; color: var(--color-text); }

    /* ========== UX ENHANCEMENTS ========== */

    /* 3A: Enhanced tab bar */
    .tab-bar {
      display: flex;
      gap: var(--space-2);
      margin-bottom: var(--space-4);
      border-bottom: 2px solid var(--color-border-light);
      padding-bottom: 0;
      position: relative;
      align-items: center;
    }

    .tab-btn {
      padding: var(--space-3) var(--space-4);
      border: none;
      background: none;
      cursor: pointer;
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--color-text-muted);
      border-bottom: 3px solid transparent;
      transition: all var(--transition-fast);
      margin-bottom: -2px;
      white-space: nowrap;
      font-family: var(--font-body);
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--space-1);
    }

    .tab-btn:hover {
      color: var(--color-text);
      background: rgba(var(--teal-600-rgb, 16, 185, 129), 0.08);
      border-radius: var(--radius-md) var(--radius-md) 0 0;
    }

    .tab-btn.active {
      color: var(--teal-600);
      font-weight: 600;
      border-bottom-color: var(--teal-600);
    }

    .tab-indicator {
      position: absolute;
      bottom: -2px;
      height: 3px;
      background: var(--teal-600);
      transition: all var(--transition-base);
      border-radius: 2px 2px 0 0;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      background: var(--teal-600);
      color: white;
      border-radius: var(--radius-full);
      font-size: 10px;
      font-weight: 700;
      margin-left: 4px;
    }

    /* 3B: Post card enhancements */
    @keyframes postFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .post-card {
      animation: postFadeIn var(--transition-base) ease-out backwards;
      transition: box-shadow var(--transition-fast), transform var(--transition-fast);
    }

    .post-card:nth-child(1) { animation-delay: 0ms; }
    .post-card:nth-child(2) { animation-delay: 60ms; }
    .post-card:nth-child(3) { animation-delay: 120ms; }
    .post-card:nth-child(4) { animation-delay: 180ms; }
    .post-card:nth-child(5) { animation-delay: 240ms; }
    .post-card:nth-child(6) { animation-delay: 300ms; }
    .post-card:nth-child(n+7) { animation-delay: 360ms; }

    .post-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-1px);
    }

    /* Bookmark button pop animation */
    @keyframes bookmarkPop {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }

    .bookmark-btn.bookmark-pop {
      animation: bookmarkPop 200ms ease-out;
    }

    .bookmark-btn {
      padding: var(--space-2) var(--space-2) !important;
      min-width: 40px;
      justify-content: center;
      transition: color var(--transition-fast), transform var(--transition-fast);
    }

    .bookmark-btn:active {
      transform: scale(0.92);
    }

    .bookmark-btn.bookmarked {
      color: var(--teal-600);
    }

    /* Type chip with left border accent */
    .type-chip {
      border-left: 3px solid var(--teal-600);
      padding-left: calc(var(--space-2) - 3px);
    }

    /* Upvote/downvote button pressed state */
    .post-action-btn:active {
      transform: scale(0.92);
      transition: transform 80ms ease;
    }

    /* 3C: Search bar enhancements */
    @keyframes searchSpinner {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .search-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid var(--color-border-light);
      border-top-color: var(--teal-600);
      border-radius: 50%;
      animation: searchSpinner 0.6s linear infinite;
    }

    input[type="text"][name="searchQuery"]:focus {
      border-color: var(--teal-600);
      transition: border-color var(--transition-fast);
    }

    /* Clear button fade-in */
    .search-clear-btn {
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--transition-fast);
    }

    .search-clear-btn.visible {
      opacity: 1;
      pointer-events: auto;
    }

    /* 3D: Create form enhancements */
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      50% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
    }

    .create-form-pulse {
      animation: pulse 2s infinite;
      animation-iteration-count: 2;
    }

    .create-form-grid input:focus,
    .create-form-grid select:focus {
      border-color: var(--teal-600);
      transition: border-color var(--transition-fast);
    }

    .create-post-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(0, 0, 0, 0.1);
      border-top-color: white;
      border-radius: 50%;
      animation: searchSpinner 0.6s linear infinite;
      margin-right: 6px;
    }

    .char-counter {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      margin-top: 4px;
      transition: color var(--transition-fast);
    }

    .char-counter.warning {
      color: #f59e0b;
    }

    .char-counter.danger {
      color: #ef4444;
    }

    /* 3E: Comments enhancements */
    .comments-section {
      overflow: hidden;
      max-height: 0;
      transition: max-height var(--transition-base) ease;
    }

    .comments-section.open {
      max-height: 2000px;
    }

    .comment-textarea {
      resize: none;
      min-height: 40px;
      max-height: 200px;
      font-family: var(--font-body);
      font-size: var(--text-sm);
      overflow-y: auto;
    }

    /* 3G: Loading states - skeleton shimmer */
    @keyframes shimmer {
      0% { background-position: -600px 0; }
      100% { background-position: 600px 0; }
    }

    .skeleton-card {
      background: linear-gradient(90deg, #ebebeb 25%, #f5f5f5 50%, #ebebeb 75%);
      background-size: 1200px 100%;
      animation: shimmer 1.4s infinite linear;
      border-radius: var(--radius-lg);
      margin-bottom: var(--space-4);
    }

    .skeleton-header {
      display: flex;
      gap: var(--space-3);
      padding: var(--space-4);
      border-bottom: 1px solid var(--color-border-light);
    }

    .skeleton-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(90deg, #ebebeb 25%, #f5f5f5 50%, #ebebeb 75%);
      background-size: 1200px 100%;
      animation: shimmer 1.4s infinite linear;
    }

    .skeleton-text-lines {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .skeleton-line {
      height: 14px;
      background: linear-gradient(90deg, #ebebeb 25%, #f5f5f5 50%, #ebebeb 75%);
      background-size: 1200px 100%;
      animation: shimmer 1.4s infinite linear;
      border-radius: 4px;
    }

    .skeleton-line.short { width: 70%; }
    .skeleton-line.medium { width: 85%; }

    /* 3H: Load more button */
    .load-more-btn {
      transition: all var(--transition-fast);
      position: relative;
    }

    .load-more-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: searchSpinner 0.6s linear infinite;
      margin-right: 6px;
    }

    /* 3I: Error messages */
    .error-alert {
      background: #fee2e2;
      border-left: 4px solid #ef4444;
      color: #991b1b;
      padding: var(--space-4);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-4);
      display: flex;
      justify-content: space-between;
      align-items: center;
      animation: slideDown var(--transition-base) ease-out;
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .error-alert-close {
      background: none;
      border: none;
      color: #991b1b;
      cursor: pointer;
      font-size: var(--text-lg);
      padding: 0;
      opacity: 0.6;
      transition: opacity var(--transition-fast);
    }

    .error-alert-close:hover {
      opacity: 1;
    }

    /* 3J: Who to Follow button states */
    .follow-btn {
      transition: all var(--transition-fast);
      position: relative;
    }

    .follow-btn:hover {
      background: rgba(16, 185, 129, 0.9);
    }

    .follow-btn.following {
      background: var(--neutral-100);
      color: var(--teal-600);
      border: 1px solid var(--color-border-light);
    }

    .follow-spinner {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(16, 185, 129, 0.3);
      border-top-color: var(--teal-600);
      border-radius: 50%;
      animation: searchSpinner 0.6s linear infinite;
    }

    /* 3K: Hover profile card animations */
    @keyframes hoverCardIn {
      from { opacity: 0; transform: scale(0.95) translateY(-4px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .hover-card {
      animation: hoverCardIn var(--transition-base) ease-out;
      backdrop-filter: blur(2px);
    }

    /* 3L: Responsive polish */
    @media (max-width: 768px) {
      .tab-bar {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
      }
      .tab-bar::-webkit-scrollbar {
        display: none;
      }
      .tab-btn {
        white-space: nowrap;
        padding: var(--space-2) var(--space-3);
      }
      .post-card {
        padding: var(--space-3);
      }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .icon {
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
      margin-right: 4px;
    }
    .icon svg {
      display: block;
    }

    @media (max-width: 1024px) {
      .community-layout { grid-template-columns: 1fr; }
      .community-sidebar { display: grid; grid-template-columns: repeat(2,1fr); }
    }
    @media (max-width: 640px) {
      .create-form-grid { grid-template-columns: 1fr; }
      .filter-row { flex-direction: column; }
      .community-sidebar { grid-template-columns: 1fr; }
    }
  `]
})
export class CommunityComponent implements OnInit {
  private communityApi = inject(CommunityApiService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  router = inject(Router);

  posts: CommunityPost[] = [];
  activeTab: 'all' | 'mine' | 'following' | 'bookmarks' = 'all';
  bookmarkedPostIds = new Set<number>();
  bookmarkAnimating = new Set<number>();
  trendingTopics: { tag: string; posts: number }[] = [];
  whoToFollow: CommunitySuggestion[] = [];
  followers: CommunityFollow[] = [];
  following: CommunityFollow[] = [];
  leaderboard: KarmaResponse[] = [];
  myKarma: KarmaResponse | null = null;
  karmaByUser: Record<string, number> = {};

  currentUserKeycloakId = '';
  currentUserInitials = 'YU';

  selectedType = '';
  selectedIndustry = '';
  selectedSort = 'createdAt,desc';

  currentPage = 0;
  pageSize = 10;
  totalPosts = 0;
  totalPages = 0;
  hasMore = false;

  isInitialLoading = true;
  isLoadingMore = false;
  isCreatingPost = false;
  showCreateForm = false;

  errorMessage = '';
  createErrorMessage = '';

  searchQuery = '';
  isSearching = false;
  searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  editingPostId: number | null = null;
  editForm = { title: '', content: '', type: '', industry: '', tagsInput: '' };
  submittingEdit = false;
  editError = '';

  hoveredAuthorId: string | null = null;
  hoveredProfile: UserProfileResponse | null = null;
  hoverCardPosition: { top: number; left: number } = { top: 0, left: 0 };
  hoverCardTimer: ReturnType<typeof setTimeout> | null = null;
  isFollowingHovered = false;

  expandedComments: Record<number, boolean> = {};
  commentsByPost: Record<number, CommunityComment[]> = {};
  loadedComments: Record<number, boolean> = {};
  loadingComments: Record<number, boolean> = {};
  commentDrafts: Record<number, string> = {};
  commentSubmitting: Record<number, boolean> = {};
  commentErrors: Record<number, string> = {};
  editingCommentId: number | null = null;
  editingCommentContent = '';
  commentEditErrors: Record<number, string> = {};
  commentEditSubmitting: Record<number, boolean> = {};

  createPostForm: CreatePostBody = {
    title: '',
    content: '',
    type: 'DISCUSSION',
    industry: '',
    tags: '',
  };

  readonly typeOptions = [
    { label: 'Discussion', value: 'DISCUSSION' },
    { label: 'Question', value: 'QUESTION' },
    { label: 'Success Story', value: 'SUCCESS_STORY' },
    { label: 'Tip', value: 'TIP' },
    { label: 'Practice Partner Request', value: 'PRACTICE_REQUEST' },
  ];

  readonly typeFilters = [
    { label: 'All Posts', value: '' },
    { label: 'Success Stories', value: 'SUCCESS_STORY' },
    { label: 'Questions', value: 'QUESTION' },
    { label: 'Tips', value: 'TIP' },
    { label: 'Practice Partners', value: 'PRACTICE_REQUEST' },
  ];

  readonly industryOptions = [
    { label: 'Technology', value: 'tech' },
    { label: 'Finance', value: 'finance' },
    { label: 'Healthcare', value: 'healthcare' },
    { label: 'Education', value: 'education' },
    { label: 'Marketing', value: 'marketing' },
    { label: 'Engineering', value: 'engineering' },
    { label: 'Legal', value: 'legal' },
    { label: 'Consulting', value: 'consulting' },
    { label: 'Media', value: 'media' },
    { label: 'Other', value: 'other' },
  ];

  ngOnInit(): void {
    this.currentUserKeycloakId = this.authService.getKeycloakId();
    this.currentUserInitials = this.getInitials(this.currentUserKeycloakId || this.authService.getFullName() || 'You');
    this.loadInitialData();
    this.loadBookmarkedIds();

    this.communityApi.getLeaderboard().subscribe({
      next: (data) => {
        this.leaderboard = data;
        this.karmaByUser = {};
        data.forEach((entry) => { this.karmaByUser[entry.keycloakId] = entry.totalKarma; });
        this.refreshWhoToFollow();
        this.cdr.markForCheck();
      },
      error: () => {},
    });

    this.communityApi.getMyKarma().subscribe({
      next: (data) => { this.myKarma = data; this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    this.createErrorMessage = '';
  }

  setCreateType(type: string): void {
    this.createPostForm.type = type;
  }

  onSearchInput(): void {
    if (this.searchDebounceTimer !== null) {
      clearTimeout(this.searchDebounceTimer);
    }
    if (!this.searchQuery.trim()) {
      this.isSearching = false;
      this.loadPosts(0, false);
      return;
    }
    this.isSearching = true;
    this.isInitialLoading = true;
    this.cdr.markForCheck();
    this.searchDebounceTimer = setTimeout(() => {
      this.communityApi.searchPosts(this.searchQuery.trim()).subscribe({
        next: (res) => {
          this.posts = res.content;
          this.refreshTrendingTopics();
          this.totalPages = res.totalPages;
          this.totalPosts = res.totalElements;
          this.hasMore = false;
          this.isInitialLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isInitialLoading = false;
          this.cdr.markForCheck();
        },
      });
    }, 350);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.isSearching = false;
    this.loadPosts(0, false);
    this.cdr.markForCheck();
  }

  startEdit(post: CommunityPost): void {
    this.editingPostId = post.id;
    this.editForm = {
      title: post.title,
      content: post.content,
      type: post.type,
      industry: post.industry ?? '',
      tagsInput: post.tags ?? '',
    };
    this.editError = '';
    this.cdr.markForCheck();
  }

  cancelEdit(): void {
    this.editingPostId = null;
    this.editError = '';
    this.cdr.markForCheck();
  }

  loadTab(tab: 'all' | 'mine' | 'following' | 'bookmarks', page = 0): void {
    this.activeTab = tab;
    this.currentPage = 0;
    this.posts = [];
    this.refreshTrendingTopics();
    this.errorMessage = '';
    this.isInitialLoading = true;
    this.cdr.markForCheck();

    switch (tab) {
      case 'all':
        this.loadPosts(0, false);
        break;
      case 'mine':
        this.communityApi.getPosts(0, this.pageSize, '', '', 'createdAt,desc')
          .pipe(finalize(() => { this.isInitialLoading = false; this.cdr.markForCheck(); }))
          .subscribe({
            next: (response) => {
              this.applyPostsResponse(response, false);
              this.cdr.markForCheck();
            },
            error: (error) => {
              this.errorMessage = this.getErrorMessage(error);
              this.cdr.markForCheck();
            },
          });
        break;
      case 'following':
        this.communityApi.getFollowingFeed(0, this.pageSize)
          .pipe(finalize(() => { this.isInitialLoading = false; this.cdr.markForCheck(); }))
          .subscribe({
            next: (response) => {
              this.applyPostsResponse(response, false);
              this.cdr.markForCheck();
            },
            error: (error) => {
              this.errorMessage = this.getErrorMessage(error);
              this.cdr.markForCheck();
            },
          });
        break;
      case 'bookmarks':
        this.communityApi.getMyBookmarks()
          .pipe(finalize(() => { this.isInitialLoading = false; this.cdr.markForCheck(); }))
          .subscribe({
            next: (response) => {
              this.posts = response.data;
              this.refreshTrendingTopics();
              this.totalPosts = response.total;
              this.totalPages = 1;
              this.currentPage = 0;
              this.hasMore = false;
              this.cdr.markForCheck();
            },
            error: (error) => {
              this.errorMessage = this.getErrorMessage(error);
              this.cdr.markForCheck();
            },
          });
        break;
    }
  }

  onToggleBookmark(post: CommunityPost): void {
    this.bookmarkAnimating.add(post.id);
    this.communityApi.toggleBookmark(post.id).subscribe({
      next: (response) => {
        if (response.bookmarked) {
          this.bookmarkedPostIds.add(post.id);
        } else {
          this.bookmarkedPostIds.delete(post.id);
        }
        setTimeout(() => {
          this.bookmarkAnimating.delete(post.id);
          this.cdr.markForCheck();
        }, 200);
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Failed to toggle bookmark';
        this.bookmarkAnimating.delete(post.id);
        this.cdr.markForCheck();
      },
    });
  }

  private loadBookmarkedIds(): void {
    this.communityApi.getMyBookmarks().subscribe({
      next: (response) => {
        this.bookmarkedPostIds.clear();
        response.data.forEach((post) => {
          this.bookmarkedPostIds.add(post.id);
        });
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  submitEdit(): void {
    if (!this.editForm.title.trim() || !this.editForm.content.trim()) {
      this.editError = 'Title and content are required.';
      this.cdr.markForCheck();
      return;
    }
    this.submittingEdit = true;
    this.editError = '';
    this.cdr.markForCheck();

    const body = {
      title: this.editForm.title.trim(),
      content: this.editForm.content.trim(),
      type: this.editForm.type,
      industry: this.editForm.industry,
      tags: this.editForm.tagsInput.trim(),
    };

    this.communityApi.updatePost(this.editingPostId!, body).subscribe({
      next: (updated) => {
        const idx = this.posts.findIndex((p) => p.id === this.editingPostId);
        if (idx !== -1) {
          this.posts = [
            ...this.posts.slice(0, idx),
            updated,
            ...this.posts.slice(idx + 1),
          ];
          this.refreshTrendingTopics();
        }
        this.editingPostId = null;
        this.submittingEdit = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.editError = 'Failed to update post. Please try again.';
        this.submittingEdit = false;
        this.cdr.markForCheck();
      },
    });
  }

  findPracticePartner(): void {
    this.showCreateForm = true;
    this.createErrorMessage = '';
    this.createPostForm = {
      title: '',
      content: 'I am preparing for interviews and looking for a practice partner. I can do mock behavioral and technical interviews. Please comment or connect if you are interested!',
      type: 'PRACTICE_REQUEST',
      industry: '',
      tags: 'practice,mock-interview,partner',
    };
    this.cdr.markForCheck();
  }

  submitPost(): void {
    if (!this.createPostForm.title.trim() || !this.createPostForm.content.trim()) {
      this.createErrorMessage = 'Title and content are required.';
      return;
    }

    this.isCreatingPost = true;
    this.createErrorMessage = '';

    const payload: CreatePostBody = {
      title: this.createPostForm.title.trim(),
      content: this.createPostForm.content.trim(),
      type: this.createPostForm.type,
      industry: this.createPostForm.industry?.trim() || '',
      tags: this.createPostForm.tags?.trim() || '',
    };

    this.communityApi.createPost(payload)
      .pipe(finalize(() => { this.isCreatingPost = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (post) => {
          this.posts = [post, ...this.posts];
          this.refreshTrendingTopics();
          this.totalPosts += 1;
          this.showCreateForm = false;
          this.createPostForm = {
            title: '',
            content: '',
            type: 'DISCUSSION',
            industry: '',
            tags: '',
          };
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.createErrorMessage = this.getErrorMessage(error);
          this.cdr.markForCheck();
        },
      });
  }

  setTypeFilter(type: string): void {
    this.selectedType = type;
    this.loadPosts(0, false);
  }

  onIndustryChange(): void {
    this.loadPosts(0, false);
  }

  onSortChange(): void {
    this.loadPosts(0, false);
  }

  upvotePost(postId: number): void {
    this.communityApi.upvotePost(postId).subscribe({
      next: (updatedPost) => { this.replacePost(updatedPost); this.cdr.markForCheck(); },
      error: (error) => { this.errorMessage = this.getErrorMessage(error); this.cdr.markForCheck(); },
    });
  }

  downvotePost(postId: number): void {
    this.communityApi.downvotePost(postId).subscribe({
      next: (updatedPost) => { this.replacePost(updatedPost); this.cdr.markForCheck(); },
      error: (error) => { this.errorMessage = this.getErrorMessage(error); this.cdr.markForCheck(); },
    });
  }

  reportPost(postId: number): void {
    this.communityApi.reportPost(postId).subscribe({
      next: () => {
        const post = this.posts.find((item) => item.id === postId);
        if (post) {
          this.replacePost({ ...post, isReported: true });
        }
        this.cdr.markForCheck();
      },
      error: (error) => { this.errorMessage = this.getErrorMessage(error); this.cdr.markForCheck(); },
    });
  }

  deletePost(postId: number): void {
    this.communityApi.deletePost(postId).subscribe({
      next: () => {
        this.posts = this.posts.filter((post) => post.id !== postId);
        this.refreshTrendingTopics();
        this.totalPosts = Math.max(0, this.totalPosts - 1);
        this.cdr.markForCheck();
      },
      error: (error) => { this.errorMessage = this.getErrorMessage(error); this.cdr.markForCheck(); },
    });
  }

  toggleComments(postId: number): void {
    this.expandedComments[postId] = !this.expandedComments[postId];
    if (this.expandedComments[postId] && !this.loadedComments[postId]) {
      this.loadComments(postId);
    }
  }

  submitComment(postId: number): void {
    const content = (this.commentDrafts[postId] || '').trim();
    if (!content) {
      this.commentErrors[postId] = 'Comment content is required.';
      return;
    }

    this.commentSubmitting[postId] = true;
    this.commentErrors[postId] = '';

    this.communityApi.addComment(postId, { content })
      .pipe(finalize(() => { this.commentSubmitting[postId] = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (comment) => {
          const currentComments = this.commentsByPost[postId] || [];
          this.commentsByPost[postId] = [...currentComments, comment];
          this.loadedComments[postId] = true;
          this.commentDrafts[postId] = '';
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.commentErrors[postId] = this.getErrorMessage(error);
          this.cdr.markForCheck();
        },
      });
  }

  upvoteComment(postId: number, commentId: number): void {
    this.communityApi.upvoteComment(commentId).subscribe({
      next: (updatedComment) => {
        const currentComments = this.commentsByPost[postId] || [];
        this.commentsByPost[postId] = currentComments.map((comment) =>
          comment.id === commentId ? updatedComment : comment
        );
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.commentErrors[postId] = this.getErrorMessage(error);
        this.cdr.markForCheck();
      },
    });
  }

  deleteComment(postId: number, commentId: number): void {
    this.communityApi.deleteComment(commentId).subscribe({
      next: () => {
        this.commentsByPost[postId] = (this.commentsByPost[postId] || []).filter((comment) => comment.id !== commentId);
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.commentErrors[postId] = this.getErrorMessage(error);
        this.cdr.markForCheck();
      },
    });
  }

  startEditComment(comment: CommunityComment): void {
    this.editingCommentId = comment.id;
    this.editingCommentContent = comment.content;
    this.commentEditErrors[comment.id] = '';
    this.cdr.markForCheck();
  }

  cancelEditComment(): void {
    this.editingCommentId = null;
    this.editingCommentContent = '';
    this.cdr.markForCheck();
  }

  submitEditComment(postId: number, commentId: number): void {
    if (!this.editingCommentContent.trim()) {
      this.commentEditErrors[commentId] = 'Comment cannot be empty.';
      this.cdr.markForCheck();
      return;
    }
    this.commentEditSubmitting[commentId] = true;
    this.communityApi.updateComment(commentId, this.editingCommentContent.trim())
      .subscribe({
        next: (updated) => {
          this.commentsByPost[postId] = (this.commentsByPost[postId] || [])
            .map(c => c.id === commentId ? updated : c);
          this.editingCommentId = null;
          this.editingCommentContent = '';
          this.commentEditSubmitting[commentId] = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.commentEditErrors[commentId] = this.getErrorMessage(err);
          this.commentEditSubmitting[commentId] = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadMore(): void {
    if (!this.hasMore || this.isLoadingMore) {
      return;
    }

    this.isLoadingMore = true;
    this.loadPosts(this.currentPage + 1, true);
  }

  toggleFollow(person: CommunitySuggestion): void {
    person.loading = true;
    const request$ = person.following
      ? this.communityApi.unfollowUser(person.keycloakId)
      : this.communityApi.followUser(person.keycloakId);

    request$
      .pipe(finalize(() => { person.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          person.following = !person.following;
          this.refreshFollowingAfterToggle(person.keycloakId, person.following);
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.errorMessage = this.getErrorMessage(error);
          this.cdr.markForCheck();
        },
      });
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      DISCUSSION: 'Discussion',
      QUESTION: 'Question',
      SUCCESS_STORY: 'Success Story',
      TIP: 'Tip',
      PRACTICE_REQUEST: 'Looking for Partner',
    };
    return labels[type] || type.replaceAll('_', ' ');
  }

  typeChip(type: string): string {
    const chips: Record<string, string> = {
      SUCCESS_STORY: 'chip chip-teal',
      DISCUSSION: 'chip chip-cyan',
      QUESTION: 'chip chip-sky',
      TIP: 'chip chip-sand',
      PRACTICE_REQUEST: 'chip chip-teal practice-badge',
    };
    return chips[type] || 'chip chip-neutral';
  }

  splitTags(tags: string | null): string[] {
    if (!tags) {
      return [];
    }

    return tags.split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  formatDate(dateValue: string | null | undefined): string {
    if (!dateValue) {
      return 'Unknown date';
    }

    return new Date(dateValue).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  getInitials(value: string): string {
    const cleaned = value.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
    if (!cleaned) {
      return 'IP';
    }

    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  getAuthorLabel(authorKeycloakId: string): string {
    return authorKeycloakId === this.currentUserKeycloakId ? 'You' : this.truncateKeycloakId(authorKeycloakId);
  }

  getComments(postId: number): CommunityComment[] {
    return this.commentsByPost[postId] || [];
  }

  getCommentButtonLabel(postId: number): string {
    if (this.loadedComments[postId]) {
      const count = this.getComments(postId).length;
      return `${count} comment${count === 1 ? '' : 's'}`;
    }

    return 'Comments';
  }

  isOwnPost(post: CommunityPost): boolean {
    return !!this.currentUserKeycloakId && post.authorKeycloakId === this.currentUserKeycloakId;
  }

  isOwnComment(comment: CommunityComment): boolean {
    return !!this.currentUserKeycloakId && comment.authorKeycloakId === this.currentUserKeycloakId;
  }

  trackByPostId(_index: number, post: CommunityPost): number {
    return post.id;
  }

  trackByCommentId(_index: number, comment: CommunityComment): number {
    return comment.id;
  }

  getAuthorKarma(keycloakId: string): number {
    return this.karmaByUser[keycloakId] ?? 0;
  }

  karmaBadgeClass(karma: number): string {
    if (karma >= 50) return 'karma-gold';
    if (karma >= 20) return 'karma-teal';
    return 'karma-gray';
  }

  karmaBadgeIcon(karma: number): string {
    if (karma >= 50) return 'badge-gold';
    if (karma >= 20) return 'badge-silver';
    return 'badge-default';
  }

  truncateDisplayName(name: string): string {
    return name.length > 15 ? name.slice(0, 15) + '…' : name;
  }

  leaderboardRank(index: number): string {
    if (index === 0) return '1st';
    if (index === 1) return '2nd';
    return '#' + (index + 1);
  }

  navigateToProfile(keycloakId: string): void {
    this.router.navigate(['/profile', keycloakId]);
  }

  onAuthorMouseEnter(event: MouseEvent, keycloakId: string): void {
    if (this.hoverCardTimer !== null) clearTimeout(this.hoverCardTimer);
    this.hoverCardTimer = setTimeout(() => {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      this.hoverCardPosition = {
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
      };
      this.hoveredAuthorId = keycloakId;
      this.hoveredProfile = null;
      this.cdr.markForCheck();

      this.communityApi.getUserProfile(keycloakId).subscribe({
        next: (profile) => { this.hoveredProfile = profile; this.cdr.markForCheck(); },
        error: () => {},
      });

      if (this.currentUserKeycloakId) {
        this.communityApi.checkIsFollowing(keycloakId).subscribe({
          next: (res) => { this.isFollowingHovered = res.following; this.cdr.markForCheck(); },
          error: () => {},
        });
      }
    }, 400);
  }

  onAuthorMouseLeave(): void {
    if (this.hoverCardTimer !== null) clearTimeout(this.hoverCardTimer);
    this.hoverCardTimer = setTimeout(() => {
      this.hoveredAuthorId = null;
      this.hoveredProfile = null;
      this.cdr.markForCheck();
    }, 200);
  }

  onHoverCardMouseEnter(): void {
    if (this.hoverCardTimer !== null) clearTimeout(this.hoverCardTimer);
  }

  onHoverCardMouseLeave(): void {
    this.hoveredAuthorId = null;
    this.hoveredProfile = null;
    this.cdr.markForCheck();
  }

  toggleFollowHovered(): void {
    if (!this.hoveredAuthorId) return;
    const request$ = this.isFollowingHovered
      ? this.communityApi.unfollowUser(this.hoveredAuthorId)
      : this.communityApi.followUser(this.hoveredAuthorId);
    request$.subscribe({
      next: () => { this.isFollowingHovered = !this.isFollowingHovered; this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  private loadInitialData(): void {
    this.isInitialLoading = true;
    this.errorMessage = '';

    forkJoin({
      posts: this.communityApi.getPosts(0, this.pageSize, '', '', 'createdAt,desc'),
      followers: this.communityApi.getFollowers().pipe(catchError(() => of([] as CommunityFollow[]))),
      following: this.communityApi.getFollowing().pipe(catchError(() => of([] as CommunityFollow[]))),
    })
      .pipe(finalize(() => { this.isInitialLoading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: ({ posts, followers, following }) => {
          this.applyPostsResponse(posts, false);
          this.followers = followers;
          this.following = following;
          this.refreshWhoToFollow();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.errorMessage = this.getErrorMessage(error);
          this.cdr.markForCheck();
        },
      });
  }

  private loadPosts(page: number, append: boolean): void {
    if (!append) {
      this.errorMessage = '';
      this.isInitialLoading = page === 0;
    }

    this.communityApi.getPosts(
      page,
      this.pageSize,
      this.selectedType,
      this.selectedIndustry,
      this.selectedSort
    )
      .pipe(finalize(() => {
        this.isInitialLoading = false;
        this.isLoadingMore = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.applyPostsResponse(response, append);
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.errorMessage = this.getErrorMessage(error);
          this.cdr.markForCheck();
        },
      });
  }

  private applyPostsResponse(response: CommunityPageResponse<CommunityPost>, append: boolean): void {
    this.posts = append ? [...this.posts, ...response.content] : response.content;
    this.currentPage = response.number;
    this.totalPosts = response.totalElements;
    this.totalPages = response.totalPages;
    this.hasMore = response.number + 1 < response.totalPages;
    this.refreshTrendingTopics();
  }

  private loadComments(postId: number): void {
    this.loadingComments[postId] = true;
    this.commentErrors[postId] = '';

    this.communityApi.getComments(postId)
      .pipe(finalize(() => { this.loadingComments[postId] = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (comments) => {
          this.commentsByPost[postId] = comments;
          this.loadedComments[postId] = true;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.commentErrors[postId] = this.getErrorMessage(error);
          this.cdr.markForCheck();
        },
      });
  }

  private replacePost(updatedPost: CommunityPost): void {
    this.posts = this.posts.map((post) => post.id === updatedPost.id ? updatedPost : post);
  }

  private refreshFollowingAfterToggle(targetKeycloakId: string, isFollowing: boolean): void {
    if (isFollowing) {
      this.following = [
        ...this.following,
        {
          followerKeycloakId: this.currentUserKeycloakId,
          followingKeycloakId: targetKeycloakId,
          followedAt: new Date().toISOString(),
        },
      ];
    } else {
      this.following = this.following.filter(
        (follow) => follow.followingKeycloakId !== targetKeycloakId,
      );
    }
    // Re-derive Who to follow so the just-followed user disappears from the panel.
    this.refreshWhoToFollow();
  }

  private syncWhoToFollow(following: CommunityFollow[]): void {
    const followingIds = new Set(following.map((item) => item.followingKeycloakId));
    this.whoToFollow = this.whoToFollow.map((person) => ({
      ...person,
      following: followingIds.has(person.keycloakId),
    }));
  }

  /**
   * Build "Who to follow" from the live karma leaderboard.
   * Excludes the current user and anyone we already follow.
   */
  private refreshWhoToFollow(): void {
    if (!this.leaderboard?.length) {
      this.whoToFollow = [];
      return;
    }
    const followingIds = new Set(
      (this.following || []).map((f) => f.followingKeycloakId),
    );
    this.whoToFollow = this.leaderboard
      .filter(
        (entry) =>
          entry.keycloakId &&
          entry.keycloakId !== this.currentUserKeycloakId &&
          !followingIds.has(entry.keycloakId),
      )
      .slice(0, 5)
      .map((entry) => {
        const name =
          (entry.displayName && entry.displayName.trim()) ||
          this.truncateKeycloakId(entry.keycloakId);
        const postsLabel =
          entry.postsCount === 1 ? '1 post' : `${entry.postsCount} posts`;
        return {
          name,
          initials: this.getInitials(name),
          title: `${entry.totalKarma} karma · ${postsLabel}`,
          keycloakId: entry.keycloakId,
          following: false,
          loading: false,
        };
      });
  }

  /**
   * Compute trending topics from the tags of currently-loaded posts.
   * Falls back to an empty list when there are no tagged posts yet.
   */
  private refreshTrendingTopics(): void {
    const counts = new Map<string, number>();
    for (const post of this.posts) {
      if (!post?.tags) continue;
      const raw = String(post.tags);
      const tags = raw
        .split(/[,#\s]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 1 && t.length < 32);
      for (const t of tags) {
        const key = t.toLowerCase();
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    this.trendingTopics = Array.from(counts.entries())
      .map(([tag, posts]) => ({
        tag: tag.replace(/\b\w/g, (c) => c.toUpperCase()),
        posts,
      }))
      .sort((a, b) => b.posts - a.posts)
      .slice(0, 5);
  }

  private truncateKeycloakId(keycloakId: string): string {
    if (keycloakId.length <= 18) {
      return keycloakId;
    }
    return `${keycloakId.slice(0, 8)}...${keycloakId.slice(-6)}`;
  }

  private getErrorMessage(error: unknown): string {
    const httpError = error as HttpErrorResponse;

    if (httpError.status === 0) {
      return 'Cannot connect to community service on port 8086';
    }

    const payload = httpError.error;

    if (payload?.fields && typeof payload.fields === 'object') {
      return Object.values(payload.fields).join(', ');
    }

    if (typeof payload === 'string' && payload.trim()) {
      return payload;
    }

    if (payload?.message) {
      return payload.message;
    }

    if (payload?.error) {
      return payload.error;
    }

    return 'Something went wrong while contacting the community service.';
  }
}
