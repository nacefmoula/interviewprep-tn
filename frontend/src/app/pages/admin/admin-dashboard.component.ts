import {
    Component,
    inject,
    OnInit,
    ChangeDetectorRef,
    ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { finalize } from "rxjs";
import { AuthService } from "../../core/auth/auth.service";
import { environment } from "../../../environments/environment";
import { InterviewApiService } from "../../core/services/interview-api.service";
import {
    InterviewSessionResponse,
    PerformanceReport,
    ProgressTracker,
} from "../../core/models/interview.models";
import {
    BadgeResponse,
    DailyActivityResponse,
    TrainingLessonResponse,
    TrainingModuleResponse,
    TrainingPathResponse,
    UserBadgeResponse,
    UserXPTrackerResponse,
} from "../../core/models/training.models";

interface GenerateMissingLessonsResponse {
    category: string;
    language: string;
    existingActiveCount: number;
    targetActiveCount: number;
    missingCount: number;
    generatedCount: number;
    generatedLessonIds: number[];
}

interface UserItem {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    plan: string;
    isVerified: boolean;
    karmaPoints: number;
    createdAt: string;
    phoneNumber: string;
    city: string;
    bio: string;
    preferredIndustry: string;
    preferredLanguage: string;
    simulationsUsedThisMonth: number;
    simulationsLimit: number;
    subscriptionActive: boolean;
    lastLoginAt: string;
}

interface UserIdentityItem {
    keycloakId: string;
    email: string;
    firstName: string;
    lastName: string;
}

type AdminTab = "users" | "interviews" | "training";

@Component({
    selector: "app-admin-dashboard",
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="admin-panel">
            <!-- Tab switcher -->
            <div class="admin-tabs">
                <button
                    class="adm-tab"
                    [class.active]="activeTab === 'users'"
                    (click)="setTab('users')"
                >
                    <i class="bi bi-people-fill"></i> Users
                </button>
                <button
                    class="adm-tab"
                    [class.active]="activeTab === 'interviews'"
                    (click)="setTab('interviews')"
                >
                    <i class="bi bi-mic-fill"></i> Interviews
                </button>
                <button
                    class="adm-tab"
                    [class.active]="activeTab === 'training'"
                    (click)="setTab('training')"
                >
                    <i class="bi bi-bullseye"></i> Training
                </button>
            </div>

            <!-- In-app notices (replaces browser alert) -->
            <div
                *ngIf="adminNotice"
                class="admin-notice"
                [class.notice-success]="adminNotice.type === 'success'"
                [class.notice-error]="adminNotice.type === 'error'"
                [class.notice-info]="adminNotice.type === 'info'"
            >
                <div class="notice-message">{{ adminNotice.message }}</div>
                <button class="notice-close" (click)="clearNotice()" aria-label="Close notice">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>

            <!-- ════════════════════ USERS TAB ════════════════════ -->
            <ng-container *ngIf="activeTab === 'users'">
                <div class="admin-stats">
                    <div class="stat-box">
                        <div class="stat-value">{{ stats.total }}</div>
                        <div class="stat-label">Total Users</div>
                    </div>
                    <div class="stat-box stat-box-green">
                        <div class="stat-value">{{ stats.active }}</div>
                        <div class="stat-label">Active</div>
                    </div>
                    <div class="stat-box stat-box-yellow">
                        <div class="stat-value">{{ stats.pending }}</div>
                        <div class="stat-label">Pending Verification</div>
                    </div>
                    <div class="stat-box stat-box-red">
                        <div class="stat-value">{{ stats.suspended }}</div>
                        <div class="stat-label">Suspended</div>
                    </div>
                </div>

                <div class="admin-toolbar">
                    <div class="search-wrap">
                        <span class="search-icon"><i class="bi bi-search"></i></span>
                        <input
                            class="input search-input"
                            type="search"
                            placeholder="Search by name or email..."
                            [(ngModel)]="searchQuery"
                            (input)="onSearch()"
                        />
                    </div>
                    <div class="filter-wrap">
                        <select
                            class="input filter-select"
                            [(ngModel)]="statusFilter"
                            (change)="loadUsers()"
                        >
                            <option value="">All statuses</option>
                            <option value="ACTIVE">Active</option>
                            <option value="PENDING_VERIFICATION">
                                Pending
                            </option>
                            <option value="SUSPENDED">Suspended</option>
                            <option value="DELETED">Deleted</option>
                        </select>
                        <select
                            class="input filter-select"
                            [(ngModel)]="roleFilter"
                            (change)="loadUsers()"
                        >
                            <option value="">All roles</option>
                            <option value="USER">User</option>
                            <option value="STUDENT">Student</option>
                            <option value="MENTOR">Mentor</option>
                            <option value="MANAGER">Manager</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>
                </div>

                <div class="admin-table-wrap">
                    <div *ngIf="loading" class="table-loading">
                        Loading users...
                    </div>
                    <table *ngIf="!loading" class="admin-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Status</th>
                                <th>Role</th>
                                <th>Plan</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                *ngFor="let user of users"
                                class="user-row"
                                (click)="openDetail(user)"
                            >
                                <td>
                                    <div class="user-cell">
                                        <div class="user-avatar">
                                            {{ getInitials(user) }}
                                        </div>
                                        <div class="user-info">
                                            <div class="user-name">
                                                {{ user.firstName }}
                                                {{ user.lastName }}
                                            </div>
                                            <div class="user-email">
                                                {{ user.email }}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span
                                        class="badge"
                                        [ngClass]="getStatusClass(user.status)"
                                    >
                                        {{ formatStatus(user.status) }}
                                    </span>
                                </td>
                                <td>
                                    <span class="badge badge-role">{{
                                        user.role
                                    }}</span>
                                </td>
                                <td>
                                    <span class="badge badge-plan">{{
                                        user.plan
                                    }}</span>
                                </td>
                                <td class="date-cell">
                                    {{ user.createdAt | date: "MMM d, y" }}
                                </td>
                                <td (click)="$event.stopPropagation()">
                                    <div class="action-buttons">
                                        <button
                                            *ngIf="!user.isVerified"
                                            class="action-btn action-btn-green"
                                            (click)="verifyUser(user)"
                                        >
                                            ✓ Verify
                                        </button>
                                        <select
                                            class="action-select"
                                            [value]="user.role"
                                            (change)="changeRole(user, $event)"
                                        >
                                            <option value="USER">USER</option>
                                            <option value="STUDENT">
                                                STUDENT
                                            </option>
                                            <option value="MENTOR">
                                                MENTOR
                                            </option>
                                            <option value="MANAGER">
                                                MANAGER
                                            </option>
                                            <option value="ADMIN">ADMIN</option>
                                        </select>
                                        <button
                                            *ngIf="user.status === 'ACTIVE'"
                                            class="action-btn action-btn-orange"
                                            (click)="
                                                updateStatus(user, 'SUSPENDED')
                                            "
                                        >
                                            Suspend
                                        </button>
                                        <button
                                            *ngIf="user.status === 'SUSPENDED'"
                                            class="action-btn action-btn-green"
                                            (click)="
                                                updateStatus(user, 'ACTIVE')
                                            "
                                        >
                                            Activate
                                        </button>
                                        <button
                                            class="action-btn action-btn-red"
                                            (click)="deleteUser(user)"
                                        >
                                            🗑
                                        </button>
                                        <button
                                            *ngIf="user.status === 'DELETED'"
                                            class="action-btn action-btn-green"
                                            (click)="restoreUser(user)"
                                        >
                                            ↩ Restore
                                        </button>
                                        <button
                                            class="action-btn action-btn-teal"
                                            title="View interview sessions"
                                            (click)="
                                                viewUserInterviews(user);
                                                $event.stopPropagation()
                                            "
                                        >
                                            🎙️ Sessions
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div
                        *ngIf="!loading && users.length === 0"
                        class="table-empty"
                    >
                        No users found.
                    </div>
                </div>

                <div class="admin-pagination" *ngIf="totalPages > 1">
                    <button
                        class="page-btn"
                        [disabled]="currentPage === 0"
                        (click)="goToPage(currentPage - 1)"
                    >
                        ← Prev
                    </button>
                    <span class="page-info"
                        >Page {{ currentPage + 1 }} of {{ totalPages }}</span
                    >
                    <button
                        class="page-btn"
                        [disabled]="currentPage >= totalPages - 1"
                        (click)="goToPage(currentPage + 1)"
                    >
                        Next →
                    </button>
                </div>
            </ng-container>

            <!-- ════════════════════ INTERVIEWS TAB ════════════════════ -->
            <ng-container *ngIf="activeTab === 'interviews'">
                <!-- No user selected: show user picker -->
                <div *ngIf="!selectedInterviewUser" class="user-picker-state">
                    <div class="picker-hint">
                        <div class="picker-hint-icon">🎙️</div>
                        <h3>Select a user to inspect their sessions</h3>
                        <p>
                            Search and pick any user to view their interview
                            history and progress tracker.
                        </p>
                    </div>
                    <div class="admin-toolbar">
                        <div class="search-wrap">
                            <span class="search-icon"><i class="bi bi-search"></i></span>
                            <input
                                class="input search-input"
                                type="search"
                                placeholder="Search users by name or email..."
                                [(ngModel)]="intUserSearch"
                                (input)="onIntUserSearch()"
                            />
                        </div>
                    </div>
                    <div class="admin-table-wrap">
                        <div *ngIf="loading" class="table-loading">
                            Loading users...
                        </div>
                        <table *ngIf="!loading" class="admin-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    *ngFor="let user of intUserList"
                                    class="user-row"
                                    (click)="viewUserInterviews(user)"
                                >
                                    <td>
                                        <div class="user-cell">
                                            <div class="user-avatar">
                                                {{ getInitials(user) }}
                                            </div>
                                            <div class="user-info">
                                                <div class="user-name">
                                                    {{ user.firstName }}
                                                    {{ user.lastName }}
                                                </div>
                                                <div class="user-email">
                                                    {{ user.email }}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="badge badge-role">{{
                                            user.role
                                        }}</span>
                                    </td>
                                    <td>
                                        <span
                                            class="badge"
                                            [ngClass]="
                                                getStatusClass(user.status)
                                            "
                                            >{{
                                                formatStatus(user.status)
                                            }}</span
                                        >
                                    </td>
                                    <td>
                                        <button
                                            class="action-btn action-btn-teal"
                                            (click)="
                                                viewUserInterviews(user);
                                                $event.stopPropagation()
                                            "
                                        >
                                            🎙️ View Sessions
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div
                            *ngIf="!loading && intUserList.length === 0"
                            class="table-empty"
                        >
                            No users found.
                        </div>
                    </div>
                </div>

                <!-- User selected: sessions + progress view -->
                <ng-container *ngIf="selectedInterviewUser">
                    <!-- Header bar -->
                    <div class="int-header">
                        <button class="btn-back" (click)="clearInterviewUser()">
                            ← Back to Users
                        </button>
                        <div class="int-user-pill">
                            <div class="user-avatar">
                                {{ getInitials(selectedInterviewUser) }}
                            </div>
                            <div>
                                <div class="user-name">
                                    {{ selectedInterviewUser.firstName }}
                                    {{ selectedInterviewUser.lastName }}
                                </div>
                                <div class="user-email">
                                    {{ selectedInterviewUser.email }}
                                </div>
                            </div>
                        </div>
                        <div class="int-header-right">
                            <button
                                class="action-btn action-btn-teal"
                                (click)="toggleProgress()"
                            >
                                {{
                                    showUserProgress
                                        ? "▲ Hide Progress"
                                        : "📈 View Progress"
                                }}
                            </button>
                            <div
                                class="int-session-count"
                                *ngIf="!intSessionsLoading"
                            >
                                <span class="count-num">{{
                                    intSessions.length
                                }}</span>
                                <span class="count-label"
                                    >session{{
                                        intSessions.length !== 1 ? "s" : ""
                                    }}</span
                                >
                            </div>
                        </div>
                    </div>

                    <!-- Progress tracker panel -->
                    <div class="progress-panel" *ngIf="showUserProgress">
                        <div class="pp-inner" *ngIf="userProgressLoading">
                            <div class="mini-spinner"></div>
                            <span>Loading progress tracker...</span>
                        </div>
                        <div
                            class="pp-empty"
                            *ngIf="!userProgressLoading && !userProgress"
                        >
                            <span>📭</span>
                            No progress data yet — this user hasn't completed
                            any sessions.
                        </div>
                        <ng-container
                            *ngIf="!userProgressLoading && userProgress"
                        >
                            <div class="pp-grid">
                                <div class="pp-stat">
                                    <div class="pp-stat-label">Level</div>
                                    <span
                                        class="level-badge"
                                        [ngClass]="
                                            'level-' +
                                            userProgress!.currentLevel
                                        "
                                    >
                                        {{ userProgress!.currentLevel }}
                                    </span>
                                </div>
                                <div class="pp-stat">
                                    <div class="pp-stat-label">
                                        Sessions Done
                                    </div>
                                    <div class="pp-stat-val">
                                        {{
                                            userProgress!.totalSessionsCompleted
                                        }}
                                    </div>
                                </div>
                                <div class="pp-stat">
                                    <div class="pp-stat-label">Avg Score</div>
                                    <div class="pp-stat-val">
                                        {{
                                            userProgress!.averageScore * 100
                                                | number: "1.0-0"
                                        }}%
                                    </div>
                                </div>
                                <div class="pp-stat">
                                    <div class="pp-stat-label">Best Score</div>
                                    <div class="pp-stat-val teal">
                                        {{
                                            userProgress!.bestScore * 100
                                                | number: "1.0-0"
                                        }}%
                                    </div>
                                </div>
                                <div class="pp-stat">
                                    <div class="pp-stat-label">
                                        Last Session
                                    </div>
                                    <div class="pp-stat-val">
                                        {{
                                            userProgress!.lastSessionAt
                                                | date: "MMM d, y"
                                        }}
                                    </div>
                                </div>
                            </div>
                            <!-- Score bars -->
                            <div class="pp-bars">
                                <div class="pp-bar-row">
                                    <span class="pp-bar-label">Average</span>
                                    <div class="pp-bar-track">
                                        <div
                                            class="pp-bar-fill pp-fill-avg"
                                            [style.width]="
                                                userProgress!.averageScore *
                                                    100 +
                                                '%'
                                            "
                                        ></div>
                                    </div>
                                    <span class="pp-bar-val"
                                        >{{
                                            userProgress!.averageScore * 100
                                                | number: "1.0-0"
                                        }}%</span
                                    >
                                </div>
                                <div class="pp-bar-row">
                                    <span class="pp-bar-label">Best</span>
                                    <div class="pp-bar-track">
                                        <div
                                            class="pp-bar-fill pp-fill-best"
                                            [style.width]="
                                                userProgress!.bestScore * 100 +
                                                '%'
                                            "
                                        ></div>
                                    </div>
                                    <span class="pp-bar-val"
                                        >{{
                                            userProgress!.bestScore * 100
                                                | number: "1.0-0"
                                        }}%</span
                                    >
                                </div>
                            </div>
                        </ng-container>
                    </div>

                    <!-- Sessions loading -->
                    <div class="int-loading" *ngIf="intSessionsLoading">
                        <div class="mini-spinner"></div>
                        Loading sessions for
                        {{ selectedInterviewUser.firstName }}...
                    </div>

                    <!-- Empty state -->
                    <div
                        class="sessions-empty"
                        *ngIf="!intSessionsLoading && intSessions.length === 0"
                    >
                        <div class="se-icon">🎙️</div>
                        <h3>No interview sessions yet</h3>
                        <p>
                            {{ selectedInterviewUser.firstName }} hasn't started
                            any mock interview sessions.
                        </p>
                    </div>

                    <!-- Sessions grid -->
                    <div
                        class="int-sessions-grid"
                        *ngIf="!intSessionsLoading && intSessions.length > 0"
                    >
                        <div
                            class="int-session-card"
                            *ngFor="let s of intSessions"
                            [class.int-selected]="
                                selectedIntSession?.id === s.id
                            "
                            (click)="selectIntSession(s)"
                        >
                            <div class="isc-top">
                                <span class="isc-type chip chip-teal">{{
                                    s.type | titlecase
                                }}</span>
                                <span
                                    class="status-chip"
                                    [ngClass]="statusChip(s.status)"
                                    >{{ s.status | titlecase }}</span
                                >
                            </div>
                            <div class="isc-industry">
                                {{ industryLabel(s.industry) }} ·
                                {{ s.targetLevel }}
                            </div>
                            <div class="isc-meta">
                                <span>{{ s.durationMinutes }}min</span>
                                <span>·</span>
                                <span>Diff {{ s.difficultyLevel }}/5</span>
                                <span>·</span>
                                <span>{{
                                    s.createdAt | date: "MMM d, y"
                                }}</span>
                            </div>
                            <div
                                class="isc-actions"
                                (click)="$event.stopPropagation()"
                            >
                                <button
                                    *ngIf="s.status === 'COMPLETED'"
                                    class="action-btn action-btn-teal"
                                    (click)="loadIntReport(s)"
                                >
                                    📊 Report
                                </button>
                                <button
                                    class="action-btn action-btn-red"
                                    (click)="adminDeleteSession(s)"
                                >
                                    <i class="bi bi-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Report panel -->
                    <div
                        class="report-panel"
                        *ngIf="intReport || intReportLoading || intReportError"
                    >
                        <div class="report-panel-header">
                            <strong
                                >📊 Performance Report
                                <span *ngIf="intReport">
                                    — Session #{{ intReport.sessionId }}</span
                                >
                            </strong>
                            <button
                                class="modal-close"
                                (click)="
                                    intReport = null; intReportError = null
                                "
                            >
                                ✕
                            </button>
                        </div>
                        <div class="int-loading" *ngIf="intReportLoading">
                            <div class="mini-spinner"></div>
                            Loading report...
                        </div>
                        <div class="report-error" *ngIf="intReportError">
                            ⚠️ {{ intReportError }}
                        </div>
                        <ng-container *ngIf="intReport && !intReportLoading">
                            <div class="report-scores-grid">
                                <div class="rsg-item rsg-item-main">
                                    <div class="rsg-label">Global Score</div>
                                    <div class="rsg-val teal">
                                        {{
                                            intReport.globalScore * 100
                                                | number: "1.0-0"
                                        }}%
                                    </div>
                                </div>
                                <div class="rsg-item">
                                    <div class="rsg-label">Level</div>
                                    <span
                                        class="level-badge"
                                        [ngClass]="
                                            'level-' +
                                            intReport.preparationLevel
                                        "
                                    >
                                        {{ intReport.preparationLevel }}
                                    </span>
                                </div>
                                <div class="rsg-item">
                                    <div class="rsg-label">Communication</div>
                                    <div class="rsg-val">
                                        {{
                                            intReport.communicationScore * 100
                                                | number: "1.0-0"
                                        }}%
                                    </div>
                                </div>
                                <div class="rsg-item">
                                    <div class="rsg-label">Content Quality</div>
                                    <div class="rsg-val">
                                        {{
                                            intReport.contentQualityScore * 100
                                                | number: "1.0-0"
                                        }}%
                                    </div>
                                </div>
                                <div class="rsg-item">
                                    <div class="rsg-label">Confidence</div>
                                    <div class="rsg-val">
                                        {{
                                            intReport.confidenceScore * 100
                                                | number: "1.0-0"
                                        }}%
                                    </div>
                                </div>
                                <div class="rsg-item">
                                    <div class="rsg-label">Stress Mgmt</div>
                                    <div class="rsg-val">
                                        {{
                                            intReport.stressManagementScore *
                                                100 | number: "1.0-0"
                                        }}%
                                    </div>
                                </div>
                            </div>
                            <div
                                class="report-text-section"
                                *ngIf="intReport.topStrengths"
                            >
                                <div class="rts-label">✅ Strengths</div>
                                <p>{{ intReport.topStrengths }}</p>
                            </div>
                            <div
                                class="report-text-section"
                                *ngIf="intReport.areasForImprovement"
                            >
                                <div class="rts-label">⚠️ Areas to Improve</div>
                                <p>{{ intReport.areasForImprovement }}</p>
                            </div>
                            <div
                                class="report-text-section"
                                *ngIf="intReport.actionableRecommendations"
                            >
                                <div class="rts-label">🎯 Recommendations</div>
                                <p>{{ intReport.actionableRecommendations }}</p>
                            </div>
                        </ng-container>
                    </div>
                </ng-container>
            </ng-container>

            <!-- ════════════════════ TRAINING TAB ════════════════════ -->
            <ng-container *ngIf="activeTab === 'training'">
                <div class="training-head">
                    <div>
                        <h3 class="training-title">Training Content</h3>
                        <p class="training-sub">
                            Manage badges, paths, modules, trackers, activities, and user badges (admin only).
                        </p>
                    </div>
                    <div class="training-views">
                        <button
                            class="sub-tab"
                            [class.active]="trainingView === 'badges'"
                            (click)="setTrainingView('badges')"
                        >
                            <i class="bi bi-award-fill"></i> Badges
                        </button>
                        <button
                            class="sub-tab"
                            [class.active]="trainingView === 'paths'"
                            (click)="setTrainingView('paths')"
                        >
                            <i class="bi bi-map-fill"></i> Paths
                        </button>
                        <button
                            class="sub-tab"
                            [class.active]="trainingView === 'modules'"
                            (click)="setTrainingView('modules')"
                        >
                            <i class="bi bi-collection-fill"></i> Modules
                        </button>
                        <button
                            class="sub-tab"
                            [class.active]="trainingView === 'lessons'"
                            (click)="setTrainingView('lessons')"
                        >
                            <i class="bi bi-file-text-fill"></i> Lessons
                        </button>
                        <button
                            class="sub-tab"
                            [class.active]="trainingView === 'xp-trackers'"
                            (click)="setTrainingView('xp-trackers')"
                        >
                            <i class="bi bi-graph-up"></i> XP Trackers
                        </button>
                        <button
                            class="sub-tab"
                            [class.active]="trainingView === 'activities'"
                            (click)="setTrainingView('activities')"
                        >
                            <i class="bi bi-calendar3"></i> Activities
                        </button>
                        <button
                            class="sub-tab"
                            [class.active]="trainingView === 'user-badges'"
                            (click)="setTrainingView('user-badges')"
                        >
                            <i class="bi bi-trophy-fill"></i> User Badges
                        </button>
                    </div>
                </div>

                <div class="table-loading" *ngIf="trainingLoading">
                    Loading training content...
                </div>
                <div class="report-error" *ngIf="!trainingLoading && trainingError">
                    <i class="bi bi-exclamation-triangle-fill"></i> {{ trainingError }}
                </div>

                <div class="admin-toolbar" *ngIf="!trainingLoading">
                    <div class="search-wrap">
                        <span class="search-icon"><i class="bi bi-search"></i></span>
                        <input
                            class="input search-input"
                            type="search"
                            [placeholder]="trainingSearchPlaceholder()"
                            [(ngModel)]="trainingSearchQuery"
                            (input)="onTrainingSearchInput()"
                        />
                    </div>
                    <div class="filter-wrap">
                        <select
                            class="input filter-select"
                            [(ngModel)]="trainingPageSize"
                            (change)="onTrainingPageSizeChange()"
                        >
                            <option [ngValue]="10">10 / page</option>
                            <option [ngValue]="25">25 / page</option>
                            <option [ngValue]="50">50 / page</option>
                        </select>
                    </div>
                    <div class="filter-wrap">
                        <span class="user-email">{{ trainingTotalItems }} items</span>
                    </div>
                </div>

                <div
                    class="admin-pagination"
                    *ngIf="!trainingLoading && trainingTotalPages > 1"
                >
                    <button
                        class="page-btn"
                        [disabled]="trainingPage === 0"
                        (click)="trainingPrevPage()"
                    >
                        ← Prev
                    </button>
                    <span class="page-info"
                        >Page {{ trainingPage + 1 }} of
                        {{ trainingTotalPages }}</span
                    >
                    <button
                        class="page-btn"
                        [disabled]="trainingPage >= trainingTotalPages - 1"
                        (click)="trainingNextPage()"
                    >
                        Next →
                    </button>
                </div>

                <!-- Badges CRUD -->
                <ng-container *ngIf="trainingView === 'badges'">
                    <div class="admin-table-wrap">
                        <table class="admin-table" *ngIf="!trainingLoading">
                            <thead>
                                <tr>
                                    <th (click)="setTrainingSort('name')">Name {{ sortIndicator('name') }}</th>
                                    <th (click)="setTrainingSort('category')">Category {{ sortIndicator('category') }}</th>
                                    <th (click)="setTrainingSort('xpReward')">XP {{ sortIndicator('xpReward') }}</th>
                                    <th (click)="setTrainingSort('isActive')">Active {{ sortIndicator('isActive') }}</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngFor="let b of visibleBadges" class="user-row" (click)="editBadge(b)">
                                    <td>
                                        <div class="user-name">{{ b.name }}</div>
                                        <div class="user-email" *ngIf="b.description">{{ b.description }}</div>
                                    </td>
                                    <td><span class="badge badge-role">{{ b.category }}</span></td>
                                    <td>{{ b.xpReward }}</td>
                                    <td>
                                        <span class="badge" [ngClass]="b.isActive ? 'badge-active' : 'badge-suspended'">
                                            {{ b.isActive ? 'ACTIVE' : 'INACTIVE' }}
                                        </span>
                                    </td>
                                    <td (click)="$event.stopPropagation()">
                                        <div class="action-buttons">
                                            <button class="action-btn action-btn-teal" (click)="editBadge(b)">
                                                <i class="bi bi-pencil"></i> Edit
                                            </button>
                                            <button class="action-btn action-btn-red" (click)="deleteBadge(b)">
                                                <i class="bi bi-trash"></i> Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="table-empty" *ngIf="!trainingLoading && trainingTotalItems === 0">
                            No badges found.
                        </div>
                    </div>

                    <div class="crud-card">
                        <div class="crud-head">
                            <strong>{{ editingBadgeId ? 'Edit Badge' : 'Create Badge' }}</strong>
                            <button class="action-btn action-btn-neutral" (click)="resetBadgeForm()">
                                <i class="bi bi-x"></i> Clear
                            </button>
                        </div>
                        <div class="crud-grid">
                            <div class="detail-item">
                                <span class="detail-label">Name</span>
                                <input class="input" [(ngModel)]="badgeForm.name" [ngModelOptions]="{standalone:true}" placeholder="e.g. Mock Interview Rookie" />
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Icon</span>
                                <input class="input" [(ngModel)]="badgeForm.icon" [ngModelOptions]="{standalone:true}" placeholder="e.g. bi-award-fill" />
                            </div>
                            <div class="detail-item detail-full">
                                <span class="detail-label">Description</span>
                                <input class="input" [(ngModel)]="badgeForm.description" [ngModelOptions]="{standalone:true}" placeholder="Short description" />
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Category</span>
                                <select class="input" [(ngModel)]="badgeForm.category" [ngModelOptions]="{standalone:true}">
                                    <option *ngFor="let c of badgeCategories" [value]="c">{{ c }}</option>
                                </select>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">XP Reward</span>
                                <input class="input" type="number" [(ngModel)]="badgeForm.xpReward" [ngModelOptions]="{standalone:true}" />
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Active</span>
                                <select class="input" [(ngModel)]="badgeForm.isActive" [ngModelOptions]="{standalone:true}">
                                    <option [ngValue]="true">true</option>
                                    <option [ngValue]="false">false</option>
                                </select>
                            </div>
                            <div class="detail-item detail-full">
                                <span class="detail-label">Criteria JSON (optional)</span>
                                <input class="input" [(ngModel)]="badgeForm.criteriaJson" [ngModelOptions]="{standalone:true}" placeholder='{"type":"sessions","min":1}' />
                            </div>
                        </div>
                        <div class="crud-actions">
                            <button class="action-btn action-btn-teal" (click)="saveBadge()">
                                <i class="bi bi-floppy-fill"></i> {{ editingBadgeId ? 'Update' : 'Create' }}
                            </button>
                            <button class="action-btn action-btn-neutral" (click)="resetBadgeForm()">
                                Cancel
                            </button>
                        </div>
                    </div>
                </ng-container>

                <!-- Paths CRUD -->
                <ng-container *ngIf="trainingView === 'paths'">
                    <div class="admin-table-wrap">
                        <table class="admin-table" *ngIf="!trainingLoading">
                            <thead>
                                <tr>
                                    <th (click)="setTrainingSort('user')">User {{ sortIndicator('user') }}</th>
                                    <th (click)="setTrainingSort('status')">Status {{ sortIndicator('status') }}</th>
                                    <th (click)="setTrainingSort('xpThreshold')">XP Threshold {{ sortIndicator('xpThreshold') }}</th>
                                    <th (click)="setTrainingSort('modulesCount')">Modules {{ sortIndicator('modulesCount') }}</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngFor="let p of visiblePaths" class="user-row" (click)="editPath(p)">
                                    <td>
                                        <div class="user-name">{{ userLabelByKeycloakId(p.userId) }}</div>
                                        <div class="user-email" *ngIf="userEmailByKeycloakId(p.userId)">
                                            {{ userEmailByKeycloakId(p.userId) }}
                                        </div>
                                    </td>
                                    <td><span class="badge badge-plan">{{ p.status }}</span></td>
                                    <td>{{ p.xpThreshold }}</td>
                                    <td>{{ p.modules.length }}</td>
                                    <td (click)="$event.stopPropagation()">
                                        <div class="action-buttons">
                                            <button class="action-btn action-btn-teal" (click)="editPath(p)"><i class="bi bi-pencil"></i> Edit</button>
                                            <button class="action-btn action-btn-red" (click)="deletePath(p)"><i class="bi bi-trash"></i> Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="table-empty" *ngIf="!trainingLoading && trainingTotalItems === 0">
                            No paths found.
                        </div>
                    </div>

                    <div class="crud-card">
                        <div class="crud-head">
                            <strong>{{ editingPathId ? 'Edit Path' : 'Create Path' }}</strong>
                            <button class="action-btn action-btn-neutral" (click)="resetPathForm()"><i class="bi bi-x"></i> Clear</button>
                        </div>
                        <div class="crud-grid">
                            <div class="detail-item detail-full">
                                <span class="detail-label">User</span>
                                <select class="input" [(ngModel)]="pathForm.userId" [ngModelOptions]="{standalone:true}">
                                    <option [ngValue]="''" disabled>Select a user...</option>
                                    <option *ngFor="let u of trainingUserIdentities" [value]="u.keycloakId">
                                        {{ userOptionLabel(u) }}
                                    </option>
                                </select>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Status</span>
                                <select class="input" [(ngModel)]="pathForm.status" [ngModelOptions]="{standalone:true}">
                                    <option *ngFor="let s of pathStatuses" [value]="s">{{ s }}</option>
                                </select>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">XP Threshold</span>
                                <input class="input" type="number" [(ngModel)]="pathForm.xpThreshold" [ngModelOptions]="{standalone:true}" />
                            </div>
                        </div>
                        <div class="crud-actions">
                            <button class="action-btn action-btn-teal" (click)="savePath()"><i class="bi bi-floppy-fill"></i> {{ editingPathId ? 'Update' : 'Create' }}</button>
                            <button class="action-btn action-btn-neutral" (click)="resetPathForm()">Cancel</button>
                        </div>
                    </div>
                </ng-container>

                <!-- Lessons CRUD -->
                <ng-container *ngIf="trainingView === 'lessons'">
                    <div class="crud-card">
                        <div *ngIf="aiGenerating" style="margin-bottom:12px;padding:10px 14px;background:#1a3a2a;border:1px solid #2a6a4a;border-radius:8px;color:#5dba87;font-size:13px;">
                            ⏳ {{ aiGeneratingMsg }}
                        </div>
                        <div class="crud-head">
                            <strong>AI: Generate missing draft lessons</strong>
                        </div>
                        <div class="crud-grid">
                            <div class="detail-item">
                                <span class="detail-label">Category</span>
                                <select class="input" [(ngModel)]="aiLessonGenForm.category" [ngModelOptions]="{standalone:true}">
                                    <option *ngFor="let c of trainingCategories" [value]="c">{{ c }}</option>
                                </select>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Language</span>
                                <select class="input" [(ngModel)]="aiLessonGenForm.language" [ngModelOptions]="{standalone:true}">
                                    <option *ngFor="let l of lessonLanguages" [value]="l">{{ l }}</option>
                                </select>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Target ACTIVE</span>
                                <input class="input" type="number" [(ngModel)]="aiLessonGenForm.targetActiveCount" [ngModelOptions]="{standalone:true}" />
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Max generate</span>
                                <input class="input" type="number" [(ngModel)]="aiLessonGenForm.maxGenerate" [ngModelOptions]="{standalone:true}" />
                            </div>
                            <div class="detail-item detail-full">
                                <span class="detail-label">Difficulty (optional)</span>
                                <select class="input" [(ngModel)]="aiLessonGenForm.difficulty" [ngModelOptions]="{standalone:true}">
                                    <option [value]="''">AUTO</option>
                                    <option *ngFor="let d of lessonDifficulties" [value]="d">{{ d }}</option>
                                </select>
                            </div>
                        </div>
                        <div class="crud-actions">
                            <button class="action-btn action-btn-teal" (click)="generateMissingLessonDrafts()"><i class="bi bi-magic"></i> Generate drafts</button>
                        </div>
                    </div>

                    <div class="admin-table-wrap">
                        <table class="admin-table" *ngIf="!trainingLoading">
                            <thead>
                                <tr>
                                    <th (click)="setTrainingSort('title')">Title {{ sortIndicator('title') }}</th>
                                    <th (click)="setTrainingSort('category')">Category {{ sortIndicator('category') }}</th>
                                    <th (click)="setTrainingSort('format')">Format {{ sortIndicator('format') }}</th>
                                    <th (click)="setTrainingSort('difficulty')">Difficulty {{ sortIndicator('difficulty') }}</th>
                                    <th (click)="setTrainingSort('estimatedMinutes')">Minutes {{ sortIndicator('estimatedMinutes') }}</th>
                                    <th (click)="setTrainingSort('language')">Lang {{ sortIndicator('language') }}</th>
                                    <th (click)="setTrainingSort('active')">Active {{ sortIndicator('active') }}</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngFor="let l of visibleLessons" class="user-row" (click)="editLesson(l)">
                                    <td>
                                        <div class="user-name">{{ l.title }}</div>
                                        <div class="user-email" *ngIf="l.summary">{{ l.summary }}</div>
                                        <div class="user-email" *ngIf="l.tags?.length">Tags: {{ (l.tags ?? []).join(', ') }}</div>
                                    </td>
                                    <td><span class="badge badge-role">{{ l.category }}</span></td>
                                    <td><span class="badge badge-plan">{{ l.format }}</span></td>
                                    <td>{{ l.difficulty }}</td>
                                    <td>{{ l.estimatedMinutes }}</td>
                                    <td>{{ l.language }}</td>
                                    <td>
                                        <span class="badge" [ngClass]="l.active ? 'badge-active' : 'badge-suspended'">
                                            {{ l.active ? 'ACTIVE' : 'INACTIVE' }}
                                        </span>
                                    </td>
                                    <td (click)="$event.stopPropagation()">
                                        <div class="action-buttons">
                                            <button class="action-btn action-btn-teal" (click)="editLesson(l)">
                                                <i class="bi bi-pencil"></i> Edit
                                            </button>
                                            <button class="action-btn action-btn-red" (click)="deleteLesson(l)">
                                                <i class="bi bi-slash-circle"></i> Disable
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="table-empty" *ngIf="!trainingLoading && trainingTotalItems === 0">
                            No lessons found.
                        </div>
                    </div>

                    <div class="crud-card">
                        <div class="crud-head">
                            <strong>{{ editingLessonId ? 'Edit Lesson' : 'Create Lesson' }}</strong>
                            <button class="action-btn action-btn-neutral" (click)="resetLessonForm()">
                                <i class="bi bi-x"></i> Clear
                            </button>
                        </div>

                        <div class="crud-grid">
                            <div class="detail-item">
                                <span class="detail-label">Category</span>
                                <select class="input" [(ngModel)]="lessonForm.category" [ngModelOptions]="{standalone:true}">
                                    <option *ngFor="let c of trainingCategories" [value]="c">{{ c }}</option>
                                </select>
                            </div>

                            <div class="detail-item">
                                <span class="detail-label">Format</span>
                                <select class="input" [(ngModel)]="lessonForm.format" [ngModelOptions]="{standalone:true}">
                                    <option *ngFor="let f of lessonFormats" [value]="f">{{ f }}</option>
                                </select>
                            </div>

                            <div class="detail-item detail-full">
                                <span class="detail-label">Title</span>
                                <input class="input" [(ngModel)]="lessonForm.title" [ngModelOptions]="{standalone:true}" placeholder="e.g. Answering STAR questions" />
                            </div>

                            <div class="detail-item detail-full">
                                <span class="detail-label">Summary (optional)</span>
                                <input class="input" [(ngModel)]="lessonForm.summary" [ngModelOptions]="{standalone:true}" placeholder="Short summary" />
                            </div>

                            <div class="detail-item detail-full" *ngIf="lessonForm.format === 'VIDEO'">
                                <span class="detail-label">Video URL</span>
                                <input class="input" [(ngModel)]="lessonForm.videoUrl" [ngModelOptions]="{standalone:true}" placeholder="https://..." />
                            </div>

                            <div class="detail-item detail-full" *ngIf="lessonForm.format === 'TEXT'">
                                <span class="detail-label">Content (Markdown)</span>
                                <textarea class="input" rows="6" [(ngModel)]="lessonForm.contentMarkdown" [ngModelOptions]="{standalone:true}" placeholder="# Lesson\n...\n"></textarea>
                            </div>

                            <div class="detail-item">
                                <span class="detail-label">Estimated Minutes</span>
                                <input class="input" type="number" min="0" [(ngModel)]="lessonForm.estimatedMinutes" [ngModelOptions]="{standalone:true}" />
                            </div>

                            <div class="detail-item">
                                <span class="detail-label">Difficulty</span>
                                <select class="input" [(ngModel)]="lessonForm.difficulty" [ngModelOptions]="{standalone:true}">
                                    <option *ngFor="let d of lessonDifficulties" [value]="d">{{ d }}</option>
                                </select>
                            </div>

                            <div class="detail-item">
                                <span class="detail-label">Language</span>
                                <input class="input" [(ngModel)]="lessonForm.language" [ngModelOptions]="{standalone:true}" placeholder="en" />
                            </div>

                            <div class="detail-item">
                                <span class="detail-label">Active</span>
                                <select class="input" [(ngModel)]="lessonForm.active" [ngModelOptions]="{standalone:true}">
                                    <option [ngValue]="true">true</option>
                                    <option [ngValue]="false">false</option>
                                </select>
                            </div>

                            <div class="detail-item detail-full">
                                <span class="detail-label">Tags (comma-separated)</span>
                                <input class="input" [(ngModel)]="lessonForm.tagsCsv" [ngModelOptions]="{standalone:true}" placeholder="behavioral, star, communication" />
                            </div>
                        </div>

                        <div class="crud-actions">
                            <button class="action-btn action-btn-teal" (click)="saveLesson()">
                                <i class="bi bi-floppy-fill"></i> {{ editingLessonId ? 'Update' : 'Create' }}
                            </button>
                            <button class="action-btn action-btn-neutral" (click)="resetLessonForm()">
                                Cancel
                            </button>
                        </div>
                    </div>
                </ng-container>

                <!-- Modules CRUD -->
                <ng-container *ngIf="trainingView === 'modules'">
                    <div class="admin-table-wrap">
                        <table class="admin-table" *ngIf="!trainingLoading">
                            <thead>
                                <tr>
                                    <th (click)="setTrainingSort('user')">User {{ sortIndicator('user') }}</th>
                                    <th (click)="setTrainingSort('title')">Title {{ sortIndicator('title') }}</th>
                                    <th (click)="setTrainingSort('category')">Category {{ sortIndicator('category') }}</th>
                                    <th (click)="setTrainingSort('status')">Status {{ sortIndicator('status') }}</th>
                                    <th (click)="setTrainingSort('progress')">Progress {{ sortIndicator('progress') }}</th>
                                    <th (click)="setTrainingSort('xpReward')">XP {{ sortIndicator('xpReward') }}</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngFor="let m of visibleModules" class="user-row" (click)="editModule(m)">
                                    <td>
                                        <div class="user-name">{{ pathOwnerLabel(m.pathId) }}</div>
                                        <div class="user-email" *ngIf="pathOwnerEmail(m.pathId)">
                                            {{ pathOwnerEmail(m.pathId) }}
                                        </div>
                                    </td>
                                    <td>
                                        <div class="user-name">{{ m.title }}</div>
                                        <div class="user-email" *ngIf="m.lessons">{{ m.completedLessons }}/{{ m.lessons }} lessons</div>
                                    </td>
                                    <td><span class="badge badge-role">{{ m.category }}</span></td>
                                    <td><span class="badge badge-plan">{{ m.status }}</span></td>
                                    <td>{{ m.progress }}%</td>
                                    <td>{{ m.xpReward }}</td>
                                    <td (click)="$event.stopPropagation()">
                                        <div class="action-buttons">
                                            <button class="action-btn action-btn-teal" (click)="editModule(m)"><i class="bi bi-pencil"></i> Edit</button>
                                            <button class="action-btn action-btn-red" (click)="deleteModule(m)"><i class="bi bi-trash"></i> Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="table-empty" *ngIf="!trainingLoading && trainingTotalItems === 0">
                            No modules found.
                        </div>
                    </div>

                    <div class="crud-card">
                        <div class="crud-head">
                            <strong>{{ editingModuleId ? 'Edit Module' : 'Create Module' }}</strong>
                            <button class="action-btn action-btn-neutral" (click)="resetModuleForm()"><i class="bi bi-x"></i> Clear</button>
                        </div>
                        <div class="crud-grid">
                            <div class="detail-item">
                                <span class="detail-label">Path</span>
                                <select class="input" [(ngModel)]="moduleForm.pathId" [ngModelOptions]="{standalone:true}">
                                    <option [ngValue]="null" disabled>Select a path...</option>
                                    <option *ngFor="let p of adminPaths" [ngValue]="p.id">{{ pathOptionLabel(p) }}</option>
                                </select>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Category</span>
                                <select class="input" [(ngModel)]="moduleForm.category" [ngModelOptions]="{standalone:true}">
                                    <option *ngFor="let c of trainingCategories" [value]="c">{{ c }}</option>
                                </select>
                            </div>
                            <div class="detail-item detail-full">
                                <span class="detail-label">Title</span>
                                <input class="input" [(ngModel)]="moduleForm.title" [ngModelOptions]="{standalone:true}" />
                            </div>
                            <div class="detail-item detail-full">
                                <span class="detail-label">Description</span>
                                <input class="input" [(ngModel)]="moduleForm.description" [ngModelOptions]="{standalone:true}" />
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Lessons</span>
                                <input class="input" type="number" [(ngModel)]="moduleForm.lessons" [ngModelOptions]="{standalone:true}" />
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Completed Lessons</span>
                                <input class="input" type="number" [(ngModel)]="moduleForm.completedLessons" [ngModelOptions]="{standalone:true}" />
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Progress (0-100)</span>
                                <input class="input" type="number" [(ngModel)]="moduleForm.progress" [ngModelOptions]="{standalone:true}" />
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">XP Reward</span>
                                <input class="input" type="number" [(ngModel)]="moduleForm.xpReward" [ngModelOptions]="{standalone:true}" />
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Status</span>
                                <select class="input" [(ngModel)]="moduleForm.status" [ngModelOptions]="{standalone:true}">
                                    <option *ngFor="let s of moduleStatuses" [value]="s">{{ s }}</option>
                                </select>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Unlocked At (optional)</span>
                                <input class="input" [(ngModel)]="moduleForm.unlockedAt" [ngModelOptions]="{standalone:true}" placeholder="2026-03-31T10:00:00" />
                            </div>
                        </div>
                        <div class="crud-actions">
                            <button class="action-btn action-btn-teal" (click)="saveModule()"><i class="bi bi-floppy-fill"></i> {{ editingModuleId ? 'Update' : 'Create' }}</button>
                            <button class="action-btn action-btn-neutral" (click)="resetModuleForm()">Cancel</button>
                        </div>
                    </div>
                </ng-container>

                <!-- XP Trackers CRUD -->
                <ng-container *ngIf="trainingView === 'xp-trackers'">
                    <div class="admin-table-wrap">
                        <table class="admin-table" *ngIf="!trainingLoading">
                            <thead>
                                <tr>
                                    <th (click)="setTrainingSort('user')">User {{ sortIndicator('user') }}</th>
                                    <th (click)="setTrainingSort('totalXp')">Total XP {{ sortIndicator('totalXp') }}</th>
                                    <th (click)="setTrainingSort('currentLevel')">Level {{ sortIndicator('currentLevel') }}</th>
                                    <th (click)="setTrainingSort('xpToNextLevel')">To Next {{ sortIndicator('xpToNextLevel') }}</th>
                                    <th (click)="setTrainingSort('currentStreak')">Streak {{ sortIndicator('currentStreak') }}</th>
                                    <th (click)="setTrainingSort('longestStreak')">Best {{ sortIndicator('longestStreak') }}</th>
                                    <th (click)="setTrainingSort('lastActivityDate')">Last Activity {{ sortIndicator('lastActivityDate') }}</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngFor="let t of visibleTrackers" class="user-row" (click)="editTracker(t)">
                                    <td>
                                        <div class="user-name">{{ userLabelByKeycloakId(t.userId) }}</div>
                                        <div class="user-email" *ngIf="userEmailByKeycloakId(t.userId)">
                                            {{ userEmailByKeycloakId(t.userId) }}
                                        </div>
                                    </td>
                                    <td>{{ t.totalXp }}</td>
                                    <td>{{ t.currentLevel }}</td>
                                    <td>{{ t.xpToNextLevel }}</td>
                                    <td>{{ t.currentStreak }}</td>
                                    <td>{{ t.longestStreak }}</td>
                                    <td>{{ t.lastActivityDate || '-' }}</td>
                                    <td (click)="$event.stopPropagation()">
                                        <div class="action-buttons">
                                            <button class="action-btn action-btn-teal" (click)="editTracker(t)"><i class="bi bi-pencil"></i> Edit</button>
                                            <button class="action-btn action-btn-red" (click)="deleteTracker(t)"><i class="bi bi-trash"></i> Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="table-empty" *ngIf="!trainingLoading && trainingTotalItems === 0">
                            No trackers found.
                        </div>
                    </div>

                    <div class="crud-card">
                        <div class="crud-head">
                            <strong>{{ editingTrackerId ? 'Edit Tracker' : 'Create Tracker' }}</strong>
                            <button class="action-btn action-btn-neutral" (click)="resetTrackerForm()"><i class="bi bi-x"></i> Clear</button>
                        </div>
                        <div class="crud-grid">
                            <div class="detail-item detail-full">
                                <span class="detail-label">User</span>
                                <select class="input" [(ngModel)]="trackerForm.userId" [ngModelOptions]="{standalone:true}">
                                    <option [ngValue]="''" disabled>Select a user...</option>
                                    <option *ngFor="let u of trainingUserIdentities" [value]="u.keycloakId">
                                        {{ userOptionLabel(u) }}
                                    </option>
                                </select>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Total XP</span>
                                <input class="input" type="number" [(ngModel)]="trackerForm.totalXp" [ngModelOptions]="{standalone:true}" />
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Current Level</span>
                                <input class="input" type="number" [(ngModel)]="trackerForm.currentLevel" [ngModelOptions]="{standalone:true}" />
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">XP To Next Level</span>
                                <input class="input" type="number" [(ngModel)]="trackerForm.xpToNextLevel" [ngModelOptions]="{standalone:true}" />
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Current Streak</span>
                                <input class="input" type="number" [(ngModel)]="trackerForm.currentStreak" [ngModelOptions]="{standalone:true}" />
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Longest Streak</span>
                                <input class="input" type="number" [(ngModel)]="trackerForm.longestStreak" [ngModelOptions]="{standalone:true}" />
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Last Activity Date (optional)</span>
                                <input class="input" [(ngModel)]="trackerForm.lastActivityDate" [ngModelOptions]="{standalone:true}" placeholder="YYYY-MM-DD" />
                            </div>
                        </div>
                        <div class="crud-actions">
                            <button class="action-btn action-btn-teal" (click)="saveTracker()"><i class="bi bi-floppy-fill"></i> {{ editingTrackerId ? 'Update' : 'Create' }}</button>
                            <button class="action-btn action-btn-neutral" (click)="resetTrackerForm()">Cancel</button>
                        </div>
                    </div>
                </ng-container>

                <!-- Activities CRUD -->
                <ng-container *ngIf="trainingView === 'activities'">
                    <div class="admin-table-wrap">
                        <table class="admin-table" *ngIf="!trainingLoading">
                            <thead>
                                <tr>
                                    <th (click)="setTrainingSort('user')">User {{ sortIndicator('user') }}</th>
                                    <th (click)="setTrainingSort('activityDate')">Date {{ sortIndicator('activityDate') }}</th>
                                    <th (click)="setTrainingSort('xpEarned')">XP {{ sortIndicator('xpEarned') }}</th>
                                    <th (click)="setTrainingSort('sessionCompleted')">Session {{ sortIndicator('sessionCompleted') }}</th>
                                    <th (click)="setTrainingSort('goalsCompleted')">Goals {{ sortIndicator('goalsCompleted') }}</th>
                                    <th (click)="setTrainingSort('behavioralCount')">Behavioral {{ sortIndicator('behavioralCount') }}</th>
                                    <th (click)="setTrainingSort('libraryCount')">Library {{ sortIndicator('libraryCount') }}</th>
                                    <th (click)="setTrainingSort('quizCount')">Quiz {{ sortIndicator('quizCount') }}</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngFor="let a of visibleActivities" class="user-row" (click)="editActivity(a)">
                                    <td>
                                        <div class="user-name">{{ userLabelByKeycloakId(a.userId) }}</div>
                                        <div class="user-email" *ngIf="userEmailByKeycloakId(a.userId)">
                                            {{ userEmailByKeycloakId(a.userId) }}
                                        </div>
                                    </td>
                                    <td>{{ a.activityDate }}</td>
                                    <td>{{ a.xpEarned }}</td>
                                    <td>{{ a.sessionCompleted ? 'YES' : 'NO' }}</td>
                                    <td>{{ a.goalsCompleted }}</td>
                                    <td>{{ a.behavioralCount }}</td>
                                    <td>{{ a.libraryCount }}</td>
                                    <td>{{ a.quizCount }}</td>
                                    <td (click)="$event.stopPropagation()">
                                        <div class="action-buttons">
                                            <button class="action-btn action-btn-teal" (click)="editActivity(a)"><i class="bi bi-pencil"></i> Edit</button>
                                            <button class="action-btn action-btn-red" (click)="deleteActivity(a)"><i class="bi bi-trash"></i> Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="table-empty" *ngIf="!trainingLoading && trainingTotalItems === 0">
                            No activities found.
                        </div>
                    </div>

                    <div class="crud-card">
                        <div class="crud-head">
                            <strong>{{ editingActivityId ? 'Edit Activity' : 'Create Activity' }}</strong>
                            <button class="action-btn action-btn-neutral" (click)="resetActivityForm()"><i class="bi bi-x"></i> Clear</button>
                        </div>
                        <div class="crud-grid">
                            <div class="detail-item detail-full">
                                <span class="detail-label">User</span>
                                <select class="input" [(ngModel)]="activityForm.userId" [ngModelOptions]="{standalone:true}">
                                    <option [ngValue]="''" disabled>Select a user...</option>
                                    <option *ngFor="let u of trainingUserIdentities" [value]="u.keycloakId">
                                        {{ userOptionLabel(u) }}
                                    </option>
                                </select>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Activity Date</span>
                                <input class="input" [(ngModel)]="activityForm.activityDate" [ngModelOptions]="{standalone:true}" placeholder="YYYY-MM-DD" />
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">XP Earned</span>
                                <input class="input" type="number" [(ngModel)]="activityForm.xpEarned" [ngModelOptions]="{standalone:true}" />
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Session Completed</span>
                                <select class="input" [(ngModel)]="activityForm.sessionCompleted" [ngModelOptions]="{standalone:true}">
                                    <option [ngValue]="true">true</option>
                                    <option [ngValue]="false">false</option>
                                </select>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Goals Completed</span>
                                <input class="input" type="number" [(ngModel)]="activityForm.goalsCompleted" [ngModelOptions]="{standalone:true}" />
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Behavioral Count</span>
                                <input class="input" type="number" [(ngModel)]="activityForm.behavioralCount" [ngModelOptions]="{standalone:true}" />
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Library Count</span>
                                <input class="input" type="number" [(ngModel)]="activityForm.libraryCount" [ngModelOptions]="{standalone:true}" />
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Quiz Count</span>
                                <input class="input" type="number" [(ngModel)]="activityForm.quizCount" [ngModelOptions]="{standalone:true}" />
                            </div>
                        </div>
                        <div class="crud-actions">
                            <button class="action-btn action-btn-teal" (click)="saveActivity()"><i class="bi bi-floppy-fill"></i> {{ editingActivityId ? 'Update' : 'Create' }}</button>
                            <button class="action-btn action-btn-neutral" (click)="resetActivityForm()">Cancel</button>
                        </div>
                    </div>
                </ng-container>

                <!-- User Badges CRUD -->
                <ng-container *ngIf="trainingView === 'user-badges'">
                    <div class="admin-table-wrap">
                        <table class="admin-table" *ngIf="!trainingLoading">
                            <thead>
                                <tr>
                                    <th (click)="setTrainingSort('user')">User {{ sortIndicator('user') }}</th>
                                    <th (click)="setTrainingSort('badge')">Badge {{ sortIndicator('badge') }}</th>
                                    <th (click)="setTrainingSort('progress')">Progress {{ sortIndicator('progress') }}</th>
                                    <th (click)="setTrainingSort('earnedDate')">Earned Date {{ sortIndicator('earnedDate') }}</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngFor="let ub of visibleUserBadges" class="user-row" (click)="editUserBadge(ub)">
                                    <td>
                                        <div class="user-name">{{ userLabelByKeycloakId(ub.userId) }}</div>
                                        <div class="user-email" *ngIf="userEmailByKeycloakId(ub.userId)">
                                            {{ userEmailByKeycloakId(ub.userId) }}
                                        </div>
                                    </td>
                                    <td>{{ badgeLabelById(ub.badgeId) }}</td>
                                    <td>{{ ub.progress ?? '-' }}</td>
                                    <td>{{ ub.earnedDate || '-' }}</td>
                                    <td (click)="$event.stopPropagation()">
                                        <div class="action-buttons">
                                            <button class="action-btn action-btn-teal" (click)="editUserBadge(ub)"><i class="bi bi-pencil"></i> Edit</button>
                                            <button class="action-btn action-btn-red" (click)="deleteUserBadge(ub)"><i class="bi bi-trash"></i> Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="table-empty" *ngIf="!trainingLoading && trainingTotalItems === 0">
                            No user badges found.
                        </div>
                    </div>

                    <div class="crud-card">
                        <div class="crud-head">
                            <strong>{{ editingUserBadgeId ? 'Edit User Badge' : 'Create User Badge' }}</strong>
                            <button class="action-btn action-btn-neutral" (click)="resetUserBadgeForm()"><i class="bi bi-x"></i> Clear</button>
                        </div>
                        <div class="crud-grid">
                            <div class="detail-item detail-full">
                                <span class="detail-label">User</span>
                                <select class="input" [(ngModel)]="userBadgeForm.userId" [ngModelOptions]="{standalone:true}">
                                    <option [ngValue]="''" disabled>Select a user...</option>
                                    <option *ngFor="let u of trainingUserIdentities" [value]="u.keycloakId">
                                        {{ userOptionLabel(u) }}
                                    </option>
                                </select>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Badge</span>
                                <select class="input" [(ngModel)]="userBadgeForm.badgeId" [ngModelOptions]="{standalone:true}">
                                    <option [ngValue]="null" disabled>Select a badge...</option>
                                    <option *ngFor="let b of adminBadges" [ngValue]="b.id">{{ b.name }}</option>
                                </select>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Progress (optional)</span>
                                <input class="input" type="number" [(ngModel)]="userBadgeForm.progress" [ngModelOptions]="{standalone:true}" />
                            </div>
                        </div>
                        <div class="crud-actions">
                            <button class="action-btn action-btn-teal" (click)="saveUserBadge()"><i class="bi bi-floppy-fill"></i> {{ editingUserBadgeId ? 'Update' : 'Create' }}</button>
                            <button class="action-btn action-btn-neutral" (click)="resetUserBadgeForm()">Cancel</button>
                        </div>
                    </div>
                </ng-container>
            </ng-container>
        </div>

        <!-- User Detail Modal -->
        <div class="modal-overlay" *ngIf="selectedUser" (click)="closeDetail()">
            <div class="modal-card" (click)="$event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-user-info">
                        <div class="modal-avatar">
                            {{ getInitials(selectedUser) }}
                        </div>
                        <div>
                            <h2>
                                {{ selectedUser.firstName }}
                                {{ selectedUser.lastName }}
                            </h2>
                            <p>{{ selectedUser.email }}</p>
                        </div>
                    </div>
                    <button class="modal-close" (click)="closeDetail()">
                        ✕
                    </button>
                </div>
                <div class="modal-body">
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Status</span>
                            <span
                                class="badge"
                                [ngClass]="getStatusClass(selectedUser.status)"
                                >{{ formatStatus(selectedUser.status) }}</span
                            >
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Role</span>
                            <span class="badge badge-role">{{
                                selectedUser.role
                            }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Plan</span>
                            <span class="badge badge-plan">{{
                                selectedUser.plan
                            }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Verified</span>
                            <span
                                class="badge"
                                [ngClass]="
                                    selectedUser.isVerified
                                        ? 'badge-active'
                                        : 'badge-pending'
                                "
                            >
                                {{ selectedUser.isVerified ? "Yes" : "No" }}
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Phone</span>
                            <span>{{ selectedUser.phoneNumber || "—" }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">City</span>
                            <span>{{ selectedUser.city || "—" }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Industry</span>
                            <span>{{
                                selectedUser.preferredIndustry || "—"
                            }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Language</span>
                            <span>{{
                                selectedUser.preferredLanguage || "—"
                            }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Karma Points</span>
                            <span>{{ selectedUser.karmaPoints }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Simulations</span>
                            <span
                                >{{ selectedUser.simulationsUsedThisMonth }} /
                                {{ selectedUser.simulationsLimit }}</span
                            >
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Subscription</span>
                            <span
                                class="badge"
                                [ngClass]="
                                    selectedUser.subscriptionActive
                                        ? 'badge-active'
                                        : 'badge-deleted'
                                "
                            >
                                {{
                                    selectedUser.subscriptionActive
                                        ? "Active"
                                        : "Inactive"
                                }}
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Joined</span>
                            <span>{{
                                selectedUser.createdAt | date: "MMM d, y"
                            }}</span>
                        </div>
                        <div
                            class="detail-item detail-full"
                            *ngIf="selectedUser.bio"
                        >
                            <span class="detail-label">Bio</span>
                            <span>{{ selectedUser.bio }}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button
                        *ngIf="!selectedUser.isVerified"
                        class="btn-action btn-green"
                        (click)="verifyUser(selectedUser); closeDetail()"
                    >
                        ✓ Verify
                    </button>
                    <button
                        *ngIf="selectedUser.status === 'ACTIVE'"
                        class="btn-action btn-orange"
                        (click)="
                            updateStatus(selectedUser, 'SUSPENDED');
                            closeDetail()
                        "
                    >
                        Suspend
                    </button>
                    <button
                        *ngIf="selectedUser.status === 'SUSPENDED'"
                        class="btn-action btn-green"
                        (click)="
                            updateStatus(selectedUser, 'ACTIVE'); closeDetail()
                        "
                    >
                        Activate
                    </button>
                    <button
                        class="btn-action btn-red"
                        (click)="deleteUser(selectedUser); closeDetail()"
                    >
                        <i class="bi bi-trash"></i> Delete
                    </button>
                    <button
                        *ngIf="selectedUser.status === 'DELETED'"
                        class="btn-action btn-green"
                        (click)="restoreUser(selectedUser); closeDetail()"
                    >
                        ↩ Restore
                    </button>
                    <button
                        class="btn-action btn-teal"
                        (click)="
                            viewUserInterviews(selectedUser); closeDetail()
                        "
                    >
                        🎙️ View Sessions
                    </button>
                    <button
                        class="btn-action btn-neutral"
                        (click)="closeDetail()"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>

        <!-- Confirm Modal (replaces browser confirm) -->
        <div
            class="modal-overlay confirm-overlay"
            *ngIf="confirmDialog"
            (click)="closeConfirm()"
        >
            <div
                class="modal-card confirm-card"
                (click)="$event.stopPropagation()"
            >
                <div class="modal-header">
                    <div class="confirm-copy">
                        <h2>{{ confirmDialog.title }}</h2>
                        <p>{{ confirmDialog.message }}</p>
                    </div>
                    <button class="modal-close" (click)="closeConfirm()">
                        ✕
                    </button>
                </div>
                <div class="modal-footer">
                    <button
                        class="btn-action"
                        [ngClass]="confirmDialog.danger ? 'btn-red' : 'btn-teal'"
                        (click)="confirmDialogConfirm()"
                    >
                        {{ confirmDialog.confirmText }}
                    </button>
                    <button
                        class="btn-action btn-neutral"
                        (click)="closeConfirm()"
                    >
                        {{ confirmDialog.cancelText }}
                    </button>
                </div>
            </div>
        </div>
    `,
    styles: [
        `
            /* Tabs */
            .admin-tabs {
                display: flex;
                gap: var(--space-2);
                margin-bottom: var(--space-2);
                border-bottom: 2px solid var(--color-border);
            }
            .adm-tab {
                padding: var(--space-3) var(--space-5);
                font-size: var(--text-sm);
                font-weight: 600;
                background: none;
                border: none;
                cursor: pointer;
                color: var(--color-text-muted);
                border-bottom: 2px solid transparent;
                margin-bottom: -2px;
                transition: all 0.15s;
            }
            .adm-tab:hover {
                color: var(--teal-600);
            }
            .adm-tab.active {
                color: var(--teal-600);
                border-bottom-color: var(--teal-500);
            }

            /* In-app notices */
            .admin-notice {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: var(--space-3);
                padding: var(--space-3) var(--space-4);
                border-radius: var(--radius-lg);
                border: 1px solid var(--color-border);
                background: var(--neutral-50);
                color: var(--color-text);
            }
            .notice-message {
                font-size: var(--text-sm);
                line-height: var(--leading-relaxed);
                white-space: pre-line;
            }
            .notice-close {
                flex-shrink: 0;
                width: 32px;
                height: 32px;
                border-radius: var(--radius-full);
                border: 1px solid var(--color-border);
                background: var(--color-surface);
                color: var(--color-text-muted);
                cursor: pointer;
            }
            .notice-close:hover {
                opacity: 0.85;
            }
            .admin-notice.notice-success {
                background: var(--success-50);
                border-color: var(--success-500);
                color: var(--success-600);
            }
            .admin-notice.notice-error {
                background: var(--error-50);
                border-color: var(--error-500);
                color: var(--error-500);
            }
            .admin-notice.notice-info {
                background: var(--teal-50);
                border-color: var(--teal-300);
                color: var(--teal-700);
            }

            /* Training tab */
            .training-head {
                display: flex;
                align-items: flex-end;
                justify-content: space-between;
                gap: var(--space-4);
                flex-wrap: wrap;
            }
            .training-title {
                margin: 0;
                font-size: var(--text-lg);
                font-weight: 700;
                color: var(--color-text);
            }
            .training-sub {
                margin: 2px 0 0;
                font-size: var(--text-sm);
                color: var(--color-text-muted);
            }
            .training-views {
                display: flex;
                gap: var(--space-2);
                flex-wrap: wrap;
            }
            .sub-tab {
                padding: 0.4rem 0.75rem;
                font-size: var(--text-xs);
                font-weight: 700;
                border-radius: var(--radius-full);
                border: 1px solid var(--color-border);
                background: var(--color-surface);
                color: var(--color-text-muted);
                cursor: pointer;
                transition: all 0.15s;
            }
            .sub-tab:hover {
                color: var(--teal-700);
                border-color: var(--teal-200);
                background: var(--teal-50);
            }
            .sub-tab.active {
                color: var(--teal-700);
                border-color: var(--teal-300);
                background: var(--teal-50);
            }

            .crud-card {
                background: var(--color-surface);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                padding: var(--space-5);
                margin-top: var(--space-5);
            }
            .crud-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--space-3);
                margin-bottom: var(--space-4);
            }
            .crud-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: var(--space-4);
            }
            .crud-actions {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                margin-top: var(--space-4);
                flex-wrap: wrap;
            }

            @media (max-width: 900px) {
                .crud-grid {
                    grid-template-columns: 1fr;
                }
            }

            .admin-panel {
                display: flex;
                flex-direction: column;
                gap: var(--space-6);
            }
            .admin-stats {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: var(--space-4);
            }
            .stat-box {
                background: var(--color-surface);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                padding: var(--space-5);
                text-align: center;
            }
            .stat-box-green {
                border-color: var(--success-500);
            }
            .stat-box-yellow {
                border-color: var(--warning-500);
            }
            .stat-box-red {
                border-color: var(--error-500);
            }
            .stat-value {
                font-size: var(--text-3xl);
                font-weight: 700;
                color: var(--color-text);
            }
            .stat-label {
                font-size: var(--text-sm);
                color: var(--color-text-muted);
                margin-top: var(--space-1);
            }

            .admin-toolbar {
                display: flex;
                gap: var(--space-4);
                align-items: center;
                flex-wrap: wrap;
            }
            .search-wrap {
                position: relative;
                flex: 1;
                min-width: 200px;
            }
            .search-icon {
                position: absolute;
                left: 0.875rem;
                top: 50%;
                transform: translateY(-50%);
                font-size: 0.875rem;
                pointer-events: none;
            }
            .search-input {
                padding-left: 2.5rem;
            }
            .filter-wrap {
                display: flex;
                gap: var(--space-3);
            }
            .filter-select {
                min-width: 140px;
            }

            .admin-table-wrap {
                background: var(--color-surface);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                overflow: hidden;
            }
            .table-loading,
            .table-empty {
                padding: var(--space-8);
                text-align: center;
                color: var(--color-text-muted);
                font-size: var(--text-sm);
            }
            .admin-table {
                width: 100%;
                border-collapse: collapse;
                font-size: var(--text-sm);
            }
            .admin-table thead {
                background: var(--neutral-50);
                border-bottom: 1px solid var(--color-border);
            }
            .admin-table th {
                padding: var(--space-3) var(--space-4);
                text-align: left;
                font-weight: 600;
                color: var(--color-text-muted);
                font-size: 0.75rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                user-select: none;
            }
            .admin-table thead th:hover {
                background: var(--neutral-100);
            }
            .admin-table td {
                padding: var(--space-3) var(--space-4);
                border-bottom: 1px solid var(--color-border-light);
                color: var(--color-text);
            }
            .admin-table tr:last-child td {
                border-bottom: none;
            }
            .user-row {
                cursor: pointer;
                transition: background 0.15s;
            }
            .user-row:hover td {
                background: var(--teal-50);
            }
            .user-cell {
                display: flex;
                align-items: center;
                gap: var(--space-3);
            }
            .user-avatar {
                width: 36px;
                height: 36px;
                border-radius: var(--radius-full);
                background: linear-gradient(
                    135deg,
                    var(--teal-300),
                    var(--cyan-300)
                );
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 0.75rem;
                font-weight: 600;
                flex-shrink: 0;
            }
            .user-name {
                font-weight: 500;
                color: var(--color-text);
            }
            .user-email {
                font-size: 0.75rem;
                color: var(--color-text-muted);
            }
            .date-cell {
                color: var(--color-text-muted);
                font-size: 0.8125rem;
            }

            .badge {
                display: inline-flex;
                align-items: center;
                padding: 0.2rem 0.6rem;
                border-radius: var(--radius-full);
                font-size: 0.7rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .badge-active {
                background: var(--success-50);
                color: var(--success-600);
            }
            .badge-pending {
                background: var(--warning-50);
                color: var(--warning-600);
            }
            .badge-suspended {
                background: var(--error-50);
                color: var(--error-500);
            }
            .badge-deleted {
                background: var(--neutral-100);
                color: var(--neutral-500);
            }
            .badge-role {
                background: var(--teal-50);
                color: var(--teal-700);
            }
            .badge-plan {
                background: var(--cyan-50);
                color: var(--cyan-500);
            }

            .action-buttons {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                flex-wrap: wrap;
            }
            .action-btn {
                padding: 0.25rem 0.625rem;
                border-radius: var(--radius-sm);
                font-size: 0.75rem;
                font-weight: 500;
                border: none;
                cursor: pointer;
                transition: opacity 0.15s;
            }
            .action-btn:hover {
                opacity: 0.8;
            }
            .action-btn-green {
                background: var(--success-50);
                color: var(--success-600);
            }
            .action-btn-orange {
                background: var(--warning-50);
                color: var(--warning-600);
            }
            .action-btn-red {
                background: var(--error-50);
                color: var(--error-500);
            }
            .action-btn-teal {
                background: var(--teal-50);
                color: var(--teal-700);
            }
            .action-select {
                padding: 0.25rem 0.5rem;
                border-radius: var(--radius-sm);
                font-size: 0.75rem;
                border: 1px solid var(--color-border);
                background: var(--color-surface);
                cursor: pointer;
            }

            .admin-pagination {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: var(--space-4);
            }
            .page-btn {
                padding: var(--space-2) var(--space-4);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-md);
                background: var(--color-surface);
                color: var(--color-text);
                cursor: pointer;
                font-size: var(--text-sm);
                transition: all 0.15s;
            }
            .page-btn:hover:not(:disabled) {
                background: var(--teal-50);
                border-color: var(--teal-300);
            }
            .page-btn:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }
            .page-info {
                font-size: var(--text-sm);
                color: var(--color-text-muted);
            }

            /* ── Interviews tab ─────────────────────────────────── */
            .user-picker-state {
                display: flex;
                flex-direction: column;
                gap: var(--space-5);
            }
            .picker-hint {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                padding: var(--space-8) var(--space-4) var(--space-4);
                color: var(--color-text-muted);
            }
            .picker-hint-icon {
                font-size: 2.5rem;
                margin-bottom: var(--space-3);
            }
            .picker-hint h3 {
                font-size: var(--text-lg);
                color: var(--color-text);
                margin: 0 0 var(--space-2);
            }
            .picker-hint p {
                font-size: var(--text-sm);
                margin: 0;
                max-width: 400px;
            }

            /* Int header */
            .int-header {
                display: flex;
                align-items: center;
                gap: var(--space-4);
                padding: var(--space-4);
                background: var(--color-surface);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
            }
            .btn-back {
                background: none;
                border: 1px solid var(--color-border);
                border-radius: var(--radius-md);
                padding: var(--space-2) var(--space-3);
                font-size: var(--text-sm);
                cursor: pointer;
                color: var(--color-text-muted);
                white-space: nowrap;
                flex-shrink: 0;
            }
            .btn-back:hover {
                background: var(--neutral-50);
            }
            .int-user-pill {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                flex: 1;
                min-width: 0;
            }
            .int-header-right {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                margin-left: auto;
                flex-shrink: 0;
            }
            .int-session-count {
                display: flex;
                flex-direction: column;
                align-items: center;
                background: var(--teal-50);
                border-radius: var(--radius-md);
                padding: 4px 12px;
                border: 1px solid var(--teal-100);
            }
            .count-num {
                font-size: var(--text-lg);
                font-weight: 700;
                color: var(--teal-600);
                line-height: 1.2;
            }
            .count-label {
                font-size: 0.65rem;
                color: var(--teal-500);
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }

            /* Progress panel */
            .progress-panel {
                background: var(--color-surface);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                padding: var(--space-5);
                display: flex;
                flex-direction: column;
                gap: var(--space-4);
                animation: slideDown 0.2s ease;
            }
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-8px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .pp-inner,
            .pp-empty {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                font-size: var(--text-sm);
                color: var(--color-text-muted);
                padding: var(--space-2);
            }
            .pp-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
                gap: var(--space-4);
            }
            .pp-stat {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .pp-stat-label {
                font-size: 0.65rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.06em;
                color: var(--color-text-muted);
            }
            .pp-stat-val {
                font-size: var(--text-xl);
                font-weight: 700;
                color: var(--color-text);
            }
            .pp-stat-val.teal {
                color: var(--teal-600);
            }
            .pp-bars {
                display: flex;
                flex-direction: column;
                gap: var(--space-3);
            }
            .pp-bar-row {
                display: grid;
                grid-template-columns: 80px 1fr 48px;
                align-items: center;
                gap: var(--space-3);
            }
            .pp-bar-label {
                font-size: var(--text-sm);
                color: var(--color-text-muted);
            }
            .pp-bar-track {
                height: 8px;
                background: var(--neutral-100);
                border-radius: var(--radius-full);
                overflow: hidden;
            }
            .pp-bar-fill {
                height: 100%;
                border-radius: var(--radius-full);
                transition: width 0.6s ease;
            }
            .pp-fill-avg {
                background: linear-gradient(
                    90deg,
                    var(--teal-400),
                    var(--teal-600)
                );
            }
            .pp-fill-best {
                background: linear-gradient(90deg, #06b6d4, #0891b2);
            }
            .pp-bar-val {
                font-size: var(--text-sm);
                font-weight: 600;
                text-align: right;
            }

            /* Sessions grid */
            .int-loading {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                padding: var(--space-6);
                color: var(--color-text-muted);
                font-size: var(--text-sm);
            }
            .mini-spinner {
                width: 18px;
                height: 18px;
                border: 2px solid var(--color-border);
                border-top-color: var(--teal-500);
                border-radius: 50%;
                animation: spin 0.7s linear infinite;
                flex-shrink: 0;
            }
            @keyframes spin {
                to {
                    transform: rotate(360deg);
                }
            }

            .sessions-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                padding: var(--space-16) var(--space-8);
                color: var(--color-text-muted);
            }
            .se-icon {
                font-size: 3rem;
                margin-bottom: var(--space-4);
            }
            .sessions-empty h3 {
                font-size: var(--text-lg);
                color: var(--color-text);
                margin: 0 0 var(--space-2);
            }
            .sessions-empty p {
                font-size: var(--text-sm);
                margin: 0;
            }

            .int-sessions-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: var(--space-4);
            }
            .int-session-card {
                background: var(--color-surface);
                border: 1.5px solid var(--color-border);
                border-radius: var(--radius-lg);
                padding: var(--space-4);
                cursor: pointer;
                transition: all 0.15s;
                display: flex;
                flex-direction: column;
                gap: var(--space-2);
            }
            .int-session-card:hover {
                border-color: var(--teal-300);
                box-shadow: var(--shadow-md);
            }
            .int-session-card.int-selected {
                border-color: var(--teal-400);
                background: var(--teal-50);
            }
            .isc-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .isc-type {
                font-size: 0.65rem;
            }
            .isc-industry {
                font-size: var(--text-sm);
                font-weight: 600;
                color: var(--color-text);
            }
            .isc-meta {
                font-size: var(--text-xs);
                color: var(--color-text-muted);
                display: flex;
                gap: var(--space-1);
            }
            .isc-actions {
                display: flex;
                gap: var(--space-2);
                margin-top: var(--space-2);
                padding-top: var(--space-2);
                border-top: 1px solid var(--color-border-light);
            }
            .status-chip {
                font-size: 0.6rem;
                font-weight: 600;
                padding: 2px 6px;
                border-radius: var(--radius-full);
            }
            .status-completed {
                background: #dbeafe;
                color: #1e40af;
            }
            .status-in_progress,
            .status-in-progress {
                background: #dcfce7;
                color: #166534;
            }
            .status-paused {
                background: #fef9c3;
                color: #854d0e;
            }
            .status-cancelled {
                background: #f3f4f6;
                color: #6b7280;
            }

            /* Report panel */
            .report-panel {
                background: var(--color-surface);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                padding: var(--space-5);
                display: flex;
                flex-direction: column;
                gap: var(--space-4);
                margin-top: var(--space-2);
                animation: slideDown 0.2s ease;
            }
            .report-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: var(--text-sm);
                font-weight: 600;
                padding-bottom: var(--space-3);
                border-bottom: 1px solid var(--color-border);
            }
            .report-scores-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                gap: var(--space-4);
                padding: var(--space-4);
                background: var(--neutral-50);
                border-radius: var(--radius-md);
            }
            .rsg-item {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .rsg-item-main {
                grid-column: span 1;
            }
            .rsg-label {
                font-size: 0.65rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.06em;
                color: var(--color-text-muted);
            }
            .rsg-val {
                font-size: var(--text-xl);
                font-weight: 700;
                color: var(--color-text);
            }
            .rsg-val.teal {
                color: var(--teal-600);
                font-size: 1.75rem;
            }
            .report-text-section {
                background: var(--neutral-50);
                border-radius: var(--radius-md);
                padding: var(--space-3);
            }
            .rts-label {
                font-size: var(--text-xs);
                font-weight: 700;
                margin-bottom: var(--space-1);
            }
            .report-text-section p {
                font-size: var(--text-sm);
                color: var(--color-text-muted);
                margin: 0;
                line-height: var(--leading-relaxed);
            }
            .report-error {
                background: var(--error-50);
                color: var(--error-700);
                padding: var(--space-3);
                border-radius: var(--radius-md);
                font-size: var(--text-sm);
            }

            .level-badge {
                display: inline-block;
                padding: 2px 10px;
                border-radius: var(--radius-full);
                font-weight: 700;
                font-size: 0.7rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .level-BEGINNER {
                background: #fef2f2;
                color: #b91c1c;
            }
            .level-INTERMEDIATE {
                background: #fef9c3;
                color: #854d0e;
            }
            .level-ADVANCED {
                background: #dcfce7;
                color: #166534;
            }
            .level-EXPERT {
                background: #dbeafe;
                color: #1e40af;
            }

            /* Modal */
            .modal-overlay {
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.5);
                z-index: 100;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: var(--space-4);
                backdrop-filter: blur(4px);
            }

            .confirm-overlay {
                z-index: 110;
            }
            .confirm-card .modal-header p {
                margin-top: var(--space-1);
                white-space: pre-line;
            }
            .confirm-card .btn-neutral {
                margin-left: 0;
            }
            .modal-card {
                background: var(--color-surface);
                border-radius: var(--radius-xl);
                width: 100%;
                max-width: 560px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
            }
            .modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--space-6);
                border-bottom: 1px solid var(--color-border);
            }
            .modal-user-info {
                display: flex;
                align-items: center;
                gap: var(--space-4);
            }
            .modal-avatar {
                width: 52px;
                height: 52px;
                border-radius: var(--radius-full);
                background: linear-gradient(
                    135deg,
                    var(--teal-400),
                    var(--cyan-400)
                );
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 1.1rem;
                font-weight: 700;
                flex-shrink: 0;
            }
            .modal-header h2 {
                font-size: var(--text-lg);
                font-weight: 700;
                color: var(--color-text);
                margin: 0 0 0.2rem;
            }
            .modal-header p {
                font-size: var(--text-sm);
                color: var(--color-text-muted);
                margin: 0;
            }
            .modal-close {
                width: 32px;
                height: 32px;
                border-radius: var(--radius-full);
                border: 1px solid var(--color-border);
                background: var(--color-surface);
                color: var(--color-text-muted);
                cursor: pointer;
                font-size: 0.875rem;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s;
            }
            .modal-close:hover {
                background: var(--error-50);
                color: var(--error-500);
                border-color: var(--error-500);
            }
            .modal-body {
                padding: var(--space-6);
            }
            .detail-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: var(--space-4);
            }
            .detail-full {
                grid-column: 1/-1;
            }
            .detail-item {
                display: flex;
                flex-direction: column;
                gap: var(--space-1);
            }
            .detail-label {
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: var(--color-text-muted);
            }
            .detail-item span:last-child {
                font-size: var(--text-sm);
                color: var(--color-text);
            }
            .modal-footer {
                display: flex;
                gap: var(--space-3);
                padding: var(--space-5) var(--space-6);
                border-top: 1px solid var(--color-border);
                flex-wrap: wrap;
            }
            .btn-action {
                padding: 0.5rem 1rem;
                border-radius: var(--radius-md);
                font-size: var(--text-sm);
                font-weight: 500;
                border: none;
                cursor: pointer;
                transition: opacity 0.15s;
                font-family: var(--font-body);
            }
            .btn-action:hover {
                opacity: 0.85;
            }
            .btn-green {
                background: var(--success-50);
                color: var(--success-600);
                border: 1px solid var(--success-500);
            }
            .btn-orange {
                background: var(--warning-50);
                color: var(--warning-600);
                border: 1px solid var(--warning-500);
            }
            .btn-red {
                background: var(--error-50);
                color: var(--error-500);
                border: 1px solid var(--error-500);
            }
            .btn-teal {
                background: var(--teal-50);
                color: var(--teal-700);
                border: 1px solid var(--teal-300);
            }
            .btn-neutral {
                background: var(--neutral-100);
                color: var(--color-text-muted);
                border: 1px solid var(--color-border);
                margin-left: auto;
            }

            @media (max-width: 768px) {
                .admin-stats {
                    grid-template-columns: repeat(2, 1fr);
                }
                .detail-grid {
                    grid-template-columns: 1fr;
                }
                .int-header {
                    flex-wrap: wrap;
                }
            }
        `,
    ],
})
export class AdminDashboardComponent implements OnInit {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private interviewApi = inject(InterviewApiService);
    private cdr = inject(ChangeDetectorRef);

    adminNotice: {
        type: "success" | "error" | "info";
        message: string;
    } | null = null;

    confirmDialog: {
        title: string;
        message: string;
        confirmText: string;
        cancelText: string;
        danger?: boolean;
        onConfirm: () => void;
    } | null = null;

    showNotice(
        type: "success" | "error" | "info",
        message: string,
    ): void {
        this.adminNotice = { type, message };
        this.cdr.markForCheck();
    }

    clearNotice(): void {
        this.adminNotice = null;
        this.cdr.markForCheck();
    }

    openConfirm(opts: {
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        danger?: boolean;
        onConfirm: () => void;
    }): void {
        this.confirmDialog = {
            title: opts.title,
            message: opts.message,
            confirmText: opts.confirmText ?? "Confirm",
            cancelText: opts.cancelText ?? "Cancel",
            danger: Boolean(opts.danger),
            onConfirm: opts.onConfirm,
        };
        this.cdr.markForCheck();
    }

    closeConfirm(): void {
        this.confirmDialog = null;
        this.cdr.markForCheck();
    }

    confirmDialogConfirm(): void {
        const cb = this.confirmDialog?.onConfirm;
        this.confirmDialog = null;
        this.cdr.markForCheck();
        if (cb) cb();
    }

    // ── Users tab ─────────────────────────────────────────────────────────────
    activeTab: AdminTab = "users";
    users: UserItem[] = [];
    loading = true;
    searchQuery = "";
    statusFilter = "";
    roleFilter = "";
    currentPage = 0;
    totalPages = 0;
    searchTimeout: any;
    selectedUser: UserItem | null = null;
    stats = { total: 0, active: 0, pending: 0, suspended: 0 };

    // ── Interviews tab ────────────────────────────────────────────────────────
    intUserSearch = "";
    intUserList: UserItem[] = [];
    intUserSearchTimeout: any;
    selectedInterviewUser: UserItem | null = null;

    intSessions: InterviewSessionResponse[] = [];
    intSessionsLoading = false;
    selectedIntSession: InterviewSessionResponse | null = null;

    intReport: (PerformanceReport & { sessionId?: number }) | null = null;
    intReportLoading = false;
    intReportError: string | null = null;

    showUserProgress = false;
    userProgress: ProgressTracker | null = null;
    userProgressLoading = false;

    // ── Training tab ─────────────────────────────────────────────────────────
    trainingView:
        | "badges"
        | "paths"
        | "modules"
        | "lessons"
        | "xp-trackers"
        | "activities"
        | "user-badges" = "badges";
    trainingLoading = false;
    trainingError: string | null = null;
    aiGenerating = false;
    aiGeneratingMsg = '';

    adminBadges: BadgeResponse[] = [];
    adminPaths: TrainingPathResponse[] = [];
    adminModules: TrainingModuleResponse[] = [];
    adminLessons: TrainingLessonResponse[] = [];

    adminTrackers: UserXPTrackerResponse[] = [];
    adminActivities: DailyActivityResponse[] = [];
    adminUserBadges: UserBadgeResponse[] = [];

    trainingUserIdentities: UserIdentityItem[] = [];
    private trainingUserIdentityByKeycloakId = new Map<string, UserIdentityItem>();
    private trainingIdentitiesLoading = false;
    private trainingIdentitiesLoaded = false;
    private trainingPathById = new Map<number, TrainingPathResponse>();
    private trainingBadgeById = new Map<number, BadgeResponse>();

    // Training table UI (search/sort/pagination) — client-side over loaded lists
    trainingSearchQuery = "";
    trainingSearchTimeout: any;
    trainingPage = 0;
    trainingPageSize = 10;
    trainingSortKey = "name";
    trainingSortDir: "asc" | "desc" = "asc";
    trainingTotalItems = 0;
    trainingTotalPages = 1;

    visibleBadges: BadgeResponse[] = [];
    visiblePaths: TrainingPathResponse[] = [];
    visibleModules: TrainingModuleResponse[] = [];
    visibleLessons: TrainingLessonResponse[] = [];
    visibleTrackers: UserXPTrackerResponse[] = [];
    visibleActivities: DailyActivityResponse[] = [];
    visibleUserBadges: UserBadgeResponse[] = [];

    editingBadgeId: number | null = null;
    badgeCategories = [
        "SIMULATION",
        "COMMUNITY",
        "STREAK",
        "PERFORMANCE",
        "MILESTONE",
    ];
    badgeForm: {
        name: string;
        description: string;
        icon: string;
        category: string;
        xpReward: number;
        criteriaJson: string;
        isActive: boolean;
    } = {
        name: "",
        description: "",
        icon: "",
        category: "SIMULATION",
        xpReward: 0,
        criteriaJson: "",
        isActive: true,
    };

    editingPathId: number | null = null;
    pathStatuses = ["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"];
    pathForm: { userId: string; status: string; xpThreshold: number } = {
        userId: "",
        status: "ACTIVE",
        xpThreshold: 200,
    };

    editingModuleId: number | null = null;
    trainingCategories = [
        "COMMUNICATION",
        "STRESS_MANAGEMENT",
        "CONTENT_PREP",
        "BODY_LANGUAGE",
        "INDUSTRY_SPECIFIC",
    ];

    lessonFormats = ["TEXT", "VIDEO"];
    lessonDifficulties = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
    lessonLanguages = ["en", "fr", "ar"];

    aiLessonGenForm: {
        category: string;
        language: string;
        targetActiveCount: number;
        maxGenerate: number;
        difficulty: string; // '' means AUTO
    } = {
        category: "COMMUNICATION",
        language: "en",
        targetActiveCount: 30,
        maxGenerate: 10,
        difficulty: "",
    };

    editingLessonId: number | null = null;
    lessonForm: {
        category: string;
        title: string;
        format: "TEXT" | "VIDEO";
        summary: string;
        contentMarkdown: string;
        videoUrl: string;
        estimatedMinutes: number;
        difficulty: string;
        language: string;
        active: boolean;
        tagsCsv: string;
    } = {
        category: "COMMUNICATION",
        title: "",
        format: "TEXT",
        summary: "",
        contentMarkdown: "",
        videoUrl: "",
        estimatedMinutes: 5,
        difficulty: "BEGINNER",
        language: "en",
        active: true,
        tagsCsv: "",
    };
    moduleStatuses = ["LOCKED", "IN_PROGRESS", "COMPLETED", "SKIPPED"];
    moduleForm: {
        pathId: number | null;
        category: string;
        title: string;
        description: string;
        lessons: number;
        completedLessons: number;
        progress: number | null;
        xpReward: number;
        status: string;
        unlockedAt: string;
    } = {
        pathId: null,
        category: "COMMUNICATION",
        title: "",
        description: "",
        lessons: 1,
        completedLessons: 0,
        progress: null,
        xpReward: 0,
        status: "LOCKED",
        unlockedAt: "",
    };

    editingTrackerId: number | null = null;
    trackerForm: {
        userId: string;
        totalXp: number;
        currentLevel: number;
        xpToNextLevel: number;
        currentStreak: number;
        longestStreak: number;
        lastActivityDate: string;
    } = {
        userId: "",
        totalXp: 0,
        currentLevel: 1,
        xpToNextLevel: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: "",
    };

    editingActivityId: number | null = null;
    activityForm: {
        userId: string;
        activityDate: string;
        xpEarned: number;
        sessionCompleted: boolean;
        goalsCompleted: number;
        behavioralCount: number;
        libraryCount: number;
        quizCount: number;
    } = {
        userId: "",
        activityDate: "",
        xpEarned: 0,
        sessionCompleted: false,
        goalsCompleted: 0,
        behavioralCount: 0,
        libraryCount: 0,
        quizCount: 0,
    };

    editingUserBadgeId: number | null = null;
    userBadgeForm: { userId: string; badgeId: number | null; progress: number | null } = {
        userId: "",
        badgeId: null,
        progress: null,
    };

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    ngOnInit(): void {
        this.loadUsers();
        this.loadStats();
    }

    setTab(tab: AdminTab): void {
        this.activeTab = tab;
        if (tab === "training") {
            this.ensureTrainingIdentitiesLoaded();
            this.trainingSortKey = this.defaultTrainingSortKey(this.trainingView);
            this.setTrainingView(this.trainingView);
        }
    }

    setTrainingView(
        view:
            | "badges"
            | "paths"
            | "modules"
            | "lessons"
            | "xp-trackers"
            | "activities"
            | "user-badges",
    ): void {
        const changed = this.trainingView !== view;
        this.trainingView = view;
        if (changed) {
            this.resetTrainingTableState(view);
        }
        this.ensureTrainingIdentitiesLoaded();
        if (view === "badges") {
            this.loadBadges();
        } else if (view === "paths") {
            this.loadPaths();
        } else if (view === "modules") {
            this.loadModules();
        } else if (view === "lessons") {
            this.loadLessons();
        } else if (view === "xp-trackers") {
            this.loadTrackers();
        } else if (view === "activities") {
            this.loadActivities();
        } else {
            this.loadUserBadges();
        }
    }

    onTrainingSearchInput(): void {
        clearTimeout(this.trainingSearchTimeout);
        this.trainingSearchTimeout = setTimeout(() => {
            this.trainingPage = 0;
            this.refreshTrainingTable();
        }, 200);
    }

    onTrainingPageSizeChange(): void {
        this.trainingPage = 0;
        this.refreshTrainingTable();
    }

    trainingPrevPage(): void {
        if (this.trainingPage <= 0) return;
        this.trainingPage -= 1;
        this.refreshTrainingTable();
    }

    trainingNextPage(): void {
        if (this.trainingPage >= this.trainingTotalPages - 1) return;
        this.trainingPage += 1;
        this.refreshTrainingTable();
    }

    setTrainingSort(key: string): void {
        if (!key) return;
        if (this.trainingSortKey === key) {
            this.trainingSortDir = this.trainingSortDir === "asc" ? "desc" : "asc";
        } else {
            this.trainingSortKey = key;
            this.trainingSortDir = "asc";
        }
        this.trainingPage = 0;
        this.refreshTrainingTable();
    }

    sortIndicator(key: string): string {
        if (this.trainingSortKey !== key) return "";
        return this.trainingSortDir === "asc" ? "▲" : "▼";
    }

    trainingSearchPlaceholder(): string {
        const label =
            {
                badges: "badges",
                paths: "paths",
                modules: "modules",
                lessons: "lessons",
                "xp-trackers": "trackers",
                activities: "activities",
                "user-badges": "user badges",
            }[this.trainingView] || "items";
        return `Search ${label}...`;
    }

    private resetTrainingTableState(
        view:
            | "badges"
            | "paths"
            | "modules"
            | "lessons"
            | "xp-trackers"
            | "activities"
            | "user-badges",
    ): void {
        this.trainingSearchQuery = "";
        this.trainingPage = 0;
        this.trainingSortKey = this.defaultTrainingSortKey(view);
        this.trainingSortDir = "asc";
        this.trainingTotalItems = 0;
        this.trainingTotalPages = 1;
        this.visibleBadges = [];
        this.visiblePaths = [];
        this.visibleModules = [];
        this.visibleLessons = [];
        this.visibleTrackers = [];
        this.visibleActivities = [];
        this.visibleUserBadges = [];
    }

    private defaultTrainingSortKey(
        view:
            | "badges"
            | "paths"
            | "modules"
            | "lessons"
            | "xp-trackers"
            | "activities"
            | "user-badges",
    ): string {
        if (view === "badges") return "name";
        if (view === "paths") return "user";
        if (view === "modules") return "title";
        if (view === "lessons") return "title";
        if (view === "xp-trackers") return "user";
        if (view === "activities") return "activityDate";
        return "user";
    }

    private ensureTrainingIdentitiesLoaded(): void {
        if (this.trainingIdentitiesLoaded || this.trainingIdentitiesLoading)
            return;

        this.trainingIdentitiesLoading = true;
        const url = `${environment.apiUrl}/api/users/identities?page=0&size=5000`;
        this.http.get<any>(url).subscribe({
            next: (res: any) => {
                const items: UserIdentityItem[] = (res?.content || []) as UserIdentityItem[];
                this.trainingUserIdentities = items;
                this.trainingUserIdentityByKeycloakId = new Map(
                    items
                        .filter((u) => !!u?.keycloakId)
                        .map((u) => [u.keycloakId, u] as const),
                );
                this.trainingIdentitiesLoaded = true;
                this.trainingIdentitiesLoading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.trainingIdentitiesLoaded = true;
                this.trainingIdentitiesLoading = false;
                this.cdr.markForCheck();
            },
        });
    }

    private userDisplayName(u: UserIdentityItem | undefined | null): string {
        if (!u) return "Unknown user";
        const full = `${String(u.firstName || "")} ${String(u.lastName || "")}`.trim();
        return full || String(u.email || "") || "Unknown user";
    }

    userLabelByKeycloakId(keycloakId: string | null | undefined): string {
        if (!keycloakId) return "Unknown user";
        return this.userDisplayName(this.trainingUserIdentityByKeycloakId.get(String(keycloakId)));
    }

    userEmailByKeycloakId(keycloakId: string | null | undefined): string {
        if (!keycloakId) return "";
        return String(this.trainingUserIdentityByKeycloakId.get(String(keycloakId))?.email || "");
    }

    userOptionLabel(u: UserIdentityItem): string {
        const name = this.userDisplayName(u);
        const email = String(u.email || "");
        return email && email !== name ? `${name} — ${email}` : name;
    }

    private pathOwnerKeycloakId(pathId: number | null | undefined): string | null {
        if (!pathId) return null;
        const p = this.trainingPathById.get(Number(pathId));
        return p?.userId || null;
    }

    pathOwnerLabel(pathId: number | null | undefined): string {
        return this.userLabelByKeycloakId(this.pathOwnerKeycloakId(pathId));
    }

    pathOwnerEmail(pathId: number | null | undefined): string {
        return this.userEmailByKeycloakId(this.pathOwnerKeycloakId(pathId));
    }

    pathOptionLabel(p: TrainingPathResponse): string {
        return `${this.userLabelByKeycloakId(p.userId)} — ${p.status}`;
    }

    badgeLabelById(badgeId: number | null | undefined): string {
        if (!badgeId) return "Unknown badge";
        return String(this.trainingBadgeById.get(Number(badgeId))?.name || "Unknown badge");
    }

    private normalizeText(v: any): string {
        return String(v ?? "")
            .trim()
            .toLowerCase();
    }

    private compareValues(a: any, b: any): number {
        if (a === b) return 0;
        if (a === null || a === undefined) return 1;
        if (b === null || b === undefined) return -1;

        if (typeof a === "number" && typeof b === "number") return a - b;
        if (typeof a === "boolean" && typeof b === "boolean")
            return a === b ? 0 : a ? 1 : -1;

        const as = this.normalizeText(a);
        const bs = this.normalizeText(b);
        return as.localeCompare(bs);
    }

    private applyTrainingTable<T>(
        rows: T[],
        matches: (row: T, q: string) => boolean,
        sortValue: (row: T, key: string) => any,
    ): T[] {
        const q = this.normalizeText(this.trainingSearchQuery);
        const filtered = q ? rows.filter((r) => matches(r, q)) : [...rows];

        const key = this.trainingSortKey;
        const dir = this.trainingSortDir;
        const sorted = key
            ? [...filtered].sort((ra: T, rb: T) => {
                  const va = sortValue(ra, key);
                  const vb = sortValue(rb, key);
                  const cmp = this.compareValues(va, vb);
                  return dir === "asc" ? cmp : -cmp;
              })
            : filtered;

        this.trainingTotalItems = sorted.length;
        this.trainingTotalPages = Math.max(
            1,
            Math.ceil(sorted.length / Math.max(1, this.trainingPageSize)),
        );

        if (this.trainingPage > this.trainingTotalPages - 1) {
            this.trainingPage = this.trainingTotalPages - 1;
        }

        const start = this.trainingPage * Math.max(1, this.trainingPageSize);
        const end = start + Math.max(1, this.trainingPageSize);
        return sorted.slice(start, end);
    }

    private refreshTrainingTable(): void {
        if (this.trainingView === "badges") {
            this.visibleBadges = this.applyTrainingTable<BadgeResponse>(
                this.adminBadges,
                (b, q) =>
                    this.normalizeText(b.name).includes(q) ||
                    this.normalizeText(b.category).includes(q) ||
                    this.normalizeText(b.description).includes(q) ||
                    this.normalizeText(b.xpReward).includes(q) ||
                    this.normalizeText(b.isActive ? "active" : "inactive").includes(q),
                (b, key) => (b as any)[key],
            );
        } else if (this.trainingView === "paths") {
            this.visiblePaths = this.applyTrainingTable<TrainingPathResponse>(
                this.adminPaths,
                (p, q) =>
                    this.normalizeText(this.userLabelByKeycloakId(p.userId)).includes(q) ||
                    this.normalizeText(this.userEmailByKeycloakId(p.userId)).includes(q) ||
                    this.normalizeText(p.status).includes(q) ||
                    this.normalizeText(p.xpThreshold).includes(q) ||
                    this.normalizeText(p.modules?.length ?? 0).includes(q),
                (p, key) => {
                    if (key === "modulesCount") return p.modules?.length ?? 0;
                    if (key === "user") return this.userLabelByKeycloakId(p.userId);
                    return (p as any)[key];
                },
            );
        } else if (this.trainingView === "modules") {
            this.visibleModules = this.applyTrainingTable<TrainingModuleResponse>(
                this.adminModules,
                (m, q) =>
                    this.normalizeText(this.pathOwnerLabel(m.pathId)).includes(q) ||
                    this.normalizeText(m.title).includes(q) ||
                    this.normalizeText(m.category).includes(q) ||
                    this.normalizeText(m.status).includes(q) ||
                    this.normalizeText(m.progress).includes(q) ||
                    this.normalizeText(m.xpReward).includes(q) ||
                    this.normalizeText(m.lessons).includes(q) ||
                    this.normalizeText(m.completedLessons).includes(q),
                (m, key) => {
                    if (key === "user") return this.pathOwnerLabel(m.pathId);
                    return (m as any)[key];
                },
            );
        } else if (this.trainingView === "lessons") {
            this.visibleLessons = this.applyTrainingTable<TrainingLessonResponse>(
                this.adminLessons,
                (l, q) =>
                    this.normalizeText(l.title).includes(q) ||
                    this.normalizeText(l.category).includes(q) ||
                    this.normalizeText(l.format).includes(q) ||
                    this.normalizeText(l.difficulty).includes(q) ||
                    this.normalizeText(l.estimatedMinutes).includes(q) ||
                    this.normalizeText(l.language).includes(q) ||
                    this.normalizeText(l.active ? "active" : "inactive").includes(q) ||
                    this.normalizeText(l.summary).includes(q) ||
                    this.normalizeText((l.tags || []).join(",")).includes(q),
                (l, key) => (l as any)[key],
            );
        } else if (this.trainingView === "xp-trackers") {
            this.visibleTrackers = this.applyTrainingTable<UserXPTrackerResponse>(
                this.adminTrackers,
                (t, q) =>
                    this.normalizeText(this.userLabelByKeycloakId(t.userId)).includes(q) ||
                    this.normalizeText(this.userEmailByKeycloakId(t.userId)).includes(q) ||
                    this.normalizeText(t.totalXp).includes(q) ||
                    this.normalizeText(t.currentLevel).includes(q) ||
                    this.normalizeText(t.xpToNextLevel).includes(q) ||
                    this.normalizeText(t.currentStreak).includes(q) ||
                    this.normalizeText(t.longestStreak).includes(q) ||
                    this.normalizeText(t.lastActivityDate).includes(q),
                (t, key) => {
                    if (key === "user") return this.userLabelByKeycloakId(t.userId);
                    return (t as any)[key];
                },
            );
        } else if (this.trainingView === "activities") {
            this.visibleActivities = this.applyTrainingTable<DailyActivityResponse>(
                this.adminActivities,
                (a, q) =>
                    this.normalizeText(this.userLabelByKeycloakId(a.userId)).includes(q) ||
                    this.normalizeText(this.userEmailByKeycloakId(a.userId)).includes(q) ||
                    this.normalizeText(a.activityDate).includes(q) ||
                    this.normalizeText(a.xpEarned).includes(q) ||
                    this.normalizeText(a.sessionCompleted ? "true" : "false").includes(q) ||
                    this.normalizeText(a.goalsCompleted).includes(q) ||
                    this.normalizeText(a.behavioralCount).includes(q) ||
                    this.normalizeText(a.libraryCount).includes(q) ||
                    this.normalizeText(a.quizCount).includes(q),
                (a, key) => {
                    if (key === "user") return this.userLabelByKeycloakId(a.userId);
                    return (a as any)[key];
                },
            );
        } else {
            this.visibleUserBadges = this.applyTrainingTable<UserBadgeResponse>(
                this.adminUserBadges,
                (ub, q) =>
                    this.normalizeText(this.userLabelByKeycloakId(ub.userId)).includes(q) ||
                    this.normalizeText(this.userEmailByKeycloakId(ub.userId)).includes(q) ||
                    this.normalizeText(this.badgeLabelById(ub.badgeId)).includes(q) ||
                    this.normalizeText(ub.progress).includes(q) ||
                    this.normalizeText(ub.earnedDate).includes(q),
                (ub, key) => {
                    if (key === "user") return this.userLabelByKeycloakId(ub.userId);
                    if (key === "badge") return this.badgeLabelById(ub.badgeId);
                    return (ub as any)[key];
                },
            );
        }

        this.cdr.markForCheck();
    }

    // ── Users ─────────────────────────────────────────────────────────────────
    loadUsers(): void {
        this.loading = true;
        const api = environment.apiUrl;
        let url = "";
        if (this.searchQuery.trim()) {
            url = `${api}/api/users/search?query=${encodeURIComponent(this.searchQuery)}&page=${this.currentPage}&size=10`;
        } else if (this.statusFilter === "DELETED") {
            url = `${api}/api/users/deleted?page=${this.currentPage}&size=10`;
        } else if (this.statusFilter) {
            url = `${api}/api/users/by-status?status=${this.statusFilter}&page=${this.currentPage}&size=10`;
        } else if (this.roleFilter) {
            url = `${api}/api/users/by-role?role=${this.roleFilter}&page=${this.currentPage}&size=10`;
        } else {
            url = `${api}/api/users?page=${this.currentPage}&size=10`;
        }
        this.http.get<any>(url).subscribe({
            next: (res: any) => {
                this.users = [...res.content];
                this.intUserList = [...res.content];
                this.totalPages = res.totalPages || 1;
                this.loading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.loading = false;
                this.cdr.markForCheck();
            },
        });
    }

    loadStats(): void {
        this.http
            .get<any>(`${environment.apiUrl}/api/users?size=1000`)
            .subscribe({
                next: (res: any) => {
                    const users: any[] = res.content || [];
                    this.stats.total = res.totalElements || users.length;
                    this.stats.active = users.filter(
                        (u: any) => u.status === "ACTIVE",
                    ).length;
                    this.stats.pending = users.filter(
                        (u: any) => u.status === "PENDING_VERIFICATION",
                    ).length;
                    this.stats.suspended = users.filter(
                        (u: any) => u.status === "SUSPENDED",
                    ).length;
                    this.cdr.markForCheck();
                },
            });
    }

    onSearch(): void {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.currentPage = 0;
            this.loadUsers();
        }, 400);
    }

    goToPage(page: number): void {
        this.currentPage = page;
        this.loadUsers();
    }
    openDetail(user: UserItem): void {
        this.selectedUser = { ...user };
    }
    closeDetail(): void {
        this.selectedUser = null;
    }

    verifyUser(user: UserItem): void {
        this.http
            .patch(`${environment.apiUrl}/api/users/${user.id}/verify`, {})
            .subscribe({
                next: () => {
                    user.isVerified = true;
                    user.status = "ACTIVE";
                    this.loadStats();
                    this.cdr.markForCheck();
                },
            });
    }

    changeRole(user: UserItem, event: Event): void {
        const role = (event.target as HTMLSelectElement).value;
        this.http
            .patch(
                `${environment.apiUrl}/api/users/${user.id}/role?role=${role}`,
                {},
            )
            .subscribe({
                next: () => {
                    user.role = role;
                    this.cdr.markForCheck();
                },
            });
    }

    updateStatus(user: UserItem, status: string): void {
        this.http
            .patch(
                `${environment.apiUrl}/api/users/${user.id}/status?status=${status}`,
                {},
            )
            .subscribe({
                next: () => {
                    user.status = status;
                    this.loadStats();
                    this.cdr.markForCheck();
                },
            });
    }

    deleteUser(user: UserItem): void {
        this.openConfirm({
            title: "Delete user",
            message: `Delete ${user.firstName} ${user.lastName}? This cannot be undone.`,
            confirmText: "Delete",
            cancelText: "Cancel",
            danger: true,
            onConfirm: () => {
                this.http
                    .delete(`${environment.apiUrl}/api/users/${user.id}`)
                    .subscribe({
                        next: () => {
                            this.users = this.users.filter(
                                (u) => u.id !== user.id,
                            );
                            this.loadStats();
                            this.cdr.markForCheck();
                        },
                    });
            },
        });
    }

    restoreUser(user: UserItem): void {
        this.http
            .patch(`${environment.apiUrl}/api/users/${user.id}/restore`, {})
            .subscribe({
                next: () => {
                    this.loadUsers();
                    this.loadStats();
                },
            });
    }

    // ── Interviews tab ────────────────────────────────────────────────────────
    onIntUserSearch(): void {
        clearTimeout(this.intUserSearchTimeout);
        this.intUserSearchTimeout = setTimeout(() => {
            const q = this.intUserSearch.trim().toLowerCase();
            this.intUserList = q
                ? this.users.filter((u) =>
                      `${u.firstName} ${u.lastName} ${u.email}`
                          .toLowerCase()
                          .includes(q),
                  )
                : [...this.users];
            this.cdr.markForCheck();
        }, 300);
    }

    viewUserInterviews(user: UserItem): void {
        this.selectedInterviewUser = user;
        this.activeTab = "interviews";
        this.intSessions = [];
        this.intReport = null;
        this.intReportError = null;
        this.selectedIntSession = null;
        this.showUserProgress = false;
        this.userProgress = null;
        this.intSessionsLoading = true;

        this.interviewApi.adminGetSessionsByUser(user.id).subscribe({
            next: (sessions) => {
                this.intSessions = sessions;
                this.intSessionsLoading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.intSessionsLoading = false;
                this.cdr.markForCheck();
            },
        });
    }

    clearInterviewUser(): void {
        this.selectedInterviewUser = null;
        this.intSessions = [];
        this.intReport = null;
        this.selectedIntSession = null;
        this.showUserProgress = false;
        this.userProgress = null;
    }

    selectIntSession(s: InterviewSessionResponse): void {
        this.selectedIntSession = s;
        this.intReport = null;
        this.intReportError = null;
    }

    /** Toggle progress panel — loads data on first open */
    toggleProgress(): void {
        if (!this.showUserProgress) {
            this.showUserProgress = true;
            if (!this.userProgress && this.selectedInterviewUser) {
                this.loadUserProgress(this.selectedInterviewUser.id);
            }
        } else {
            this.showUserProgress = false;
        }
    }

    loadLessons(): void {
        this.setTrainingBusy(true, null);
        this.http.get<TrainingLessonResponse[]>(`${this.trainingAdminBase()}/lessons`)
            .pipe(finalize(() => this.setTrainingBusy(false, null)))
            .subscribe({
            next: (res) => {
                this.adminLessons = res || [];
                try { this.refreshTrainingTable(); } catch (e) { console.error('refreshTrainingTable error:', e); }
            },
            error: (err) => {
                this.trainingError = this.formatTrainingError(err);
                this.cdr.markForCheck();
            },
        });
    }

    generateMissingLessonDrafts(): void {
        this.trainingError = null;

        const cat = this.aiLessonGenForm.category;
        const lang = this.aiLessonGenForm.language;
        const target = Number(this.aiLessonGenForm.targetActiveCount ?? 0);
        const maxGenerate = Number(this.aiLessonGenForm.maxGenerate ?? 0);
        const difficulty = (this.aiLessonGenForm.difficulty || "").trim();

        if (!cat || !lang || !target || target < 0) {
            this.trainingError = "Please set category, language and a valid target active count.";
            this.cdr.markForCheck();
            return;
        }

        if (!Number.isFinite(maxGenerate) || maxGenerate <= 0) {
            this.trainingError = "Please set a positive 'Max generate' (e.g. 3, 5, 10).";
            this.cdr.markForCheck();
            return;
        }

        const payload: any = {
            category: cat,
            language: lang,
            targetActiveCount: target,
            maxGenerate: Math.max(1, Math.floor(maxGenerate)),
            difficulty: difficulty ? difficulty : null,
        };

        this.openConfirm({
            title: "Generate draft lessons",
            message: `Generate missing draft lessons (INACTIVE) for ${cat} / ${lang} up to ${target} active lessons?\n\nNew lessons will be created as INACTIVE and must be reviewed + activated by an admin.`,
            confirmText: "Generate",
            cancelText: "Cancel",
            onConfirm: () => {
                this.aiGenerating = true;
                this.aiGeneratingMsg = `Generating lessons with Ollama… this may take several minutes.`;
                this.trainingError = null;
                this.cdr.markForCheck();
                this.http
                    .post<GenerateMissingLessonsResponse>(
                        `${this.trainingAdminBase()}/lessons/generate-missing`,
                        payload,
                    )
                    .pipe(finalize(() => { this.aiGenerating = false; this.aiGeneratingMsg = ''; this.cdr.markForCheck(); }))
                    .subscribe({
                        next: (res) => {
                            this.loadLessons();
                            const generated = res?.generatedCount ?? 0;
                            const existingActive = res?.existingActiveCount ?? 0;
                            const missing = res?.missingCount ?? 0;
                            const targetCount = res?.targetActiveCount ?? target;
                            this.showNotice(
                                "success",
                                `Generated ${generated} draft lessons (INACTIVE).\n\nExisting ACTIVE: ${existingActive}\nTarget ACTIVE: ${targetCount}\nMissing: ${missing}\n\nReview them in the Lessons list (INACTIVE).`,
                            );
                        },
                        error: (err) => {
                            this.trainingError = this.formatTrainingError(err);
                            this.cdr.markForCheck();
                        },
                    });
            },
        });
    }

    editLesson(l: TrainingLessonResponse): void {
        this.editingLessonId = l.id;
        this.lessonForm = {
            category: String(l.category || "COMMUNICATION"),
            title: l.title || "",
            format: (l.format as any) === "VIDEO" ? "VIDEO" : "TEXT",
            summary: (l.summary as any) || "",
            contentMarkdown: (l.contentMarkdown as any) || "",
            videoUrl: (l.videoUrl as any) || "",
            estimatedMinutes: Number(l.estimatedMinutes ?? 5),
            difficulty: String(l.difficulty || "BEGINNER"),
            language: (l.language as any) || "en",
            active: Boolean((l as any).active ?? true),
            tagsCsv: (l.tags || []).join(", "),
        };
        this.cdr.markForCheck();
    }

    resetLessonForm(): void {
        this.editingLessonId = null;
        this.lessonForm = {
            category: "COMMUNICATION",
            title: "",
            format: "TEXT",
            summary: "",
            contentMarkdown: "",
            videoUrl: "",
            estimatedMinutes: 5,
            difficulty: "BEGINNER",
            language: "en",
            active: true,
            tagsCsv: "",
        };
        this.cdr.markForCheck();
    }

    private parseTagsCsv(csv: string): string[] {
        return String(csv || "")
            .split(",")
            .map((t) => t.trim())
            .filter((t) => !!t);
    }

    saveLesson(): void {
        this.trainingError = null;

        const payload: any = {
            category: this.lessonForm.category,
            title: this.lessonForm.title?.trim(),
            format: this.lessonForm.format,
            summary: this.lessonForm.summary?.trim() || null,
            contentMarkdown: this.lessonForm.format === "TEXT" ? (this.lessonForm.contentMarkdown || "") : null,
            videoUrl: this.lessonForm.format === "VIDEO" ? (this.lessonForm.videoUrl || "") : null,
            estimatedMinutes: Number(this.lessonForm.estimatedMinutes ?? 5),
            difficulty: this.lessonForm.difficulty,
            language: this.lessonForm.language?.trim() || "en",
            active: Boolean(this.lessonForm.active),
            tags: this.parseTagsCsv(this.lessonForm.tagsCsv),
        };

        const url = this.editingLessonId
            ? `${this.trainingAdminBase()}/lessons/${this.editingLessonId}`
            : `${this.trainingAdminBase()}/lessons`;

        const req = this.editingLessonId
            ? this.http.put<TrainingLessonResponse>(url, payload)
            : this.http.post<TrainingLessonResponse>(url, payload);

        req.subscribe({
            next: () => {
                this.resetLessonForm();
                this.loadLessons();
            },
            error: (err) => {
                this.trainingError = this.formatTrainingError(err);
                this.cdr.markForCheck();
            },
        });
    }

    deleteLesson(l: TrainingLessonResponse): void {
        if (!l?.id) return;
        this.openConfirm({
            title: "Disable lesson",
            message: `Disable lesson "${l.title}"?`,
            confirmText: "Disable",
            cancelText: "Cancel",
            danger: true,
            onConfirm: () => {
                this.trainingError = null;
                this.http
                    .delete(`${this.trainingAdminBase()}/lessons/${l.id}`)
                    .subscribe({
                        next: () => {
                            this.loadLessons();
                        },
                        error: (err) => {
                            this.trainingError = this.formatTrainingError(err);
                            this.cdr.markForCheck();
                        },
                    });
            },
        });
    }

    loadIntReport(s: InterviewSessionResponse): void {
        this.intReportLoading = true;
        this.intReport = null;
        this.intReportError = null;
        this.interviewApi.adminGetReport(s.id).subscribe({
            next: (report) => {
                this.intReport = { ...report, sessionId: s.id };
                this.intReportLoading = false;
                this.cdr.markForCheck();
            },
            error: (err) => {
                this.intReportError =
                    err.status === 404
                        ? "No report found — session may not be completed yet."
                        : "Failed to load report.";
                this.intReportLoading = false;
                this.cdr.markForCheck();
            },
        });
    }

    adminDeleteSession(s: InterviewSessionResponse): void {
        this.openConfirm({
            title: "Delete interview session",
            message: `Delete session #${s.id}? This will remove the session, all responses, and the report permanently.`,
            confirmText: "Delete",
            cancelText: "Cancel",
            danger: true,
            onConfirm: () => {
                this.interviewApi.adminDeleteSession(s.id).subscribe({
                    next: () => {
                        this.intSessions = this.intSessions.filter(
                            (x) => x.id !== s.id,
                        );
                        if (this.selectedIntSession?.id === s.id)
                            this.selectedIntSession = null;
                        if ((this.intReport as any)?.sessionId === s.id)
                            this.intReport = null;
                        this.cdr.markForCheck();
                    },
                    error: () => {
                        this.intReportError = "Failed to delete session.";
                        this.cdr.markForCheck();
                    },
                });
            },
        });
    }

    // ── Training tab (admin) ────────────────────────────────────────────────
    private trainingAdminBase(): string {
        return `${environment.trainingApiUrl}/api/v1/admin/training`;
    }

    private setTrainingBusy(busy: boolean, error: string | null = null): void {
        this.trainingLoading = busy;
        this.trainingError = error;
        this.cdr.markForCheck();
    }

    private fetchPathsForLookup(): void {
        if (this.adminPaths.length) return;
        this.http
            .get<TrainingPathResponse[]>(`${this.trainingAdminBase()}/paths`)
            .subscribe({
                next: (res) => {
                    this.adminPaths = res || [];
                    this.trainingPathById = new Map(
                        (this.adminPaths || []).map((p) => [Number(p.id), p] as const),
                    );
                    this.cdr.markForCheck();
                },
                error: () => {
                    // best-effort: module/user-badge views can still load without path labels
                },
            });
    }

    private fetchBadgesForLookup(): void {
        if (this.adminBadges.length) return;
        this.http
            .get<BadgeResponse[]>(`${this.trainingAdminBase()}/badges`)
            .subscribe({
                next: (res) => {
                    this.adminBadges = res || [];
                    this.trainingBadgeById = new Map(
                        (this.adminBadges || []).map((b) => [Number(b.id), b] as const),
                    );
                    this.cdr.markForCheck();
                },
                error: () => {
                    // best-effort
                },
            });
    }

    loadBadges(): void {
        this.ensureTrainingIdentitiesLoaded();
        this.setTrainingBusy(true, null);
        this.http.get<BadgeResponse[]>(`${this.trainingAdminBase()}/badges`).subscribe({
            next: (res) => {
                this.adminBadges = res || [];
                this.trainingBadgeById = new Map(
                    (this.adminBadges || []).map((b) => [Number(b.id), b] as const),
                );
                this.refreshTrainingTable();
                this.setTrainingBusy(false, null);
            },
            error: (err) => {
                this.setTrainingBusy(false, this.formatTrainingError(err));
            },
        });
    }

    editBadge(b: BadgeResponse): void {
        this.editingBadgeId = b.id;
        this.badgeForm = {
            name: b.name || "",
            description: b.description || "",
            icon: b.icon || "",
            category: String(b.category || "SIMULATION"),
            xpReward: Number(b.xpReward ?? 0),
            criteriaJson: (b.criteriaJson as any) || "",
            isActive: Boolean((b as any).isActive ?? true),
        };
        this.cdr.markForCheck();
    }

    resetBadgeForm(): void {
        this.editingBadgeId = null;
        this.badgeForm = {
            name: "",
            description: "",
            icon: "",
            category: "SIMULATION",
            xpReward: 0,
            criteriaJson: "",
            isActive: true,
        };
        this.cdr.markForCheck();
    }

    saveBadge(): void {
        this.trainingError = null;
        const payload = {
            name: this.badgeForm.name?.trim(),
            description: this.badgeForm.description?.trim() || null,
            icon: this.badgeForm.icon?.trim() || null,
            category: this.badgeForm.category,
            xpReward: Number(this.badgeForm.xpReward ?? 0),
            criteriaJson: this.badgeForm.criteriaJson?.trim() || null,
            isActive: Boolean(this.badgeForm.isActive),
        };

        const req$ = this.editingBadgeId
            ? this.http.put<BadgeResponse>(
                  `${this.trainingAdminBase()}/badges/${this.editingBadgeId}`,
                  payload,
              )
            : this.http.post<BadgeResponse>(
                  `${this.trainingAdminBase()}/badges`,
                  payload,
              );

        this.setTrainingBusy(true, null);
        req$.subscribe({
            next: () => {
                this.resetBadgeForm();
                this.loadBadges();
            },
            error: (err) => {
                this.setTrainingBusy(false, this.formatTrainingError(err));
            },
        });
    }

    deleteBadge(b: BadgeResponse): void {
        this.openConfirm({
            title: "Delete badge",
            message: `Delete badge "${b.name}"?`,
            confirmText: "Delete",
            cancelText: "Cancel",
            danger: true,
            onConfirm: () => {
                this.setTrainingBusy(true, null);
                this.http
                    .delete(`${this.trainingAdminBase()}/badges/${b.id}`)
                    .subscribe({
                        next: () => this.loadBadges(),
                        error: (err) => {
                            this.setTrainingBusy(
                                false,
                                this.formatTrainingError(err),
                            );
                        },
                    });
            },
        });
    }

    loadPaths(): void {
        this.ensureTrainingIdentitiesLoaded();
        this.setTrainingBusy(true, null);
        this.http
            .get<TrainingPathResponse[]>(`${this.trainingAdminBase()}/paths`)
            .subscribe({
                next: (res) => {
                    this.adminPaths = res || [];
                    this.trainingPathById = new Map(
                        (this.adminPaths || []).map((p) => [Number(p.id), p] as const),
                    );
                    this.refreshTrainingTable();
                    this.setTrainingBusy(false, null);
                },
                error: (err) => {
                    this.setTrainingBusy(false, this.formatTrainingError(err));
                },
            });
    }

    editPath(p: TrainingPathResponse): void {
        this.editingPathId = p.id;
        this.pathForm = {
            userId: p.userId || "",
            status: String(p.status || "ACTIVE"),
            xpThreshold: Number(p.xpThreshold ?? 0),
        };
        this.cdr.markForCheck();
    }

    resetPathForm(): void {
        this.editingPathId = null;
        this.pathForm = { userId: "", status: "ACTIVE", xpThreshold: 200 };
        this.cdr.markForCheck();
    }

    savePath(): void {
        const payload = {
            userId: this.pathForm.userId?.trim(),
            status: this.pathForm.status,
            xpThreshold: Number(this.pathForm.xpThreshold ?? 0),
        };

        const req$ = this.editingPathId
            ? this.http.put<TrainingPathResponse>(
                  `${this.trainingAdminBase()}/paths/${this.editingPathId}`,
                  payload,
              )
            : this.http.post<TrainingPathResponse>(
                  `${this.trainingAdminBase()}/paths`,
                  payload,
              );

        this.setTrainingBusy(true, null);
        req$.subscribe({
            next: () => {
                this.resetPathForm();
                this.loadPaths();
            },
            error: (err) => {
                this.setTrainingBusy(false, this.formatTrainingError(err));
            },
        });
    }

    deletePath(p: TrainingPathResponse): void {
        this.openConfirm({
            title: "Delete path",
            message: `Delete path for ${this.userLabelByKeycloakId(p.userId)}?`,
            confirmText: "Delete",
            cancelText: "Cancel",
            danger: true,
            onConfirm: () => {
                this.setTrainingBusy(true, null);
                this.http
                    .delete(`${this.trainingAdminBase()}/paths/${p.id}`)
                    .subscribe({
                        next: () => this.loadPaths(),
                        error: (err) => {
                            this.setTrainingBusy(
                                false,
                                this.formatTrainingError(err),
                            );
                        },
                    });
            },
        });
    }

    loadModules(): void {
        this.ensureTrainingIdentitiesLoaded();
        this.fetchPathsForLookup();
        this.setTrainingBusy(true, null);
        this.http
            .get<TrainingModuleResponse[]>(`${this.trainingAdminBase()}/modules`)
            .subscribe({
                next: (res) => {
                    this.adminModules = res || [];
                    this.refreshTrainingTable();
                    this.setTrainingBusy(false, null);
                },
                error: (err) => {
                    this.setTrainingBusy(false, this.formatTrainingError(err));
                },
            });
    }

    editModule(m: TrainingModuleResponse): void {
        this.editingModuleId = m.id;
        this.moduleForm = {
            pathId: Number(m.pathId ?? 0),
            category: String(m.category || "COMMUNICATION"),
            title: m.title || "",
            description: (m as any).description || "",
            lessons: Number(m.lessons ?? 1),
            completedLessons: Number(m.completedLessons ?? 0),
            progress: Number.isFinite(m.progress as any)
                ? Number(m.progress)
                : null,
            xpReward: Number(m.xpReward ?? 0),
            status: String(m.status || "LOCKED"),
            unlockedAt: (m.unlockedAt as any) || "",
        };
        this.cdr.markForCheck();
    }

    resetModuleForm(): void {
        this.editingModuleId = null;
        this.moduleForm = {
            pathId: null,
            category: "COMMUNICATION",
            title: "",
            description: "",
            lessons: 1,
            completedLessons: 0,
            progress: null,
            xpReward: 0,
            status: "LOCKED",
            unlockedAt: "",
        };
        this.cdr.markForCheck();
    }

    saveModule(): void {
        const pathId = Number(this.moduleForm.pathId);
        if (!Number.isFinite(pathId) || pathId <= 0) {
            this.trainingError = "Path is required for modules.";
            this.cdr.markForCheck();
            return;
        }

        const progressValue =
            this.moduleForm.progress === null || this.moduleForm.progress === ("" as any)
                ? null
                : Number(this.moduleForm.progress);

        const payload: any = {
            pathId,
            category: this.moduleForm.category,
            title: this.moduleForm.title?.trim(),
            description: this.moduleForm.description?.trim() || null,
            lessons: Number(this.moduleForm.lessons ?? 1),
            completedLessons: Number(this.moduleForm.completedLessons ?? 0),
            progress: progressValue,
            xpReward: Number(this.moduleForm.xpReward ?? 0),
            status: this.moduleForm.status,
            unlockedAt: this.moduleForm.unlockedAt?.trim() || null,
        };

        const req$ = this.editingModuleId
            ? this.http.put<TrainingModuleResponse>(
                  `${this.trainingAdminBase()}/modules/${this.editingModuleId}`,
                  payload,
              )
            : this.http.post<TrainingModuleResponse>(
                  `${this.trainingAdminBase()}/modules`,
                  payload,
              );

        this.setTrainingBusy(true, null);
        req$.subscribe({
            next: () => {
                this.resetModuleForm();
                this.loadModules();
            },
            error: (err) => {
                this.setTrainingBusy(false, this.formatTrainingError(err));
            },
        });
    }

    deleteModule(m: TrainingModuleResponse): void {
        this.openConfirm({
            title: "Delete module",
            message: `Delete module "${m.title}"?`,
            confirmText: "Delete",
            cancelText: "Cancel",
            danger: true,
            onConfirm: () => {
                this.setTrainingBusy(true, null);
                this.http
                    .delete(`${this.trainingAdminBase()}/modules/${m.id}`)
                    .subscribe({
                        next: () => this.loadModules(),
                        error: (err) => {
                            this.setTrainingBusy(
                                false,
                                this.formatTrainingError(err),
                            );
                        },
                    });
            },
        });
    }

    loadTrackers(): void {
        this.ensureTrainingIdentitiesLoaded();
        this.setTrainingBusy(true, null);
        this.http
            .get<UserXPTrackerResponse[]>(
                `${this.trainingAdminBase()}/xp-trackers`,
            )
            .subscribe({
                next: (res) => {
                    this.adminTrackers = res || [];
                    this.refreshTrainingTable();
                    this.setTrainingBusy(false, null);
                },
                error: (err) => {
                    this.setTrainingBusy(false, this.formatTrainingError(err));
                },
            });
    }

    editTracker(t: UserXPTrackerResponse): void {
        this.editingTrackerId = t.id;
        this.trackerForm = {
            userId: t.userId || "",
            totalXp: Number(t.totalXp ?? 0),
            currentLevel: Number(t.currentLevel ?? 1),
            xpToNextLevel: Number(t.xpToNextLevel ?? 0),
            currentStreak: Number(t.currentStreak ?? 0),
            longestStreak: Number(t.longestStreak ?? 0),
            lastActivityDate: (t.lastActivityDate as any) || "",
        };
        this.cdr.markForCheck();
    }

    resetTrackerForm(): void {
        this.editingTrackerId = null;
        this.trackerForm = {
            userId: "",
            totalXp: 0,
            currentLevel: 1,
            xpToNextLevel: 0,
            currentStreak: 0,
            longestStreak: 0,
            lastActivityDate: "",
        };
        this.cdr.markForCheck();
    }

    saveTracker(): void {
        const payload: any = {
            userId: this.trackerForm.userId?.trim(),
            totalXp: Number(this.trackerForm.totalXp ?? 0),
            currentLevel: Number(this.trackerForm.currentLevel ?? 1),
            xpToNextLevel: Number(this.trackerForm.xpToNextLevel ?? 0),
            currentStreak: Number(this.trackerForm.currentStreak ?? 0),
            longestStreak: Number(this.trackerForm.longestStreak ?? 0),
            lastActivityDate: this.trackerForm.lastActivityDate?.trim() || null,
        };

        const req$ = this.editingTrackerId
            ? this.http.put<UserXPTrackerResponse>(
                  `${this.trainingAdminBase()}/xp-trackers/${this.editingTrackerId}`,
                  payload,
              )
            : this.http.post<UserXPTrackerResponse>(
                  `${this.trainingAdminBase()}/xp-trackers`,
                  payload,
              );

        this.setTrainingBusy(true, null);
        req$.subscribe({
            next: () => {
                this.resetTrackerForm();
                this.loadTrackers();
            },
            error: (err) => {
                this.setTrainingBusy(false, this.formatTrainingError(err));
            },
        });
    }

    deleteTracker(t: UserXPTrackerResponse): void {
        this.openConfirm({
            title: "Delete XP tracker",
            message: `Delete tracker for ${this.userLabelByKeycloakId(t.userId)}?`,
            confirmText: "Delete",
            cancelText: "Cancel",
            danger: true,
            onConfirm: () => {
                this.setTrainingBusy(true, null);
                this.http
                    .delete(`${this.trainingAdminBase()}/xp-trackers/${t.id}`)
                    .subscribe({
                        next: () => this.loadTrackers(),
                        error: (err) => {
                            this.setTrainingBusy(
                                false,
                                this.formatTrainingError(err),
                            );
                        },
                    });
            },
        });
    }

    loadActivities(): void {
        this.ensureTrainingIdentitiesLoaded();
        this.setTrainingBusy(true, null);
        this.http
            .get<DailyActivityResponse[]>(
                `${this.trainingAdminBase()}/activities`,
            )
            .subscribe({
                next: (res) => {
                    this.adminActivities = res || [];
                    this.refreshTrainingTable();
                    this.setTrainingBusy(false, null);
                },
                error: (err) => {
                    this.setTrainingBusy(false, this.formatTrainingError(err));
                },
            });
    }

    editActivity(a: DailyActivityResponse): void {
        this.editingActivityId = (a.id as any) ?? null;
        this.activityForm = {
            userId: a.userId || "",
            activityDate: (a.activityDate as any) || "",
            xpEarned: Number(a.xpEarned ?? 0),
            sessionCompleted: Boolean(a.sessionCompleted),
            goalsCompleted: Number(a.goalsCompleted ?? 0),
            behavioralCount: Number(a.behavioralCount ?? 0),
            libraryCount: Number(a.libraryCount ?? 0),
            quizCount: Number(a.quizCount ?? 0),
        };
        this.cdr.markForCheck();
    }

    resetActivityForm(): void {
        this.editingActivityId = null;
        this.activityForm = {
            userId: "",
            activityDate: "",
            xpEarned: 0,
            sessionCompleted: false,
            goalsCompleted: 0,
            behavioralCount: 0,
            libraryCount: 0,
            quizCount: 0,
        };
        this.cdr.markForCheck();
    }

    saveActivity(): void {
        const payload: any = {
            userId: this.activityForm.userId?.trim(),
            activityDate: this.activityForm.activityDate?.trim(),
            xpEarned: Number(this.activityForm.xpEarned ?? 0),
            sessionCompleted: Boolean(this.activityForm.sessionCompleted),
            goalsCompleted: Number(this.activityForm.goalsCompleted ?? 0),
            behavioralCount: Number(this.activityForm.behavioralCount ?? 0),
            libraryCount: Number(this.activityForm.libraryCount ?? 0),
            quizCount: Number(this.activityForm.quizCount ?? 0),
        };

        const req$ = this.editingActivityId
            ? this.http.put<DailyActivityResponse>(
                  `${this.trainingAdminBase()}/activities/${this.editingActivityId}`,
                  payload,
              )
            : this.http.post<DailyActivityResponse>(
                  `${this.trainingAdminBase()}/activities`,
                  payload,
              );

        this.setTrainingBusy(true, null);
        req$.subscribe({
            next: () => {
                this.resetActivityForm();
                this.loadActivities();
            },
            error: (err) => {
                this.setTrainingBusy(false, this.formatTrainingError(err));
            },
        });
    }

    deleteActivity(a: DailyActivityResponse): void {
        const id = (a.id as any) ?? null;
        if (!id) {
            this.trainingError = "Cannot delete an activity (missing identifier).";
            this.cdr.markForCheck();
            return;
        }
        this.openConfirm({
            title: "Delete activity",
            message: `Delete activity for ${this.userLabelByKeycloakId(a.userId)} (${a.activityDate})?`,
            confirmText: "Delete",
            cancelText: "Cancel",
            danger: true,
            onConfirm: () => {
                this.setTrainingBusy(true, null);
                this.http
                    .delete(`${this.trainingAdminBase()}/activities/${id}`)
                    .subscribe({
                        next: () => this.loadActivities(),
                        error: (err) => {
                            this.setTrainingBusy(
                                false,
                                this.formatTrainingError(err),
                            );
                        },
                    });
            },
        });
    }

    loadUserBadges(): void {
        this.ensureTrainingIdentitiesLoaded();
        this.fetchBadgesForLookup();
        this.setTrainingBusy(true, null);
        this.http
            .get<UserBadgeResponse[]>(
                `${this.trainingAdminBase()}/user-badges`,
            )
            .subscribe({
                next: (res) => {
                    this.adminUserBadges = res || [];
                    this.refreshTrainingTable();
                    this.setTrainingBusy(false, null);
                },
                error: (err) => {
                    this.setTrainingBusy(false, this.formatTrainingError(err));
                },
            });
    }

    editUserBadge(ub: UserBadgeResponse): void {
        this.editingUserBadgeId = ub.id;
        this.userBadgeForm = {
            userId: ub.userId || "",
            badgeId: Number(ub.badgeId ?? 0),
            progress:
                ub.progress === null || ub.progress === undefined
                    ? null
                    : Number(ub.progress),
        };
        this.cdr.markForCheck();
    }

    resetUserBadgeForm(): void {
        this.editingUserBadgeId = null;
        this.userBadgeForm = { userId: "", badgeId: null, progress: null };
        this.cdr.markForCheck();
    }

    saveUserBadge(): void {
        const badgeId = Number(this.userBadgeForm.badgeId);
        if (!Number.isFinite(badgeId) || badgeId <= 0) {
            this.trainingError = "Badge is required for user badges.";
            this.cdr.markForCheck();
            return;
        }

        const payload: any = {
            userId: this.userBadgeForm.userId?.trim(),
            badgeId,
            progress:
                this.userBadgeForm.progress === null ||
                this.userBadgeForm.progress === ("" as any)
                    ? null
                    : Number(this.userBadgeForm.progress),
        };

        const req$ = this.editingUserBadgeId
            ? this.http.put<UserBadgeResponse>(
                  `${this.trainingAdminBase()}/user-badges/${this.editingUserBadgeId}`,
                  payload,
              )
            : this.http.post<UserBadgeResponse>(
                  `${this.trainingAdminBase()}/user-badges`,
                  payload,
              );

        this.setTrainingBusy(true, null);
        req$.subscribe({
            next: () => {
                this.resetUserBadgeForm();
                this.loadUserBadges();
            },
            error: (err) => {
                this.setTrainingBusy(false, this.formatTrainingError(err));
            },
        });
    }

    deleteUserBadge(ub: UserBadgeResponse): void {
        this.openConfirm({
            title: "Delete user badge",
            message: `Delete user badge for ${this.userLabelByKeycloakId(ub.userId)} (${this.badgeLabelById(ub.badgeId)})?`,
            confirmText: "Delete",
            cancelText: "Cancel",
            danger: true,
            onConfirm: () => {
                this.setTrainingBusy(true, null);
                this.http
                    .delete(`${this.trainingAdminBase()}/user-badges/${ub.id}`)
                    .subscribe({
                        next: () => this.loadUserBadges(),
                        error: (err) => {
                            this.setTrainingBusy(
                                false,
                                this.formatTrainingError(err),
                            );
                        },
                    });
            },
        });
    }

    private formatTrainingError(err: any): string {
        const status = err?.status;
        if (status === 401) return "Unauthorized (login required).";
        if (status === 403) return "Forbidden (ADMIN role required).";
        if (status === 0) return "Network error (service unreachable).";

        const msg =
            err?.error?.message ||
            err?.error?.error ||
            err?.message ||
            "Request failed.";
        return status ? `HTTP ${status}: ${msg}` : msg;
    }

    loadUserProgress(userId: string): void {
        this.userProgressLoading = true;
        this.userProgress = null;
        this.interviewApi.adminGetProgress(userId).subscribe({
            next: (p) => {
                this.userProgress = p;
                this.userProgressLoading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.userProgressLoading = false;
                this.cdr.markForCheck();
            },
        });
    }

    // ── Utils ─────────────────────────────────────────────────────────────────
    getInitials(user: UserItem): string {
        return (
            (user.firstName?.[0] || "") + (user.lastName?.[0] || "")
        ).toUpperCase();
    }
    formatStatus(status: string): string {
        return (
            (
                {
                    ACTIVE: "Active",
                    PENDING_VERIFICATION: "Pending",
                    SUSPENDED: "Suspended",
                    DELETED: "Deleted",
                } as any
            )[status] || status
        );
    }
    getStatusClass(status: string): string {
        return (
            (
                {
                    ACTIVE: "badge-active",
                    PENDING_VERIFICATION: "badge-pending",
                    SUSPENDED: "badge-suspended",
                    DELETED: "badge-deleted",
                } as any
            )[status] || "badge-pending"
        );
    }
    statusChip(status: string): string {
        return (
            (
                {
                    IN_PROGRESS: "status-in-progress",
                    PAUSED: "status-paused",
                    COMPLETED: "status-completed",
                    CANCELLED: "status-cancelled",
                } as any
            )[status] || ""
        );
    }
    industryLabel(industry: string): string {
        return (
            (
                {
                    IT_TECH: "IT/Tech",
                    FINANCE: "Finance",
                    HEALTH: "Health",
                    ENGINEERING: "Engineering",
                    CONSULTING: "Consulting",
                    SALES_MARKETING: "Sales & Mktg",
                } as any
            )[industry] || industry
        );
    }
}