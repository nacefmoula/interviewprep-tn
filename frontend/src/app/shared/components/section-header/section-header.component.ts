import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
    selector: "app-section-header",
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="section-header">
            <div class="section-header-left">
                <span class="section-icon" *ngIf="icon" [innerHTML]="icon"></span>
                <div>
                    <h2 class="section-title">{{ title }}</h2>
                    <p class="section-subtitle" *ngIf="subtitle">
                        {{ subtitle }}
                    </p>
                </div>
            </div>
            <div class="section-actions" *ngIf="actionLabel">
                <button
                    class="btn btn-ghost btn-sm"
                    type="button"
                    (click)="onActionClick()"
                >
                    {{ actionLabel }} →
                </button>
            </div>
        </div>
    `,
    styles: [
        `
            .section-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                margin-bottom: var(--space-5);
                gap: var(--space-4);
            }

            .section-header-left {
                display: flex;
                align-items: flex-start;
                gap: var(--space-3);
            }

            .section-icon {
                font-size: 1.25rem;
                margin-top: 2px;
            }

            .section-title {
                font-size: var(--text-lg);
                font-weight: var(--weight-semibold);
                color: var(--color-text);
            }

            .section-subtitle {
                font-size: var(--text-sm);
                color: var(--color-text-muted);
                margin-top: 2px;
            }

            .section-actions {
                flex-shrink: 0;
            }
        `,
    ],
})
export class SectionHeaderComponent {
    @Input() title = "";
    @Input() subtitle?: string;
    @Input() icon?: string;
    @Input() actionLabel?: string;
    @Output() actionClick = new EventEmitter<void>();

    onActionClick(): void {
        this.actionClick.emit();
    }
}
