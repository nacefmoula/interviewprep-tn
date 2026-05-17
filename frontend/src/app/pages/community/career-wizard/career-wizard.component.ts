import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommunityApiService, CareerWizardForm, CareerRecommendationResult, Post } from '../../../core/services/community-api.service';

@Component({
  selector: 'app-career-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wizard-container">
      <!-- Wizard Screen -->
      @if (!showResults) {
        <div class="wizard-card">
          <div class="wizard-header">
            <div class="wizard-header-top">
              <button type="button" class="btn-back" (click)="backToCommunity()">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                Back to Community
              </button>
            </div>
            <h1>Career Match Wizard</h1>
            <div class="progress-section">
              <div class="step-dots">
                @for (name of stepNames; track name; let i = $index) {
                  <div class="step-dot-item">
                    <div class="step-dot" [class.active]="i + 1 <= currentStep"></div>
                    <span class="step-dot-label">{{ name }}</span>
                  </div>
                }
              </div>
              <div class="progress-bar-container">
                <div class="progress-bar" [style.width.%]="progressPercent"></div>
              </div>
              <span class="step-indicator">Step {{ currentStep }} of {{ totalSteps }} — {{ stepNames[currentStep - 1] }}</span>
            </div>
          </div>

          <!-- Step 1: Who are you? -->
          @if (currentStep === 1) {
            <div class="step-content">
              <h2>Who are you?</h2>
              <div class="form-group">
                <label>Current Role</label>
                <select [(ngModel)]="form.currentRole" name="currentRole" class="input" id="currentRole">
                  <option value="">Select your current role</option>
                  @for (option of currentRoleOptions; track option) {
                    <option [value]="option">{{ option }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Years of Experience</label>
                <div class="number-input-group">
                  <button type="button" (click)="decrementExp()" class="btn-mini">−</button>
                  <input type="number" [(ngModel)]="form.experienceYears" name="exp" class="number-input" readonly />
                  <button type="button" (click)="incrementExp()" class="btn-mini">+</button>
                </div>
                <span class="help-text">{{ form.experienceYears }} years</span>
              </div>
              <div class="form-group">
                <label>Career Level</label>
                <div class="card-grid">
                  @for (level of careerLevelOptions; track level.value) {
                    <button
                      type="button"
                      class="card-radio"
                      [class.active]="form.careerLevel === level.value"
                      (click)="form.careerLevel = level.value; cdr.markForCheck()"
                    >
                      {{ level.label }}
                    </button>
                  }
                </div>
              </div>
            </div>
          }

          <!-- Step 2: Where do you want to go? -->
          @if (currentStep === 2) {
            <div class="step-content">
              <h2>Where do you want to go?</h2>
              <div class="form-group">
                <label>Target Roles (max 3)</label>
                <div class="tag-input-group">
                  <input
                    type="text"
                    [(ngModel)]="targetRoleInput"
                    (keyup.enter)="addTargetRole(targetRoleInput)"
                    name="roleInput"
                    class="input"
                    placeholder="Type role and press Enter"
                  />
                  <button type="button" (click)="addTargetRole(targetRoleInput)" class="btn btn-sm">Add</button>
                </div>
                <div class="tags-container">
                  @for (role of form.targetRoles; track role) {
                    <span class="tag">
                      {{ role }}
                      <button type="button" (click)="removeTargetRole(role)" class="tag-remove">×</button>
                    </span>
                  }
                </div>
                <div class="suggestions">
                  <strong>Suggestions:</strong>
                  @for (role of suggestedRoles; track role) {
                    <button type="button" (click)="addTargetRole(role)" class="chip">{{ role }}</button>
                  }
                </div>
              </div>
            </div>
          }

          <!-- Step 3: Your skills -->
          @if (currentStep === 3) {
            <div class="step-content">
              <h2>Your Skills</h2>
              <div class="form-group">
                <label>Current Skills</label>
                <div class="tag-input-group">
                  <input
                    type="text"
                    [(ngModel)]="skillInput"
                    (keyup.enter)="addSkill(skillInput)"
                    name="skillInput"
                    class="input"
                    placeholder="Type skill and press Enter"
                  />
                  <button type="button" (click)="addSkill(skillInput)" class="btn btn-sm">Add</button>
                </div>
                <div class="tags-container">
                  @for (skill of form.skills; track skill) {
                    <span class="tag">
                      {{ skill }}
                      <button type="button" (click)="removeSkill(skill)" class="tag-remove">×</button>
                    </span>
                  }
                </div>
                <div class="suggestions">
                  <strong>Suggestions:</strong>
                  @for (skill of suggestedSkills; track skill) {
                    <button type="button" (click)="addSkill(skill)" class="chip">{{ skill }}</button>
                  }
                </div>
              </div>
            </div>
          }

          <!-- Step 4: Work preferences -->
          @if (currentStep === 4) {
            <div class="step-content">
              <h2>Work Preferences</h2>
              <div class="form-group">
                <label>Preferred Work Type</label>
                <div class="card-grid">
                  @for (type of workTypeOptions; track type.value) {
                    <button
                      type="button"
                      class="card-radio"
                      [class.active]="form.workType === type.value"
                      (click)="form.workType = type.value; cdr.markForCheck()"
                    >
                      {{ type.label }}
                    </button>
                  }
                </div>
              </div>
              <div class="form-group">
                <label>Target Industries</label>
                <div class="checkbox-grid">
                  @for (industry of industryOptions; track industry) {
                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        [checked]="form.targetIndustries.includes(industry)"
                        (change)="toggleIndustry(industry)"
                      />
                      {{ industry }}
                    </label>
                  }
                </div>
              </div>
              <div class="form-group">
                <label>Availability</label>
                <div class="card-grid">
                  @for (avail of availabilityOptions; track avail.value) {
                    <button
                      type="button"
                      class="card-radio"
                      [class.active]="form.availability === avail.value"
                      (click)="form.availability = avail.value; cdr.markForCheck()"
                    >
                      {{ avail.label }}
                    </button>
                  }
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Min Salary (TND/month, optional)</label>
                  <input type="number" [(ngModel)]="form.salaryMin" name="salaryMin" class="input" />
                </div>
                <div class="form-group">
                  <label>Max Salary (TND/month, optional)</label>
                  <input type="number" [(ngModel)]="form.salaryMax" name="salaryMax" class="input" />
                </div>
              </div>
            </div>
          }

          <!-- Step 5: Review & confirm -->
          @if (currentStep === 5) {
            <div class="step-content">
              <h2>Review Your Answers</h2>
              <div class="review-grid">
                <div class="review-section">
                  <strong>Current Role</strong>
                  <p>{{ form.currentRole || '—' }}</p>
                </div>
                <div class="review-section">
                  <strong>Target Roles</strong>
                  <p>{{ form.targetRoles.join(', ') || '—' }}</p>
                </div>
                <div class="review-section">
                  <strong>Experience</strong>
                  <p>{{ form.experienceYears }} years</p>
                </div>
                <div class="review-section">
                  <strong>Career Level</strong>
                  <p>{{ form.careerLevel }}</p>
                </div>
                <div class="review-section">
                  <strong>Skills</strong>
                  <p>{{ form.skills.join(', ') || '—' }}</p>
                </div>
                <div class="review-section">
                  <strong>Industries</strong>
                  <p>{{ form.targetIndustries.join(', ') || '—' }}</p>
                </div>
                <div class="review-section">
                  <strong>Work Type</strong>
                  <p>{{ form.workType }}</p>
                </div>
                <div class="review-section">
                  <strong>Availability</strong>
                  <p>{{ form.availability }}</p>
                </div>
              </div>
            </div>
          }

          @if (isSubmitting) {
            <div class="analyzing-overlay">
              <div class="analyzing-spinner"></div>
              <p>Analyzing your profile...</p>
              <p class="analyzing-sub">Matching against {{ totalJobs }} jobs in our catalog</p>
            </div>
          }

          <!-- Navigation buttons -->
          <div class="wizard-footer">
            <button type="button" (click)="prevStep()" class="btn btn-secondary" [disabled]="currentStep === 1">
              Back
            </button>
            @if (currentStep < totalSteps) {
              <button type="button" (click)="nextStep()" class="btn btn-primary" [disabled]="!isStepValid()">
                Next
              </button>
            }
            @if (currentStep === totalSteps) {
              <button
                type="button"
                (click)="submitWizard()"
                class="btn btn-primary"
                [disabled]="isSubmitting"
              >
                @if (isSubmitting) {
                  <span class="spinner"></span>
                }
                {{ isSubmitting ? 'Analyzing...' : 'Get My Recommendations' }}
              </button>
            }
          </div>
        </div>
      }

      <!-- Results Screen -->
      @if (showResults && results) {
        <div class="results-card">
          <h1>Your Career Match Profile</h1>
          <p class="subtitle">
            {{ results.profile.currentRole }} → {{ results.profile.targetRoles?.split(',').join(', ') || '—' }}
          </p>

          <div class="results-grid">
            <!-- Top Job Matches -->
            <div class="results-section">
              <h2>Top Job Matches</h2>
              @for (match of results.topJobs; track match.job.id; let i = $index) {
                <div class="job-card">
                  <div class="job-header">
                    <h3>{{ i + 1 }}. {{ match.job.title }}</h3>
                    <div class="match-score">{{ match.matchScore }}%</div>
                  </div>
                  <p class="job-company">{{ match.job.company }}</p>
                  <p class="job-location">📍 {{ match.job.location }}</p>
                  @if (match.job.salaryMin && match.job.salaryMax) {
                    <p class="job-salary">💰 {{ match.job.salaryMin }} - {{ match.job.salaryMax }} TND</p>
                  }
                  <div class="job-badges">
                    <span class="badge">{{ match.job.workType }}</span>
                    <span class="badge">{{ match.job.careerLevel }}</span>
                  </div>
                  <div class="match-reasons">
                    @for (reason of match.matchReasons; track reason) {
                      <span class="reason-tag">{{ reason }}</span>
                    }
                  </div>
                  @if (match.job.jobUrl) {
                    <button type="button" (click)="openJobUrl(match.job.jobUrl)" class="btn btn-sm btn-primary">
                      View Job
                    </button>
                  }
                </div>
              }
            </div>

            <!-- Skills Gap -->
            @if (results.skillsGap.length > 0) {
              <div class="results-section">
                <h2>Skills to Learn</h2>
                <div class="skills-list">
                  @for (skill of results.skillsGap; track skill) {
                    <span class="skill-tag">{{ skill }}</span>
                  }
                </div>
              </div>
            }
          </div>

          @if (results.peopleToFollow && results.peopleToFollow.length > 0) {
            <div class="results-section">
              <h2>People to Follow</h2>
              <p class="section-subtitle">Community members with similar career paths</p>
              <div class="people-list">
                @for (person of results.peopleToFollow; track person) {
                  <div class="person-card">
                    <div class="person-avatar">{{ person.substring(0, 2).toUpperCase() }}</div>
                    <div class="person-info">
                      <span class="person-id">Community Member</span>
                      <span class="person-sub">Similar career goals</span>
                    </div>
                    <button type="button" class="btn btn-sm btn-secondary">Follow</button>
                  </div>
                }
              </div>
            </div>
          }

          @if (results.postsToRead && results.postsToRead.length > 0) {
            <div class="results-section">
              <h2>Posts to Read</h2>
              <p class="section-subtitle">Community discussions relevant to your career goals</p>
              <div class="posts-list">
                @for (post of results.postsToRead; track post.id) {
                  <div class="post-card">
                    <div class="post-meta">
                      @if (post.tags) {
                        <span class="post-tag">{{ post.tags.split(',')[0] }}</span>
                      }
                    </div>
                    <h4 class="post-title">{{ post.title }}</h4>
                    <p class="post-excerpt">{{ post.content.substring(0, 100) }}{{ post.content.length > 100 ? '...' : '' }}</p>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Action buttons -->
          <div class="results-footer">
            <button type="button" (click)="retakeWizard()" class="btn btn-secondary">
              Retake Wizard
            </button>
            <button type="button" (click)="backToCommunity()" class="btn btn-primary">
              Back to Community
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .wizard-container {
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1rem;
      font-family: var(--font-body);
    }

    .wizard-card, .results-card {
      background: var(--color-surface);
      border: 0.5px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      position: relative;
    }

    .wizard-header {
      margin-bottom: 2rem;
    }
    .wizard-header-top {
      margin-bottom: 1rem;
    }
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
    }
    .btn-back:hover { color: #1D9E75; border-color: rgba(29,158,117,0.4); background: rgba(29,158,117,0.06); }

    .wizard-header h1 {
      margin: 0 0 1rem 0;
      font-size: 1.75rem;
      color: var(--color-text);
    }

    .progress-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .progress-bar-container {
      background: var(--color-border-light);
      height: 4px;
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-bar {
      background: linear-gradient(90deg, #1D9E75, #15c481);
      height: 100%;
      transition: width 0.3s ease;
    }

    .step-indicator {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    .step-content {
      margin: 2rem 0;
      animation: fadeSlideIn 0.25s ease;
    }

    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .step-content h2 {
      font-size: 1.25rem;
      margin: 0 0 1.5rem 0;
      color: var(--color-text);
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: var(--color-text);
      font-size: 0.875rem;
    }

    .input {
      width: 100%;
      padding: 0.75rem;
      border: 0.5px solid var(--color-border-light);
      border-radius: var(--radius-md);
      background: var(--color-background);
      color: var(--color-text);
      font-family: var(--font-body);
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.2s;
    }

    .input:focus {
      border-color: #1D9E75;
    }

    .number-input-group {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .number-input {
      flex: 1;
      text-align: center;
    }

    .btn-mini {
      width: 40px;
      height: 40px;
      border: 0.5px solid var(--color-border-light);
      background: var(--color-surface);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 1.25rem;
      transition: all 0.2s;
    }

    .btn-mini:hover {
      background: var(--color-background);
    }

    .help-text {
      display: block;
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 1rem;
    }

    .card-radio {
      padding: 1rem;
      border: 0.5px solid var(--color-border-light);
      background: var(--color-background);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
      font-weight: 500;
      color: var(--color-text);
    }

    .card-radio:hover {
      border-color: #1D9E75;
      background: #f0fdf9;
    }

    .card-radio.active {
      background: #1D9E75;
      color: white;
      border-color: #1D9E75;
    }

    .tag-input-group {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .tag-input-group .input {
      flex: 1;
    }

    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .tag {
      background: #1D9E75;
      color: white;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .tag-remove {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 1rem;
      padding: 0;
    }

    .suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    .suggestions strong {
      width: 100%;
      font-size: 0.875rem;
    }

    .chip {
      background: var(--color-background);
      border: 0.5px solid var(--color-border-light);
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 0.75rem;
      transition: all 0.2s;
    }

    .chip:hover {
      border-color: #1D9E75;
      background: #f0fdf9;
    }

    .checkbox-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 1rem;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-weight: 400;
    }

    .checkbox-label input {
      cursor: pointer;
    }

    .review-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
    }

    .review-section {
      padding: 1rem;
      background: var(--color-background);
      border-radius: var(--radius-md);
    }

    .review-section strong {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--color-text);
    }

    .review-section p {
      margin: 0;
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }

    .wizard-footer {
      display: flex;
      gap: 1rem;
      justify-content: space-between;
      margin-top: 2rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary {
      background: #1D9E75;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #15c481;
    }

    .btn-secondary {
      background: var(--color-border-light);
      color: var(--color-text);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--color-border-light);
    }

    .btn-sm {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Results styles */
    .results-card h1 {
      margin: 0 0 0.5rem 0;
      font-size: 1.75rem;
      color: var(--color-text);
    }

    .subtitle {
      color: var(--color-text-muted);
      margin: 0 0 2rem 0;
      font-size: 0.875rem;
    }

    .results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .results-section h2 {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      color: var(--color-text);
    }

    .job-card {
      background: var(--color-background);
      border: 0.5px solid var(--color-border-light);
      border-radius: var(--radius-md);
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .job-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }

    .job-header h3 {
      margin: 0;
      font-size: 0.95rem;
      color: var(--color-text);
    }

    .match-score {
      background: #1D9E75;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .job-company, .job-location, .job-salary {
      margin: 0.25rem 0;
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .job-badges {
      display: flex;
      gap: 0.5rem;
      margin: 0.75rem 0;
    }

    .badge {
      background: #f0fdf9;
      color: #1D9E75;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 500;
    }

    .match-reasons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 0.75rem 0;
    }

    .reason-tag {
      background: #f0fdf9;
      color: #1D9E75;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.65rem;
    }

    .skills-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .skill-tag {
      background: #1D9E75;
      color: white;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-md);
      font-size: 0.75rem;
    }

    .results-footer {
      display: flex;
      gap: 1rem;
      justify-content: space-between;
    }

    /* Step dots */
    .step-dots {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }

    .step-dot-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      flex: 1;
    }

    .step-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid var(--color-border-light);
      background: var(--color-background);
      transition: all 0.2s;
    }

    .step-dot.active {
      background: #1D9E75;
      border-color: #1D9E75;
    }

    .step-dot-label {
      font-size: 0.65rem;
      color: var(--color-text-muted);
    }

    /* Analyzing overlay */
    .analyzing-overlay {
      position: absolute;
      inset: 0;
      background: rgba(255,255,255,0.92);
      border-radius: var(--radius-lg);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      z-index: 10;
    }

    .analyzing-overlay p {
      margin: 0;
      font-weight: 500;
      color: var(--color-text);
    }

    .analyzing-sub {
      font-size: 0.8rem !important;
      color: var(--color-text-muted) !important;
      font-weight: 400 !important;
    }

    .analyzing-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(29,158,117,0.2);
      border-top-color: #1D9E75;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* People to follow */
    .section-subtitle {
      font-size: 0.8rem;
      color: var(--color-text-muted);
      margin: -0.5rem 0 1rem 0;
    }

    .people-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .person-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      background: var(--color-background);
      border: 0.5px solid var(--color-border-light);
      border-radius: var(--radius-md);
    }

    .person-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #1D9E75;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .person-info {
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 0.1rem;
    }

    .person-id {
      font-weight: 500;
      font-size: 0.875rem;
      color: var(--color-text);
    }

    .person-sub {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    /* Posts to read */
    .posts-list {
      display: flex;
      flex-direction: column;
    }

    .post-card {
      background: var(--color-background);
      border: 0.5px solid var(--color-border-light);
      border-radius: var(--radius-md);
      padding: 1rem;
      margin-bottom: 0.75rem;
    }

    .post-meta {
      margin-bottom: 0.5rem;
    }

    .post-tag {
      background: #f0fdf9;
      color: #1D9E75;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 500;
    }

    .post-title {
      font-size: 0.9rem;
      font-weight: 600;
      margin: 0 0 0.5rem 0;
      color: var(--color-text);
    }

    .post-excerpt {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin: 0;
      line-height: 1.5;
    }

    @media (max-width: 640px) {
      .wizard-card, .results-card {
        padding: 1rem;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .card-grid {
        grid-template-columns: 1fr;
      }

      .results-grid {
        grid-template-columns: 1fr;
      }

      .wizard-footer {
        flex-direction: column;
      }

      .btn {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class CareerWizardComponent implements OnInit {
  private communityApi = inject(CommunityApiService);
  private router = inject(Router);
  cdr = inject(ChangeDetectorRef);

  currentStep = 1;
  totalSteps = 5;
  showResults = false;
  isSubmitting = false;
  errorMessage = '';
  totalJobs = 26;

  readonly stepNames = ['Profile', 'Goals', 'Skills', 'Preferences', 'Review'];

  form: CareerWizardForm = {
    currentRole: '',
    targetRoles: [],
    experienceYears: 0,
    careerLevel: 'ENTRY',
    skills: [],
    targetIndustries: [],
    workType: 'ANY',
    availability: 'IMMEDIATE',
  };

  skillInput = '';
  targetRoleInput = '';
  results: CareerRecommendationResult | null = null;

  readonly currentRoleOptions = [
    'Student', 'Recent Graduate', 'Junior Developer', 'Mid-level Developer',
    'Senior Developer', 'Career Changer', 'Freelancer', 'Other'
  ];

  readonly careerLevelOptions = [
    { value: 'ENTRY',  label: 'Entry Level (0-2 years)' },
    { value: 'MID',    label: 'Mid Level (2-5 years)' },
    { value: 'SENIOR', label: 'Senior (5-10 years)' },
    { value: 'LEAD',   label: 'Lead / Architect (10+ years)' },
  ] as const;

  readonly industryOptions = [
    'Technology', 'Finance', 'Healthcare', 'Education', 'Engineering',
    'Marketing', 'Consulting', 'Media', 'Other'
  ];

  readonly workTypeOptions = [
    { value: 'REMOTE', label: 'Remote' },
    { value: 'HYBRID', label: 'Hybrid' },
    { value: 'ONSITE', label: 'On-site' },
    { value: 'ANY',    label: 'No preference' },
  ] as const;

  readonly availabilityOptions = [
    { value: 'IMMEDIATE',    label: 'Immediately' },
    { value: 'ONE_MONTH',    label: 'Within 1 month' },
    { value: 'THREE_MONTHS', label: 'Within 3 months' },
  ] as const;

  readonly suggestedRoles = [
    'Backend Engineer', 'Frontend Developer', 'Full Stack Developer',
    'DevOps Engineer', 'Data Scientist', 'Data Engineer', 'Mobile Developer',
    'Cloud Engineer', 'QA Engineer', 'Product Manager', 'Cybersecurity Analyst'
  ];

  readonly suggestedSkills = [
    'Java', 'Spring Boot', 'Angular', 'React', 'Python', 'Docker', 'Kubernetes',
    'PostgreSQL', 'TypeScript', 'Node.js', 'AWS', 'Git', 'Linux', 'Kafka', 'Redis'
  ];

  get progressPercent(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  ngOnInit(): void {
    this.communityApi.getWizardProgress().subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        if (!data) { this.cdr.markForCheck(); return; }

        // Pre-fill form
        this.form.currentRole = data.currentRole || '';
        this.form.targetRoles = data.targetRoles ? data.targetRoles.split(',').filter((s: string) => s.trim()) : [];
        this.form.experienceYears = data.experienceYears || 0;
        this.form.careerLevel = data.careerLevel || 'ENTRY';
        this.form.skills = data.skills ? data.skills.split(',').filter((s: string) => s.trim()) : [];
        this.form.targetIndustries = data.targetIndustries ? data.targetIndustries.split(',').filter((s: string) => s.trim()) : [];
        this.form.workType = data.workType || 'ANY';
        this.form.availability = data.availability || 'IMMEDIATE';
        this.form.salaryMin = data.salaryMin;
        this.form.salaryMax = data.salaryMax;

        if (data.completed) {
          // Load results directly, skip wizard
          this.communityApi.getRecommendations().subscribe({
            next: (recRes: any) => {
              this.results = recRes?.data || recRes;
              this.showResults = true;
              this.cdr.markForCheck();
            },
            error: () => { this.cdr.markForCheck(); }
          });
        } else {
          this.cdr.markForCheck();
        }
      },
      error: () => { this.cdr.markForCheck(); }
    });
  }

  nextStep(): void {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.communityApi.saveWizardProgress(this.form).subscribe({
        error: () => {}
      });
      this.cdr.markForCheck();
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.cdr.markForCheck();
    }
  }

  submitWizard(): void {
    this.isSubmitting = true;
    this.cdr.markForCheck();
    this.communityApi.completeWizard(this.form).subscribe({
      next: (result) => {
        this.results = result;
        this.showResults = true;
        this.isSubmitting = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = 'Failed to generate recommendations';
        this.cdr.markForCheck();
      }
    });
  }

  addSkill(skill: string): void {
    if (skill.trim() && !this.form.skills.includes(skill.trim())) {
      this.form.skills.push(skill.trim());
      this.skillInput = '';
      this.cdr.markForCheck();
    }
  }

  removeSkill(skill: string): void {
    this.form.skills = this.form.skills.filter(s => s !== skill);
    this.cdr.markForCheck();
  }

  addTargetRole(role: string): void {
    if (role.trim() && !this.form.targetRoles.includes(role.trim()) && this.form.targetRoles.length < 3) {
      this.form.targetRoles.push(role.trim());
      this.targetRoleInput = '';
      this.cdr.markForCheck();
    }
  }

  removeTargetRole(role: string): void {
    this.form.targetRoles = this.form.targetRoles.filter(r => r !== role);
    this.cdr.markForCheck();
  }

  toggleIndustry(industry: string): void {
    if (this.form.targetIndustries.includes(industry)) {
      this.form.targetIndustries = this.form.targetIndustries.filter(i => i !== industry);
    } else {
      this.form.targetIndustries.push(industry);
    }
    this.cdr.markForCheck();
  }

  incrementExp(): void {
    if (this.form.experienceYears < 20) {
      this.form.experienceYears++;
      this.cdr.markForCheck();
    }
  }

  decrementExp(): void {
    if (this.form.experienceYears > 0) {
      this.form.experienceYears--;
      this.cdr.markForCheck();
    }
  }

  isStepValid(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!this.form.currentRole && this.form.experienceYears >= 0;
      case 2:
        return this.form.targetRoles.length > 0;
      case 3:
        return this.form.skills.length > 0;
      case 4:
        return this.form.targetIndustries.length > 0;
      case 5:
        return true;
      default:
        return false;
    }
  }

  openJobUrl(url: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  retakeWizard(): void {
    this.showResults = false;
    this.currentStep = 1;
    this.form = {
      currentRole: '',
      targetRoles: [],
      experienceYears: 0,
      careerLevel: 'ENTRY',
      skills: [],
      targetIndustries: [],
      workType: 'ANY',
      availability: 'IMMEDIATE',
    };
    this.cdr.markForCheck();
  }

  backToCommunity(): void {
    this.router.navigate(['/community']);
  }
}
