import { environment } from '../../../environments/environment';
import { Component, signal, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../core/auth/auth.service";
import { CurrentUserStoreService } from "../../core/services/current-user-store.service";
import {
    UserApiService,
    UserProfile,
} from "../../core/services/user-api.service";
import { ThemeService, Theme } from "../../core/services/theme.service";

@Component({
    selector: "app-settings",
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div
            class="settings-page animate-fade"
            [class.compact]="compactMode"
            [class.no-animations]="!animationsEnabled"
        >
            <div class="page-header">
                <div>
                    <h1>Settings</h1>
                    <p>Manage your account, preferences, and security.</p>
                </div>
                <button
                    class="btn btn-primary"
                    (click)="saveAccount()"
                    [disabled]="saving"
                    *ngIf="activeTab() === 'account'"
                >
                    {{ saving ? "Saving…" : "Save Changes" }}
                </button>
            </div>

            <div class="saved-toast" *ngIf="saved">
                <i class="bi bi-check-circle-fill"></i> Changes saved!
            </div>
            <div class="error-toast" *ngIf="saveError">
                <i class="bi bi-exclamation-circle-fill"></i> {{ saveError }}
            </div>

            <div class="loading-state" *ngIf="loading">
                <div class="loading-spinner"></div>
                <span>Loading your settings…</span>
            </div>

            <div class="settings-layout" *ngIf="!loading">
                <!-- Nav sidebar -->
                <div class="settings-nav">
                    <button
                        class="sn-item"
                        *ngFor="let tab of tabs"
                        [class.active]="activeTab() === tab.key"
                        (click)="setTab(tab.key)"
                    >
                        <i class="bi sn-icon" [ngClass]="tab.icon"></i>
                        <span>{{ tab.label }}</span>
                    </button>
                </div>

                <!-- Content -->
                <div class="settings-content">
                    <!-- ── ACCOUNT ── -->
                    <div
                        *ngIf="activeTab() === 'account'"
                        class="settings-panel"
                    >
                        <div class="sp-title">Account Information</div>
                        <div class="sp-desc">Update your personal details.</div>

                        <div class="form-grid">
                            <div class="form-group">
                                <label>First Name</label>
                                <input
                                    class="input"
                                    [(ngModel)]="form.firstName"
                                    placeholder="Your first name"
                                />
                            </div>
                            <div class="form-group">
                                <label>Last Name</label>
                                <input
                                    class="input"
                                    [(ngModel)]="form.lastName"
                                    placeholder="Your last name"
                                />
                            </div>
                            <div class="form-group">
                                <label>Email Address</label>
                                <input
                                    class="input"
                                    [value]="user?.email || ''"
                                    type="email"
                                    disabled
                                    title="Email is managed by your identity provider"
                                    style="opacity:0.6;cursor:not-allowed;"
                                />
                            </div>
                            <div class="form-group">
                                <label>Phone Number</label>
                                <input
                                    class="input"
                                    [(ngModel)]="form.phoneNumber"
                                    placeholder="+1 234 567 890"
                                    type="tel"
                                />
                            </div>
                            <div class="form-group">
                                <label>City</label>
                                <input
                                    class="input"
                                    [(ngModel)]="form.city"
                                    placeholder="Your city"
                                />
                            </div>
                            <div class="form-group">
                                <label>Preferred Language</label>
                                <select
                                    class="input"
                                    [(ngModel)]="form.preferredLanguage"
                                >
                                    <option value="en">English</option>
                                    <option value="fr">French</option>
                                    <option value="ar">Arabic</option>
                                    <option value="es">Spanish</option>
                                </select>
                            </div>
                            <div class="form-group full-width">
                                <label>Bio</label>
                                <textarea
                                    class="input"
                                    rows="3"
                                    [(ngModel)]="form.bio"
                                    placeholder="Tell us about yourself…"
                                ></textarea>
                            </div>
                        </div>

                        <div class="sp-divider"></div>
                        <div class="sp-title">Account Details</div>
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-label">Plan</div>
                                <span
                                    class="badge-plan"
                                    [class.premium]="user?.plan === 'PREMIUM'"
                                >
                                    {{
                                        user?.plan === "PREMIUM"
                                            ? "⭐ Premium"
                                            : "🆓 Free"
                                    }}
                                </span>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Status</div>
                                <span
                                    class="badge-status"
                                    [class.active]="user?.status === 'ACTIVE'"
                                >
                                    {{ user?.status || "PENDING" }}
                                </span>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Karma Points</div>
                                <div class="info-value">
                                    <i class="bi bi-lightning-charge-fill info-icon-karma"></i>
                                    {{ user?.karmaPoints ?? 0 }}
                                </div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Member Since</div>
                                <div class="info-value">
                                    {{ user?.createdAt | date: "mediumDate" }}
                                </div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">
                                    Sessions This Month
                                </div>
                                <div class="info-value">
                                    {{ user?.simulationsUsedThisMonth ?? 0 }} /
                                    {{ user?.simulationsLimit ?? 3 }}
                                </div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Verified</div>
                                <div class="info-value">
                                    <ng-container *ngIf="user?.isVerified; else verifyPending">
                                        <i class="bi bi-check-circle-fill info-icon-ok"></i>
                                        Yes
                                    </ng-container>
                                    <ng-template #verifyPending>
                                        <i class="bi bi-hourglass-split info-icon-pending"></i>
                                        Pending
                                    </ng-template>
                                </div>
                            </div>
                        </div>

                        <div class="sp-divider"></div>
                        <div class="sp-title" style="color:var(--error-500);">
                            Danger Zone
                        </div>
                        <p class="sp-desc">
                            Once you delete your account, all data will be
                            permanently removed.
                        </p>
                        <button
                            class="btn btn-sm"
                            style="background:var(--error-50);color:var(--error-500);border:1px solid #fecaca;"
                        >
                            Delete Account
                        </button>
                    </div>

                    <!-- ── SECURITY ── -->
                    <div
                        *ngIf="activeTab() === 'security'"
                        class="settings-panel"
                    >
                        <div class="sp-title">Security</div>
                        <div class="sp-desc">
                            Manage your sign-in methods and keep your account
                            secure.
                        </div>

                        <div class="security-section">
                            <div class="ss-label">Connected Accounts</div>
                            <div class="signin-method">
                                <div class="sm-icon">
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            fill="#4285F4"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                        />
                                        <path
                                            fill="#EA4335"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                </div>
                                <div class="sm-info">
                                    <div class="sm-name">Google</div>
                                    <div class="sm-sub">Social sign-in</div>
                                </div>
                                <span class="sm-badge"><i class="bi bi-check-circle-fill"></i> Connected</span>
                            </div>
                            <div class="signin-method">
                                <div class="sm-icon">
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        style="color:#1f2328"
                                    >
                                        <path
                                            d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"
                                        />
                                    </svg>
                                </div>
                                <div class="sm-info">
                                    <div class="sm-name">GitHub</div>
                                    <div class="sm-sub">Social sign-in</div>
                                </div>
                                <span class="sm-badge"><i class="bi bi-check-circle-fill"></i> Connected</span>
                            </div>
                        </div>

                        <div class="sp-divider"></div>

                        <div class="security-section">
                            <div class="ss-label">Passkey</div>
                            <div class="ss-desc">
                                Sign in instantly with your fingerprint, face,
                                or device PIN.
                            </div>
                            <div
                                class="passkey-card"
                                [class.registered]="passkeyRegistered"
                            >
                                <div
                                    class="pk-icon"
                                    [class.registered]="passkeyRegistered"
                                >
                                    <svg
                                        width="26"
                                        height="26"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        [attr.stroke]="
                                            passkeyRegistered
                                                ? '#0d9488'
                                                : '#94a3b8'
                                        "
                                        stroke-width="1.5"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    >
                                        <path
                                            d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"
                                        />
                                    </svg>
                                </div>
                                <div class="pk-info">
                                    <div class="pk-title">
                                        {{
                                            passkeyRegistered
                                                ? "Passkey enabled"
                                                : "No passkey set up"
                                        }}
                                    </div>
                                    <div class="pk-desc">
                                        {{
                                            passkeyRegistered
                                                ? "You can sign in with your device passkey on your next visit."
                                                : "Set up a passkey for faster, more secure sign-in on this device."
                                        }}
                                    </div>
                                </div>
                                <div class="pk-actions">
                                    <button
                                        *ngIf="!passkeyRegistered"
                                        class="btn-passkey-setup"
                                        (click)="setupPasskey()"
                                    >
                                        <i class="bi bi-key-fill"></i>
                                        Set up passkey
                                    </button>
                                    <ng-container *ngIf="passkeyRegistered">
                                        <span class="pk-badge-ok">
                                            <i class="bi bi-check-circle-fill"></i>
                                            Registered
                                        </span>
                                        <button
                                            class="btn btn-secondary btn-sm"
                                            (click)="managePasskeys()"
                                        >
                                            Manage
                                        </button>
                                    </ng-container>
                                </div>
                            </div>
                            <div class="pk-hint" *ngIf="!passkeyRegistered">
                                <i class="bi bi-lightbulb-fill"></i>
                                <span
                                    >Passkeys are safer than passwords — they
                                    can't be stolen or phished.</span
                                >
                            </div>
                        </div>

                        <div class="sp-divider"></div>

                        <div class="security-section">
                            <div class="ss-label">Current Session</div>
                            <div class="signin-method">
                                <div class="sm-icon device-icon">
                                    <i class="bi bi-laptop"></i>
                                </div>
                                <div class="sm-info">
                                    <div class="sm-name">This device</div>
                                    <div class="sm-sub">
                                        {{ user?.email }} · Active now
                                    </div>
                                </div>
                                <span class="sm-badge">Current</span>
                            </div>
                        </div>
                    </div>

                    <!-- ── NOTIFICATIONS ── -->
                    <div
                        *ngIf="activeTab() === 'notifications'"
                        class="settings-panel"
                    >
                        <div class="sp-title">Notification Preferences</div>
                        <div class="sp-desc">
                            Control how and when you hear from us.
                        </div>
                        <div
                            class="notif-group"
                            *ngFor="let group of notificationGroups"
                        >
                            <div class="ng-title">{{ group.title }}</div>
                            <div
                                class="notif-row"
                                *ngFor="let item of group.items"
                            >
                                <div class="nr-info">
                                    <div class="nr-name">{{ item.name }}</div>
                                    <div class="nr-desc">{{ item.desc }}</div>
                                </div>
                                <div class="nr-toggles">
                                    <div
                                        class="nr-toggle"
                                        *ngFor="let ch of channels"
                                    >
                                        <span class="ch-label">{{ ch }}</span>
                                        <div
                                            class="toggle-switch"
                                            [class.on]="item.enabled"
                                            (click)="
                                                item.enabled = !item.enabled
                                            "
                                        >
                                            <div class="toggle-knob"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ── APPEARANCE ── -->
                    <div
                        *ngIf="activeTab() === 'appearance'"
                        class="settings-panel"
                    >
                        <div class="sp-title">Appearance</div>
                        <div class="sp-desc">
                            Customize how interV looks and feels.
                        </div>

                        <!-- Color theme -->
                        <div class="appear-section-title">Color Theme</div>
                        <div class="theme-grid">
                            <button
                                class="theme-card"
                                *ngFor="let t of themes"
                                [class.active]="currentTheme === t.value"
                                (click)="setTheme(t.value)"
                            >
                                <div
                                    class="theme-preview"
                                    [class]="t.previewClass"
                                ></div>
                                <span class="theme-name">{{ t.label }}</span>
                                <span
                                    class="theme-check"
                                    *ngIf="currentTheme === t.value"
                                >
                                    <i class="bi bi-check-lg"></i>
                                </span>
                            </button>
                        </div>

                        <div class="sp-divider"></div>

                        <!-- Compact mode -->
                        <div class="appear-row">
                            <div class="ar-info">
                                <div class="ar-label">Compact Mode</div>
                                <div class="ar-desc">
                                    Reduces spacing across all panels for a
                                    denser layout.
                                </div>
                            </div>
                            <div
                                class="toggle-switch"
                                [class.on]="compactMode"
                                (click)="toggleCompact()"
                            >
                                <div class="toggle-knob"></div>
                            </div>
                        </div>

                        <!-- Animations -->
                        <div class="appear-row">
                            <div class="ar-info">
                                <div class="ar-label">Animations</div>
                                <div class="ar-desc">
                                    Smooth transitions and micro-interactions
                                    throughout the app.
                                </div>
                            </div>
                            <div
                                class="toggle-switch"
                                [class.on]="animationsEnabled"
                                (click)="toggleAnimations()"
                            >
                                <div class="toggle-knob"></div>
                            </div>
                        </div>

                        <!-- Font size -->
                        <div class="appear-row">
                            <div class="ar-info">
                                <div class="ar-label">Font Size</div>
                                <div class="ar-desc">
                                    Adjusts the base text size across the entire
                                    app.
                                </div>
                            </div>
                            <div class="font-size-options">
                                <button
                                    class="fs-btn"
                                    *ngFor="let s of fontSizes"
                                    [class.active]="fontSize === s.value"
                                    (click)="setFontSize(s.value)"
                                >
                                    {{ s.label }}
                                </button>
                            </div>
                        </div>

                        <div class="sp-divider"></div>

                        <!-- Live preview -->
                        <div class="appear-section-title">Live Preview</div>
                        <div class="appear-preview">
                            <div class="preview-card">
                                <div class="preview-avatar">
                                    {{ getInitials() }}
                                </div>
                                <div>
                                    <div class="preview-name">
                                        {{ user?.firstName || "Your" }}
                                        {{ user?.lastName || "Name" }}
                                    </div>
                                    <div class="preview-role">
                                        {{
                                            user?.plan === "PREMIUM"
                                                ? "⭐ Premium Member"
                                                : "🆓 Free Member"
                                        }}
                                    </div>
                                </div>
                                <span
                                    class="chip chip-teal"
                                    style="margin-left:auto;"
                                    >Active</span
                                >
                            </div>
                        </div>
                    </div>

                    <!-- ── SUBSCRIPTION ── -->
                    <div
                        *ngIf="activeTab() === 'subscription'"
                        class="settings-panel"
                    >
                        <div class="sp-title">Subscription & Billing</div>
                        <div class="sp-desc">Manage your plan and usage.</div>

                        <div
                            class="plan-card"
                            [class.premium]="user?.plan === 'PREMIUM'"
                        >
                            <div class="plan-left">
                                <div class="plan-name">
                                    {{
                                        user?.plan === "PREMIUM"
                                            ? "⭐ Premium Plan"
                                            : "🆓 Free Plan"
                                    }}
                                </div>
                                <div class="plan-price">
                                    {{ user?.plan === "PREMIUM" ? "$19" : "$0"
                                    }}<span>/month</span>
                                </div>
                                <div
                                    class="plan-note"
                                    *ngIf="user?.subscriptionEnd"
                                >
                                    Renews
                                    {{
                                        user?.subscriptionEnd
                                            | date: "mediumDate"
                                    }}
                                </div>
                                <div
                                    class="plan-note"
                                    *ngIf="
                                        !user?.subscriptionEnd &&
                                        user?.plan === 'FREE'
                                    "
                                >
                                    Upgrade to unlock unlimited sessions,
                                    mentors & more
                                </div>
                            </div>
                            <div class="plan-actions">
                                <button class="btn btn-primary btn-sm">
                                    {{
                                        user?.plan === "FREE"
                                            ? "⬆ Upgrade"
                                            : "Change Plan"
                                    }}
                                </button>
                                <button
                                    *ngIf="user?.plan === 'PREMIUM'"
                                    class="btn btn-ghost btn-sm"
                                    style="color:var(--error-500);"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>

                        <div class="sp-divider"></div>
                        <div
                            class="sp-title"
                            style="font-size:var(--text-base);"
                        >
                            Usage This Month
                        </div>
                        <div class="usage-block">
                            <div class="usage-row">
                                <span class="usage-name">Mock Sessions</span>
                                <span class="usage-count"
                                    >{{ user?.simulationsUsedThisMonth ?? 0 }} /
                                    {{ user?.simulationsLimit ?? 3 }}</span
                                >
                            </div>
                            <div class="usage-track">
                                <div
                                    class="usage-fill"
                                    [style.width.%]="
                                        getUsagePct(
                                            user?.simulationsUsedThisMonth,
                                            user?.simulationsLimit
                                        )
                                    "
                                    [class.usage-warn]="
                                        getUsagePct(
                                            user?.simulationsUsedThisMonth,
                                            user?.simulationsLimit
                                        ) >= 80
                                    "
                                ></div>
                            </div>
                        </div>

                        <div class="sp-divider"></div>
                        <div
                            class="sp-title"
                            style="font-size:var(--text-base);"
                        >
                            What's Included
                        </div>
                        <div class="features-compare">
                            <div class="fc-row header">
                                <span>Feature</span><span>Free</span
                                ><span>Premium</span>
                            </div>
                            <div class="fc-row" *ngFor="let f of features">
                                <span>{{ f.name }}</span>
                                <span [innerHTML]="f.free"></span>
                                <span class="fc-premium" [innerHTML]="f.premium"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [
        `
            .settings-page {
                display: flex;
                flex-direction: column;
                gap: var(--space-6);
            }
            .settings-page.compact {
                --space-5: 0.75rem;
                --space-6: 1rem;
                --space-8: 1.25rem;
            }
            .settings-page.no-animations * {
                transition: none !important;
                animation: none !important;
            }

            .saved-toast {
                background: var(--success-50);
                border: 1px solid #bbf7d0;
                color: #166534;
                padding: var(--space-3) var(--space-5);
                border-radius: var(--radius-md);
                font-size: var(--text-sm);
                font-weight: 600;
            }
            .error-toast {
                background: var(--error-50);
                border: 1px solid #fecaca;
                color: #991b1b;
                padding: var(--space-3) var(--space-5);
                border-radius: var(--radius-md);
                font-size: var(--text-sm);
                font-weight: 600;
            }

            .loading-state {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                padding: var(--space-12);
                justify-content: center;
                color: var(--color-text-muted);
            }
            .loading-spinner {
                width: 20px;
                height: 20px;
                border: 2px solid var(--teal-200);
                border-top-color: var(--teal-500);
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }

            .settings-layout {
                display: grid;
                grid-template-columns: 220px 1fr;
                gap: var(--space-6);
                align-items: start;
            }
            .settings-nav {
                background: var(--color-surface);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                padding: var(--space-3);
                display: flex;
                flex-direction: column;
                gap: var(--space-1);
                position: sticky;
                top: calc(68px + var(--space-6));
            }
            .sn-item {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                padding: var(--space-3) var(--space-4);
                border-radius: var(--radius-md);
                font-size: var(--text-sm);
                font-weight: 500;
                color: var(--color-text-muted);
                background: none;
                border: none;
                cursor: pointer;
                font-family: var(--font-body);
                text-align: left;
                transition: all var(--transition-fast);
            }
            .sn-item:hover {
                background: var(--neutral-50);
                color: var(--color-text);
            }
            .sn-item.active {
                background: var(--color-primary-light);
                color: var(--color-primary);
                font-weight: 600;
            }
            .sn-icon {
                font-size: 1rem;
                width: 18px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                color: var(--color-text-muted);
                transition: color var(--duration-fast) var(--ease-out);
            }
            .sn-item:hover .sn-icon { color: var(--color-text); }
            .sn-item.active .sn-icon { color: var(--color-primary); }
            [data-theme="dark"] .sn-item.active {
                background: rgba(20,184,166,0.15);
                color: var(--teal-300);
            }
            [data-theme="dark"] .sn-item.active .sn-icon { color: var(--teal-300); }

            /* Info value icons (account tab) */
            .info-value { display: inline-flex; align-items: center; gap: 0.4rem; }
            .info-icon-karma { color: var(--warning-500); }
            .info-icon-ok { color: var(--success-500); }
            .info-icon-pending { color: var(--warning-500); }

            /* Device-icon container in current-session row */
            .device-icon {
                background: var(--color-bg-alt);
                color: var(--color-text-muted);
            }

            /* Feature comparison check/cross */
            .fc-yes { color: var(--success-500); font-size: 1.1rem; }
            .fc-no  { color: var(--neutral-400); font-size: 1.1rem; }

            .settings-content {
                background: var(--color-surface);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                padding: var(--space-8);
            }
            .settings-panel {
                display: flex;
                flex-direction: column;
                gap: var(--space-5);
            }
            .sp-title {
                font-size: var(--text-lg);
                font-weight: 700;
                color: var(--color-text);
            }
            .sp-desc {
                font-size: var(--text-sm);
                color: var(--color-text-muted);
                margin-top: calc(-1 * var(--space-3));
                line-height: 1.6;
            }
            .sp-divider {
                height: 1px;
                background: var(--color-border);
                margin: var(--space-1) 0;
            }

            /* Forms */
            .form-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: var(--space-5);
            }
            .form-group {
                display: flex;
                flex-direction: column;
                gap: var(--space-2);
            }
            .form-group.full-width {
                grid-column: 1 / -1;
            }
            .form-group label {
                font-size: var(--text-sm);
                font-weight: 600;
                color: var(--color-text);
            }

            /* Info grid */
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: var(--space-3);
            }
            .info-item {
                padding: var(--space-4);
                background: var(--neutral-50);
                border: 1px solid var(--color-border-light);
                border-radius: var(--radius-md);
            }
            .info-label {
                font-size: var(--text-xs);
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: var(--color-text-muted);
                margin-bottom: 4px;
            }
            .info-value {
                font-size: var(--text-sm);
                font-weight: 600;
                color: var(--color-text);
            }
            .badge-plan {
                display: inline-block;
                padding: 3px 10px;
                border-radius: var(--radius-full);
                font-size: var(--text-xs);
                font-weight: 700;
                background: var(--neutral-100);
                color: var(--color-text-muted);
            }
            .badge-plan.premium {
                background: #fef9c3;
                color: #854d0e;
                border: 1px solid #fde047;
            }
            .badge-status {
                display: inline-block;
                padding: 3px 10px;
                border-radius: var(--radius-full);
                font-size: var(--text-xs);
                font-weight: 700;
                background: var(--neutral-100);
                color: var(--color-text-muted);
            }
            .badge-status.active {
                background: #dcfce7;
                color: #166534;
            }

            /* Toggle */
            .toggle-switch {
                width: 44px;
                height: 24px;
                background: var(--neutral-200);
                border-radius: var(--radius-full);
                cursor: pointer;
                position: relative;
                transition: background var(--transition-base);
                flex-shrink: 0;
            }
            .toggle-switch.on {
                background: var(--teal-500);
            }
            .toggle-knob {
                position: absolute;
                width: 18px;
                height: 18px;
                background: white;
                border-radius: 50%;
                top: 3px;
                left: 3px;
                transition: transform var(--transition-base);
                box-shadow: var(--shadow-sm);
            }
            .toggle-switch.on .toggle-knob {
                transform: translateX(20px);
            }

            /* Security */
            .security-section {
                display: flex;
                flex-direction: column;
                gap: var(--space-3);
            }
            .ss-label {
                font-size: var(--text-xs);
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.07em;
                color: var(--color-text-muted);
            }
            .ss-desc {
                font-size: var(--text-sm);
                color: var(--color-text-muted);
                margin-top: -4px;
            }
            .signin-method {
                display: flex;
                align-items: center;
                gap: var(--space-4);
                padding: var(--space-4);
                border: 1px solid var(--color-border-light);
                border-radius: var(--radius-md);
                background: var(--neutral-50);
            }
            .sm-icon {
                width: 38px;
                height: 38px;
                border-radius: var(--radius-md);
                background: var(--color-surface);
                border: 1px solid var(--color-border-light);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            .sm-info {
                flex: 1;
            }
            .sm-name {
                font-size: var(--text-sm);
                font-weight: 600;
                color: var(--color-text);
            }
            .sm-sub {
                font-size: var(--text-xs);
                color: var(--color-text-muted);
            }
            .sm-badge {
                font-size: var(--text-xs);
                font-weight: 600;
                padding: 3px 10px;
                border-radius: var(--radius-full);
                background: #dcfce7;
                color: #166534;
                border: 1px solid #bbf7d0;
            }
            .passkey-card {
                display: flex;
                align-items: center;
                gap: var(--space-4);
                padding: var(--space-5);
                border: 1.5px dashed var(--color-border);
                border-radius: var(--radius-lg);
                background: var(--neutral-50);
                transition: all 0.2s;
            }
            .passkey-card.registered {
                border-style: solid;
                border-color: var(--teal-200);
                background: linear-gradient(
                    135deg,
                    var(--teal-50),
                    var(--cyan-50)
                );
            }
            .pk-icon {
                width: 48px;
                height: 48px;
                border-radius: var(--radius-lg);
                background: var(--neutral-100);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            .pk-icon.registered {
                background: var(--teal-100);
            }
            .pk-info {
                flex: 1;
            }
            .pk-title {
                font-size: var(--text-sm);
                font-weight: 700;
                margin-bottom: 2px;
                color: var(--color-text);
            }
            .pk-desc {
                font-size: var(--text-xs);
                color: var(--color-text-muted);
                line-height: 1.5;
            }
            .pk-actions {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                flex-shrink: 0;
            }
            .btn-passkey-setup {
                padding: 8px 16px;
                border-radius: var(--radius-md);
                background: linear-gradient(
                    135deg,
                    var(--teal-500),
                    var(--teal-600)
                );
                color: white;
                font-size: var(--text-sm);
                font-weight: 600;
                border: none;
                cursor: pointer;
                font-family: var(--font-body);
                transition: opacity 0.2s;
            }
            .btn-passkey-setup:hover {
                opacity: 0.9;
            }
            .pk-badge-ok {
                font-size: var(--text-xs);
                font-weight: 700;
                padding: 4px 10px;
                border-radius: var(--radius-full);
                background: var(--teal-100);
                color: var(--teal-700);
                border: 1px solid var(--teal-200);
            }
            .pk-hint {
                display: flex;
                gap: var(--space-2);
                padding: var(--space-3) var(--space-4);
                background: #fffbeb;
                border: 1px solid #fde68a;
                border-radius: var(--radius-md);
                font-size: var(--text-xs);
                color: #92400e;
            }

            /* Notifications */
            .notif-group {
                display: flex;
                flex-direction: column;
            }
            .ng-title {
                font-size: var(--text-xs);
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                color: var(--color-text-muted);
                padding: var(--space-4) 0 var(--space-2);
            }
            .notif-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--space-4) 0;
                border-bottom: 1px solid var(--color-border-light);
                gap: var(--space-6);
            }
            .notif-row:last-child {
                border-bottom: none;
            }
            .nr-info {
                flex: 1;
            }
            .nr-name {
                font-size: var(--text-sm);
                font-weight: 600;
                color: var(--color-text);
            }
            .nr-desc {
                font-size: var(--text-xs);
                color: var(--color-text-muted);
            }
            .nr-toggles {
                display: flex;
                gap: var(--space-6);
            }
            .nr-toggle {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
            }
            .ch-label {
                font-size: 0.65rem;
                font-weight: 600;
                text-transform: uppercase;
                color: var(--color-text-light);
            }

            /* Appearance */
            .appear-section-title {
                font-size: var(--text-sm);
                font-weight: 700;
                color: var(--color-text-muted);
                text-transform: uppercase;
                letter-spacing: 0.06em;
            }
            .appear-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--space-6);
                padding: var(--space-4) 0;
                border-bottom: 1px solid var(--color-border-light);
            }
            .appear-row:last-of-type {
                border-bottom: none;
            }
            .ar-info {
                flex: 1;
            }
            .ar-label {
                font-size: var(--text-sm);
                font-weight: 600;
                color: var(--color-text);
                margin-bottom: 2px;
            }
            .ar-desc {
                font-size: var(--text-xs);
                color: var(--color-text-muted);
            }

            /* Theme cards */
            .theme-grid {
                display: flex;
                gap: var(--space-3);
            }
            .theme-card {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: var(--space-2);
                padding: var(--space-4) var(--space-5);
                border: 1.5px solid var(--color-border);
                border-radius: var(--radius-lg);
                background: var(--color-surface);
                cursor: pointer;
                font-family: var(--font-body);
                font-size: var(--text-sm);
                font-weight: 600;
                color: var(--color-text-muted);
                transition: all var(--transition-fast);
                position: relative;
                min-width: 90px;
            }
            .theme-card:hover {
                border-color: var(--teal-300);
                color: var(--color-text);
            }
            .theme-card.active {
                border-color: var(--teal-500);
                background: var(--teal-50);
                color: var(--teal-700);
            }
            .theme-preview {
                width: 64px;
                height: 40px;
                border-radius: var(--radius-sm);
                border: 1px solid var(--color-border-light);
                margin-bottom: 2px;
            }
            .light-preview {
                background: linear-gradient(135deg, #f8fafc 60%, #f0fdfa);
            }
            .dark-preview {
                background: linear-gradient(135deg, #1e293b 60%, #0f172a);
            }
            .system-preview {
                background: linear-gradient(to right, #f8fafc 50%, #1e293b 50%);
            }
            .theme-name {
                font-size: var(--text-xs);
                font-weight: 600;
            }
            .theme-check {
                position: absolute;
                top: 7px;
                right: 9px;
                font-size: 0.75rem;
                color: var(--teal-600);
            }

            /* Font size */
            .font-size-options {
                display: flex;
                gap: var(--space-2);
            }
            .fs-btn {
                padding: var(--space-2) var(--space-3);
                border: 1.5px solid var(--color-border);
                border-radius: var(--radius-md);
                font-size: var(--text-xs);
                font-weight: 600;
                background: var(--color-surface);
                color: var(--color-text-muted);
                cursor: pointer;
                font-family: var(--font-body);
                transition: all var(--transition-fast);
            }
            .fs-btn:hover {
                border-color: var(--teal-300);
                color: var(--color-text);
            }
            .fs-btn.active {
                border-color: var(--teal-500);
                background: var(--teal-50);
                color: var(--teal-700);
            }

            /* Preview */
            .appear-preview {
                background: var(--neutral-50);
                border: 1px solid var(--color-border-light);
                border-radius: var(--radius-lg);
                padding: var(--space-4);
            }
            .preview-card {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                background: var(--color-surface);
                border: 1px solid var(--color-border-light);
                border-radius: var(--radius-md);
                padding: var(--space-3) var(--space-4);
            }
            .preview-avatar {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: linear-gradient(
                    135deg,
                    var(--teal-400),
                    var(--cyan-400)
                );
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 700;
                font-size: var(--text-xs);
                flex-shrink: 0;
            }
            .preview-name {
                font-size: var(--text-sm);
                font-weight: 600;
                color: var(--color-text);
            }
            .preview-role {
                font-size: var(--text-xs);
                color: var(--color-text-muted);
            }

            /* Subscription */
            .plan-card {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: var(--space-4);
                padding: var(--space-6);
                border: 1.5px solid var(--color-border-light);
                border-radius: var(--radius-lg);
                background: var(--neutral-50);
            }
            .plan-card.premium {
                background: linear-gradient(
                    135deg,
                    var(--teal-50),
                    var(--cyan-50)
                );
                border-color: var(--teal-200);
            }
            .plan-name {
                font-size: var(--text-lg);
                font-weight: 700;
                color: var(--color-text);
                margin-bottom: var(--space-2);
            }
            .plan-price {
                font-family: var(--font-display);
                font-size: var(--text-3xl);
                font-weight: 700;
                color: var(--teal-600);
            }
            .plan-price span {
                font-size: var(--text-sm);
                color: var(--color-text-muted);
                font-family: var(--font-body);
            }
            .plan-note {
                font-size: var(--text-xs);
                color: var(--color-text-muted);
                margin-top: var(--space-2);
            }
            .plan-actions {
                display: flex;
                flex-direction: column;
                gap: var(--space-2);
                align-items: flex-end;
                flex-shrink: 0;
            }
            .usage-block {
                display: flex;
                flex-direction: column;
                gap: var(--space-2);
            }
            .usage-row {
                display: flex;
                justify-content: space-between;
                font-size: var(--text-sm);
                font-weight: 600;
                color: var(--color-text);
            }
            .usage-count {
                color: var(--color-text-muted);
            }
            .usage-track {
                height: 8px;
                background: var(--neutral-100);
                border-radius: var(--radius-full);
                overflow: hidden;
            }
            .usage-fill {
                height: 100%;
                background: linear-gradient(
                    90deg,
                    var(--teal-400),
                    var(--teal-600)
                );
                border-radius: var(--radius-full);
                transition: width 0.5s ease;
            }
            .usage-fill.usage-warn {
                background: linear-gradient(90deg, #f59e0b, #ef4444);
            }
            .features-compare {
                border: 1px solid var(--color-border-light);
                border-radius: var(--radius-md);
                overflow: hidden;
            }
            .fc-row {
                display: grid;
                grid-template-columns: 1fr 80px 80px;
                gap: var(--space-4);
                padding: var(--space-3) var(--space-4);
                font-size: var(--text-sm);
                color: var(--color-text);
                border-bottom: 1px solid var(--color-border-light);
            }
            .fc-row:last-child {
                border-bottom: none;
            }
            .fc-row.header {
                font-weight: 700;
                font-size: var(--text-xs);
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: var(--color-text-muted);
                background: var(--neutral-50);
            }
            .fc-premium {
                color: var(--teal-600);
                font-weight: 600;
            }

            @media (max-width: 1024px) {
                .settings-layout {
                    grid-template-columns: 1fr;
                }
                .settings-nav {
                    flex-direction: row;
                    flex-wrap: wrap;
                    position: static;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }
                .settings-nav .sn-item {
                    flex-shrink: 0;
                }
                .form-grid,
                .info-grid {
                    grid-template-columns: 1fr;
                }
                .passkey-card {
                    flex-direction: column;
                    align-items: flex-start;
                }
                .pk-actions {
                    width: 100%;
                    flex-wrap: wrap;
                }
                .theme-grid {
                    flex-wrap: wrap;
                }
            }

            @media (max-width: 640px) {
                .settings-content {
                    padding: var(--space-4);
                }
                .signin-method,
                .appear-row {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: var(--space-2);
                }
                .signin-method .sm-badge {
                    align-self: flex-start;
                }
                .features-compare .fc-row {
                    grid-template-columns: 1.4fr 0.8fr 0.8fr;
                    font-size: var(--text-xs);
                }
                .features-compare .fc-row > span {
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .plan-card {
                    padding: var(--space-4);
                }
                .info-item {
                    padding: var(--space-3);
                }
            }

            @media (max-width: 420px) {
                .settings-nav .sn-item {
                    padding: var(--space-2) var(--space-3);
                    font-size: var(--text-xs);
                }
                .saved-toast,
                .error-toast {
                    font-size: var(--text-sm);
                }
            }
        `,
    ],
})
export class SettingsComponent implements OnInit {
    private authService = inject(AuthService);
    private userStore = inject(CurrentUserStoreService);
    private userApi = inject(UserApiService);
    private themeService = inject(ThemeService);

    activeTab = signal("account");
    saved = false;
    saveError = "";
    saving = false;
    loading = true;
    passkeyRegistered = false;

    user: UserProfile | null = null;
    form = {
        firstName: "",
        lastName: "",
        phoneNumber: "",
        city: "",
        bio: "",
        preferredLanguage: "en",
    };

    // Appearance
    compactMode = false;
    animationsEnabled = true;
    fontSize = "base";

    themes = [
        {
            label: "Light",
            value: "light" as Theme,
            previewClass: "light-preview",
        },
        { label: "Dark", value: "dark" as Theme, previewClass: "dark-preview" },
        {
            label: "System",
            value: "system" as Theme,
            previewClass: "system-preview",
        },
    ];

    fontSizes = [
        { label: "Small", value: "sm" },
        { label: "Normal", value: "base" },
        { label: "Large", value: "lg" },
    ];

    tabs = [
        { key: "account", icon: "bi-person-fill", label: "Account" },
        { key: "security", icon: "bi-shield-lock-fill", label: "Security" },
        { key: "notifications", icon: "bi-bell-fill", label: "Notifications" },
        { key: "appearance", icon: "bi-palette-fill", label: "Appearance" },
        { key: "subscription", icon: "bi-stars", label: "Subscription" },
    ];

    private readonly FC_NO = '<i class="bi bi-x-circle-fill fc-no"></i>';
    private readonly FC_YES = '<i class="bi bi-check-circle-fill fc-yes"></i>';

    features = [
        { name: "Mock Sessions / month", free: "3", premium: "Unlimited" },
        { name: "AI Feedback Reports", free: "Basic", premium: "Detailed" },
        { name: "Mentor Sessions", free: this.FC_NO, premium: this.FC_YES },
        { name: "Community Access", free: this.FC_YES, premium: this.FC_YES },
        { name: "Resource Library", free: "Limited", premium: "Full" },
        { name: "Priority Support", free: this.FC_NO, premium: this.FC_YES },
    ];

    get currentTheme(): Theme {
        return this.themeService.active;
    }
    setTheme(t: Theme): void {
        this.themeService.apply(t);
    }

    ngOnInit() {
        this.passkeyRegistered = this.authService.isPasskeyAuthenticated();
        this.loadAppearancePrefs();

        const cached = this.userStore.currentUser;
        if (cached) {
            this.user = cached;
            this.populateForm(cached);
            this.loading = false;
        } else {
            this.userStore.loadCurrentUser().subscribe((u) => {
                this.user = u;
                if (u) this.populateForm(u);
                this.loading = false;
            });
        }
    }

    private populateForm(u: UserProfile): void {
        this.form.firstName = u.firstName || "";
        this.form.lastName = u.lastName || "";
        this.form.phoneNumber = u.phoneNumber || "";
        this.form.city = u.city || "";
        this.form.bio = u.bio || "";
        this.form.preferredLanguage = u.preferredLanguage || "en";
    }

    private loadAppearancePrefs(): void {
        try {
            this.compactMode =
                localStorage.getItem("interv_compact") === "true";
            this.animationsEnabled =
                localStorage.getItem("interv_animations") !== "false";
            this.fontSize = localStorage.getItem("interv_fontsize") || "base";
            this.applyFontSize(this.fontSize);
        } catch {
            /* ignore */
        }
    }

    toggleCompact(): void {
        this.compactMode = !this.compactMode;
        try {
            localStorage.setItem("interv_compact", String(this.compactMode));
        } catch {
            /* ignore */
        }
    }

    toggleAnimations(): void {
        this.animationsEnabled = !this.animationsEnabled;
        try {
            localStorage.setItem(
                "interv_animations",
                String(this.animationsEnabled),
            );
        } catch {
            /* ignore */
        }
    }

    setFontSize(size: string): void {
        this.fontSize = size;
        this.applyFontSize(size);
        try {
            localStorage.setItem("interv_fontsize", size);
        } catch {
            /* ignore */
        }
    }

    private applyFontSize(size: string): void {
        const map: Record<string, string> = {
            sm: "14px",
            base: "16px",
            lg: "18px",
        };
        document.documentElement.style.fontSize = map[size] || "16px";
    }

    saveAccount(): void {
        this.saving = true;
        this.saved = false;
        this.saveError = "";
        this.userApi
            .updateCurrentUser({
                firstName: this.form.firstName,
                lastName: this.form.lastName,
                phoneNumber: this.form.phoneNumber,
                city: this.form.city,
                bio: this.form.bio,
                preferredLanguage: this.form.preferredLanguage,
            })
            .subscribe({
                next: (u) => {
                    this.user = u;
                    this.userStore.setCurrentUser(u);
                    this.saving = false;
                    this.saved = true;
                    setTimeout(() => (this.saved = false), 3000);
                },
                error: () => {
                    this.saving = false;
                    this.saveError = "Failed to save. Please try again.";
                    setTimeout(() => (this.saveError = ""), 4000);
                },
            });
    }

    getInitials(): string {
        const f = this.user?.firstName?.[0] || "";
        const l = this.user?.lastName?.[0] || "";
        return (f + l).toUpperCase() || "?";
    }

    getUsagePct(used?: number, limit?: number): number {
        if (!limit) return 0;
        return Math.min(100, ((used ?? 0) / limit) * 100);
    }

    setupPasskey(): void {
        this.authService.registerPasskeyViaAIA();
    }
    managePasskeys(): void {
        window.open(
            `${environment.keycloak.url}/realms/${environment.keycloak.realm}/account/#/security/signing-in`,
            "_blank",
        );
    }
    setTab(key: string): void {
        this.activeTab.set(key);
        this.saved = false;
    }

    channels = ["Email", "Push"];

    notificationGroups = [
        {
            title: "Sessions & Practice",
            items: [
                {
                    name: "Session reminders",
                    desc: "Get reminded before upcoming sessions",
                    enabled: true,
                },
                {
                    name: "New session available",
                    desc: "When new session slots open up",
                    enabled: false,
                },
                {
                    name: "AI feedback ready",
                    desc: "When your session report is generated",
                    enabled: true,
                },
            ],
        },
        {
            title: "Learning & Progress",
            items: [
                {
                    name: "Daily streak reminder",
                    desc: "Keep your streak alive",
                    enabled: true,
                },
                {
                    name: "Badge earned",
                    desc: "When you earn a new badge",
                    enabled: true,
                },
                {
                    name: "Level up",
                    desc: "When you reach a new XP level",
                    enabled: true,
                },
            ],
        },
        {
            title: "Community",
            items: [
                {
                    name: "New comments",
                    desc: "When someone comments on your posts",
                    enabled: true,
                },
                {
                    name: "New followers",
                    desc: "When someone follows you",
                    enabled: false,
                },
                {
                    name: "Weekly digest",
                    desc: "A summary of community activity",
                    enabled: true,
                },
            ],
        },
    ];
}
