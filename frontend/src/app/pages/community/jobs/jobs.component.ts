import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommunityApiService } from '../../../core/services/community-api.service';

@Component({
  selector: 'app-jobs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="jobs-page">
      <div class="jobs-header">
        <div class="jobs-header-left">
          <button type="button" class="btn-back" (click)="backToCommunity()">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back to Community
          </button>
          <h1 class="jobs-title">Job Board</h1>
          <p class="jobs-subtitle">Browse and apply to tech jobs in Tunisia and remote</p>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <input
          class="filter-input"
          type="text"
          [(ngModel)]="keyword"
          placeholder="Search by title or skill..."
          (keydown.enter)="search()"
        />
        <select class="filter-select" [(ngModel)]="selectedIndustry">
          <option value="">All Industries</option>
          @for (opt of industryOptions; track opt) {
            <option [value]="opt">{{ opt }}</option>
          }
        </select>
        <select class="filter-select" [(ngModel)]="selectedWorkType">
          <option value="">All Work Types</option>
          @for (opt of workTypeOptions; track opt) {
            <option [value]="opt">{{ opt }}</option>
          }
        </select>
        <button class="btn-search" type="button" (click)="search()">Search</button>
        <button class="btn-clear" type="button" (click)="clearFilters()">Clear</button>
      </div>

      <!-- Skeleton Loading -->
      @if (isLoading) {
        <div class="jobs-grid">
          @for (sk of [1, 2, 3]; track sk) {
            <div class="job-card skeleton-card">
              <div class="skeleton sk-title"></div>
              <div class="skeleton sk-line"></div>
              <div class="skeleton sk-line sk-short"></div>
              <div class="skeleton sk-badges"></div>
              <div class="skeleton sk-skills"></div>
              <div class="skeleton sk-buttons"></div>
            </div>
          }
        </div>
      }

      <!-- Empty State -->
      @if (!isLoading && jobs.length === 0) {
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-muted)"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          <p>No jobs found. Try adjusting your filters.</p>
        </div>
      }

      <!-- Jobs Grid -->
      @if (!isLoading && jobs.length > 0) {
        <div class="jobs-grid">
          @for (job of jobs; track job.id) {
            <div class="job-card">
              <div class="job-card-header">
                <div>
                  <h3 class="job-title">{{ job.title }}</h3>
                  <p class="job-company">{{ job.company }}</p>
                  <p class="job-location">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {{ job.location || 'Not specified' }}
                  </p>
                </div>
              </div>

              <div class="job-badges">
                @if (job.workType) {
                  <span class="badge badge-work">{{ job.workType }}</span>
                }
                @if (job.careerLevel) {
                  <span class="badge badge-level">{{ job.careerLevel }}</span>
                }
                @if (job.industry) {
                  <span class="badge badge-industry">{{ job.industry }}</span>
                }
              </div>

              @if (job.salaryMin || job.salaryMax) {
                <p class="job-salary">
                  {{ job.salaryMin | number }} – {{ job.salaryMax | number }} TND/month
                </p>
              }

              @if (getSkillList(job).length > 0) {
                <div class="job-skills">
                  @for (skill of getSkillList(job).slice(0, 5); track skill) {
                    <span class="skill-chip">{{ skill }}</span>
                  }
                  @if (getSkillList(job).length > 5) {
                    <span class="skill-chip skill-more">+{{ getSkillList(job).length - 5 }} more</span>
                  }
                </div>
              }

              <div class="job-actions">
                <button class="btn-apply" type="button" (click)="openQuickApply(job)">Quick Apply</button>
                <button
                  class="btn-view"
                  type="button"
                  [disabled]="!job.jobUrl"
                  (click)="openJobUrl(job.jobUrl)"
                >View Source</button>
              </div>
            </div>
          }
        </div>

        <!-- Pagination -->
        <div class="pagination">
          <button class="btn-page" [disabled]="currentPage === 0" (click)="prevPage()">Previous</button>
          <span class="page-indicator">Page {{ currentPage + 1 }} of {{ totalPages }}</span>
          <button class="btn-page" [disabled]="currentPage >= totalPages - 1" (click)="nextPage()">Next</button>
        </div>
      }
    </div>

    <!-- Quick Apply Modal -->
    @if (showApplyModal && selectedJob) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <button class="modal-close" type="button" (click)="closeModal()">×</button>
          <h2 class="modal-title">Quick Apply — {{ selectedJob.title }}</h2>
          <p class="modal-company">{{ selectedJob.company }}</p>

          <!-- No wizard data -->
          @if (!wizardProfile || !wizardProfile.completed) {
            <div class="no-wizard">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-muted)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p>Complete your Career Wizard first to use Quick Apply</p>
              <button class="btn-wizard" type="button" (click)="goToWizard()">Go to Career Wizard</button>
            </div>
          }

          <!-- Has wizard data -->
          @if (wizardProfile && wizardProfile.completed) {
            <!-- Section 1: Profile Summary -->
            <div class="modal-section">
              <p class="section-label">Your Profile Summary</p>
              <div class="profile-grid">
                <div class="profile-item">
                  <span class="profile-key">Name</span>
                  <span class="profile-val">Your Name</span>
                </div>
                <div class="profile-item">
                  <span class="profile-key">Current Role</span>
                  <span class="profile-val">{{ wizardProfile.currentRole || '—' }}</span>
                </div>
                <div class="profile-item">
                  <span class="profile-key">Experience</span>
                  <span class="profile-val">{{ wizardProfile.experienceYears || 0 }} years</span>
                </div>
                <div class="profile-item">
                  <span class="profile-key">Career Level</span>
                  <span class="profile-val">{{ wizardProfile.careerLevel || '—' }}</span>
                </div>
                <div class="profile-item">
                  <span class="profile-key">Skills</span>
                  <span class="profile-val">{{ wizardProfile.skills || '—' }}</span>
                </div>
                <div class="profile-item">
                  <span class="profile-key">Availability</span>
                  <span class="profile-val">{{ formatAvailability(wizardProfile.availability) }}</span>
                </div>
                <div class="profile-item">
                  <span class="profile-key">Work Preference</span>
                  <span class="profile-val">{{ wizardProfile.workType || '—' }}</span>
                </div>
              </div>
            </div>

            <!-- Section 2: Cover Letter -->
            <div class="modal-section">
              <div class="section-header-row">
                <p class="section-label">Cover Letter</p>
                <div class="copy-row">
                  @if (coverLetterCopied) {
                    <span class="copied-text">Copied!</span>
                  }
                  <button class="btn-copy" type="button" (click)="copyLetter()">Copy Cover Letter</button>
                </div>
              </div>
              <textarea
                class="cover-letter-area"
                [value]="generatedCoverLetter"
                rows="8"
                readonly
              ></textarea>
            </div>

            <!-- Section 3: Action buttons -->
            <div class="modal-actions">
              <button
                class="btn-visit"
                type="button"
                [disabled]="!selectedJob.jobUrl"
                [title]="selectedJob.jobUrl ? '' : 'No URL available'"
                (click)="openJobUrl(selectedJob.jobUrl)"
              >Visit Job Site</button>
              <button class="btn-modal-close" type="button" (click)="closeModal()">Close</button>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .jobs-page {
      max-width: 1100px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
      font-family: inherit;
      color: var(--color-text);
    }
    .jobs-header { margin-bottom: 1.5rem; }
    .jobs-header-left { display: flex; flex-direction: column; gap: 0.25rem; }
    .jobs-title { font-size: 1.75rem; font-weight: 700; margin: 0 0 0.25rem; }
    .jobs-subtitle { color: var(--color-text-muted); margin: 0; font-size: 0.95rem; }
    .btn-back {
      display: inline-flex; align-items: center; gap: 0.4rem;
      padding: 0.35rem 0.75rem;
      font-size: 0.85rem; font-weight: 500; font-family: inherit;
      color: var(--color-text-muted);
      background: transparent;
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.15s;
      margin-bottom: 0.5rem;
      width: fit-content;
    }
    .btn-back:hover { color: var(--teal-600); border-color: var(--teal-300); background: var(--teal-50); }

    /* Filter Bar */
    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.625rem;
      margin-bottom: 1.5rem;
      align-items: center;
    }
    .filter-input {
      flex: 1 1 200px;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border-light);
      border-radius: 8px;
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 0.875rem;
      outline: none;
    }
    .filter-input:focus { border-color: #1D9E75; }
    .filter-select {
      flex: 0 1 160px;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border-light);
      border-radius: 8px;
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 0.875rem;
      outline: none;
      cursor: pointer;
    }
    .btn-search {
      padding: 0.5rem 1.25rem;
      background: #1D9E75;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn-search:hover { opacity: 0.88; }
    .btn-clear {
      padding: 0.5rem 1rem;
      background: transparent;
      color: var(--color-text-muted);
      border: 1px solid var(--color-border-light);
      border-radius: 8px;
      font-size: 0.875rem;
      cursor: pointer;
    }
    .btn-clear:hover { color: var(--color-text); }

    /* Grid */
    .jobs-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    @media (max-width: 640px) {
      .jobs-grid { grid-template-columns: 1fr; }
    }

    /* Job Card */
    .job-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border-light);
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      transition: box-shadow 0.2s;
    }
    .job-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
    .job-card-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .job-title { font-size: 1rem; font-weight: 700; margin: 0 0 0.2rem; line-height: 1.3; }
    .job-company { font-size: 0.875rem; color: var(--color-text-muted); margin: 0 0 0.2rem; }
    .job-location {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8rem;
      color: var(--color-text-muted);
      margin: 0;
    }

    /* Badges */
    .job-badges { display: flex; flex-wrap: wrap; gap: 0.375rem; }
    .badge {
      padding: 0.2rem 0.55rem;
      border-radius: 20px;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    .badge-work  { background: rgba(29,158,117,0.12); color: #1D9E75; }
    .badge-level { background: rgba(99,102,241,0.12); color: #6366f1; }
    .badge-industry { background: rgba(245,158,11,0.12); color: #d97706; }

    /* Salary */
    .job-salary { font-size: 0.85rem; font-weight: 600; color: #1D9E75; margin: 0; }

    /* Skills */
    .job-skills { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .skill-chip {
      padding: 0.175rem 0.5rem;
      background: var(--color-background);
      border: 1px solid var(--color-border-light);
      border-radius: 6px;
      font-size: 0.72rem;
      color: var(--color-text-muted);
    }
    .skill-more { color: #1D9E75; border-color: #1D9E75; background: rgba(29,158,117,0.06); }

    /* Actions */
    .job-actions { display: flex; gap: 0.5rem; margin-top: auto; padding-top: 0.25rem; }
    .btn-apply {
      flex: 1;
      padding: 0.45rem 0;
      background: #1D9E75;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn-apply:hover { opacity: 0.88; }
    .btn-view {
      flex: 1;
      padding: 0.45rem 0;
      background: transparent;
      color: var(--color-text);
      border: 1px solid var(--color-border-light);
      border-radius: 8px;
      font-size: 0.825rem;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .btn-view:hover:not(:disabled) { border-color: #1D9E75; color: #1D9E75; }
    .btn-view:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Pagination */
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 0.5rem 0;
    }
    .btn-page {
      padding: 0.45rem 1rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border-light);
      border-radius: 8px;
      font-size: 0.85rem;
      cursor: pointer;
      color: var(--color-text);
      transition: border-color 0.15s;
    }
    .btn-page:hover:not(:disabled) { border-color: #1D9E75; color: #1D9E75; }
    .btn-page:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-indicator { font-size: 0.875rem; color: var(--color-text-muted); }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 4rem 1rem;
      color: var(--color-text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    .empty-state p { font-size: 0.95rem; }

    /* Skeleton */
    .skeleton {
      background: linear-gradient(90deg, var(--color-border-light) 25%, var(--color-background) 50%, var(--color-border-light) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 6px;
    }
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .skeleton-card { min-height: 220px; }
    .sk-title  { height: 18px; width: 70%; margin-bottom: 0.5rem; }
    .sk-line   { height: 13px; width: 55%; margin-bottom: 0.4rem; }
    .sk-short  { width: 35%; }
    .sk-badges { height: 22px; width: 80%; margin-top: 0.25rem; }
    .sk-skills { height: 18px; width: 90%; }
    .sk-buttons { height: 34px; width: 100%; margin-top: auto; }

    /* Modal Overlay */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-box {
      position: relative;
      background: var(--color-surface);
      border-radius: var(--radius-lg, 16px);
      padding: 2rem;
      max-width: 600px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .modal-close {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: none;
      border: none;
      font-size: 1.5rem;
      line-height: 1;
      color: var(--color-text-muted);
      cursor: pointer;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
    }
    .modal-close:hover { color: var(--color-text); background: var(--color-border-light); }
    .modal-title { font-size: 1.15rem; font-weight: 700; margin: 0; padding-right: 2rem; }
    .modal-company { font-size: 0.875rem; color: var(--color-text-muted); margin: -0.75rem 0 0; }

    /* No wizard state */
    .no-wizard {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 1.5rem 0;
      text-align: center;
      color: var(--color-text-muted);
    }
    .no-wizard p { font-size: 0.95rem; margin: 0; }
    .btn-wizard {
      padding: 0.5rem 1.25rem;
      background: #1D9E75;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-wizard:hover { opacity: 0.88; }

    /* Modal Sections */
    .modal-section { display: flex; flex-direction: column; gap: 0.75rem; }
    .section-label {
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--color-text-muted);
      margin: 0;
      letter-spacing: 0.05em;
    }
    .section-header-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; }
    .copy-row { display: flex; align-items: center; gap: 0.5rem; }
    .copied-text { font-size: 0.8rem; color: #1D9E75; font-weight: 600; }

    /* Profile Grid */
    .profile-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      background: var(--color-background);
      padding: 1rem;
      border-radius: var(--radius-md, 10px);
    }
    @media (max-width: 480px) {
      .profile-grid { grid-template-columns: 1fr; }
    }
    .profile-item { display: flex; flex-direction: column; gap: 0.15rem; }
    .profile-key { font-size: 0.72rem; color: var(--color-text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    .profile-val { font-size: 0.875rem; color: var(--color-text); }

    /* Cover Letter */
    .cover-letter-area {
      width: 100%;
      box-sizing: border-box;
      font-family: monospace;
      font-size: 0.8rem;
      padding: 1rem;
      border: 0.5px solid var(--color-border-light);
      border-radius: var(--radius-md, 10px);
      resize: vertical;
      background: var(--color-background);
      color: var(--color-text);
      line-height: 1.6;
      outline: none;
    }
    .btn-copy {
      padding: 0.35rem 0.875rem;
      background: transparent;
      color: var(--color-text);
      border: 1px solid var(--color-border-light);
      border-radius: 6px;
      font-size: 0.8rem;
      cursor: pointer;
      white-space: nowrap;
    }
    .btn-copy:hover { border-color: #1D9E75; color: #1D9E75; }

    /* Modal Actions */
    .modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; flex-wrap: wrap; }
    .btn-visit {
      padding: 0.5rem 1.25rem;
      background: #1D9E75;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn-visit:hover:not(:disabled) { opacity: 0.88; }
    .btn-visit:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-modal-close {
      padding: 0.5rem 1.25rem;
      background: transparent;
      color: var(--color-text);
      border: 1px solid var(--color-border-light);
      border-radius: 8px;
      font-size: 0.875rem;
      cursor: pointer;
    }
    .btn-modal-close:hover { border-color: var(--color-text-muted); }
  `]
})
export class JobsComponent implements OnInit {
  private readonly communityApi = inject(CommunityApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  jobs: any[] = [];
  totalPages = 0;
  currentPage = 0;
  pageSize = 12;
  isLoading = false;
  keyword = '';
  selectedIndustry = '';
  selectedWorkType = '';

  selectedJob: any = null;
  showApplyModal = false;
  wizardProfile: any = null;
  coverLetterCopied = false;

  readonly industryOptions = ['Technology', 'Finance', 'Healthcare', 'Education', 'Engineering', 'Other'];
  readonly workTypeOptions = ['REMOTE', 'HYBRID', 'ONSITE'];

  ngOnInit(): void {
    this.loadJobs();
    this.communityApi.getWizardProgress().subscribe({
      next: (res: any) => {
        this.wizardProfile = res?.data || res;
        this.cdr.markForCheck();
      },
      error: () => { /* no wizard yet — handled in template */ }
    });
  }

  loadJobs(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.communityApi.getJobs(
      this.currentPage,
      this.pageSize,
      this.selectedIndustry || undefined,
      this.selectedWorkType || undefined,
      this.keyword || undefined
    ).subscribe({
      next: (res: any) => {
        this.jobs = res?.content ?? [];
        this.totalPages = res?.totalPages ?? 0;
        this.currentPage = res?.number ?? 0;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  backToCommunity(): void {
    this.router.navigate(['/community']);
  }

  search(): void {
    this.currentPage = 0;
    this.loadJobs();
  }

  clearFilters(): void {
    this.keyword = '';
    this.selectedIndustry = '';
    this.selectedWorkType = '';
    this.currentPage = 0;
    this.loadJobs();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadJobs();
    }
  }

  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadJobs();
    }
  }

  openJobUrl(url: string): void {
    window.open(url, '_blank');
  }

  openQuickApply(job: any): void {
    this.selectedJob = job;
    this.showApplyModal = true;
    this.coverLetterCopied = false;
    this.cdr.markForCheck();
  }

  closeModal(): void {
    this.showApplyModal = false;
    this.selectedJob = null;
    this.cdr.markForCheck();
  }

  goToWizard(): void {
    this.closeModal();
    this.router.navigate(['/community/career']);
  }

  copyLetter(): void {
    navigator.clipboard.writeText(this.generatedCoverLetter).then(() => {
      this.coverLetterCopied = true;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.coverLetterCopied = false;
        this.cdr.markForCheck();
      }, 2000);
    });
  }

  get generatedCoverLetter(): string {
    const p = this.wizardProfile;
    const job = this.selectedJob;
    if (!p || !job) return '';

    const availability = this.formatAvailability(p.availability);
    const workType = (p.workType || 'flexible').toLowerCase();
    const targetRole = p.targetRoles ? p.targetRoles.split(',')[0].trim() : p.currentRole || 'a new role';
    const topSkills = p.skills
      ? p.skills.split(',').slice(0, 5).map((s: string) => s.trim()).join(', ')
      : 'various technical skills';
    const level = p.careerLevel ? p.careerLevel.toLowerCase() : 'experienced';

    return `Dear Hiring Manager,\n\nI am a ${level} ${p.currentRole || 'professional'} with ${p.experienceYears || 0} years of experience, currently looking for opportunities as a ${targetRole}.\n\nMy key skills include ${topSkills}. I am available ${availability} and prefer ${workType} work.\n\nI am excited about the ${job.title} position at ${job.company} and believe my background aligns well with your requirements.\n\nBest regards`;
  }

  formatAvailability(value: string): string {
    switch (value) {
      case 'IMMEDIATE':    return 'Immediately';
      case 'ONE_MONTH':    return 'Within 1 month';
      case 'THREE_MONTHS': return 'Within 3 months';
      default:             return value || '—';
    }
  }

  getSkillList(job: any): string[] {
    if (!job.requiredSkills) return [];
    return job.requiredSkills.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
  }
}
