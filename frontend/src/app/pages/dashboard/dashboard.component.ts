import {
    Component,
    DestroyRef,
    inject,
    OnInit,
    ChangeDetectorRef,
    ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink, ActivatedRoute, Router } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

import { StatCardComponent } from "../../shared/components/stat-card/stat-card.component";
import { SectionHeaderComponent } from "../../shared/components/section-header/section-header.component";
import { BadgeCardComponent } from "../../shared/components/badge-card/badge-card.component";
import { ChartPlaceholderComponent } from "../../shared/components/chart-placeholder/chart-placeholder.component";

import {
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    EmptyStateComponent,
    SkeletonComponent,
} from "../../shared/components/ui";

import { AuthService } from "../../core/auth/auth.service";
import { AdminDashboardComponent } from "../admin/admin-dashboard.component";
import { CurrentUserStoreService } from "../../core/services/current-user-store.service";
import { UserProfile } from "../../core/services/user-api.service";
import { TrainingApiService } from "../../core/services/training-api.service";
import { InterviewApiService } from "../../core/services/interview-api.service";
import { QuizService } from "../../core/services/quiz.service";
import {
    BookmarkApiResponse,
    ResourceApiService,
} from "../../core/services/resource-api.service";
import {
    InterviewSessionResponse,
    ProgressTracker,
} from "../../core/models/interview.models";
import {
    TrainingModuleResponse,
    UserBadgeResponse,
    UserXPTrackerResponse,
} from "../../core/models/training.models";
import { Badge } from "../../core/models/models";
import { catchError, forkJoin, of } from "rxjs";

interface Recommendation {
    icon: string;
    title: string;
    progress: number;
    xp: number;
}

interface SavedResource {
    icon: string;
    title: string;
    duration: string;
    category: string;
}

interface ActivityRow {
    icon: string;
    tone: "primary" | "success" | "info" | "warning";
    title: string;
    subtitle: string;
    time: string;
}

@Component({
    selector: "app-dashboard",
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterLink,
        StatCardComponent,
        SectionHeaderComponent,
        BadgeCardComponent,
        ChartPlaceholderComponent,
        AdminDashboardComponent,
        ButtonComponent,
        CardComponent,
        BadgeComponent,
        EmptyStateComponent,
        SkeletonComponent,
    ],
    templateUrl: "./dashboard.component.html",
    styleUrls: ["./dashboard.component.css"],
})
export class DashboardComponent implements OnInit {
    private authService = inject(AuthService);
    private currentUserStore = inject(CurrentUserStoreService);
    private destroyRef = inject(DestroyRef);
    private cdr = inject(ChangeDetectorRef);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private trainingApi = inject(TrainingApiService);
    private interviewApi = inject(InterviewApiService);
    private quizService = inject(QuizService);
    private resourceApi = inject(ResourceApiService);

    currentUser: UserProfile | null = null;
    loading = true;
    storeInitialized = false;
    isAdmin = false;
    activeTab: "overview" | "admin" = "overview";

    /** True until the supplementary live data (sessions/badges/etc.) finishes loading. */
    dashboardDataLoading = false;
    private dashboardDataLoaded = false;

    progress: ProgressTracker | null = null;
    xpTracker: UserXPTrackerResponse | null = null;
    sessions: InterviewSessionResponse[] = [];
    quizAttempts: any[] = [];
    pathModules: TrainingModuleResponse[] = [];
    bookmarks: BookmarkApiResponse[] = [];
    earnedBadges: Badge[] = [];

    circumference = 2 * Math.PI * 48;

    ngOnInit(): void {
        this.route.queryParamMap
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((params) => {
                const tab = params.get("tab");
                this.activeTab = tab === "admin" ? "admin" : "overview";
            });

        this.currentUserStore.currentUser$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((user) => {
                this.currentUser = user;
                this.isAdmin = this.computeIsAdmin(user);
                this.cdr.markForCheck();
                if (user && !this.dashboardDataLoaded) {
                    this.loadDashboardData();
                }
            });

        this.currentUserStore.initialized$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((initialized) => {
                this.storeInitialized = initialized;
                this.loading = !initialized;
                this.cdr.markForCheck();
            });

        if (!this.currentUserStore.initialized) {
            this.currentUserStore
                .loadCurrentUser()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe();
        } else {
            this.loading = false;
            this.storeInitialized = true;
        }
    }

    setTab(tab: "overview" | "admin"): void {
        this.activeTab = tab;
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: tab === "admin" ? { tab: "admin" } : {},
            queryParamsHandling: "",
        });
    }

    reloadDashboard(): void {
        this.loading = true;
        this.storeInitialized = false;
        this.dashboardDataLoaded = false;

        this.currentUserStore
            .refreshCurrentUser()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    /**
     * Load all the live, user-scoped data the dashboard needs in parallel.
     * Each stream is wrapped in `catchError` so that one missing/failing
     * service (e.g. training-service down) doesn't prevent the rest from
     * appearing — the affected section just falls back to its empty state.
     */
    private loadDashboardData(): void {
        const userId = this.authService.getKeycloakId();
        this.dashboardDataLoading = true;
        this.dashboardDataLoaded = true;

        forkJoin({
            progress: this.interviewApi
                .getMyProgress()
                .pipe(catchError(() => of(null))),
            sessions: this.interviewApi
                .getMySessions()
                .pipe(catchError(() => of([] as InterviewSessionResponse[]))),
            xpTracker: userId
                ? this.trainingApi
                      .getUserXpTracker(userId)
                      .pipe(catchError(() => of(null)))
                : of(null),
            badges: userId
                ? this.trainingApi
                      .getUserBadges(userId)
                      .pipe(catchError(() => of([] as UserBadgeResponse[])))
                : of([] as UserBadgeResponse[]),
            path: userId
                ? this.trainingApi
                      .getOrCreatePath(userId)
                      .pipe(catchError(() => of(null)))
                : of(null),
            quizAttempts: this.quizService
                .getMyAttempts()
                .pipe(catchError(() => of([] as any[]))),
            bookmarks: this.resourceApi
                .getBookmarks()
                .pipe(catchError(() => of([] as BookmarkApiResponse[]))),
        })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => {
                    this.progress = res.progress;
                    this.sessions = Array.isArray(res.sessions)
                        ? res.sessions
                        : [];
                    this.xpTracker = res.xpTracker;
                    this.earnedBadges = this.mapUserBadges(res.badges || []);
                    this.pathModules = res.path?.modules || [];
                    this.quizAttempts = Array.isArray(res.quizAttempts)
                        ? res.quizAttempts
                        : [];
                    this.bookmarks = Array.isArray(res.bookmarks)
                        ? res.bookmarks
                        : [];
                    this.dashboardDataLoading = false;
                    this.cdr.markForCheck();
                },
                error: () => {
                    this.dashboardDataLoading = false;
                    this.cdr.markForCheck();
                },
            });
    }

    get fullWelcomeName(): string {
        if (!this.currentUser) {
            return this.authService.getFullName() || "there";
        }

        const fullName =
            `${this.currentUser.firstName || ""} ${this.currentUser.lastName || ""}`.trim();

        return fullName || this.authService.getFullName() || "there";
    }

    get readinessScore(): number {
        return this.computeProfileCompletion();
    }

    get readinessDash(): number {
        return (this.readinessScore / 100) * this.circumference;
    }

    get readinessTone(): "primary" | "success" | "warning" {
        const score = this.readinessScore;
        if (score >= 80) return "success";
        if (score >= 50) return "primary";
        return "warning";
    }

    get totalSessions(): number {
        return (
            this.progress?.totalSessionsCompleted ??
            this.currentUser?.simulationsUsedThisMonth ??
            0
        );
    }

    get totalQuizzes(): number {
        return this.quizAttempts.length;
    }

    /** Latest score derived from the most recent completed session (0–100). */
    get recentScore(): number {
        const avg = this.progress?.averageScore;
        if (avg == null) return 0;
        return Math.round(avg * 100);
    }

    /** Total study time in hours, summed from completed session durations. */
    get hoursStudied(): number {
        if (!this.sessions.length) return 0;
        const minutes = this.sessions
            .filter((s) => s.status === "COMPLETED")
            .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
        return Math.round(minutes / 60);
    }

    get sessionsThisWeek(): number {
        if (!this.sessions.length) return 0;
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return this.sessions.filter((s) => {
            const t = s.startedAt ? new Date(s.startedAt).getTime() : 0;
            return t >= cutoff;
        }).length;
    }

    get karmaPoints(): number {
        return (
            this.xpTracker?.totalXp ?? this.currentUser?.karmaPoints ?? 0
        );
    }

    get dayStreak(): number {
        return this.xpTracker?.currentStreak ?? 0;
    }

    get memberSince(): string {
        if (!this.currentUser?.createdAt) return "";

        const date = new Date(this.currentUser.createdAt);
        return date.toLocaleString("en-US", {
            month: "short",
            year: "numeric",
        });
    }

    get currentRoleLabel(): string {
        return this.formatRole(this.currentUser?.role || "");
    }

    get currentIndustryLabel(): string {
        return this.formatTextValue(this.currentUser?.preferredIndustry || "");
    }

    get currentCityLabel(): string {
        return this.currentUser?.city || "";
    }

    get profileCompletionItems(): { label: string; done: boolean }[] {
        return [
            {
                label: "Complete name",
                done:
                    this.hasText(this.currentUser?.firstName) &&
                    this.hasText(this.currentUser?.lastName),
            },
            {
                label: "Add city",
                done: this.hasText(this.currentUser?.city),
            },
            {
                label: "Set preferred industry",
                done: this.hasText(this.currentUser?.preferredIndustry),
            },
            {
                label: "Set preferred language",
                done: this.hasText(this.currentUser?.preferredLanguage),
            },
            {
                label: "Write strong bio",
                done: this.hasStrongBio(this.currentUser?.bio),
            },
            {
                label: "Upload profile photo",
                done: this.hasText(this.currentUser?.avatarUrl),
            },
            {
                label: "Add skills",
                done: this.hasArray(this.currentUser?.skills),
            },
            {
                label: "Upload CV",
                done: this.hasText(this.currentUser?.cvUrl),
            },
            {
                label: "Add work experience",
                done: this.hasJsonArray(this.currentUser?.experiencesJson),
            },
            {
                label: "Add education",
                done: this.hasJsonArray(this.currentUser?.educationsJson),
            },
        ];
    }

    /**
     * Top in-progress modules from the user's training path.
     * Falls back to non-locked modules if there's nothing in progress yet.
     */
    get recommendations(): Recommendation[] {
        if (!this.pathModules.length) return [];

        const inProgress = this.pathModules.filter(
            (m) => m.status === "IN_PROGRESS",
        );
        const queue = this.pathModules.filter((m) => m.status !== "LOCKED");
        const picked = (inProgress.length ? inProgress : queue).slice(0, 3);

        return picked.map((m) => ({
            icon: this.iconForCategory(m.category),
            title: m.title,
            progress: Math.round(m.progress || 0),
            xp: m.xpReward || 0,
        }));
    }

    /** Three most recently bookmarked library items. */
    get savedResources(): SavedResource[] {
        return this.bookmarks
            .slice(0, 3)
            .filter((b) => !!b.resource)
            .map((b) => ({
                icon: this.iconForResourceType(b.resource.type),
                title: b.resource.title,
                duration: this.resourceDurationLabel(b.resource.type),
                category:
                    b.resource.categoryName ||
                    this.formatTextValue(b.resource.industry || ""),
            }));
    }

    /**
     * Recent activity merged from the latest interview sessions and quiz attempts.
     * Most recent first; capped at 4 rows.
     */
    get recentActivity(): ActivityRow[] {
        const rows: (ActivityRow & { _at: number })[] = [];

        for (const s of this.sessions) {
            const at = s.endedAt || s.startedAt || s.createdAt;
            if (!at) continue;
            const completed = s.status === "COMPLETED";
            rows.push({
                _at: new Date(at).getTime(),
                icon: completed
                    ? "bi-check-circle-fill"
                    : "bi-mic-fill",
                tone: completed ? "success" : "primary",
                title: completed
                    ? `${this.formatTextValue(s.type || "")} session completed`
                    : `${this.formatTextValue(s.type || "")} session started`,
                subtitle: this.formatTextValue(s.industry || "") || "—",
                time: this.relativeTime(at),
            });
        }

        for (const a of this.quizAttempts) {
            const at =
                a?.completedAt || a?.submittedAt || a?.createdAt || a?.updatedAt;
            if (!at) continue;
            rows.push({
                _at: new Date(at).getTime(),
                icon: "bi-patch-question-fill",
                tone: "info",
                title: a?.quizTitle
                    ? `Quiz: ${a.quizTitle}`
                    : "Quiz attempt completed",
                subtitle:
                    typeof a?.score === "number"
                        ? `Scored ${Math.round(a.score)}%`
                        : "Submitted",
                time: this.relativeTime(at),
            });
        }

        return rows
            .sort((a, b) => b._at - a._at)
            .slice(0, 4)
            .map(({ _at, ...row }) => row);
    }

    private mapUserBadges(userBadges: UserBadgeResponse[]): Badge[] {
        return userBadges
            .filter((ub) => !!ub.badge)
            .map((ub) => ({
                id: String(ub.badgeId),
                name: ub.badge!.name,
                description: ub.badge!.description || "",
                icon:
                    typeof ub.badge!.icon === "string" &&
                    ub.badge!.icon.trim().length > 0
                        ? `<i class="bi ${ub.badge!.icon.startsWith("bi-") ? ub.badge!.icon : "bi-award-fill"}"></i>`
                        : '<i class="bi bi-award-fill"></i>',
                color: "teal",
                earned: true,
                earnedDate: ub.earnedDate
                    ? this.formatShortDate(ub.earnedDate)
                    : undefined,
                xpReward: ub.badge!.xpReward || 0,
            }));
    }

    private iconForCategory(category: string): string {
        switch (category) {
            case "COMMUNICATION":
                return "bi-chat-dots-fill";
            case "STRESS_MANAGEMENT":
                return "bi-heart-pulse-fill";
            case "CONTENT_PREP":
                return "bi-pencil-square";
            case "BODY_LANGUAGE":
                return "bi-person-fill";
            case "INDUSTRY_SPECIFIC":
                return "bi-building-fill";
            default:
                return "bi-stars";
        }
    }

    private iconForResourceType(type: string): string {
        const t = (type || "").toUpperCase();
        if (t.includes("VIDEO")) return "bi-play-btn-fill";
        if (t.includes("PDF") || t.includes("DOC"))
            return "bi-file-earmark-pdf-fill";
        if (t.includes("ARTICLE") || t.includes("BLOG"))
            return "bi-file-earmark-text-fill";
        if (t.includes("BOOK")) return "bi-book-half";
        if (t.includes("PODCAST") || t.includes("AUDIO"))
            return "bi-mic-fill";
        return "bi-bookmark-fill";
    }

    private resourceDurationLabel(type: string): string {
        const t = (type || "").toUpperCase();
        if (t.includes("VIDEO")) return "Watch";
        if (t.includes("PDF") || t.includes("DOC")) return "Download";
        if (t.includes("PODCAST") || t.includes("AUDIO")) return "Listen";
        return "Read";
    }

    private relativeTime(value: string): string {
        const t = new Date(value).getTime();
        if (!t) return "";
        const diff = Date.now() - t;
        if (diff < 60_000) return "Just now";
        if (diff < 60 * 60_000) {
            const m = Math.floor(diff / 60_000);
            return `${m}m ago`;
        }
        if (diff < 24 * 60 * 60_000) {
            const h = Math.floor(diff / (60 * 60_000));
            return `${h}h ago`;
        }
        const d = Math.floor(diff / (24 * 60 * 60_000));
        if (d === 1) return "Yesterday";
        if (d < 7) return `${d}d ago`;
        return new Date(value).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
        });
    }

    private formatShortDate(value: string): string {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "";
        return d.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }

    private computeIsAdmin(user: UserProfile | null): boolean {
        const role = (user?.role || "").toUpperCase();
        return (
            role === "ADMIN" ||
            role === "ROLE_ADMIN" ||
            this.authService.hasRole("ROLE_ADMIN")
        );
    }

    private computeProfileCompletion(): number {
        if (!this.currentUser) return 0;

        const TOTAL_POINTS = 110;
        let score = 0;

        if (
            this.hasText(this.currentUser.firstName) &&
            this.hasText(this.currentUser.lastName)
        ) {
            score += 15;
        }

        if (this.hasText(this.currentUser.city)) score += 10;
        if (this.hasText(this.currentUser.preferredIndustry)) score += 10;
        if (this.hasText(this.currentUser.preferredLanguage)) score += 5;
        if (this.hasStrongBio(this.currentUser.bio)) score += 15;
        if (this.hasText(this.currentUser.avatarUrl)) score += 5;
        if (this.hasArray(this.currentUser.skills)) score += 15;
        if (this.hasText(this.currentUser.cvUrl)) score += 10;
        if (this.hasJsonArray(this.currentUser.experiencesJson)) score += 10;
        if (this.hasJsonArray(this.currentUser.educationsJson)) score += 10;
        if (this.currentUser.isVerified) score += 5;

        return Math.round((score / TOTAL_POINTS) * 100);
    }

    private hasText(value: unknown): boolean {
        return typeof value === "string" && value.trim().length > 0;
    }

    private hasStrongBio(value: unknown): boolean {
        return typeof value === "string" && value.trim().length >= 30;
    }

    private hasArray(value: unknown): boolean {
        return Array.isArray(value) && value.length > 0;
    }

    private hasJsonArray(value: unknown): boolean {
        if (!value || typeof value !== "string") return false;

        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) && parsed.length > 0;
        } catch {
            return false;
        }
    }

    private formatRole(role: string): string {
        if (!role) return "";
        return role.replace(/^ROLE_/, "").replace(/_/g, " ");
    }

    private formatTextValue(value: string): string {
        if (!value) return "";
        return value.replace(/_/g, " ");
    }
}
