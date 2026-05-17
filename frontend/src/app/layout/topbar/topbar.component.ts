import {
    Component,
    Input,
    Output,
    EventEmitter,
    inject,
    OnChanges,
    SimpleChanges,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { CommonModule } from "@angular/common";
import { AuthService } from "../../core/auth/auth.service";
import { UserProfile } from "../../core/services/user-api.service";

@Component({
    selector: "app-topbar",
    standalone: true,
    imports: [RouterLink, CommonModule],
    template: `
        <header class="topbar">
            <div class="topbar-left">
                <button
                    class="icon-btn menu-btn"
                    (click)="toggleSidebar.emit()"
                    aria-label="Toggle menu"
                    title="Menu"
                >
                    <i class="bi bi-list"></i>
                </button>

                <label class="search-wrap" [class.is-focused]="searchFocused">
                    <i class="bi bi-search search-icon" aria-hidden="true"></i>
                    <input
                        class="search-input"
                        type="search"
                        placeholder="Search sessions, quizzes, mentors, resources..."
                        [attr.aria-label]="'Global search'"
                        (focus)="searchFocused = true"
                        (blur)="searchFocused = false"
                    />
                    <span class="search-shortcut" aria-hidden="true">
                        <kbd>⌘</kbd><kbd>K</kbd>
                    </span>
                </label>
            </div>

            <div class="topbar-right">
                <button class="icon-btn notif-btn" title="Notifications" aria-label="Notifications">
                    <i class="bi bi-bell"></i>
                    <span class="notif-badge" *ngIf="notificationCount > 0">
                        {{ notificationCount > 9 ? '9+' : notificationCount }}
                    </span>
                </button>

                <a
                    routerLink="/profile"
                    class="topbar-user"
                    *ngIf="isAuthenticated()"
                    [title]="displayName + ' — view profile'"
                >
                    <div class="topbar-avatar-wrap">
                        <ng-container *ngIf="avatarUrl; else initialsAvatar">
                            <img
                                [src]="avatarUrl"
                                alt="Profile avatar"
                                class="topbar-avatar-img"
                                (error)="onAvatarError()"
                            />
                        </ng-container>

                        <ng-template #initialsAvatar>
                            <div class="avatar-initials">{{ initials }}</div>
                        </ng-template>
                        <span class="status-dot" aria-hidden="true"></span>
                    </div>

                    <div class="topbar-user-info">
                        <div class="topbar-user-name">{{ displayName }}</div>
                        <div class="topbar-user-title">{{ displayTitle }}</div>
                    </div>
                </a>

                <button
                    *ngIf="isAuthenticated()"
                    class="icon-btn logout-btn"
                    (click)="logout()"
                    title="Log out"
                    aria-label="Log out"
                >
                    <i class="bi bi-box-arrow-right"></i>
                </button>
            </div>
        </header>
    `,
    styles: [
        `
            .topbar {
                position: sticky;
                top: 0;
                z-index: var(--z-sticky);
                height: var(--topbar-height);
                background: var(--color-surface);
                border-bottom: 1px solid var(--color-border);
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 var(--page-padding);
                gap: var(--space-4);
                /* Subtle backdrop blur effect when scrolling underneath */
                backdrop-filter: var(--blur-sm);
                -webkit-backdrop-filter: var(--blur-sm);
            }

            .topbar-left {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                flex: 1;
                min-width: 0;
            }

            /* ── Icon button — generic for menu, notif, logout ── */
            .icon-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 38px;
                height: 38px;
                border-radius: var(--radius-md);
                background: transparent;
                color: var(--color-text-muted);
                border: 1px solid transparent;
                cursor: pointer;
                font-size: 1.05rem;
                transition:
                    background var(--duration-fast) var(--ease-out),
                    color var(--duration-fast) var(--ease-out),
                    border-color var(--duration-fast) var(--ease-out),
                    transform var(--duration-fast) var(--ease-out);
                position: relative;
                flex-shrink: 0;
            }
            .icon-btn:hover {
                background: var(--color-bg-alt);
                color: var(--color-text);
                border-color: var(--color-border);
            }
            .icon-btn:focus-visible {
                outline: var(--ring-width) solid var(--ring-color);
                outline-offset: 1px;
            }
            .icon-btn:active { transform: scale(0.96); }

            .menu-btn { display: none; }

            /* ── Search bar ── */
            .search-wrap {
                position: relative;
                display: flex;
                align-items: center;
                max-width: 480px;
                flex: 1;
                background: var(--color-bg-alt);
                border: 1px solid transparent;
                border-radius: var(--radius-md);
                transition:
                    border-color var(--duration-fast) var(--ease-out),
                    background var(--duration-fast) var(--ease-out),
                    box-shadow var(--duration-fast) var(--ease-out);
                cursor: text;
            }
            .search-wrap:hover {
                border-color: var(--color-border);
            }
            .search-wrap.is-focused {
                background: var(--color-surface);
                border-color: var(--color-primary);
                box-shadow: 0 0 0 3px var(--ring-color);
            }

            .search-icon {
                position: absolute;
                left: 0.875rem;
                font-size: 0.95rem;
                color: var(--color-text-muted);
                pointer-events: none;
                z-index: 1;
                transition: color var(--duration-fast) var(--ease-out);
            }
            .search-wrap.is-focused .search-icon { color: var(--color-primary); }

            .search-input {
                width: 100%;
                padding: 0 4rem 0 2.5rem;
                height: 38px;
                background: transparent;
                border: 0;
                outline: none;
                font-family: var(--font-body);
                font-size: var(--text-sm);
                color: var(--color-text);
                letter-spacing: -0.005em;
            }
            .search-input::placeholder { color: var(--color-text-light); }
            .search-input::-webkit-search-cancel-button { -webkit-appearance: none; }

            .search-shortcut {
                position: absolute;
                right: 0.65rem;
                display: inline-flex;
                gap: 2px;
                pointer-events: none;
            }
            .search-shortcut kbd {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 18px;
                height: 18px;
                padding: 0 4px;
                font-family: var(--font-body);
                font-size: 0.65rem;
                font-weight: var(--weight-medium);
                color: var(--color-text-muted);
                background: var(--color-surface);
                border: 1px solid var(--color-border);
                border-radius: 4px;
                line-height: 1;
            }

            /* ── Right side ── */
            .topbar-right {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                flex-shrink: 0;
            }

            /* Notification button */
            .notif-btn { font-size: 1.1rem; }
            .notif-badge {
                position: absolute;
                top: 4px;
                right: 4px;
                min-width: 16px;
                height: 16px;
                padding: 0 4px;
                background: var(--error-500);
                color: white;
                font-size: 0.6rem;
                font-weight: var(--weight-bold);
                border-radius: 8px;
                border: 2px solid var(--color-surface);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                line-height: 1;
                animation: notif-pop var(--duration-base) var(--ease-spring);
            }
            @keyframes notif-pop {
                from { transform: scale(0); }
                to   { transform: scale(1); }
            }

            /* ── User button ── */
            .topbar-user {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                text-decoration: none;
                padding: var(--space-1) var(--space-2);
                border-radius: var(--radius-md);
                border: 1px solid transparent;
                transition:
                    background var(--duration-fast) var(--ease-out),
                    border-color var(--duration-fast) var(--ease-out);
            }
            .topbar-user:hover {
                background: var(--color-bg-alt);
                border-color: var(--color-border);
            }

            .topbar-avatar-wrap {
                position: relative;
                width: 38px;
                height: 38px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            .topbar-avatar-img {
                width: 38px;
                height: 38px;
                border-radius: 50%;
                object-fit: cover;
                display: block;
                border: 2px solid var(--color-surface);
                box-shadow: var(--shadow-sm);
            }
            .avatar-initials {
                width: 38px;
                height: 38px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--teal-500), var(--cyan-400));
                color: white;
                font-size: 0.82rem;
                font-weight: var(--weight-semibold);
                display: flex;
                align-items: center;
                justify-content: center;
                letter-spacing: 0.02em;
                box-shadow: var(--shadow-sm);
            }
            .status-dot {
                position: absolute;
                bottom: 0;
                right: 0;
                width: 11px;
                height: 11px;
                border-radius: 50%;
                background: var(--success-500);
                border: 2px solid var(--color-surface);
            }

            .topbar-user-info {
                display: flex;
                flex-direction: column;
                min-width: 0;
            }
            .topbar-user-name {
                font-size: var(--text-sm);
                font-weight: var(--weight-semibold);
                color: var(--color-text);
                white-space: nowrap;
                letter-spacing: -0.005em;
            }
            .topbar-user-title {
                font-size: 0.7rem;
                color: var(--color-text-muted);
                white-space: nowrap;
                line-height: 1.2;
            }

            .logout-btn:hover {
                color: var(--error-500);
                background: var(--error-50);
                border-color: var(--error-50);
            }
            [data-theme="dark"] .logout-btn:hover {
                background: rgba(239, 68, 68, 0.1);
                border-color: rgba(239, 68, 68, 0.2);
            }

            /* ── Responsive ── */
            @media (max-width: 768px) {
                .menu-btn { display: inline-flex; }
                .topbar-user-info { display: none; }
                .topbar { padding: 0 var(--space-4); gap: var(--space-2); }
                .topbar-right { gap: var(--space-1); }
                .search-shortcut { display: none; }
            }
            @media (max-width: 500px) {
                .search-wrap { display: none; }
                .topbar-user { padding: 2px; }
                .icon-btn { width: 36px; height: 36px; }
            }
        `,
    ],
})
export class TopbarComponent implements OnChanges {
    @Input() sidebarCollapsed = false;
    @Input() currentUser: UserProfile | null = null;
    @Input() notificationCount = 0;
    @Output() toggleSidebar = new EventEmitter<void>();

    authService = inject(AuthService);
    avatarFailed = false;
    searchFocused = false;

    ngOnChanges(changes: SimpleChanges): void {
        if ("currentUser" in changes) {
            this.avatarFailed = false;
        }
    }

    get displayName(): string {
        if (this.currentUser) {
            return (
                `${this.currentUser.firstName || ""} ${this.currentUser.lastName || ""}`.trim() ||
                this.authService.getFullName() ||
                "User"
            );
        }
        return this.authService.getFullName() || "User";
    }

    get displayTitle(): string {
        if (this.currentUser?.preferredIndustry) {
            return this.currentUser.preferredIndustry
                .toLowerCase()
                .replace(/\b\w/g, c => c.toUpperCase());
        }
        return "InterV Member";
    }

    get initials(): string {
        if (this.currentUser) {
            const first = this.currentUser.firstName?.[0] || "";
            const last = this.currentUser.lastName?.[0] || "";
            return (first + last).toUpperCase() || this.getInitialsFromAuth();
        }
        return this.getInitialsFromAuth();
    }

    get avatarUrl(): string {
        if (this.avatarFailed) return "";
        return this.currentUser?.avatarUrl?.trim() || "";
    }

    onAvatarError(): void {
        this.avatarFailed = true;
    }

    private getInitialsFromAuth(): string {
        const name = this.authService.getFullName();
        if (!name) return "U";
        return name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    }

    logout(): void {
        this.authService.logout();
    }

    isAuthenticated(): boolean {
        return this.authService.isAuthenticated();
    }
}
