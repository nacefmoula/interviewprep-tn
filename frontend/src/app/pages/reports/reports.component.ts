import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ChartPlaceholderComponent } from '../../shared/components/chart-placeholder/chart-placeholder.component';
import { MOCK_REPORTS } from '../../core/data/mock-data';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, StatCardComponent, SectionHeaderComponent, ChartPlaceholderComponent],
  template: `
    <div class="reports-page animate-fade">
      <div class="page-header">
        <div>
          <h1>Performance Reports</h1>
          <p>Detailed analysis of your interview performance, strengths, and growth areas.</p>
        </div>
        <button class="btn btn-secondary"><i class="bi bi-download"></i> Export PDF</button>
      </div>

      <!-- Overall Stats -->
      <div class="report-stats">
        <app-stat-card icon='<i class="bi bi-bullseye"></i>' value="78%" label="Overall Score"        color="teal" change="vs 71% last session" [changePositive]="true"></app-stat-card>
        <app-stat-card icon='<i class="bi bi-mic-fill"></i>' value="23"   label="Sessions Completed"  color="cyan"></app-stat-card>
        <app-stat-card icon='<i class="bi bi-graph-up"></i>' value="+7%"  label="Improvement (30d)"   color="mint" change="vs previous month" [changePositive]="true"></app-stat-card>
        <app-stat-card icon='<i class="bi bi-stopwatch-fill"></i>' value="36h"  label="Total Practice Time" color="sky"></app-stat-card>
      </div>

      <!-- Score Breakdown + Radar -->
      <div class="reports-grid">
        <div class="card score-breakdown">
          <app-section-header title="Score Breakdown" subtitle="Latest session: Amazon Leadership Principles"></app-section-header>
          <div class="categories-list">
            <div class="cat-item" *ngFor="let c of categories">
              <div class="cat-header">
                <div class="cat-label">
                  <span [innerHTML]="c.icon"></span>
                  <span>{{ c.name }}</span>
                </div>
                <span class="cat-score" [class.high]="c.score >= 80" [class.mid]="c.score >= 65 && c.score < 80" [class.low]="c.score < 65">{{ c.score }}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" [style.width]="c.score + '%'" [class.fill-mid]="c.score < 80" [class.fill-low]="c.score < 65"></div>
              </div>
            </div>
          </div>
        </div>

        <app-chart-placeholder
          title="Performance Radar"
          badge="Latest session"
          type="radar"
          height="auto"
        ></app-chart-placeholder>
      </div>

      <!-- Charts row -->
      <div class="charts-row">
        <app-chart-placeholder
          title="Score Trend Over Time"
          badge="All sessions"
          type="line"
          height="240px"
        ></app-chart-placeholder>
        <app-chart-placeholder
          title="Session Scores by Category"
          badge="Last 5 sessions"
          type="bar"
          height="240px"
        ></app-chart-placeholder>
      </div>

      <!-- Strengths & Weaknesses -->
      <div class="sw-grid">
        <div class="card strengths-card">
          <app-section-header title="Your Strengths" icon='<i class="bi bi-lightning-charge-fill"></i>'></app-section-header>
          <div class="sw-list">
            <div class="sw-item strength" *ngFor="let s of report.strengths">
              <span class="sw-icon"><i class="bi bi-check-lg"></i></span>
              <span>{{ s }}</span>
            </div>
          </div>
        </div>

        <div class="card weaknesses-card">
          <app-section-header title="Growth Areas" icon='<i class="bi bi-bullseye"></i>'></app-section-header>
          <div class="sw-list">
            <div class="sw-item weakness" *ngFor="let w of report.weaknesses">
              <span class="sw-icon"><i class="bi bi-arrow-right"></i></span>
              <span>{{ w }}</span>
            </div>
          </div>
        </div>

        <div class="card suggestions-card">
          <app-section-header title="AI Suggestions" icon='<i class="bi bi-robot"></i>'></app-section-header>
          <div class="sw-list">
            <div class="sw-item suggestion" *ngFor="let sg of report.suggestions">
              <span class="sw-icon"><i class="bi bi-lightbulb-fill"></i></span>
              <span>{{ sg }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Report History -->
      <div class="card">
        <app-section-header title="Report History" icon='<i class="bi bi-calendar-fill"></i>' actionLabel="View All"></app-section-header>
        <div class="history-table">
          <div class="ht-header">
            <span>Session</span>
            <span>Date</span>
            <span>Type</span>
            <span>Score</span>
            <span>Action</span>
          </div>
          <div class="ht-row" *ngFor="let r of MOCK_REPORTS">
            <span class="ht-title">{{ r.sessionTitle }}</span>
            <span class="ht-date">{{ r.date }}</span>
            <span><span class="chip chip-teal">Behavioral</span></span>
            <span class="ht-score" [class.high]="r.overallScore >= 80">{{ r.overallScore }}%</span>
            <button class="btn btn-ghost btn-sm">View <i class="bi bi-arrow-right"></i></button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reports-page { display: flex; flex-direction: column; gap: var(--space-6); }
    .report-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: var(--space-4); }
    .reports-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-5); }
    .charts-row  { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-5); }
    .sw-grid     { display: grid; grid-template-columns: repeat(3,1fr); gap: var(--space-5); }

    .categories-list { display: flex; flex-direction: column; gap: var(--space-4); }
    .cat-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2); }
    .cat-label  { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); font-weight: var(--weight-medium); }
    .cat-score  { font-size: var(--text-sm); font-weight: 700; }
    .cat-score.high { color: var(--success-600); }
    .cat-score.mid  { color: var(--warning-600); }
    .cat-score.low  { color: var(--error-500); }

    .fill-mid  { background: linear-gradient(90deg, var(--warning-500), var(--warning-600)) !important; }
    .fill-low  { background: linear-gradient(90deg, var(--error-500), #f87171) !important; }

    .sw-list { display: flex; flex-direction: column; gap: var(--space-3); }
    .sw-item {
      display: flex; align-items: flex-start; gap: var(--space-3);
      font-size: var(--text-sm); line-height: var(--leading-relaxed);
    }
    .sw-icon { font-size: 0.85rem; font-weight: 700; flex-shrink: 0; margin-top: 2px; }
    .strength .sw-icon { color: var(--success-600); }
    .weakness .sw-icon { color: var(--warning-600); }
    .suggestion .sw-icon { color: var(--teal-600); }

    .history-table { display: flex; flex-direction: column; }
    .ht-header {
      display: grid; grid-template-columns: 2fr 1fr 1fr 80px 80px;
      padding: var(--space-3) var(--space-2);
      font-size: var(--text-xs); font-weight: var(--weight-semibold);
      color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;
      border-bottom: 1px solid var(--color-border);
    }
    .ht-row {
      display: grid; grid-template-columns: 2fr 1fr 1fr 80px 80px;
      align-items: center; padding: var(--space-4) var(--space-2);
      border-bottom: 1px solid var(--color-border-light);
      transition: background var(--transition-fast);
    }
    .ht-row:hover { background: var(--neutral-50); }
    .ht-title { font-size: var(--text-sm); font-weight: var(--weight-medium); }
    .ht-date  { font-size: var(--text-sm); color: var(--color-text-muted); }
    .ht-score { font-size: var(--text-sm); font-weight: 700; color: var(--warning-600); }
    .ht-score.high { color: var(--success-600); }

    @media (max-width: 1024px) {
      .report-stats  { grid-template-columns: repeat(2,1fr); }
      .reports-grid, .charts-row, .sw-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class ReportsComponent {
  MOCK_REPORTS = MOCK_REPORTS;
  report = MOCK_REPORTS[0];

  categories = [
    { name: 'Communication',    icon: '<i class="bi bi-chat-fill"></i>', score: 88 },
    { name: 'Confidence',       icon: '<i class="bi bi-lightning-charge-fill"></i>', score: 80 },
    { name: 'Clarity',          icon: '<i class="bi bi-eye-fill"></i>', score: 85 },
    { name: 'Response Structure',icon: '<i class="bi bi-clipboard-fill"></i>', score: 82 },
    { name: 'Stress Handling',  icon: '<i class="bi bi-heart-fill"></i>', score: 75 },
    { name: 'Readiness',        icon: '<i class="bi bi-check-circle-fill"></i>', score: 83 },
  ];
}
