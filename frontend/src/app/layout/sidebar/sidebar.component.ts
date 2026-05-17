import {
    Component,
    Input,
    Output,
    EventEmitter,
    inject,
    OnChanges,
    SimpleChanges,
    OnInit,
} from "@angular/core";
import { AuthService } from "../../core/auth/auth.service";
import {
    IsActiveMatchOptions,
    RouterLink,
    RouterLinkActive,
} from "@angular/router";
import { CommonModule } from "@angular/common";
import { UserProfile } from "../../core/services/user-api.service";

interface NavItem {
    label: string;
    icon: string;
    route: string;
    queryParams?: Record<string, any>;
    /**
     * Optional matcher passed to RouterLinkActive. Use STRICT_ACTIVE for routes
     * that share a path (e.g. /dashboard plain vs. /dashboard?tab=admin).
     */
    activeOptions?: IsActiveMatchOptions;
}

const DEFAULT_ACTIVE: IsActiveMatchOptions = {
    paths: "subset",
    queryParams: "ignored",
    matrixParams: "ignored",
    fragment: "ignored",
};

const STRICT_ACTIVE: IsActiveMatchOptions = {
    paths: "exact",
    queryParams: "exact",
    matrixParams: "ignored",
    fragment: "ignored",
};

type Theme = "light" | "dark";

@Component({
    selector: "app-sidebar",
    standalone: true,
    imports: [RouterLink, RouterLinkActive, CommonModule],
    template: `
        <aside class="sidebar" [class.collapsed]="collapsed">
            <div class="sidebar-logo">
                <a routerLink="/dashboard" class="logo-link" [title]="collapsed ? 'interV' : ''">
                    <div class="logo-icon">
                        <span>i</span>
                    </div>
                    <span class="logo-text" *ngIf="!collapsed"
                        >inter<strong>V</strong></span
                    >
                </a>

                <button
                    class="collapse-btn"
                    (click)="toggleSidebar.emit()"
                    [title]="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
                    [attr.aria-label]="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
                >
                    <i class="bi" [class.bi-chevron-double-right]="collapsed" [class.bi-chevron-double-left]="!collapsed"></i>
                </button>
            </div>

            <nav class="sidebar-nav">
                <div class="nav-section-label" *ngIf="!collapsed">Prepare</div>

                <a
                    *ngFor="let item of mainNav"
                    [routerLink]="item.route"
                    routerLinkActive="active"
                    [routerLinkActiveOptions]="item.activeOptions || DEFAULT_ACTIVE"
                    class="nav-item"
                    [title]="collapsed ? item.label : ''"
                >
                    <span class="nav-icon" [innerHTML]="item.icon"></span>
                    <span class="nav-label" *ngIf="!collapsed">{{
                        item.label
                    }}</span>
                </a>

                <div class="nav-divider"></div>

                <div class="nav-section-label" *ngIf="!collapsed">Connect</div>

                <a
                    *ngFor="let item of connectNav"
                    [routerLink]="item.route"
                    routerLinkActive="active"
                    [routerLinkActiveOptions]="item.activeOptions || DEFAULT_ACTIVE"
                    class="nav-item"
                    [title]="collapsed ? item.label : ''"
                >
                    <span class="nav-icon" [innerHTML]="item.icon"></span>
                    <span class="nav-label" *ngIf="!collapsed">{{
                        item.label
                    }}</span>
                </a>

                <div class="nav-divider"></div>

                <div class="nav-section-label" *ngIf="!collapsed">Account</div>

                <a
                    *ngFor="let item of accountNav"
                    [routerLink]="item.route"
                    [queryParams]="item.queryParams || null"
                    routerLinkActive="active"
                    [routerLinkActiveOptions]="item.activeOptions || DEFAULT_ACTIVE"
                    class="nav-item"
                    [title]="collapsed ? item.label : ''"
                >
                    <span class="nav-icon" [innerHTML]="item.icon"></span>
                    <span class="nav-label" *ngIf="!collapsed">{{
                        item.label
                    }}</span>
                </a>
            </nav>

            <!-- Theme toggle -->
            <div class="theme-toggle-wrap">
                <button
                    class="theme-toggle"
                    (click)="toggleTheme()"
                    [title]="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
                    [attr.aria-label]="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
                >
                    <span class="theme-toggle-icon" [class.is-dark]="theme === 'dark'">
                        <i class="bi bi-sun-fill icon-sun"></i>
                        <i class="bi bi-moon-stars-fill icon-moon"></i>
                    </span>
                    <span class="theme-toggle-label" *ngIf="!collapsed">
                        {{ theme === 'dark' ? 'Light mode' : 'Dark mode' }}
                    </span>
                </button>
            </div>

            <div class="sidebar-user" *ngIf="!collapsed && isAuthenticated()">
                <a routerLink="/profile" class="user-link">
                    <div class="sidebar-avatar-wrap">
                        <ng-container *ngIf="avatarUrl; else sidebarInitials">
                            <img
                                [src]="avatarUrl"
                                alt="Profile avatar"
                                class="sidebar-avatar-img"
                                (error)="onAvatarError()"
                            />
                        </ng-container>

                        <ng-template #sidebarInitials>
                            <div class="avatar-initials">{{ initials }}</div>
                        </ng-template>
                    </div>

                    <div class="user-info">
                        <div class="user-name">{{ displayName }}</div>

                        <div class="user-meta">
                            <span
                                class="user-chip"
                                [attr.data-variant]="displayPlan === 'FREE' ? 'neutral' : 'primary'"
                            >
                                {{ displayPlan | titlecase }}
                            </span>

                            <span
                                *ngIf="isAdmin && displayRole"
                                class="user-chip"
                                data-variant="primary"
                            >
                                {{ displayRole | titlecase }}
                            </span>

                            <span
                                *ngIf="isVerified"
                                class="user-chip"
                                data-variant="success"
                                title="Verified account"
                            >
                                <i class="bi bi-check-circle-fill"></i>
                            </span>
                        </div>
                    </div>
                </a>
            </div>

            <div
                class="sidebar-user sidebar-user-mini"
                *ngIf="collapsed && isAuthenticated()"
            >
                <a routerLink="/profile" [title]="displayName">
                    <div class="sidebar-avatar-wrap">
                        <ng-container
                            *ngIf="avatarUrl; else sidebarMiniInitials"
                        >
                            <img
                                [src]="avatarUrl"
                                alt="Profile avatar"
                                class="sidebar-avatar-img"
                                (error)="onAvatarError()"
                            />
                        </ng-container>

                        <ng-template #sidebarMiniInitials>
                            <div class="avatar-initials">{{ initials }}</div>
                        </ng-template>
                    </div>
                </a>
            </div>
        </aside>
    `,
    styles: [
        `
            .sidebar {
                position: fixed;
                top: 0;
                left: 0;
                height: 100vh;
                width: var(--sidebar-width);
                background: var(--color-bg-alt);
                border-right: 1px solid var(--color-border);
                display: flex;
                flex-direction: column;
                z-index: var(--z-sticky);
                transition: width var(--duration-base) var(--ease-out);
                overflow: hidden;
            }

            .sidebar.collapsed { width: 72px; }

            /* ── Logo header ── */
            .sidebar-logo {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 var(--space-4);
                border-bottom: 1px solid var(--color-border-light);
                height: var(--topbar-height);
                flex-shrink: 0;
            }
            .sidebar.collapsed .sidebar-logo {
                padding: var(--space-3) 0;
                flex-direction: column;
                gap: var(--space-2);
                height: auto;
                min-height: var(--topbar-height);
                justify-content: center;
            }

            .logo-link {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                text-decoration: none;
                transition: opacity var(--duration-fast) var(--ease-out);
            }
            .logo-link:hover { opacity: 0.85; }

            .logo-icon {
                width: 36px;
                height: 36px;
                border-radius: var(--radius-md);
                background: linear-gradient(135deg, var(--teal-500), var(--cyan-400));
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-family: var(--font-display);
                font-size: 1.15rem;
                font-weight: 700;
                font-style: italic;
                flex-shrink: 0;
                box-shadow: var(--shadow-teal);
                transition: transform var(--duration-base) var(--ease-spring);
            }
            .logo-link:hover .logo-icon { transform: rotate(-6deg) scale(1.05); }

            .logo-text {
                font-family: var(--font-display);
                font-size: 1.3rem;
                font-weight: 400;
                color: var(--color-text);
                letter-spacing: -0.02em;
                white-space: nowrap;
            }
            .logo-text strong { font-weight: 700; color: var(--color-primary); }

            /* ── Collapse button ── */
            .collapse-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                border-radius: var(--radius-sm);
                background: transparent;
                color: var(--color-text-muted);
                font-size: 0.75rem;
                border: 1px solid transparent;
                cursor: pointer;
                transition:
                    background var(--duration-fast) var(--ease-out),
                    color var(--duration-fast) var(--ease-out),
                    border-color var(--duration-fast) var(--ease-out);
                flex-shrink: 0;
            }
            .collapse-btn:hover {
                background: var(--color-primary-light);
                color: var(--color-primary);
                border-color: var(--color-primary-mid);
            }
            .collapse-btn:focus-visible {
                outline: var(--ring-width) solid var(--ring-color);
                outline-offset: 1px;
            }
            .sidebar.collapsed .collapse-btn {
                /* Stay visible so users can re-expand from desktop */
                width: 32px;
                height: 32px;
            }

            /* ── Nav ── */
            .sidebar-nav {
                flex: 1;
                padding: var(--space-4) var(--space-3);
                overflow-y: auto;
                overflow-x: hidden;
            }

            .nav-section-label {
                font-size: 0.6875rem;
                font-weight: var(--weight-semibold);
                text-transform: uppercase;
                letter-spacing: 0.1em;
                color: var(--color-text-light);
                padding: 0 var(--space-3);
                margin: var(--space-3) 0 var(--space-2);
                white-space: nowrap;
            }
            .nav-section-label:first-child { margin-top: 0; }

            .nav-item {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                padding: 0.55rem var(--space-3);
                border-radius: var(--radius-md);
                color: var(--color-text-muted);
                font-size: var(--text-sm);
                font-weight: var(--weight-medium);
                text-decoration: none;
                transition:
                    background var(--duration-fast) var(--ease-out),
                    color var(--duration-fast) var(--ease-out),
                    transform var(--duration-fast) var(--ease-out);
                margin-bottom: 2px;
                position: relative;
                white-space: nowrap;
                overflow: hidden;
            }

            .nav-item::before {
                content: '';
                position: absolute;
                left: 0;
                top: 50%;
                transform: translateY(-50%) scaleY(0);
                width: 3px;
                height: 60%;
                background: linear-gradient(180deg, var(--teal-400), var(--cyan-400));
                border-radius: 0 2px 2px 0;
                transition: transform var(--duration-base) var(--ease-spring);
                transform-origin: center;
            }

            .nav-item:hover {
                background: var(--color-primary-light);
                color: var(--color-text);
            }

            .nav-item.active {
                background: var(--color-primary-light);
                color: var(--color-primary);
                font-weight: var(--weight-semibold);
            }

            .nav-item.active::before {
                transform: translateY(-50%) scaleY(1);
            }

            .nav-item:focus-visible {
                outline: var(--ring-width) solid var(--ring-color);
                outline-offset: -1px;
                background: var(--color-primary-light);
                color: var(--color-text);
            }

            .nav-icon {
                font-size: 1.05rem;
                flex-shrink: 0;
                width: 20px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                color: var(--color-text-muted);
                transition: color var(--duration-fast) var(--ease-out);
            }
            .nav-item:hover .nav-icon { color: var(--color-primary); }
            .nav-item.active .nav-icon { color: var(--color-primary); }

            .nav-label {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                letter-spacing: -0.005em;
            }

            /* Collapsed: center icons */
            .sidebar.collapsed .nav-item {
                justify-content: center;
                padding: 0.6rem 0;
            }
            .sidebar.collapsed .nav-item::before { left: 0; }
            .sidebar.collapsed .nav-section-label { display: none; }

            .nav-divider {
                height: 1px;
                background: var(--color-border-light);
                margin: var(--space-3) 0;
            }

            /* ── Theme toggle ── */
            .theme-toggle-wrap {
                padding: var(--space-3);
                border-top: 1px solid var(--color-border-light);
                flex-shrink: 0;
            }
            .theme-toggle {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                width: 100%;
                padding: 0.55rem var(--space-3);
                border-radius: var(--radius-md);
                background: transparent;
                border: 1px solid transparent;
                color: var(--color-text-muted);
                font-family: var(--font-body);
                font-size: var(--text-sm);
                font-weight: var(--weight-medium);
                cursor: pointer;
                transition:
                    background var(--duration-fast) var(--ease-out),
                    color var(--duration-fast) var(--ease-out),
                    border-color var(--duration-fast) var(--ease-out);
            }
            .theme-toggle:hover {
                background: var(--color-bg);
                color: var(--color-text);
                border-color: var(--color-border);
            }
            .theme-toggle:focus-visible {
                outline: var(--ring-width) solid var(--ring-color);
                outline-offset: 1px;
            }
            .sidebar.collapsed .theme-toggle { justify-content: center; padding: 0.6rem 0; }

            .theme-toggle-icon {
                position: relative;
                width: 20px;
                height: 20px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            .icon-sun, .icon-moon {
                position: absolute;
                font-size: 1rem;
                transition:
                    transform var(--duration-base) var(--ease-spring),
                    opacity var(--duration-base) var(--ease-out);
            }
            .icon-sun  { color: #f59e0b; }
            .icon-moon { color: #94a3b8; }

            /* Light mode showing → sun visible, moon hidden */
            .theme-toggle-icon:not(.is-dark) .icon-sun {
                opacity: 1; transform: rotate(0deg) scale(1);
            }
            .theme-toggle-icon:not(.is-dark) .icon-moon {
                opacity: 0; transform: rotate(60deg) scale(0.6);
            }
            /* Dark mode showing → moon visible, sun hidden */
            .theme-toggle-icon.is-dark .icon-sun {
                opacity: 0; transform: rotate(-60deg) scale(0.6);
            }
            .theme-toggle-icon.is-dark .icon-moon {
                opacity: 1; transform: rotate(0deg) scale(1);
            }

            /* ── User card at bottom ── */
            .sidebar-user {
                padding: var(--space-3) var(--space-4) var(--space-4);
                border-top: 1px solid var(--color-border-light);
            }
            .user-link {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                text-decoration: none;
                padding: var(--space-2);
                border-radius: var(--radius-md);
                transition: background var(--duration-fast) var(--ease-out);
            }
            .user-link:hover { background: var(--color-bg); }
            .user-link:focus-visible {
                outline: var(--ring-width) solid var(--ring-color);
                outline-offset: 1px;
                background: var(--color-bg);
            }

            .user-info {
                min-width: 0;
                flex: 1;
            }

            .user-name {
                font-size: var(--text-sm);
                font-weight: var(--weight-semibold);
                color: var(--color-text);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                letter-spacing: -0.005em;
            }

            .sidebar-avatar-wrap {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
                flex-shrink: 0;
            }
            .sidebar-avatar-img {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                object-fit: cover;
                display: block;
                border: 2px solid var(--color-surface);
                box-shadow: var(--shadow-sm);
            }
            .avatar-initials {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--teal-500), var(--cyan-400));
                color: white;
                font-size: 0.78rem;
                font-weight: var(--weight-semibold);
                display: flex;
                align-items: center;
                justify-content: center;
                letter-spacing: 0.02em;
                box-shadow: var(--shadow-sm);
            }

            .user-meta {
                display: flex;
                align-items: center;
                gap: 0.3rem;
                flex-wrap: wrap;
                margin-top: 0.25rem;
            }
            .user-chip {
                font-size: 0.625rem;
                font-weight: var(--weight-semibold);
                letter-spacing: 0.02em;
                padding: 0.1rem 0.45rem;
                border-radius: var(--radius-sm);
                line-height: 1.4;
                background: var(--neutral-100);
                color: var(--color-text-muted);
            }
            .user-chip[data-variant="primary"] {
                background: var(--color-primary-light);
                color: var(--color-primary);
            }
            .user-chip[data-variant="success"] {
                background: var(--success-50);
                color: var(--success-600);
                padding: 0.1rem 0.35rem;
            }
            [data-theme="dark"] .user-chip[data-variant="success"] { color: #4ade80; }

            .sidebar-user-mini {
                display: flex;
                justify-content: center;
            }
            .sidebar-user-mini a { padding: var(--space-2); }

            /* ── Mobile ── */
            @media (max-width: 768px) {
                .sidebar {
                    transform: translateX(-100%);
                    transition:
                        transform var(--duration-base) var(--ease-out),
                        width var(--duration-base) var(--ease-out);
                }
                .sidebar.collapsed {
                    transform: translateX(-100%);
                    width: var(--sidebar-width);
                }
                .sidebar:not(.collapsed) { transform: translateX(0); }
            }
        `,
    ],
})
export class SidebarComponent implements OnChanges, OnInit {
    @Input() collapsed = false;
    @Input() currentUser: UserProfile | null = null;
    @Output() toggleSidebar = new EventEmitter<void>();

    private authService = inject(AuthService);

    avatarFailed = false;
    theme: Theme = "light";

    /** Default RouterLinkActive matcher used when a NavItem doesn't specify one. */
    readonly DEFAULT_ACTIVE: IsActiveMatchOptions = DEFAULT_ACTIVE;

    accountNav: NavItem[] = this.buildAccountNav();

    ngOnInit(): void {
        // Initialize theme from localStorage or system preference
        const stored = (typeof localStorage !== "undefined"
            && localStorage.getItem("theme")) as Theme | null;
        if (stored === "light" || stored === "dark") {
            this.theme = stored;
        } else if (typeof window !== "undefined"
            && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
            this.theme = "dark";
        }
        this.applyTheme();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ("currentUser" in changes) {
            this.avatarFailed = false;
            this.accountNav = this.buildAccountNav();
        }
    }

    toggleTheme(): void {
        this.theme = this.theme === "dark" ? "light" : "dark";
        try { localStorage.setItem("theme", this.theme); } catch {}
        this.applyTheme();
    }

    private applyTheme(): void {
        if (typeof document === "undefined") return;
        document.documentElement.setAttribute("data-theme", this.theme);
    }

    isAuthenticated(): boolean {
        return this.authService.isAuthenticated();
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

    get displayPlan(): string {
        return this.currentUser?.plan || "FREE";
    }

    get displayRole(): string {
        const role = this.currentUser?.role || "";
        return role.replace(/^ROLE_/, "").replace(/_/g, " ");
    }

    get isVerified(): boolean {
        return !!this.currentUser?.isVerified;
    }

    get isAdmin(): boolean {
        const role = (this.currentUser?.role || "").toUpperCase();
        return (
            role === "ADMIN" ||
            role === "ROLE_ADMIN" ||
            this.authService.hasRole("ROLE_ADMIN")
        );
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

    mainNav: NavItem[] = [
        { label: "Dashboard",   icon: '<i class="bi bi-grid-1x2-fill"></i>',   route: "/dashboard", activeOptions: STRICT_ACTIVE },
        { label: "Interviews",  icon: '<i class="bi bi-mic-fill"></i>',         route: "/interviews" },
        { label: "Quiz & Assess", icon: '<i class="bi bi-pencil-square"></i>',  route: "/quiz-assessment" },
        { label: "Training",    icon: '<i class="bi bi-rocket-takeoff-fill"></i>', route: "/training-gamification" },
        { label: "Reports",     icon: '<i class="bi bi-bar-chart-fill"></i>',   route: "/reports" },
        { label: "Library",     icon: '<i class="bi bi-book-half"></i>',        route: "/library" },
    ];

    connectNav: NavItem[] = [
        { label: "Mentorship",  icon: '<i class="bi bi-people-fill"></i>',         route: "/mentorship" },
        { label: "Community",   icon: '<i class="bi bi-chat-square-quote-fill"></i>', route: "/community" },
    ];

    private buildAccountNav(): NavItem[] {
        const base: NavItem[] = [
            { label: "Profile",  icon: '<i class="bi bi-person-circle"></i>', route: "/profile" },
            { label: "Pricing",  icon: '<i class="bi bi-stars"></i>',         route: "/pricing" },
            { label: "Settings", icon: '<i class="bi bi-gear-fill"></i>',     route: "/settings" },
        ];

        if (this.isAdmin) {
            return [
                {
                    label: "Admin Panel",
                    icon: '<i class="bi bi-shield-lock-fill"></i>',
                    route: "/dashboard",
                    queryParams: { tab: "admin" },
                    activeOptions: STRICT_ACTIVE,
                },
                ...base,
            ];
        }

        return base;
    }
}
