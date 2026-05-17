import { ChangeDetectorRef, Component, Input, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { firstValueFrom } from "rxjs";

import { InterviewApiService } from "../../core/services/interview-api.service";
import { PerformanceReport } from "../../core/models/interview.models";

@Component({
  selector: "app-interview-report-card",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="report-card">
      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading report…</span>
      </div>

      <div class="error" *ngIf="error && !loading">{{ error }}</div>

      <div class="report" *ngIf="report && !loading">
        <div class="scores-grid">
          <div class="score-item main">
            <span class="score-label">Overall</span>
            <span class="score-value">{{ pct(report.globalScore) }}</span>
          </div>
          <div class="score-item">
            <span class="score-label">Communication</span>
            <span class="score-value">{{ pct(report.communicationScore) }}</span>
          </div>
          <div class="score-item">
            <span class="score-label">Content</span>
            <span class="score-value">{{ pct(report.contentQualityScore) }}</span>
          </div>
          <div class="score-item">
            <span class="score-label">Confidence</span>
            <span class="score-value">{{ pct(report.confidenceScore) }}</span>
          </div>
          <div class="score-item">
            <span class="score-label">Stress mgmt</span>
            <span class="score-value">{{ pct(report.stressManagementScore) }}</span>
          </div>
        </div>

        <div class="pill-row">
          <span class="pill level">{{ report.preparationLevel }}</span>
          <span class="pill sessions" *ngIf="report.estimatedSessionsToNextLevel > 0">
            ~{{ report.estimatedSessionsToNextLevel }} sessions to next level
          </span>
        </div>

        <div class="section" *ngIf="report.topStrengths">
          <h4 class="section-title">Strengths</h4>
          <p class="section-body">{{ report.topStrengths }}</p>
        </div>

        <div class="section" *ngIf="report.areasForImprovement">
          <h4 class="section-title">Areas for improvement</h4>
          <p class="section-body">{{ report.areasForImprovement }}</p>
        </div>

        <div class="section" *ngIf="report.actionableRecommendations">
          <h4 class="section-title">Recommendations</h4>
          <p class="section-body">{{ report.actionableRecommendations }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .report-card {
      padding: 20px 0 4px;
      font-family: "Inter", system-ui, sans-serif;
      color: #0b1220;
    }
    .loading {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #6b7280;
      font-size: 14px;
      padding: 12px 0;
    }
    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid #e5e7eb;
      border-top-color: #0d9488;
      border-radius: 50%;
      animation: spin 700ms linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error {
      color: #b91c1c;
      font-size: 13px;
      padding: 8px 0;
    }
    .scores-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 14px;
    }
    .score-item {
      background: #f6f7f9;
      border-radius: 10px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 90px;
    }
    .score-item.main {
      background: #ccfbf1;
    }
    .score-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #6b7280;
    }
    .score-value {
      font-size: 20px;
      font-weight: 700;
      color: #0b1220;
    }
    .pill-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .pill {
      font-size: 12px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 999px;
    }
    .pill.level {
      background: #e0f2fe;
      color: #0369a1;
    }
    .pill.sessions {
      background: #fef3c7;
      color: #b45309;
    }
    .section {
      margin-bottom: 12px;
    }
    .section-title {
      margin: 0 0 4px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #6b7280;
    }
    .section-body {
      margin: 0;
      font-size: 14px;
      line-height: 1.6;
      color: #374151;
    }
  `],
})
export class InterviewReportCardComponent implements OnInit {
  @Input() sessionId!: number;

  private api = inject(InterviewApiService);
  private cdr = inject(ChangeDetectorRef);

  report: PerformanceReport | null = null;
  loading = true;
  error = "";

  async ngOnInit() {
    try {
      this.report = await firstValueFrom(this.api.getReport(this.sessionId));
    } catch (err: any) {
      if (err?.status === 404) {
        this.error = "No report available yet for this session.";
      } else {
        this.error = "Could not load the report.";
      }
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  pct(v: number): string {
    return `${Math.round(v * 100)}%`;
  }
}
