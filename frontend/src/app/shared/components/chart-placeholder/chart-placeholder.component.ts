import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chart-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-wrap" [style.height]="height">
      <div class="chart-title-row">
        <span class="chart-title">{{ title }}</span>
        <span class="chart-badge">{{ badge }}</span>
      </div>
      <div class="chart-visual">
        <ng-container *ngIf="type === 'bar'">
          <div class="bar-chart">
            <div class="bar-group" *ngFor="let b of bars">
              <div class="bar-fill" [style.height]="b.pct + '%'"></div>
              <div class="bar-label">{{ b.label }}</div>
            </div>
          </div>
        </ng-container>
        <ng-container *ngIf="type === 'line'">
          <svg class="line-chart-svg" viewBox="0 0 400 160" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--teal-400)" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="var(--teal-400)" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <path [attr.d]="areaPath" fill="url(#lineGrad)"/>
            <path [attr.d]="linePath" fill="none" stroke="var(--teal-500)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle *ngFor="let pt of linePointsData" [attr.cx]="pt.x" [attr.cy]="pt.y" r="4" fill="var(--teal-500)" stroke="white" stroke-width="2"/>
          </svg>
        </ng-container>
        <ng-container *ngIf="type === 'donut'">
          <div class="donut-wrap">
            <svg viewBox="0 0 120 120" width="120" height="120">
              <circle cx="60" cy="60" r="48" fill="none" stroke="var(--neutral-100)" stroke-width="18"/>
              <circle cx="60" cy="60" r="48" fill="none"
                stroke="var(--teal-400)" stroke-width="18"
                [attr.stroke-dasharray]="donutDash"
                stroke-dashoffset="0"
                stroke-linecap="round"
                transform="rotate(-90 60 60)"/>
            </svg>
            <div class="donut-center">
              <div class="donut-pct">{{ donutValue }}%</div>
              <div class="donut-sub">score</div>
            </div>
          </div>
        </ng-container>
        <ng-container *ngIf="type === 'radar'">
          <svg class="radar-svg" viewBox="0 0 200 200">
            <polygon [attr.points]="radarGrid(0.33)" fill="none" stroke="var(--neutral-200)" stroke-width="1"/>
            <polygon [attr.points]="radarGrid(0.66)" fill="none" stroke="var(--neutral-200)" stroke-width="1"/>
            <polygon [attr.points]="radarGrid(1)" fill="none" stroke="var(--neutral-200)" stroke-width="1"/>
            <polygon [attr.points]="radarData" fill="rgba(20,184,166,0.2)" stroke="var(--teal-500)" stroke-width="2" stroke-linejoin="round"/>
            <text *ngFor="let l of radarLabels; let i = index"
              [attr.x]="radarLabelPos(i).x" [attr.y]="radarLabelPos(i).y"
              text-anchor="middle" dominant-baseline="middle" font-size="9" fill="var(--neutral-500)">{{ l }}</text>
          </svg>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .chart-wrap { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-4); }
    .chart-title-row { display: flex; align-items: center; justify-content: space-between; }
    .chart-title { font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-text); }
    .chart-badge { font-size: var(--text-xs); color: var(--color-text-muted); background: var(--neutral-100); padding: 2px 8px; border-radius: var(--radius-full); }
    .chart-visual { flex: 1; display: flex; align-items: flex-end; }
    .bar-chart { display: flex; align-items: flex-end; gap: 8px; width: 100%; height: 120px; }
    .bar-group { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
    .bar-fill { width: 100%; border-radius: 4px 4px 0 0; min-height: 4px; background: linear-gradient(180deg, var(--teal-400), var(--cyan-400)); }
    .bar-label { font-size: 0.6rem; color: var(--color-text-light); white-space: nowrap; }
    .line-chart-svg { width: 100%; height: 100%; min-height: 100px; }
    .donut-wrap { display: flex; align-items: center; gap: var(--space-6); width: 100%; }
    .donut-pct { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-semibold); color: var(--color-text); }
    .donut-sub { font-size: var(--text-xs); color: var(--color-text-muted); }
    .radar-svg { width: 100%; max-height: 200px; }
  `]
})
export class ChartPlaceholderComponent {
  @Input() title = 'Chart';
  @Input() badge = 'Last 30 days';
  @Input() type: 'bar' | 'line' | 'donut' | 'radar' = 'bar';
  @Input() height = '220px';
  @Input() donutValue = 78;

  bars = [
    { label: 'Mon', pct: 60 }, { label: 'Tue', pct: 80 }, { label: 'Wed', pct: 45 },
    { label: 'Thu', pct: 90 }, { label: 'Fri', pct: 70 }, { label: 'Sat', pct: 55 }, { label: 'Sun', pct: 75 }
  ];

  get donutDash(): string {
    const c = 2 * Math.PI * 48;
    return `${(this.donutValue / 100) * c} ${c}`;
  }

  linePointsData = [
    { x: 20, y: 120 }, { x: 75, y: 80 }, { x: 130, y: 100 },
    { x: 185, y: 55 }, { x: 240, y: 70 }, { x: 295, y: 40 }, { x: 380, y: 30 }
  ];

  get linePath() { return this.linePointsData.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '); }
  get areaPath() {
    const line = this.linePointsData.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const last = this.linePointsData[this.linePointsData.length - 1];
    const first = this.linePointsData[0];
    return `${line} L ${last.x} 160 L ${first.x} 160 Z`;
  }

  radarLabels = ['Comms', 'Confidence', 'Clarity', 'Structure', 'Stress', 'Readiness'];
  radarValues = [0.88, 0.80, 0.85, 0.82, 0.75, 0.83];
  cx = 100; cy = 100; r = 75;

  radarGrid(pct: number): string {
    return this.radarLabels.map((_, i) => {
      const angle = (i / this.radarLabels.length) * 2 * Math.PI - Math.PI / 2;
      return `${this.cx + this.r * pct * Math.cos(angle)},${this.cy + this.r * pct * Math.sin(angle)}`;
    }).join(' ');
  }

  get radarData(): string {
    return this.radarValues.map((v, i) => {
      const angle = (i / this.radarValues.length) * 2 * Math.PI - Math.PI / 2;
      return `${this.cx + this.r * v * Math.cos(angle)},${this.cy + this.r * v * Math.sin(angle)}`;
    }).join(' ');
  }

  radarLabelPos(i: number): { x: number; y: number } {
    const angle = (i / this.radarLabels.length) * 2 * Math.PI - Math.PI / 2;
    return { x: this.cx + (this.r + 16) * Math.cos(angle), y: this.cy + (this.r + 16) * Math.sin(angle) };
  }
}
