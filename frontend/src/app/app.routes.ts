import { Routes } from "@angular/router";
import { authGuard } from "./core/auth/auth.guard";
import { roleGuard } from "./core/auth/role.guard";

export const routes: Routes = [
    {
        path: "",
        pathMatch: "full",
        loadComponent: () =>
            import("./pages/landing/landing.component").then(
                (m) => m.LandingComponent,
            ),
    },
    {
        path: "",
        loadComponent: () =>
            import("./layout/shell/shell.component").then(
                (m) => m.ShellComponent,
            ),
        canActivate: [authGuard],
        children: [
            {
                path: "dashboard",
                loadComponent: () =>
                    import("./pages/dashboard/dashboard.component").then(
                        (m) => m.DashboardComponent,
                    ),
            },
            {
                path: "profile",
                loadComponent: () =>
                    import("./pages/profile/profile.component").then(
                        (m) => m.ProfileComponent,
                    ),
            },
            {
                path: "interviews",
                loadComponent: () =>
                    import("./pages/interviews/interviews.component").then(
                        (m) => m.InterviewsComponent,
                    ),
            },
            {
                path: "live-interview/:id",
                loadComponent: () =>
                    import("./pages/live-interview/live-interview.component").then(
                        (m) => m.LiveInterviewComponent,
                    ),
            },
            {
                path: "quick-interview/:id",
                loadComponent: () =>
                    import("./pages/quick-interview/quick-interview.component").then(
                        (m) => m.QuickInterviewComponent,
                    ),
            },
            {
                path: "reports",
                loadComponent: () =>
                    import("./pages/reports/reports.component").then(
                        (m) => m.ReportsComponent,
                    ),
            },
            {
                path: "quiz-assessment",
                loadComponent: () =>
                    import("./pages/quiz-assessment/quiz-assessment.component").then(
                        (m) => m.QuizAssessmentComponent,
                    ),
            },
            {
                path: "training-gamification",
                loadComponent: () =>
                    import("./pages/training-gamification/training-gamification.component").then(
                        (m) => m.TrainingGamificationComponent,
                    ),
            },
            {
                path: "mentorship",
                loadComponent: () =>
                    import("./pages/mentorship/mentorship.component").then(
                        (m) => m.MentorshipComponent,
                    ),
            },
            {
                path: "community",
                loadComponent: () =>
                    import("./pages/community/community.component").then(
                        (m) => m.CommunityComponent,
                    ),
            },
            {
                path: "profile/:keycloakId",
                loadComponent: () =>
                    import("./pages/user-profile/user-profile.component").then(
                        (m) => m.UserProfileComponent,
                    ),
            },
            {
                path: "community/career",
                loadComponent: () =>
                    import("./pages/community/career-wizard/career-wizard.component").then(
                        (m) => m.CareerWizardComponent,
                    ),
            },
            {
                path: "community/jobs",
                loadComponent: () =>
                    import("./pages/community/jobs/jobs.component").then(
                        (m) => m.JobsComponent,
                    ),
            },
            {
                path: "library",
                loadComponent: () =>
                    import("./pages/library/library.component").then(
                        (m) => m.LibraryComponent,
                    ),
            },
            {
                path: "pricing",
                loadComponent: () =>
                    import("./pages/pricing/pricing.component").then(
                        (m) => m.PricingComponent,
                    ),
            },
            {
                path: "settings",
                loadComponent: () =>
                    import("./pages/settings/settings.component").then(
                        (m) => m.SettingsComponent,
                    ),
            },
            {
                path: "ai-report",
                loadComponent: () =>
                    import("./pages/quiz/quiz-evaluation-report.component").then(
                        (m) => m.QuizEvaluationReportComponent,
                    ),
            },
            {
                path: "admin",
                canActivate: [roleGuard("ADMIN")],
                loadComponent: () =>
                    import("./pages/admin/admin-dashboard.component").then(
                        (m) => m.AdminDashboardComponent,
                    ),
            },
        ],
    },
    {
        path: "complete-profile",
        loadComponent: () =>
            import("./pages/complete-profile/complete-profile.component").then(
                (m) => m.CompleteProfileComponent,
            ),
    },
    { path: "**", redirectTo: "" },
];
