import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, catchError, forkJoin, of } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { SectionHeaderComponent } from '../../../shared/components/section-header/section-header.component';
import { MentorshipApiService } from '../../../core/services/mentorship-api.service';
import { MentorRequest, MentorSession } from '../../../core/models/models';
import { UserApiService, UserProfile } from '../../../core/services/user-api.service';

type RequestStatus = MentorRequest['status'];
type SessionStatus = MentorSession['status'];
type SessionGroup = {
	requestId: string;
	menteeLabel: string;
	mentorLabel: string;
	allSessions: MentorSession[];
	visibleSessions: MentorSession[];
	latestScheduledAt: string | null;
	totalCounts: Record<SessionStatus, number>;
};

@Component({
	selector: 'app-admin-mentorship-view',
	standalone: true,
	imports: [CommonModule, SectionHeaderComponent],
	template: `
		<div class="mentorship-page animate-fade">

			<!-- Header -->
			<div class="page-header">
				<div>
					<h1>Mentorship</h1>
					<p>Admin dashboard to monitor mentorship requests and sessions.</p>
				</div>
				<div class="mentor-page-stats">
					<span class="chip chip-purple"><i class="bi bi-shield-lock-fill"></i> Admin Dashboard</span>
				</div>
			</div>

			<!-- Messages -->
			<div class="card error-card" *ngIf="errorMessage()">⚠️ {{ errorMessage() }}</div>

			<!-- Loading -->
			<div class="card" *ngIf="loading()">Loading mentorship data...</div>

			<!-- Stats -->
			<div class="admin-mentorship-stats" *ngIf="!loading()">
				<div class="admin-stat-card">
					<div class="admin-stat-label">Total requests</div>
					<div class="admin-stat-value">{{ totalRequests() }}</div>
				</div>
				<div class="admin-stat-card">
					<div class="admin-stat-label">Pending requests</div>
					<div class="admin-stat-value">{{ requestCount('PENDING') }}</div>
				</div>
				<div class="admin-stat-card">
					<div class="admin-stat-label">Accepted requests</div>
					<div class="admin-stat-value">{{ requestCount('ACCEPTED') }}</div>
				</div>
				<div class="admin-stat-card">
					<div class="admin-stat-label">Declined requests</div>
					<div class="admin-stat-value">{{ requestCount('DECLINED') }}</div>
				</div>
				<div class="admin-stat-card">
					<div class="admin-stat-label">Total sessions</div>
					<div class="admin-stat-value">{{ totalSessions() }}</div>
					<div class="admin-stat-sub">
						<span class="chip chip-neutral"><i class="bi bi-calendar3"></i> {{ sessionCount('SCHEDULED') }} Scheduled</span>
						<span class="chip chip-teal"><i class="bi bi-check-circle-fill"></i> {{ sessionCount('COMPLETED') }} Completed</span>
						<span class="chip chip-error"><i class="bi bi-x-circle-fill"></i> {{ sessionCount('CANCELLED') }} Cancelled</span>
					</div>
				</div>
			</div>

			<!-- Charts -->
			<div class="card" *ngIf="!loading()">
				<app-section-header title="Overview Charts" icon='<i class="bi bi-bar-chart-fill"></i>'></app-section-header>

				<div class="admin-charts">
					<div class="admin-chart-card">
						<div class="admin-chart-title">Requests by status</div>
						<div class="admin-chart-body">
							<div class="chart-pie" [style.background]="requestsPieBackground()"></div>
							<div class="chart-legend">
								<div class="chart-legend-row">
									<span class="chart-swatch swatch-pending"></span>
									<span class="chart-label">PENDING</span>
									<span class="chart-value">{{ requestCount('PENDING') }}</span>
									<span class="chart-pct">{{ requestPendingPct() }}%</span>
								</div>
								<div class="chart-legend-row">
									<span class="chart-swatch swatch-accepted"></span>
									<span class="chart-label">ACCEPTED</span>
									<span class="chart-value">{{ requestCount('ACCEPTED') }}</span>
									<span class="chart-pct">{{ requestAcceptedPct() }}%</span>
								</div>
								<div class="chart-legend-row">
									<span class="chart-swatch swatch-declined"></span>
									<span class="chart-label">DECLINED</span>
									<span class="chart-value">{{ requestCount('DECLINED') }}</span>
									<span class="chart-pct">{{ requestDeclinedPct() }}%</span>
								</div>
							</div>
						</div>
					</div>

					<div class="admin-chart-card">
						<div class="admin-chart-title">Sessions by status</div>
						<div class="admin-chart-body">
							<div class="chart-bars">
								<div class="chart-bar-row">
									<div class="chart-bar-label">SCHEDULED</div>
									<div class="chart-bar-track">
										<div class="chart-bar-fill fill-scheduled" [style.width.%]="sessionScheduledPct()"></div>
									</div>
									<div class="chart-bar-value">{{ sessionCount('SCHEDULED') }}</div>
								</div>

								<div class="chart-bar-row">
									<div class="chart-bar-label">COMPLETED</div>
									<div class="chart-bar-track">
										<div class="chart-bar-fill fill-completed" [style.width.%]="sessionCompletedPct()"></div>
									</div>
									<div class="chart-bar-value">{{ sessionCount('COMPLETED') }}</div>
								</div>

								<div class="chart-bar-row">
									<div class="chart-bar-label">CANCELLED</div>
									<div class="chart-bar-track">
										<div class="chart-bar-fill fill-cancelled" [style.width.%]="sessionCancelledPct()"></div>
									</div>
									<div class="chart-bar-value">{{ sessionCount('CANCELLED') }}</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Requests history table -->
			<div class="card" *ngIf="!loading()">
				<app-section-header title="Requests History" icon='<i class="bi bi-inbox-fill"></i>'></app-section-header>

				<div class="admin-table-toolbar">
					<div class="admin-filter">
						<label class="form-label">Search</label>
						<input
							class="input"
							placeholder="Search mentee / mentor / status..."
							[value]="requestSearchQuery()"
							(input)="setRequestSearch($event)">
					</div>

					<div class="admin-filter">
						<label class="form-label">Filter by status</label>
						<select class="input" [value]="requestStatusFilter()" (change)="setRequestFilter($event)">
							<option value="">All</option>
							<option value="PENDING">PENDING</option>
							<option value="ACCEPTED">ACCEPTED</option>
							<option value="DECLINED">DECLINED</option>
						</select>
					</div>

					<div class="admin-filter">
						<label class="form-label">Order</label>
						<select class="input" [value]="requestSortOrder()" (change)="setRequestSortOrder($event)">
							<option value="recent">Recent</option>
							<option value="old">Old</option>
						</select>
					</div>
				</div>

				<div class="empty-state" *ngIf="filteredRequests().length === 0">
					<div class="empty-icon"><i class="bi bi-inbox"></i></div>
					<div class="empty-title">No requests found</div>
					<div class="empty-desc">Try changing the status filter.</div>
				</div>

				<div class="table-wrap" *ngIf="filteredRequests().length > 0">
					<table class="admin-table">
						<thead>
							<tr>
								<th>Mentee</th>
								<th>Mentor</th>
								<th>Status</th>
								<th>Date</th>
									<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							<tr *ngFor="let r of pagedRequests(); trackBy: trackById">
								<td [title]="r.menteeId">{{ userLabel(r.menteeId) }}</td>
								<td [title]="r.mentorId">{{ userLabel(r.mentorId) }}</td>
								<td>
									<span class="chip"
										[class.chip-neutral]="r.status === 'PENDING'"
										[class.chip-teal]="r.status === 'ACCEPTED'"
										[class.chip-error]="r.status === 'DECLINED'">
										{{ r.status }}
									</span>
								</td>
								<td>{{ r.createdAt | date:'medium' }}</td>
									<td>
										<div class="request-actions">
											<ng-container *ngIf="r.status === 'PENDING'">
												<button class="btn btn-primary btn-sm"
													[disabled]="processingRequestId() === r.id"
													(click)="acceptRequest(r.id)">
													{{ processingRequestId() === r.id ? '...' : '✓ Accept' }}
												</button>
												<button class="btn btn-ghost btn-sm"
													[disabled]="processingRequestId() === r.id"
													(click)="declineRequest(r.id)">
													✕ Reject
												</button>
												<button class="btn btn-ghost btn-sm"
													[disabled]="processingRequestId() === r.id"
													(click)="cancelRequest(r.id)">
													🗑 Cancel
												</button>
											</ng-container>

											<ng-container *ngIf="r.status !== 'PENDING'">
												<button class="btn btn-ghost btn-sm"
													[disabled]="processingRequestId() === r.id"
													(click)="deleteRequest(r.id)">
													🗑 Delete
												</button>
											</ng-container>
										</div>
									</td>
							</tr>
						</tbody>
					</table>
				</div>

				<div class="admin-pagination" *ngIf="filteredRequests().length > 0 && requestTotalPages() > 1">
					<button class="page-btn" [disabled]="requestPage() === 0" (click)="setRequestPage(requestPage() - 1)">Preview</button>

					<ng-container *ngFor="let item of requestPageItems()">
						<span *ngIf="item === 'ellipsis'" class="page-ellipsis">…</span>
						<button
							*ngIf="item !== 'ellipsis'"
							class="page-number"
							[class.active]="$any(item) === requestPage()"
							(click)="setRequestPage($any(item))">
							{{ $any(item) + 1 }}
						</button>
					</ng-container>

					<button class="page-btn" [disabled]="requestPage() >= requestTotalPages() - 1" (click)="setRequestPage(requestPage() + 1)">Next</button>
				</div>
			</div>

			<!-- Sessions history table -->
			<div class="card" *ngIf="!loading()">
				<app-section-header title="Sessions History" icon='<i class="bi bi-camera-video-fill"></i>'></app-section-header>

				<div class="admin-table-toolbar">
					<div class="admin-filter">
						<label class="form-label">Search</label>
						<input
							class="input"
							placeholder="Search request / mentee / mentor..."
							[value]="sessionSearchQuery()"
							(input)="setSessionSearch($event)">
					</div>

					<div class="admin-filter">
						<label class="form-label">Filter by status</label>
						<select class="input" [value]="sessionStatusFilter()" (change)="setSessionFilter($event)">
							<option value="">All</option>
							<option value="SCHEDULED">SCHEDULED</option>
							<option value="COMPLETED">COMPLETED</option>
							<option value="CANCELLED">CANCELLED</option>
						</select>
					</div>

					<div class="admin-filter">
						<label class="form-label">Order</label>
						<select class="input" [value]="sessionSortOrder()" (change)="setSessionSortOrder($event)">
							<option value="recent">Recent</option>
							<option value="old">Old</option>
						</select>
					</div>
				</div>

				<div class="empty-state" *ngIf="sessionGroups().length === 0">
					<div class="empty-icon"><i class="bi bi-camera-video"></i></div>
					<div class="empty-title">No sessions found</div>
					<div class="empty-desc">Try changing the status filter.</div>
				</div>

				<div class="table-wrap" *ngIf="sessionGroups().length > 0">
					<table class="admin-table">
						<thead>
							<tr>
								<th>Request</th>
								<th>Mentee</th>
								<th>Mentor</th>
								<th>Latest</th>
								<th>Showing</th>
								<th>All statuses</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							<ng-container *ngFor="let g of pagedSessionGroups(); trackBy: trackByRequestId">
								<tr class="session-group-row">
									<td>
										<button class="btn btn-ghost btn-sm" (click)="toggleGroup(g.requestId)">
											{{ isGroupOpen(g.requestId) ? '▾' : '▸' }} Sessions
										</button>
									</td>
									<td>{{ g.menteeLabel }}</td>
									<td>{{ g.mentorLabel }}</td>
									<td>{{ g.latestScheduledAt ? (g.latestScheduledAt | date:'medium') : '—' }}</td>
									<td>
										<span class="session-group-showing">
											Showing {{ g.visibleSessions.length }} of {{ g.allSessions.length }}
										</span>
									</td>
									<td>
										<div class="session-group-counts">
											<span class="chip chip-neutral">📅 {{ g.totalCounts['SCHEDULED'] || 0 }}</span>
											<span class="chip chip-teal">✅ {{ g.totalCounts['COMPLETED'] || 0 }}</span>
											<span class="chip chip-error">🛑 {{ g.totalCounts['CANCELLED'] || 0 }}</span>
										</div>
									</td>
									<td class="session-group-actions">
										<button class="btn btn-ghost btn-sm" (click)="toggleGroup(g.requestId)">
											{{ isGroupOpen(g.requestId) ? 'Hide' : 'Show' }}
										</button>
									</td>
								</tr>
								<tr *ngIf="isGroupOpen(g.requestId)" class="session-group-details">
									<td colspan="7">
										<div class="session-group-inner">
											<table class="admin-table admin-table--nested">
												<thead>
													<tr>
														<th>Date</th>
														<th>Link</th>
														<th>Status</th>
														<th>Actions</th>
													</tr>
												</thead>
												<tbody>
													<ng-container *ngFor="let s of g.visibleSessions; trackBy: trackById">
														<tr *ngIf="editingSessionId() !== s.id">
															<td>{{ s.scheduledAt | date:'medium' }}</td>
															<td class="mono">{{ s.meetingLink }}</td>
															<td>
																<span class="chip"
																	[class.chip-neutral]="s.status === 'SCHEDULED'"
																	[class.chip-teal]="s.status === 'COMPLETED'"
																	[class.chip-error]="s.status === 'CANCELLED'">
																	{{ s.status }}
																</span>
															</td>
															<td>
																<div class="request-actions">
																	<button class="btn btn-ghost btn-sm" (click)="openMeetingLink(s)">🔗 Open</button>
																	<button class="btn btn-primary btn-sm"
																		*ngIf="s.status === 'SCHEDULED'"
																		(click)="startEditSession(s)">✏️ Edit</button>
																	<button class="btn btn-ghost btn-sm"
																		*ngIf="s.status === 'SCHEDULED'"
																		[disabled]="processingSessionId() === s.id"
																		(click)="cancelSession(s.id)">🗑 Cancel</button>
																	<button class="btn btn-teal btn-sm"
																		*ngIf="s.status === 'SCHEDULED'"
																		[disabled]="processingSessionId() === s.id"
																		(click)="completeSession(s.id)">✅ Complete</button>
																	<button class="btn btn-ghost btn-sm"
																		[disabled]="processingSessionId() === s.id"
																		(click)="deleteSession(s.id)">🗑 Delete</button>
																</div>
															</td>
														</tr>
														<tr *ngIf="editingSessionId() === s.id">
															<td>
																<input class="input" type="datetime-local" [value]="editScheduledAt()" (change)="editScheduledAt.set($any($event.target).value)" />
															</td>
															<td>
																<input class="input" type="text" [value]="editMeetingLink()" (input)="editMeetingLink.set($any($event.target).value)" />
															</td>
															<td>
																<span class="chip chip-neutral">SCHEDULED</span>
															</td>
															<td>
																<div class="request-actions">
																	<button class="btn btn-primary btn-sm" [disabled]="processingSessionId() === s.id" (click)="saveEditSession(s.id)">💾 Save</button>
																	<button class="btn btn-ghost btn-sm" (click)="cancelEditSession()">Cancel</button>
																</div>
															</td>
														</tr>
													</ng-container>
												</tbody>
											</table>
										</div>
									</td>
								</tr>
							</ng-container>
						</tbody>
					</table>
				</div>

				<div class="admin-pagination" *ngIf="sessionGroups().length > 0 && sessionTotalPages() > 1">
					<button class="page-btn" [disabled]="sessionPage() === 0" (click)="setSessionPage(sessionPage() - 1)">Preview</button>

					<ng-container *ngFor="let item of sessionPageItems()">
						<span *ngIf="item === 'ellipsis'" class="page-ellipsis">…</span>
						<button
							*ngIf="item !== 'ellipsis'"
							class="page-number"
							[class.active]="$any(item) === sessionPage()"
							(click)="setSessionPage($any(item))">
							{{ $any(item) + 1 }}
						</button>
					</ng-container>

					<button class="page-btn" [disabled]="sessionPage() >= sessionTotalPages() - 1" (click)="setSessionPage(sessionPage() + 1)">Next</button>
				</div>
			</div>

		</div>
	`,
	styleUrls: ['../mentorship-shared.scss']
})
export class AdminViewComponent implements OnInit {
	private mentorshipApi = inject(MentorshipApiService);
	private userApi = inject(UserApiService);

	private userNameById = signal<Record<string, string>>({});
	private requestById = signal<Map<string, MentorRequest>>(new Map());

	loading = signal(false);
	errorMessage = signal<string | null>(null);

	requests = signal<MentorRequest[]>([]);
	sessions = signal<MentorSession[]>([]);
	processingRequestId = signal<string | null>(null);
	processingSessionId = signal<string | null>(null);
	editingSessionId = signal<string | null>(null);
	editScheduledAt = signal<string>('');
	editMeetingLink = signal<string>('');

	requestStatusFilter = signal<'' | RequestStatus>('');
	sessionStatusFilter = signal<'' | SessionStatus>('');

	requestSearchQuery = signal('');
	requestSortOrder = signal<'recent' | 'old'>('recent');

	sessionSearchQuery = signal('');
	sessionSortOrder = signal<'recent' | 'old'>('recent');

	readonly pageSize = 5;
	requestPage = signal(0);
	sessionPage = signal(0);

	requestTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredRequests().length / this.pageSize)));
	sessionTotalPages = computed(() => Math.max(1, Math.ceil(this.sessionGroups().length / this.pageSize)));

	requestPageItems = computed(() => this.buildPageItems(this.requestPage(), this.requestTotalPages()));
	sessionPageItems = computed(() => this.buildPageItems(this.sessionPage(), this.sessionTotalPages()));

	pagedRequests = computed(() => {
		const rows = this.filteredRequests();
		const totalPages = Math.max(1, Math.ceil(rows.length / this.pageSize));
		const page = this.clampPage(this.requestPage(), totalPages);
		const start = page * this.pageSize;
		return rows.slice(start, start + this.pageSize);
	});

	openSessionGroups = signal<Record<string, boolean>>({});

	isGroupOpen(requestId: string): boolean {
		return Boolean(this.openSessionGroups()[requestId]);
	}

	toggleGroup(requestId: string): void {
		this.openSessionGroups.update(curr => ({ ...curr, [requestId]: !curr[requestId] }));
	}

	private groupByRequestId(list: MentorSession[]): Map<string, MentorSession[]> {
		const map = new Map<string, MentorSession[]>();
		for (const s of list || []) {
			const rid = s?.requestId;
			if (!rid) continue;
			const arr = map.get(rid) ?? [];
			arr.push(s);
			map.set(rid, arr);
		}
		for (const [rid, arr] of map.entries()) {
			map.set(rid, this.sortByDateDesc(arr, x => x.scheduledAt));
		}
		return map;
	}

	private countSessionStatuses(list: MentorSession[]): Record<SessionStatus, number> {
		const counts: Record<SessionStatus, number> = { SCHEDULED: 0, COMPLETED: 0, CANCELLED: 0 };
		for (const s of list || []) {
			counts[s.status] = (counts[s.status] ?? 0) + 1;
		}
		return counts;
	}

	sessionGroups = computed<SessionGroup[]>(() => {
		const allSessions = this.sessions();
		const visibleSessions = this.filteredSessions();

		const allMap = this.groupByRequestId(allSessions);
		const visibleMap = this.groupByRequestId(visibleSessions);
		const filterActive = Boolean(this.sessionStatusFilter());

		const requestIds = filterActive
			? Array.from(visibleMap.keys())
			: Array.from(allMap.keys());

		const groups: SessionGroup[] = [];
		for (const requestId of requestIds) {
			const all = allMap.get(requestId) ?? [];
			const visible = visibleMap.get(requestId) ?? [];

			// When filter is active, hide groups with 0 matching sessions.
			if (filterActive && visible.length === 0) continue;

			const req = this.requestById().get(requestId);
			const menteeLabel = req?.menteeId ? this.userLabel(req.menteeId) : '—';
			const mentorLabel = req?.mentorId ? this.userLabel(req.mentorId) : '—';

			groups.push({
				requestId,
				menteeLabel,
				mentorLabel,
				allSessions: all,
				visibleSessions: visible,
				latestScheduledAt: all[0]?.scheduledAt ?? null,
				totalCounts: this.countSessionStatuses(all)
			});
		}

		const q = this.sessionSearchQuery().toLowerCase().trim();
		const filtered = q
			? groups.filter(g => {
				const hay = `${g.requestId} ${g.menteeLabel} ${g.mentorLabel}`.toLowerCase();
				return hay.includes(q);
			})
			: groups;

		const order = this.sessionSortOrder();
		return filtered.sort((a, b) => {
			const at = Date.parse(a.latestScheduledAt ?? '');
			const bt = Date.parse(b.latestScheduledAt ?? '');
			const diff = (isNaN(bt) ? 0 : bt) - (isNaN(at) ? 0 : at);
			return order === 'recent' ? diff : -diff;
		});
	});

	pagedSessionGroups = computed(() => {
		const rows = this.sessionGroups();
		const totalPages = Math.max(1, Math.ceil(rows.length / this.pageSize));
		const page = this.clampPage(this.sessionPage(), totalPages);
		const start = page * this.pageSize;
		return rows.slice(start, start + this.pageSize);
	});

	private requestCountsByStatus = computed(() => {
		const counts: Record<string, number> = { PENDING: 0, ACCEPTED: 0, DECLINED: 0 };
		for (const r of this.requests()) {
			counts[r.status] = (counts[r.status] ?? 0) + 1;
		}
		return counts as Record<RequestStatus, number>;
	});

	private sessionCountsByStatus = computed(() => {
		const counts: Record<string, number> = { SCHEDULED: 0, COMPLETED: 0, CANCELLED: 0 };
		for (const s of this.sessions()) {
			counts[s.status] = (counts[s.status] ?? 0) + 1;
		}
		return counts as Record<SessionStatus, number>;
	});

	private percent(part: number, total: number): number {
		if (!total || total <= 0) return 0;
		return Math.round((part / total) * 100);
	}

	requestPendingPct = computed(() => this.percent(this.requestCount('PENDING'), this.totalRequests()));
	requestAcceptedPct = computed(() => this.percent(this.requestCount('ACCEPTED'), this.totalRequests()));
	requestDeclinedPct = computed(() => this.percent(this.requestCount('DECLINED'), this.totalRequests()));

	sessionScheduledPct = computed(() => this.percent(this.sessionCount('SCHEDULED'), this.totalSessions()));
	sessionCompletedPct = computed(() => this.percent(this.sessionCount('COMPLETED'), this.totalSessions()));
	sessionCancelledPct = computed(() => this.percent(this.sessionCount('CANCELLED'), this.totalSessions()));

	requestsPieBackground = computed(() => {
		const total = this.totalRequests();
		if (!total) {
			return 'conic-gradient(var(--color-border) 0 360deg)';
		}

		const pending = this.requestCount('PENDING');
		const accepted = this.requestCount('ACCEPTED');
		const declined = this.requestCount('DECLINED');

		const pendingDeg = (pending / total) * 360;
		const acceptedDeg = (accepted / total) * 360;
		// declined is the remainder (prevents rounding gaps)
		const a0 = 0;
		const a1 = pendingDeg;
		const a2 = pendingDeg + acceptedDeg;

		return `conic-gradient(
			var(--neutral-300) ${a0}deg ${a1}deg,
			var(--teal-500) ${a1}deg ${a2}deg,
			var(--error-500) ${a2}deg 360deg
		)`;
	});

	ngOnInit(): void {
		this.load();
	}

	private load(): void {
		this.loading.set(true);
		this.errorMessage.set(null);

		forkJoin({
			requests: this.mentorshipApi.getAllRequests(),
			sessions: this.mentorshipApi.getAllSessions()
		})
			.pipe(finalize(() => this.loading.set(false)))
			.subscribe({
				next: ({ requests, sessions }) => {
					const sortedRequests = this.sortByDateDesc(requests, r => r.createdAt);
					this.requests.set(sortedRequests);
					this.requestById.set(new Map(sortedRequests.map(r => [r.id, r])));
					this.sessions.set(this.sortByDateDesc(sessions, s => s.scheduledAt));
					this.prefetchUserNames([
						...requests.map(r => r.menteeId),
						...requests.map(r => r.mentorId)
					]);
					this.ensurePagesInRange();
				},
				error: (err) => {
					const message = err?.error?.message || err?.message || 'Failed to load mentorship admin data.';
					this.errorMessage.set(message);
				}
			});
	}

	private requestForSession(session: MentorSession): MentorRequest | undefined {
		return this.requestById().get(session.requestId);
	}

	acceptRequest(requestId: string): void {
		this.processingRequestId.set(requestId);
		this.mentorshipApi.acceptRequest(requestId).subscribe({
			next: (updated) => {
				this.requests.update(list => list.map(r => (r.id === requestId ? updated : r)));
				this.requestById.update(map => {
					const next = new Map(map);
					next.set(requestId, updated);
					return next;
				});
				this.ensurePagesInRange();
				this.processingRequestId.set(null);
			},
			error: () => this.processingRequestId.set(null)
		});
	}

	declineRequest(requestId: string): void {
		this.processingRequestId.set(requestId);
		this.mentorshipApi.declineRequest(requestId).subscribe({
			next: (updated) => {
				this.requests.update(list => list.map(r => (r.id === requestId ? updated : r)));
				this.requestById.update(map => {
					const next = new Map(map);
					next.set(requestId, updated);
					return next;
				});
				this.ensurePagesInRange();
				this.processingRequestId.set(null);
			},
			error: () => this.processingRequestId.set(null)
		});
	}

	deleteRequest(requestId: string): void {
		const ok = window.confirm('Are you sure? This will delete the request and all its sessions.');
		if (!ok) return;
		this.processingRequestId.set(requestId);
		this.mentorshipApi.deleteRequest(requestId).subscribe({
			next: () => {
				this.requests.update(list => list.filter(r => r.id !== requestId));
				this.requestById.update(map => {
					const next = new Map(map);
					next.delete(requestId);
					return next;
				});
				// also remove sessions that belonged to that request (keeps UI consistent)
				this.sessions.update(list => list.filter(s => s.requestId !== requestId));
				this.ensurePagesInRange();
				this.processingRequestId.set(null);
			},
			error: () => this.processingRequestId.set(null)
		});
	}

	cancelRequest(requestId: string): void {
		// "Cancel" is implemented as delete (requests have no CANCELLED status)
		this.deleteRequest(requestId);
	}

	openMeetingLink(session: MentorSession): void {
		const raw = (session.meetingLink || '').trim();
		if (!raw) return;
		const url = /^https?:\/\//i.test(raw) ? raw : `https://meet.jit.si/${encodeURIComponent(raw)}`;
		window.open(url, '_blank', 'noopener');
	}

	deleteSession(sessionId: string): void {
		const ok = window.confirm('Are you sure you want to delete this session?');
		if (!ok) return;
		this.processingSessionId.set(sessionId);
		this.mentorshipApi.deleteSession(sessionId).subscribe({
			next: () => {
				this.sessions.update(list => list.filter(s => s.id !== sessionId));
				if (this.editingSessionId() === sessionId) {
					this.cancelEditSession();
				}
				this.ensurePagesInRange();
				this.processingSessionId.set(null);
			},
			error: () => this.processingSessionId.set(null)
		});
	}

	startEditSession(session: MentorSession): void {
		this.editingSessionId.set(session.id);
		// datetime-local expects YYYY-MM-DDTHH:mm
		const iso = (session.scheduledAt || '').slice(0, 16);
		this.editScheduledAt.set(iso);
		this.editMeetingLink.set(session.meetingLink || '');
	}

	cancelEditSession(): void {
		this.editingSessionId.set(null);
		this.editScheduledAt.set('');
		this.editMeetingLink.set('');
	}

	saveEditSession(sessionId: string): void {
		this.processingSessionId.set(sessionId);
		this.mentorshipApi.updateSession(sessionId, this.editScheduledAt(), this.editMeetingLink()).subscribe({
			next: (updated) => {
				this.sessions.update(list => list.map(s => (s.id === sessionId ? updated : s)));
				this.ensurePagesInRange();
				this.processingSessionId.set(null);
				this.cancelEditSession();
			},
			error: () => this.processingSessionId.set(null)
		});
	}

	cancelSession(sessionId: string): void {
		this.processingSessionId.set(sessionId);
		this.mentorshipApi.cancelSession(sessionId).subscribe({
			next: (updated) => {
				this.sessions.update(list => list.map(s => (s.id === sessionId ? updated : s)));
				this.ensurePagesInRange();
				this.processingSessionId.set(null);
			},
			error: () => this.processingSessionId.set(null)
		});
	}

	completeSession(sessionId: string): void {
		this.processingSessionId.set(sessionId);
		this.mentorshipApi.completeSession(sessionId).subscribe({
			next: (updated) => {
				this.sessions.update(list => list.map(s => (s.id === sessionId ? updated : s)));
				this.ensurePagesInRange();
				this.processingSessionId.set(null);
			},
			error: () => this.processingSessionId.set(null)
		});
	}

	sessionMenteeId(session: MentorSession): string {
		return this.requestForSession(session)?.menteeId ?? '';
	}

	sessionMentorId(session: MentorSession): string {
		return this.requestForSession(session)?.mentorId ?? '';
	}

	sessionMenteeLabel(session: MentorSession): string {
		const id = this.sessionMenteeId(session);
		return id ? this.userLabel(id) : '—';
	}

	sessionMentorLabel(session: MentorSession): string {
		const id = this.sessionMentorId(session);
		return id ? this.userLabel(id) : '—';
	}

	userLabel(userId: string): string {
		if (!userId) return '';
		return this.userNameById()[userId] || userId;
	}

	private prefetchUserNames(userIds: string[]): void {
		const existing = this.userNameById();
		const unique = Array.from(new Set((userIds || []).filter(Boolean)));
		const missing = unique.filter(id => !existing[id]);
		if (missing.length === 0) return;

		const calls: Record<string, Observable<UserProfile | null>> = {};
		for (const id of missing) {
			calls[id] = this.userApi.getUserById(id).pipe(catchError(() => of(null)));
		}

		forkJoin(calls).subscribe((result) => {
			const additions: Record<string, string> = {};
			for (const [id, profile] of Object.entries(result)) {
				if (!profile) continue;
				const fullName = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim();
				additions[id] = fullName || profile.email || id;
			}

			if (Object.keys(additions).length === 0) return;
			this.userNameById.update((curr) => ({ ...curr, ...additions }));
		});
	}

	totalRequests(): number {
		return this.requests().length;
	}

	requestCount(status: RequestStatus): number {
		return this.requestCountsByStatus()[status] ?? 0;
	}

	totalSessions(): number {
		return this.sessions().length;
	}

	sessionCount(status: SessionStatus): number {
		return this.sessionCountsByStatus()[status] ?? 0;
	}

	filteredRequests(): MentorRequest[] {
		const status = this.requestStatusFilter();
		const q = this.requestSearchQuery().toLowerCase().trim();
		const order = this.requestSortOrder();

		let rows = this.requests();
		if (status) rows = rows.filter(r => r.status === status);

		if (q) {
			rows = rows.filter(r => {
				const mentee = this.userLabel(r.menteeId).toLowerCase();
				const mentor = this.userLabel(r.mentorId).toLowerCase();
				const menteeId = (r.menteeId || '').toLowerCase();
				const mentorId = (r.mentorId || '').toLowerCase();
				const statusText = (r.status || '').toLowerCase();
				const idText = (r.id || '').toLowerCase();
				return (
					mentee.includes(q) ||
					mentor.includes(q) ||
					menteeId.includes(q) ||
					mentorId.includes(q) ||
					statusText.includes(q) ||
					idText.includes(q)
				);
			});
		}

		return [...rows].sort((a, b) => {
			const at = Date.parse(a.createdAt || '');
			const bt = Date.parse(b.createdAt || '');
			const diff = (isNaN(bt) ? 0 : bt) - (isNaN(at) ? 0 : at);
			return order === 'recent' ? diff : -diff;
		});
	}

	filteredSessions(): MentorSession[] {
		const status = this.sessionStatusFilter();
		const rows = this.sessions();
		if (!status) return rows;
		return rows.filter(s => s.status === status);
	}

	setRequestFilter(event: Event): void {
		const next = String((event.target as HTMLSelectElement).value || '') as '' | RequestStatus;
		this.requestStatusFilter.set(next);
		this.requestPage.set(0);
	}

	setRequestSearch(event: Event): void {
		this.requestSearchQuery.set(String((event.target as HTMLInputElement).value || ''));
		this.requestPage.set(0);
	}

	setRequestSortOrder(event: Event): void {
		const next = String((event.target as HTMLSelectElement).value || 'recent') as 'recent' | 'old';
		this.requestSortOrder.set(next);
		this.requestPage.set(0);
	}

	setSessionFilter(event: Event): void {
		const next = String((event.target as HTMLSelectElement).value || '') as '' | SessionStatus;
		this.sessionStatusFilter.set(next);
		this.sessionPage.set(0);
	}

	setSessionSearch(event: Event): void {
		this.sessionSearchQuery.set(String((event.target as HTMLInputElement).value || ''));
		this.sessionPage.set(0);
	}

	setSessionSortOrder(event: Event): void {
		const next = String((event.target as HTMLSelectElement).value || 'recent') as 'recent' | 'old';
		this.sessionSortOrder.set(next);
		this.sessionPage.set(0);
	}

	setRequestPage(page: number): void {
		this.requestPage.set(this.clampPage(page, this.requestTotalPages()));
	}

	setSessionPage(page: number): void {
		this.sessionPage.set(this.clampPage(page, this.sessionTotalPages()));
	}

	private ensurePagesInRange(): void {
		this.requestPage.set(this.clampPage(this.requestPage(), this.requestTotalPages()));
		this.sessionPage.set(this.clampPage(this.sessionPage(), this.sessionTotalPages()));
	}

	private clampPage(page: number, totalPages: number): number {
		const max = Math.max(0, (totalPages || 1) - 1);
		return Math.min(Math.max(0, Math.floor(page || 0)), max);
	}

	private buildPageItems(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
		if (!totalPages || totalPages <= 1) return [0];
		if (totalPages <= 5) return Array.from({ length: totalPages }, (_v, i) => i);

		const last = totalPages - 1;
		const pages = new Set<number>([0, last]);
		for (const p of [currentPage - 1, currentPage, currentPage + 1]) {
			if (p > 0 && p < last) pages.add(p);
		}

		const sorted = [...pages].sort((a, b) => a - b);
		const items: Array<number | 'ellipsis'> = [];
		for (let i = 0; i < sorted.length; i++) {
			if (i > 0 && sorted[i] - sorted[i - 1] > 1) items.push('ellipsis');
			items.push(sorted[i]);
		}
		return items;
	}

	trackById(_index: number, row: { id: string }): string {
		return row.id;
	}

	trackByRequestId(_index: number, row: { requestId: string }): string {
		return row.requestId;
	}

	private sortByDateDesc<T>(items: T[], getDate: (item: T) => string): T[] {
		return [...items].sort((a, b) => {
			const aTime = Date.parse(getDate(a) || '');
			const bTime = Date.parse(getDate(b) || '');
			return (isNaN(bTime) ? 0 : bTime) - (isNaN(aTime) ? 0 : aTime);
		});
	}
}

