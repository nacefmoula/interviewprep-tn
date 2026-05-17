import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { SectionHeaderComponent } from '../../../shared/components/section-header/section-header.component';
import { MentorCardComponent } from '../../../shared/components/mentor-card/mentor-card.component';
import { JitsiMeetComponent } from '../../../shared/components/jitsi-meet/jitsi-meet.component';
import { MentorshipApiService } from '../../../core/services/mentorship-api.service';
import { UserApiService, UserProfile } from '../../../core/services/user-api.service';
import { MentorRequest, MentorSession, Mentor, MentorScoreDTO } from '../../../core/models/models';
import { Observable, catchError, forkJoin, of } from 'rxjs';

type RecChatMessage = { role: 'user' | 'ai'; text: string };

@Component({
    selector: 'app-mentee-view',
    standalone: true,
    imports: [CommonModule, SectionHeaderComponent, MentorCardComponent, FullCalendarModule, JitsiMeetComponent],
    template: `
    <div class="mentorship-page animate-fade">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Mentorship</h1>
          <p>Book 1:1 sessions with verified industry professionals. Get the insider guidance you need.</p>
        </div>
        <div class="mentor-page-stats">
          <span class="chip chip-teal"><i class="bi bi-people-fill"></i> {{ mentors.length }}+ Mentors</span>
          <span class="chip chip-mint"><i class="bi bi-star-fill"></i> 4.8 Avg Rating</span>
        </div>
      </div>

      <!-- Messages -->
      <div class="card error-card" *ngIf="errorMessage()">⚠️ {{ errorMessage() }}</div>
      <div class="card success-card" *ngIf="successMessage()">✅ {{ successMessage() }}</div>

      <!-- Upcoming SCHEDULED session banner -->
      <div class="card upcoming-session" *ngIf="upcomingSession() && upcomingSession()!.status === 'SCHEDULED'">
        <div class="us-header">
          <span class="chip chip-teal"><i class="bi bi-calendar-event-fill"></i> Upcoming Session</span>
        </div>
        <div class="us-body">
          <div class="avatar-placeholder" style="width:52px;height:52px;font-size:1rem;">M</div>
          <div class="us-info">
            <div class="us-mentor-name">{{ upcomingMentorName() }}</div>
            <div class="us-mentor-role">Mentee: {{ displayName() }}</div>
            <div class="us-mentor-role">Room: {{ upcomingSession()!.meetingLink }}</div>
            <div class="us-meta">
              <span>📅 {{ upcomingSession()!.scheduledAt | date:'medium' }}</span>
              <span class="chip chip-cyan">Video Call</span>
            </div>
          </div>
          <div class="us-actions">
            <button class="btn btn-primary"
              [disabled]="!canJoin(upcomingSession()!)"
              (click)="openJitsi(upcomingSession()!)">
              Join
            </button>
            <button class="btn btn-ghost btn-sm"
              (click)="cancelSession(upcomingSession()!.id)">
              Cancel
            </button>
          </div>
        </div>
      </div>

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

      <!-- My requests + sessions -->
      <div class="card" *ngIf="myRequests().length > 0">
        <app-section-header title="My Mentor Requests" icon='<i class="bi bi-inbox-fill"></i>'></app-section-header>

        <div class="admin-table-toolbar" style="justify-content:flex-start;gap:var(--space-3);flex-wrap:wrap;">
          <div class="admin-filter">
            <label class="form-label">Search by mentor</label>
            <input
              class="input"
              placeholder="Type mentor name..."
              [value]="myRequestsSearchQuery()"
              (input)="setMyRequestsSearch($event)">
          </div>

          <div class="admin-filter">
            <label class="form-label">Sort</label>
            <select class="input" [value]="myRequestsSort()" (change)="setMyRequestsSort($event)">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="pending-first">Pending first</option>
            </select>
          </div>
        </div>

        <div class="requests-list">

          <div class="request-block" *ngFor="let req of displayedMyRequests()">

            <!-- Request row -->
            <div class="request-item">
              <div class="request-info">
                <span class="request-mentor" [title]="req.mentorId">Mentor: {{ userLabel(req.mentorId) }}</span>
                <span class="chip"
                  [class.chip-teal]="req.status === 'ACCEPTED'"
                  [class.chip-neutral]="req.status === 'PENDING'"
                  [class.chip-error]="req.status === 'DECLINED'">
                  {{ req.status }}
                </span>
              </div>
              <div class="request-date">{{ req.createdAt | date:'mediumDate' }}</div>
              <div class="request-actions">
                <button class="btn btn-ghost btn-sm"
                  *ngIf="req.status === 'PENDING'"
                  (click)="cancelRequest(req.id)">
                  Cancel Request
                </button>
                <button class="btn btn-ghost btn-sm"
                  *ngIf="req.status === 'ACCEPTED' && getSessionsForRequest(req.id).length > 0"
                  (click)="toggleSessions(req.id)">
                  {{ expandedRequestId() === req.id ? '▲ Hide Sessions' : '📋 View Sessions' }}
                </button>
              </div>
            </div>

            <!-- Sessions for this request -->
            <div class="sessions-list"
              *ngIf="expandedRequestId() === req.id && getSessionsForRequest(req.id).length > 0">
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
                <div class="session-row-actions">
                  <button class="btn btn-primary btn-sm"
                    *ngIf="session.status === 'SCHEDULED'"
                    [disabled]="!canJoin(session)"
                    (click)="openJitsi(session)">
                    Join
                  </button>
                  <button class="btn btn-ghost btn-sm"
                    *ngIf="session.status === 'SCHEDULED'"
                    (click)="cancelSession(session.id)">
                    Cancel Session
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Filters + Search -->
      <div class="mentors-controls">
        <div class="input-icon-wrap" style="flex:1;max-width:380px;">
          <span class="icon">🔍</span>
          <input class="input"
            placeholder="Search by name, expertise, company..."
            [value]="searchQuery()"
            (input)="searchQuery.set($any($event.target).value); mentorPage.set(0)">
        </div>
        <div class="mentor-filters">
          <button class="chip"
            [class]="activeFilter() === 'all' ? 'chip-teal' : 'chip-neutral'"
            (click)="setFilter('all')">All Mentors</button>
          <button class="chip"
            [class]="activeFilter() === 'available' ? 'chip-teal' : 'chip-neutral'"
            (click)="setFilter('available')">Available Now</button>
        </div>
        <select class="input" style="width:auto;padding:0.5rem 1rem;"
          (change)="setSortBy($any($event.target).value)">
          <option value="rating">Sort: Top Rated</option>
          <option value="sessions">Sort: Most Sessions</option>
          <option value="price_asc">Sort: Price Low→High</option>
          <option value="price_desc">Sort: Price High→Low</option>
        </select>
      </div>

      <!-- Mentor grid -->
      <div class="mentors-grid">
        <app-mentor-card
          *ngFor="let mentor of pagedMentors()"
          [mentor]="mentor"
          [requested]="hasRequestFor(mentor.id)"
          [requesting]="requestingId() === mentor.id"
          (requestClicked)="sendRequest($event)"
          (rateSubmitted)="onRateSubmitted($event)"
          (unrateClicked)="onUnrate($event)">
        </app-mentor-card>
      </div>

      <div class="admin-pagination" *ngIf="displayedMentors().length > 0 && mentorTotalPages() > 1">
        <button class="page-btn" [disabled]="mentorPage() === 0" (click)="setMentorPage(mentorPage() - 1)">Preview</button>

        <ng-container *ngFor="let item of mentorPageItems()">
          <span *ngIf="item === 'ellipsis'" class="page-ellipsis">…</span>
          <button
            *ngIf="item !== 'ellipsis'"
            class="page-number"
            [class.active]="$any(item) === mentorPage()"
            (click)="setMentorPage($any(item))">
            {{ $any(item) + 1 }}
          </button>
        </ng-container>

        <button class="page-btn" [disabled]="mentorPage() >= mentorTotalPages() - 1" (click)="setMentorPage(mentorPage() + 1)">Next</button>
      </div>

      <!-- Empty search result -->
      <div class="empty-state" *ngIf="displayedMentors().length === 0">
        <div class="empty-icon"><i class="bi bi-search"></i></div>
        <div class="empty-title">No mentors found</div>
        <div class="empty-desc">Try a different search or filter.</div>
      </div>

      <!-- How it works -->
      <div class="card how-mentorship-works">
        <app-section-header title="How Mentorship Works" icon='<i class="bi bi-lightbulb-fill"></i>'></app-section-header>
        <div class="hmw-steps">
          <div class="hmw-step" *ngFor="let step of howItWorks">
            <div class="hmw-icon">{{ step.icon }}</div>
            <div class="hmw-title">{{ step.title }}</div>
            <div class="hmw-desc">{{ step.desc }}</div>
          </div>
        </div>
      </div>


      <!-- AI Recommendations -->
      <div class="card recommendations-card">
        <app-section-header title="Recommended for You" icon='<i class="bi bi-robot"></i>'></app-section-header>
        <p class="rec-subtitle">Matched based on your profile and skills</p>

        <div class="loading-card" *ngIf="loadingRecommendations()">Loading recommendations…</div>
        <div class="card error-card" *ngIf="recommendationsError()">⚠️ {{ recommendationsError() }}</div>

        <ng-container *ngIf="!loadingRecommendations() && !recommendationsError()">
          <div class="empty-state" *ngIf="recommendations().length === 0">
            <div class="empty-icon"><i class="bi bi-robot"></i></div>
            <div class="empty-title">No recommendations yet</div>
            <div class="empty-desc">Complete your profile (skills/industry) then try again.</div>
            <button class="btn btn-primary btn-sm" (click)="loadRecommendations()">Retry</button>
          </div>

          <div class="recommendations-grid" *ngIf="recommendations().length > 0">
            <div class="rec-card" *ngFor="let rec of recommendations()">

              <div class="rec-header">
                <div class="avatar-placeholder" style="width:48px;height:48px;font-size:1rem;">
                  {{ rec.firstName[0] }}{{ rec.lastName[0] }}
                </div>
                <div class="rec-meta">
                  <div class="rec-name">{{ rec.firstName }} {{ rec.lastName }}</div>
                  <div class="rec-industry" *ngIf="rec.preferredIndustry">
                    {{ rec.preferredIndustry }}
                  </div>
                </div>
                <div class="rec-score">
                  <span class="score-value">{{ rec.score }}</span>
                  <span class="score-label">match</span>
                </div>
              </div>

              <div class="rec-skills" *ngIf="rec.skills.length > 0">
                <span *ngFor="let skill of rec.skills.slice(0,3)"
                  class="chip chip-teal">{{ skill }}</span>
              </div>

              <!-- AI explanation -->
              <div class="rec-explanation" *ngIf="rec.aiExplanation">
                <span class="ai-badge">✨ AI</span>
                <p class="rec-explanation-text">{{ rec.aiExplanation }}</p>
              </div>

              <!-- AI chat -->
              <div class="rec-chat">
                <button class="btn btn-ghost btn-sm" (click)="toggleRecChat(rec.mentorId)">
                  {{ isRecChatOpen(rec.mentorId) ? 'Hide AI Chat' : 'Chat with AI' }}
                </button>

                <div class="rec-chat-panel" *ngIf="isRecChatOpen(rec.mentorId)">
                  <div class="card error-card" *ngIf="recChatError(rec.mentorId)">
                    ⚠️ {{ recChatError(rec.mentorId) }}
                  </div>

                  <div class="rec-chat-messages" *ngIf="recChatMessages(rec.mentorId).length > 0">
                    <div
                      class="rec-chat-msg"
                      *ngFor="let m of recChatMessages(rec.mentorId)"
                      [class.is-user]="m.role === 'user'"
                      [class.is-ai]="m.role === 'ai'">
                      {{ m.text }}
                    </div>
                  </div>

                  <div class="rec-chat-hint" *ngIf="recChatMessages(rec.mentorId).length === 0">
                    Ask something like: “What should I prepare for a first session?”
                  </div>

                  <div class="rec-chat-input">
                    <input
                      class="input"
                      placeholder="Ask a question…"
                      [value]="recChatInput(rec.mentorId)"
                      (input)="setRecChatInput(rec.mentorId, $any($event.target).value)"
                      (keydown.enter)="sendRecChat(rec.mentorId)">
                    <button
                      class="btn btn-primary btn-sm"
                      [disabled]="recChatLoading(rec.mentorId) || !recChatInput(rec.mentorId).trim()"
                      (click)="sendRecChat(rec.mentorId)">
                      {{ recChatLoading(rec.mentorId) ? 'Sending…' : 'Send' }}
                    </button>
                  </div>
                </div>
              </div>

              <button
                class="btn btn-primary btn-sm rec-btn"
                [disabled]="hasRequestFor(rec.mentorId) || requestingId() === rec.mentorId"
                (click)="sendRequest(rec.mentorId)">
                {{ hasRequestFor(rec.mentorId) ? '✓ Requested' :
                   requestingId() === rec.mentorId ? 'Sending...' : 'Request Mentor' }}
              </button>

            </div>
          </div>
        </ng-container>
      </div>

    </div>
  `,
    styleUrls: ['../mentorship-shared.scss']
})
export class MenteeViewComponent implements OnInit {
    private mentorshipApi = inject(MentorshipApiService);
  private userApi = inject(UserApiService);

  private userNameById = signal<Record<string, string>>({});
  

  displayName = signal<string>('');
  activeRoomName = signal<string | null>(null);

  recommendations = signal<MentorScoreDTO[]>([]);
  loadingRecommendations = signal(false);
  recommendationsError = signal<string | null>(null);

  openRecChatMentorId = signal<string | null>(null);
  recChatByMentorId = signal<Record<string, RecChatMessage[]>>({});
  recChatInputByMentorId = signal<Record<string, string>>({});
  recChatLoadingByMentorId = signal<Record<string, boolean>>({});
  recChatErrorByMentorId = signal<Record<string, string | null>>({});

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

    mentors: Mentor[] = [];
  realMentors = signal<Mentor[]>([]);
    myRequests = signal<MentorRequest[]>([]);

    myRequestsSearchQuery = signal('');
    myRequestsSort = signal<'newest' | 'oldest' | 'pending-first'>('newest');

    displayedMyRequests = () => {
      const q = this.myRequestsSearchQuery().toLowerCase().trim();
      let rows = [...this.myRequests()];

      if (q) {
        rows = rows.filter(r => {
          const mentorLabel = this.userLabel(r.mentorId).toLowerCase();
          const mentorId = (r.mentorId || '').toLowerCase();
          return mentorLabel.includes(q) || mentorId.includes(q);
        });
      }

      const time = (r: MentorRequest) => {
        const t = Date.parse(r.createdAt || '');
        return isNaN(t) ? 0 : t;
      };

      const mode = this.myRequestsSort();
      if (mode === 'oldest') {
        rows.sort((a, b) => time(a) - time(b));
      } else if (mode === 'pending-first') {
        rows.sort((a, b) => {
          const ap = a.status === 'PENDING' ? 0 : 1;
          const bp = b.status === 'PENDING' ? 0 : 1;
          if (ap !== bp) return ap - bp;
          return time(b) - time(a);
        });
      } else {
        rows.sort((a, b) => time(b) - time(a));
      }

      return rows;
    };
    sessionsByRequest = signal<Map<string, MentorSession[]>>(new Map());
    upcomingSession = signal<MentorSession | null>(null);
    requestingId = signal<string | null>(null);
    expandedRequestId = signal<string | null>(null);
    errorMessage = signal<string | null>(null);
    successMessage = signal<string | null>(null);
    activeFilter = signal<'all' | 'available'>('all');
    searchQuery = signal('');
    sortBy = signal('rating');
// mentor per page pagination
    readonly mentorPageSize = 3;
    mentorPage = signal(0);

    mentorTotalPages = () => Math.max(1, Math.ceil(this.displayedMentors().length / this.mentorPageSize));
    mentorPageItems = () => this.buildPageItems(this.mentorPage(), this.mentorTotalPages());

    pagedMentors = () => {
      const rows = this.displayedMentors();
      const totalPages = this.mentorTotalPages();
      const page = this.clampPage(this.mentorPage(), totalPages);
      const start = page * this.mentorPageSize;
      return rows.slice(start, start + this.mentorPageSize);
    };

    displayedMentors = () => {
    let list = [...this.realMentors()];

        // search
        const q = this.searchQuery().toLowerCase().trim();
        if (q) {
            list = list.filter(m =>
                m.name.toLowerCase().includes(q) ||
                m.company.toLowerCase().includes(q) ||
                m.expertise.some(e => e.toLowerCase().includes(q)) ||
                m.title.toLowerCase().includes(q)
            );
        }

        // filter
        if (this.activeFilter() === 'available') list = list.filter(m => m.available);

        // sort
  if (this.sortBy() === 'rating') list.sort((a, b) => (b.averageRating ?? b.rating) - (a.averageRating ?? a.rating));
  if (this.sortBy() === 'sessions') list.sort((a, b) => (b.completedSessions ?? b.sessions) - (a.completedSessions ?? a.sessions));
        if (this.sortBy() === 'price_asc') list.sort((a, b) => a.price - b.price);
        if (this.sortBy() === 'price_desc') list.sort((a, b) => b.price - a.price);

        return list;
    };

    setMentorPage(page: number): void {
      this.mentorPage.set(this.clampPage(page, this.mentorTotalPages()));
    }

    setMyRequestsSearch(event: Event) {
      this.myRequestsSearchQuery.set(String((event.target as HTMLInputElement).value || ''));
    }

    setMyRequestsSort(event: Event) {
      const next = String((event.target as HTMLSelectElement).value || 'newest') as 'newest' | 'oldest' | 'pending-first';
      this.myRequestsSort.set(next);
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

    ngOnInit() {
      this.loadMentors();
      this.loadMyRequests();
      this.loadRecommendations();

    }

    loadMentors() {
      this.mentorshipApi.getMentors().subscribe({
        next: (res) => {
          this.mentors = (res.content || []).map((user: any) => {
            const initials = (user.firstName?.[0] || '') + (user.lastName?.[0] || '');
            return {
              id: user.id,
              name: user.firstName + ' ' + user.lastName,
              initials,
              avatar: user.avatarUrl || '',
              title: user.status || '', // You can adjust this if you want a different field
              company: user.city || '',
              expertise: user.skills || [],
              rating: user.karmaPoints || 5, // Placeholder, adjust if you have a real rating
              reviews: user.isVerified ? 1 : 0, // Placeholder, adjust as needed
              sessions: 0, // Not available in UserResponse
              available: user.status === 'ACTIVE',
              price: 0, // Not available in UserResponse
              bio: user.bio || '',
              nextAvailable: '', // Not available in UserResponse
              email: user.email,
              experiencesJson: user.experiencesJson,
              isVerified: user.isVerified
            };
          });

          this.realMentors.set(this.mentors);
          this.loadMentorStats(this.mentors);
          this.loadMyRatings();
        },
        error: () => {
          this.mentors = [];
          this.realMentors.set([]);
          this.showError('Failed to load mentors.');
        }
      });
    }

    loadMyRequests() {
      this.userApi.getCurrentUser().subscribe({
        next: (me) => {
          this.displayName.set(`${me.firstName ?? ''} ${me.lastName ?? ''}`.trim() || me.email || 'User');
          this.sessionsByRequest.set(new Map());
          this.upcomingSession.set(null);
          this.refreshCalendarEvents();
          this.mentorshipApi.getRequestsByMentee(me.id).subscribe({
            next: (requests) => {
                this.myRequests.set(requests);
                this.prefetchUserNames(requests.map(r => r.mentorId));
                // load sessions for each accepted request
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
                                // set upcoming session banner
                                const scheduled = sessions.find(s => s.status === 'SCHEDULED');
                                if (scheduled) this.upcomingSession.set(scheduled);

                          // rating is allowed even without sessions
                          this.realMentors.update(list => list.map(m =>
                            m.id === r.mentorId ? { ...m, canRate: true } : m
                          ));

                                this.refreshCalendarEvents();
                            }
                        });
                    });

                this.refreshCalendarEvents();
            },
            error: () => {}
          });
        },
        error: () => {}
      });
    }

    loadRecommendations() {
      this.recommendationsError.set(null);
      this.loadingRecommendations.set(true);

      this.mentorshipApi.getRecommendations().subscribe({
        next: (recs) => {
          this.recommendations.set(recs);
          this.loadingRecommendations.set(false);
        },
        error: () => {
          this.loadingRecommendations.set(false);
          this.recommendationsError.set('Failed to load recommendations (check login / backend).');
        }
      });
    }

    isRecChatOpen(mentorId: string): boolean {
      return this.openRecChatMentorId() === mentorId;
    }

    toggleRecChat(mentorId: string): void {
      this.recChatErrorByMentorId.update(curr => ({ ...curr, [mentorId]: null }));
      this.openRecChatMentorId.set(this.isRecChatOpen(mentorId) ? null : mentorId);
    }

    recChatMessages(mentorId: string): RecChatMessage[] {
      return this.recChatByMentorId()[mentorId] ?? [];
    }

    recChatInput(mentorId: string): string {
      return this.recChatInputByMentorId()[mentorId] ?? '';
    }

    setRecChatInput(mentorId: string, value: string): void {
      this.recChatInputByMentorId.update(curr => ({ ...curr, [mentorId]: value }));
    }

    recChatLoading(mentorId: string): boolean {
      return Boolean(this.recChatLoadingByMentorId()[mentorId]);
    }

    recChatError(mentorId: string): string | null {
      return this.recChatErrorByMentorId()[mentorId] ?? null;
    }

    sendRecChat(mentorId: string): void {
      if (this.recChatLoading(mentorId)) return;

      const text = this.recChatInput(mentorId).trim();
      if (!text) return;
      if (text.length > 800) {
        this.recChatErrorByMentorId.update(curr => ({ ...curr, [mentorId]: 'Message too long (max 800 characters).' }));
        return;
      }

      this.recChatErrorByMentorId.update(curr => ({ ...curr, [mentorId]: null }));
      this.setRecChatInput(mentorId, '');

      this.recChatByMentorId.update(curr => ({
        ...curr,
        [mentorId]: [...(curr[mentorId] ?? []), { role: 'user', text }]
      }));
      this.recChatLoadingByMentorId.update(curr => ({ ...curr, [mentorId]: true }));

      this.mentorshipApi.chatRecommendation(mentorId, text).subscribe({
        next: (res) => {
          const reply = (res?.reply ?? '').trim();
          if (reply) {
            this.recChatByMentorId.update(curr => ({
              ...curr,
              [mentorId]: [...(curr[mentorId] ?? []), { role: 'ai', text: reply }]
            }));
          } else {
            this.recChatErrorByMentorId.update(curr => ({ ...curr, [mentorId]: 'No reply from AI.' }));
          }
          this.recChatLoadingByMentorId.update(curr => ({ ...curr, [mentorId]: false }));
        },
        error: () => {
          this.recChatLoadingByMentorId.update(curr => ({ ...curr, [mentorId]: false }));
          this.recChatErrorByMentorId.update(curr => ({ ...curr, [mentorId]: 'Failed to chat with AI (check backend / GEMINI_API_KEY).' }));
        }
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

        const scheduled = sessions.filter(s => s.status === 'SCHEDULED');
        const events: EventInput[] = scheduled.map(s => ({
            id: s.id,
            title: 'Mentorship Session',
            start: s.scheduledAt,
            // No external navigation: sessions are joined in-app via Jitsi embed.
        }));

        this.calendarEvents.set(events);
        this.calendarOptions.update(opts => ({ ...opts, events }));
    }

    getSessionsForRequest(requestId: string): MentorSession[] {
        return this.sessionsByRequest().get(requestId) ?? [];
    }

    toggleSessions(requestId: string) {
        this.expandedRequestId.set(
            this.expandedRequestId() === requestId ? null : requestId
        );
    }

    sendRequest(mentorId: string) {
        this.clearMessages();
        this.requestingId.set(mentorId);
        this.mentorshipApi.sendRequest({ mentorId }).subscribe({
            next: (req) => {
                this.myRequests.update(reqs => [...reqs, req]);
                this.requestingId.set(null);
                this.showSuccess('Request sent successfully!');
            },
            error: (err) => {
                this.requestingId.set(null);
                this.showError(err.error?.error ?? 'Failed to send request.');
            }
        });
    }

    cancelRequest(requestId: string) {
      const ok = window.confirm('Are you sure? This will delete the request and all its sessions.');
      if (!ok) return;
        this.mentorshipApi.deleteRequest(requestId).subscribe({
            next: () => {
                this.myRequests.update(reqs => reqs.filter(r => r.id !== requestId));
                this.showSuccess('Request cancelled.');
            },
            error: () => this.showError('Failed to cancel request.')
        });
    }

    cancelSession(sessionId: string) {
        this.mentorshipApi.cancelSession(sessionId).subscribe({
            next: () => {
                this.upcomingSession.set(null);
                // update session status in the map
                this.sessionsByRequest.update(map => {
                    const newMap = new Map(map);
                    newMap.forEach((sessions, key) => {
                        newMap.set(key, sessions.map(s =>
                            s.id === sessionId ? { ...s, status: 'CANCELLED' as const } : s
                        ));
                    });
                    return newMap;
                });
          this.refreshCalendarEvents();
                this.showSuccess('Session cancelled.');
            },
            error: () => this.showError('Failed to cancel session.')
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

    upcomingMentorName(): string {
      const session = this.upcomingSession();
      if (!session) return '';
      const req = this.myRequests().find(r => r.id === session.requestId);
      if (!req) return 'Mentor';
      return this.userLabel(req.mentorId);
    }

    hasRequestFor(mentorId: string): boolean {
        return this.myRequests().some(r => r.mentorId === mentorId && r.status === 'PENDING');
    }

    onRateSubmitted(event: { mentorId: string; stars: number; comment: string }) {
      this.mentorshipApi.rateMentor(
        event.mentorId,
        event.stars,
        event.comment,
        this.findCompletedSessionId(event.mentorId)
      ).subscribe({
        next: () => {
          this.realMentors.update(list => list.map(m =>
            m.id === event.mentorId
              ? { ...m, myRatingStars: event.stars, myRatingComment: event.comment }
              : m
          ));
          this.refreshOneMentorStats(event.mentorId);
          this.showSuccess('Rating saved!');
        },
        error: (err) => this.showError(err.error?.error ?? 'Failed to submit rating.')
      });
    }

    onUnrate(mentorId: string) {
      this.mentorshipApi.unrateMentor(mentorId).subscribe({
        next: () => {
          this.realMentors.update(list => list.map(m =>
            m.id === mentorId
              ? { ...m, myRatingStars: null, myRatingComment: null }
              : m
          ));
          this.refreshOneMentorStats(mentorId);
          this.showSuccess('Rating removed.');
        },
        error: () => this.showError('Failed to remove rating.')
      });
    }

    findCompletedSessionId(mentorId: string): string | null {
      for (const [requestId, sessions] of this.sessionsByRequest()) {
        const req = this.myRequests().find(r => r.id === requestId && r.mentorId === mentorId);
        if (req) {
          const completed = sessions.find(s => s.status === 'COMPLETED');
          if (completed) return completed.id;
        }
      }
      return null;
    }

    private loadMentorStats(mentors: Mentor[]) {
      mentors.forEach(m => {
        this.mentorshipApi.getMentorStats(m.id).subscribe({
          next: (stats) => {
            // update the mentor in the list with real stats
            this.realMentors.update(list => list.map(mentor =>
              mentor.id === m.id ? {
                ...mentor,
                completedSessions: stats.completedSessions,
                averageRating: stats.averageRating,
                totalRatings: stats.totalRatings,
                canRate: true
              } : mentor
            ));
          },
          error: () => {} // silent if stats not available
        });
      });
    }

    private refreshOneMentorStats(mentorId: string) {
      this.mentorshipApi.getMentorStats(mentorId).subscribe({
        next: (stats) => {
          this.realMentors.update(list => list.map(m =>
            m.id === mentorId
              ? { ...m, completedSessions: stats.completedSessions, averageRating: stats.averageRating, totalRatings: stats.totalRatings }
              : m
          ));
        },
        error: () => {}
      });
    }

    private loadMyRatings() {
      this.mentorshipApi.getMyRatings().subscribe({
        next: (ratings) => {
          const byMentorId: Record<string, { stars: number; comment: string | null }> = {};
          for (const r of ratings || []) {
            if (!r?.mentorId) continue;
            byMentorId[r.mentorId] = { stars: r.stars, comment: r.comment };
          }

          this.realMentors.update(list => list.map(m => {
            const mine = byMentorId[m.id];
            if (!mine) return m;
            return { ...m, myRatingStars: mine.stars, myRatingComment: mine.comment };
          }));
        },
        error: () => {}
      });
    }

    setFilter(f: 'all' | 'available') { this.activeFilter.set(f); this.mentorPage.set(0); }
    setSortBy(s: string) { this.sortBy.set(s); this.mentorPage.set(0); }

    private showSuccess(msg: string) {
        this.successMessage.set(msg);
        setTimeout(() => this.successMessage.set(null), 3000);
    }

    private showError(msg: string) {
        this.errorMessage.set(msg);
        setTimeout(() => this.errorMessage.set(null), 4000);
    }

    private clearMessages() {
        this.errorMessage.set(null);
        this.successMessage.set(null);
    }

    howItWorks = [
      { icon: '🔍', title: 'Browse Mentors', desc: 'Browse all mentors or only available mentors.' },
        { icon: '📅', title: 'Book a Session', desc: 'Choose a time slot that works for you and your mentor.' },
        { icon: '🎙️', title: 'Meet & Practice', desc: 'Join a live 1:1 video session with your mentor.' },
        { icon: '📊', title: 'Get Feedback', desc: 'Receive personalized feedback and an action plan.' },
    ];

    
}