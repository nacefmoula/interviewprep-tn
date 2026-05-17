import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { SectionHeaderComponent } from '../../../shared/components/section-header/section-header.component';
import { JitsiMeetComponent } from '../../../shared/components/jitsi-meet/jitsi-meet.component';
import { MentorshipApiService } from '../../../core/services/mentorship-api.service';
import { UserApiService, UserProfile } from '../../../core/services/user-api.service';
import { MentorRequest, MentorSession } from '../../../core/models/models';
import { Observable, catchError, forkJoin, of } from 'rxjs';

@Component({
    selector: 'app-mentor-view',
    standalone: true,
    imports: [CommonModule, SectionHeaderComponent, FullCalendarModule, JitsiMeetComponent],
    template: `
    <div class="mentorship-page animate-fade">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Mentorship</h1>
          <p>Manage your mentee requests and upcoming sessions.</p>
        </div>
        <div class="mentor-page-stats">
          <span class="chip chip-teal"><i class="bi bi-inbox-fill"></i> {{ pendingCount() }} Pending</span>
          <span class="chip chip-mint"><i class="bi bi-star-fill"></i> {{ mentorAverageRating() }} ({{ mentorTotalRatings() }} ratings)</span>
          <span class="chip chip-purple"><i class="bi bi-mortarboard-fill"></i> Mentor Dashboard</span>
          <button 
            class="btn btn-sm"
            [class.btn-primary]="isAvailable()"
            [class.btn-ghost]="!isAvailable()"
            [disabled]="togglingAvailability()"
            (click)="toggleAvailability()">
            {{ isAvailable() ? '🟢 Available' : '🔴 Unavailable' }}
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div class="card error-card" *ngIf="errorMessage()">⚠️ {{ errorMessage() }}</div>
      <div class="card success-card" *ngIf="successMessage()">✅ {{ successMessage() }}</div>

      <!-- Embedded meeting -->
      <div class="card" *ngIf="activeRoomName()">
        <app-section-header title="Live Session" icon='<i class="bi bi-camera-video-fill"></i>'></app-section-header>
        <div style="display:flex;justify-content:flex-end;gap:0.5rem;margin-bottom:0.75rem;">
          <button class="btn btn-ghost btn-sm" (click)="closeJitsi()">Close</button>
        </div>
        <app-jitsi-meet [roomName]="activeRoomName()!" [displayName]="displayName()"></app-jitsi-meet>
      </div>

      <!-- Calendar -->
      <div class="card">
        <app-section-header title="My Calendar" icon='<i class="bi bi-calendar3"></i>'></app-section-header>

        <div class="empty-state" *ngIf="calendarEvents().length === 0">
          <div class="empty-icon"><i class="bi bi-calendar3"></i></div>
          <div class="empty-title">No scheduled sessions</div>
          <div class="empty-desc">Scheduled mentorship sessions will appear here.</div>
        </div>

        <full-calendar *ngIf="calendarEvents().length > 0" [options]="calendarOptions()"></full-calendar>
      </div>

      <!-- Incoming requests -->
      <div class="card">
        <app-section-header title="Incoming Requests" icon='<i class="bi bi-inbox-fill"></i>'></app-section-header>

        <div class="admin-table-toolbar" style="justify-content:flex-start;gap:var(--space-3);flex-wrap:wrap;">
          <div class="admin-filter">
            <label class="form-label">Search by mentee</label>
            <input
              class="input"
              placeholder="Type mentee name..."
              [value]="incomingSearchQuery()"
              (input)="setIncomingSearch($event)">
          </div>
          <div class="admin-filter">
            <label class="form-label">Order</label>
            <select class="input" [value]="incomingSortOrder()" (change)="setIncomingSortOrder($event)">
              <option value="recent">Recent</option>
              <option value="old">Old</option>
            </select>
          </div>
        </div>

        <div class="loading-state" *ngIf="loadingRequests()">Loading requests...</div>

        <div class="empty-state"
          *ngIf="!loadingRequests() && incomingRequests().length === 0">
          <div class="empty-icon"><i class="bi bi-inbox"></i></div>
          <div class="empty-title">No requests yet</div>
          <div class="empty-desc">When users request your mentorship, they'll appear here.</div>
        </div>

        <div class="empty-state"
          *ngIf="!loadingRequests() && incomingRequests().length > 0 && displayedIncomingRequests().length === 0">
          <div class="empty-icon"><i class="bi bi-search"></i></div>
          <div class="empty-title">No matching requests</div>
          <div class="empty-desc">Try a different search.</div>
        </div>

        <div class="requests-list" *ngIf="displayedIncomingRequests().length > 0">
          <div class="request-block" *ngFor="let req of displayedIncomingRequests()">

            <!-- Request row -->
            <div class="request-item">
              <div class="request-avatar">
                <div class="avatar-placeholder"
                  style="width:40px;height:40px;font-size:0.85rem;">U</div>
              </div>
              <div class="request-info">
                <span class="request-mentor" [title]="req.menteeId">Mentee: {{ userLabel(req.menteeId) }}</span>
                <span class="request-date">{{ req.createdAt | date:'mediumDate' }}</span>
              </div>
              <span class="chip"
                [class.chip-teal]="req.status === 'ACCEPTED'"
                [class.chip-neutral]="req.status === 'PENDING'"
                [class.chip-error]="req.status === 'DECLINED'">
                {{ req.status }}
              </span>

              <!-- PENDING actions -->
              <div class="request-actions" *ngIf="req.status === 'PENDING'">
                <button class="btn btn-primary btn-sm"
                  [disabled]="processingId() === req.id"
                  (click)="acceptRequest(req.id)">
                  {{ processingId() === req.id ? '...' : '✓ Accept' }}
                </button>
                <button class="btn btn-ghost btn-sm"
                  [disabled]="processingId() === req.id"
                  (click)="declineRequest(req.id)">
                  ✕ Decline
                </button>
              </div>

              <!-- ACCEPTED actions -->
              <div class="request-actions" *ngIf="req.status === 'ACCEPTED'">
                <button class="btn btn-primary btn-sm"
                  *ngIf="!hasScheduledSession(req.id)"
                  (click)="openScheduleModal(req.id)">
                  📅 Schedule
                </button>
                <button class="btn btn-teal btn-sm"
                  *ngIf="getSessionsForRequest(req.id).length > 0"
                  (click)="toggleSession(req.id)">
                  {{ viewingId() === req.id ? '▲ Hide' : '👁 Session' }}
                </button>
                <button class="btn btn-ghost btn-sm"
                  [disabled]="processingId() === req.id"
                  (click)="deleteRequest(req.id)">
                  🗑 Delete
                </button>
              </div>

              <!-- DECLINED actions -->
              <div class="request-actions" *ngIf="req.status === 'DECLINED'">
                <button class="btn btn-ghost btn-sm"
                  [disabled]="processingId() === req.id"
                  (click)="deleteRequest(req.id)">
                  🗑 Delete
                </button>
              </div>
            </div>

            <!-- Session detail panel -->
            <div class="session-panel"
              *ngIf="viewingId() === req.id && getSessionsForRequest(req.id).length > 0">

              <ng-container *ngIf="!editMode()">
                <div class="sessions-list">
                  <div class="session-card" *ngFor="let session of getSessionsForRequest(req.id)">
                    <div class="session-row">
                      <span class="session-label">📅 Date</span>
                      <span class="session-value">{{ session.scheduledAt | date:'full' }}</span>
                    </div>
                    <div class="session-row">
                      <span class="session-label">🎥 Room Name</span>
                      <span class="session-value">{{ session.meetingLink }}</span>
                    </div>
                    <div class="session-row">
                      <span class="session-label">📊 Status</span>
                      <span class="chip"
                        [class.chip-teal]="session.status === 'SCHEDULED'"
                        [class.chip-neutral]="session.status === 'COMPLETED'"
                        [class.chip-error]="session.status === 'CANCELLED'">
                        {{ session.status }}
                      </span>
                    </div>

                    <div class="session-actions">
                      <button class="btn btn-primary btn-sm"
                        *ngIf="session.status === 'SCHEDULED'"
                        (click)="enterEditMode(req.id, session)">
                        ✏️ Edit
                      </button>
                      <button class="btn btn-ghost btn-sm"
                        *ngIf="session.status === 'SCHEDULED'"
                        (click)="cancelActiveSession(session.id, req.id)">
                        🗑 Cancel Session
                      </button>
                      <button class="btn btn-teal btn-sm"
                        *ngIf="session.status === 'SCHEDULED'"
                        [disabled]="!canJoin(session) || completingRequestId() === req.id"
                        (click)="completeActiveSession(session.id, req.id)">
                        {{ completingRequestId() === req.id ? '...' : '✅ Complete' }}
                      </button>
                      <button class="btn btn-primary btn-sm"
                        *ngIf="session.status === 'SCHEDULED'"
                        [disabled]="!canJoin(session)"
                        (click)="openJitsi(session)">
                        Join
                      </button>
                    </div>
                  </div>
                </div>
              </ng-container>

              <ng-container *ngIf="editMode()">
                <div class="schedule-form">
                  <div class="form-group">
                    <label class="form-label">New Date & Time</label>
                    <input type="datetime-local" class="input"
                      [value]="scheduledAt"
                      (change)="scheduledAt = $any($event.target).value">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Room Name</label>
                    <input type="text" class="input"
                      placeholder="mentorship-..."
                      [value]="meetingLink"
                      (input)="meetingLink = $any($event.target).value">
                  </div>
                  <div class="schedule-actions">
                    <button class="btn btn-primary"
                      [disabled]="!scheduledAt || !meetingLink || schedulingSession()"
                      (click)="updateSession(req.id)">
                      {{ schedulingSession() ? 'Saving...' : '💾 Save Changes' }}
                    </button>
                    <button class="btn btn-ghost" (click)="exitEditMode()">Cancel</button>
                  </div>
                </div>
              </ng-container>

            </div>

          </div>
        </div>
      </div>

      <!-- Schedule new session modal -->
      <div class="card schedule-card" *ngIf="schedulingRequestId()">
        <app-section-header title="Schedule a Session" icon='<i class="bi bi-calendar-plus-fill"></i>'></app-section-header>
        <div class="schedule-form">
          <div class="form-group">
            <label class="form-label">Date & Time</label>
            <input type="datetime-local" class="input"
              [value]="scheduledAt"
              (change)="scheduledAt = $any($event.target).value">
          </div>
          <div class="form-group">
            <label class="form-label">Room Name</label>
            <input type="text" class="input"
              placeholder="mentorship-..."
              [value]="meetingLink"
              (input)="meetingLink = $any($event.target).value">
          </div>
          <div class="schedule-actions">
            <button class="btn btn-primary"
              [disabled]="!scheduledAt || !meetingLink || schedulingSession()"
              (click)="scheduleSession()">
              {{ schedulingSession() ? 'Scheduling...' : 'Confirm Session' }}
            </button>
            <button class="btn btn-ghost" (click)="closeScheduleModal()">Cancel</button>
          </div>
        </div>
      </div>

    </div>
  `,
    styleUrls: ['../mentorship-shared.scss']
})
export class MentorViewComponent implements OnInit {
    private mentorshipApi = inject(MentorshipApiService);
    private userApi = inject(UserApiService);

    private userNameById = signal<Record<string, string>>({});

  calendarEvents = signal<EventInput[]>([]);
  calendarOptions = signal<CalendarOptions>({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    height: 'auto',
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    },
    eventClick: (arg: EventClickArg) => {
      // No external navigation: sessions are joined in-app via Jitsi embed.
      arg.jsEvent.preventDefault();
    },
    events: [],
  });

    incomingRequests = signal<MentorRequest[]>([]);

    incomingSearchQuery = signal('');
    incomingSortOrder = signal<'recent' | 'old'>('recent');

    displayedIncomingRequests = computed(() => {
      const q = this.incomingSearchQuery().toLowerCase().trim();
      let rows = [...this.incomingRequests()];

      if (q) {
        rows = rows.filter(r => {
          const mentee = this.userLabel(r.menteeId).toLowerCase();
          const menteeId = (r.menteeId || '').toLowerCase();
          return mentee.includes(q) || menteeId.includes(q);
        });
      }

      const order = this.incomingSortOrder();
      return rows.sort((a, b) => {
        const at = Date.parse(a.createdAt || '');
        const bt = Date.parse(b.createdAt || '');
        const diff = (isNaN(bt) ? 0 : bt) - (isNaN(at) ? 0 : at);
        return order === 'recent' ? diff : -diff;
      });
    });
    sessionsByRequest = signal<Map<string, MentorSession[]>>(new Map());
    loadingRequests = signal(false);
    processingId = signal<string | null>(null);
    schedulingRequestId = signal<string | null>(null);
    schedulingSession = signal(false);
    completingRequestId = signal<string | null>(null);
    viewingId = signal<string | null>(null);
    editMode = signal(false);
    errorMessage = signal<string | null>(null);
    successMessage = signal<string | null>(null);
    isAvailable = signal(true);
    togglingAvailability = signal(false);
    currentUserId = signal<string | null>(null);
    displayName = signal<string>('');
    activeRoomName = signal<string | null>(null);
    mentorAverageRating = signal<number>(0);
    mentorTotalRatings = signal<number>(0);
    scheduledAt = '';
    meetingLink = '';
    editingSessionId: string | null = null;

    private generateRoomName(): string {
      try {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        const base64 = btoa(String.fromCharCode(...Array.from(bytes)));
        const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
        return `mentorship-${base64url}`;
      } catch {
        return `mentorship-${Date.now()}`;
      }
    }

    private ensureMeetingLinkPrefilled() {
      if (!this.meetingLink || !this.meetingLink.trim()) {
        this.meetingLink = this.generateRoomName();
      }
    }

    get pendingCount() {
        return () => this.incomingRequests().filter(r => r.status === 'PENDING').length;
    }

    setIncomingSearch(event: Event) {
      this.incomingSearchQuery.set(String((event.target as HTMLInputElement).value || ''));
    }

    setIncomingSortOrder(event: Event) {
      const next = String((event.target as HTMLSelectElement).value || 'recent') as 'recent' | 'old';
      this.incomingSortOrder.set(next);
    }

    ngOnInit() {
        this.loadCurrentUser();
        this.loadIncomingRequests();
    }

    loadCurrentUser() {
        this.userApi.getCurrentUser().subscribe({
            next: (user) => {
                this.currentUserId.set(user.id);
                this.isAvailable.set(user.status === 'ACTIVE');
          this.displayName.set(`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email || 'User');
                this.loadMyRatingStats(user.id);
            },
        error: () => this.showError('Failed to load profile.')
        });
    }

    private loadMyRatingStats(mentorId: string) {
      this.mentorshipApi.getMentorStats(mentorId).subscribe({
        next: (stats) => {
          this.mentorAverageRating.set(stats.averageRating ?? 0);
          this.mentorTotalRatings.set(stats.totalRatings ?? 0);
        },
        error: () => {}
      });
    }

    canJoin(session: MentorSession): boolean {
      const start = new Date(session.scheduledAt).getTime();
      const now = Date.now();
        return now >= start;
    }

    openJitsi(session: MentorSession) {
      const room = (session.meetingLink || '').trim();
      if (!room) {
        this.showError('Room name not set.');
        return;
      }
      this.activeRoomName.set(room);
    }

    closeJitsi() {
      this.activeRoomName.set(null);
    }

    loadIncomingRequests() {
      const userId = this.currentUserId();
      if (!userId) {
        this.userApi.getCurrentUser().subscribe({
          next: (me) => {
            this.currentUserId.set(me.id);
            this.loadIncomingRequests();
          },
          error: () => this.showError('Failed to load profile.')
        });
        return;
      }

      this.loadingRequests.set(true);
      this.sessionsByRequest.set(new Map());
      this.refreshCalendarEvents();

      this.mentorshipApi.getRequestsByMentor(userId).subscribe({
            next: (requests) => {
                this.incomingRequests.set(requests);
            this.prefetchUserNames(requests.map(r => r.menteeId));
                this.loadingRequests.set(false);
                requests
                    .filter(r => r.status === 'ACCEPTED')
                    .forEach(r => {
                        this.mentorshipApi.getSessionsByRequest(r.id).subscribe({
                            next: (sessions) => {
                        this.sessionsByRequest.update(map => {
                          const newMap = new Map(map);
                          newMap.set(r.id, sessions);
                          return newMap;
                        });
                        this.refreshCalendarEvents();
                            }
                        });
                    });

            this.refreshCalendarEvents();
            },
            error: () => this.loadingRequests.set(false)
        });
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

      private refreshCalendarEvents() {
        const sessions: MentorSession[] = [];
        for (const list of this.sessionsByRequest().values()) {
          sessions.push(...list);
        }
        const events: EventInput[] = sessions
          .filter(s => s.status === 'SCHEDULED')
          .map(s => ({ id: s.id, title: 'Mentorship Session', start: s.scheduledAt }));

        this.calendarEvents.set(events);
        this.calendarOptions.update(opts => ({ ...opts, events }));
      }

      getSessionsForRequest(requestId: string): MentorSession[] {
        return this.sessionsByRequest().get(requestId) ?? [];
      }

      hasScheduledSession(requestId: string): boolean {
        return this.getSessionsForRequest(requestId).some(s => s.status === 'SCHEDULED');
      }

    acceptRequest(requestId: string) {
        this.processingId.set(requestId);
        this.mentorshipApi.acceptRequest(requestId).subscribe({
            next: (updated) => {
                this.incomingRequests.update(reqs => reqs.map(r => r.id === requestId ? updated : r));
                this.processingId.set(null);
                this.showSuccess('Request accepted!');
            },
            error: () => { this.processingId.set(null); this.showError('Failed to accept.'); }
        });
    }

    declineRequest(requestId: string) {
        this.processingId.set(requestId);
        this.mentorshipApi.declineRequest(requestId).subscribe({
            next: (updated) => {
                this.incomingRequests.update(reqs => reqs.map(r => r.id === requestId ? updated : r));
                this.processingId.set(null);
                this.showSuccess('Request declined.');
            },
            error: () => { this.processingId.set(null); this.showError('Failed to decline.'); }
        });
    }

    deleteRequest(requestId: string) {
      const ok = window.confirm('Are you sure? This will delete the request and all its sessions.');
      if (!ok) return;
        this.processingId.set(requestId);
        this.mentorshipApi.deleteRequest(requestId).subscribe({
            next: () => {
                this.incomingRequests.update(reqs => reqs.filter(r => r.id !== requestId));
          this.sessionsByRequest.update(map => { const m = new Map(map); m.delete(requestId); return m; });
                if (this.viewingId() === requestId) this.viewingId.set(null);
                this.processingId.set(null);
                this.showSuccess('Request deleted.');
            },
            error: () => { this.processingId.set(null); this.showError('Failed to delete.'); }
        });
    }

    toggleSession(requestId: string) {
        if (this.viewingId() === requestId) {
            this.viewingId.set(null);
            this.editMode.set(false);
        } else {
            this.viewingId.set(requestId);
            this.schedulingRequestId.set(null);
            this.editMode.set(false);
        }
    }

    openScheduleModal(requestId: string) {
        this.schedulingRequestId.set(requestId);
        this.viewingId.set(null);
        this.scheduledAt = '';
        this.meetingLink = '';
      this.ensureMeetingLinkPrefilled();
    }

    closeScheduleModal() {
        this.schedulingRequestId.set(null);
        this.scheduledAt = '';
        this.meetingLink = '';
    }

    scheduleSession() {
        const requestId = this.schedulingRequestId();
        if (!requestId || !this.scheduledAt || !this.meetingLink) return;
        this.schedulingSession.set(true);

        this.mentorshipApi.createSession({
            requestId,
            scheduledAt: this.scheduledAt,
            meetingLink: this.meetingLink
        }).subscribe({
            next: (session) => {
            this.sessionsByRequest.update(map => {
              const m = new Map(map);
              const existing = m.get(requestId) ?? [];
              m.set(requestId, [...existing, session]);
              return m;
            });
            this.refreshCalendarEvents();
                this.schedulingSession.set(false);
                this.closeScheduleModal();
                this.showSuccess('Session scheduled!');
            },
            error: (err) => {
                this.schedulingSession.set(false);
                this.showError(err.error?.error ?? 'Failed to schedule session.');
            }
        });
    }

      enterEditMode(requestId: string, session: MentorSession) {
        if (!session || session.status !== 'SCHEDULED') return;
        this.editingSessionId = session.id;
        this.scheduledAt = (session.scheduledAt || '').slice(0, 16);
        this.meetingLink = session.meetingLink;
        this.ensureMeetingLinkPrefilled();
        this.editMode.set(true);
      }

    exitEditMode() {
        this.editMode.set(false);
        this.scheduledAt = '';
        this.meetingLink = '';
        this.editingSessionId = null;
    }

    updateSession(requestId: string) {
        const sessionId = this.editingSessionId;
        if (!sessionId || !this.scheduledAt || !this.meetingLink) return;
        this.schedulingSession.set(true);

        this.mentorshipApi.updateSession(sessionId, this.scheduledAt, this.meetingLink).subscribe({
          next: (updated) => {
            this.sessionsByRequest.update(map => {
              const m = new Map(map);
              const list = m.get(requestId) ?? [];
              m.set(requestId, list.map(s => (s.id === sessionId ? updated : s)));
              return m;
            });
            this.refreshCalendarEvents();

            this.schedulingSession.set(false);
            this.exitEditMode();
            this.showSuccess('Session updated!');
          },
          error: (err) => {
            this.schedulingSession.set(false);
            this.showError(err.error?.error ?? 'Failed to update session.');
          }
        });
    }

    cancelActiveSession(sessionId: string, requestId: string) {
        this.mentorshipApi.cancelSession(sessionId).subscribe({
            next: () => {
          this.sessionsByRequest.update(map => {
            const m = new Map(map);
            const list = m.get(requestId) ?? [];
            m.set(requestId, list.map(s => (s.id === sessionId ? { ...s, status: 'CANCELLED' as const } : s)));
            return m;
          });
          this.refreshCalendarEvents();
                this.viewingId.set(null);
                this.showSuccess('Session cancelled.');
            },
            error: () => this.showError('Failed to cancel session.')
        });
    }

    completeActiveSession(sessionId: string, requestId: string) {
      this.completingRequestId.set(requestId);
      this.mentorshipApi.completeSession(sessionId).subscribe({
        next: (updated) => {
          this.sessionsByRequest.update(map => {
            const m = new Map(map);
            const list = m.get(requestId) ?? [];
            m.set(requestId, list.map(s => (s.id === sessionId ? updated : s)));
            return m;
          });
          this.refreshCalendarEvents();

          if (this.activeRoomName() && (updated.meetingLink || '').trim() === this.activeRoomName()) {
            this.closeJitsi();
          }

          this.completingRequestId.set(null);
          this.showSuccess('Session completed.');
        },
        error: () => {
          this.completingRequestId.set(null);
          this.showError('Failed to complete session.');
        }
      });
    }

    toggleAvailability() {
        const userId = this.currentUserId();
        if (!userId) {
            this.showError('User ID not found.');
            return;
        }

        this.togglingAvailability.set(true);
        const newStatus = this.isAvailable() ? 'SUSPENDED' : 'ACTIVE';

        this.userApi.toggleAvailability(userId, newStatus).subscribe({
            next: (user) => {
                this.isAvailable.set(user.status === 'ACTIVE');
                this.togglingAvailability.set(false);
                this.showSuccess(this.isAvailable() ? 'You are now available for mentoring.' : 'You are now unavailable for mentoring.');
            },
          error: () => {
                this.togglingAvailability.set(false);
            this.showError('Failed to update availability.');
            }
        });
    }

    private showSuccess(msg: string) {
        this.successMessage.set(msg);
        setTimeout(() => this.successMessage.set(null), 3000);
    }

    private showError(msg: string) {
        this.errorMessage.set(msg);
        setTimeout(() => this.errorMessage.set(null), 4000);
    }
}