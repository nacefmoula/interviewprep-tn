import {
    Component,
    signal,
    inject,
    OnInit,
    DestroyRef,
} from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { SidebarComponent } from "../sidebar/sidebar.component";
import { TopbarComponent } from "../topbar/topbar.component";
import { CommonModule } from "@angular/common";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CurrentUserStoreService } from "../../core/services/current-user-store.service";
import { UserProfile } from "../../core/services/user-api.service";
import { Observable, asyncScheduler } from "rxjs";
import { observeOn, shareReplay } from "rxjs/operators";

@Component({
    selector: "app-shell",
    standalone: true,
    imports: [RouterOutlet, SidebarComponent, TopbarComponent, CommonModule],
    template: `
        <div class="shell" [class.sidebar-collapsed]="sidebarCollapsed()">
            <app-sidebar
                [collapsed]="sidebarCollapsed()"
                [currentUser]="currentUser$ | async"
                (toggleSidebar)="toggleSidebar()"
            ></app-sidebar>

            <div class="shell-content">
                <app-topbar
                    [sidebarCollapsed]="sidebarCollapsed()"
                    [currentUser]="currentUser$ | async"
                    (toggleSidebar)="toggleSidebar()"
                ></app-topbar>

                <main class="main-content">
                    <router-outlet></router-outlet>
                </main>
            </div>

            <div
                class="mobile-overlay"
                *ngIf="!sidebarCollapsed()"
                (click)="toggleSidebar()"
            ></div>
        </div>
    `,
    styles: [
        `
            .shell {
                display: flex;
                min-height: 100vh;
                background: var(--color-bg);
            }

            .shell-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-width: 0;
                margin-left: var(--sidebar-width);
                transition: margin-left var(--duration-base) var(--ease-out);
            }

            .shell.sidebar-collapsed .shell-content {
                margin-left: 72px;
            }

            .main-content {
                flex: 1;
                padding: var(--space-8) var(--page-padding);
                overflow-y: auto;
                overflow-x: hidden;
            }

            .mobile-overlay {
                display: none;
            }

            @media (max-width: 768px) {
                .shell-content {
                    margin-left: 0 !important;
                }

                .mobile-overlay {
                    display: block;
                    position: fixed;
                    inset: 0;
                    background: var(--surface-overlay);
                    z-index: calc(var(--z-sticky) - 1);
                    backdrop-filter: var(--blur-sm);
                    -webkit-backdrop-filter: var(--blur-sm);
                    animation: scrim-in var(--duration-fast) var(--ease-out);
                }
                @keyframes scrim-in {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }

                .main-content {
                    padding: var(--space-4) var(--space-4);
                }
            }
        `,
    ],
})
export class ShellComponent implements OnInit {
    sidebarCollapsed = signal(false);

    private currentUserStore = inject(CurrentUserStoreService);
    private destroyRef = inject(DestroyRef);

    readonly currentUser$: Observable<UserProfile | null>;

    constructor() {
        // Schedule emissions to avoid ExpressionChangedAfterItHasBeenCheckedError
        // when Keycloak/fetch-based HTTP resolves very quickly during initial render.
        this.currentUser$ = this.currentUserStore.currentUser$.pipe(
            observeOn(asyncScheduler),
            shareReplay({ bufferSize: 1, refCount: true }),
        );
    }

    ngOnInit(): void {
        this.currentUserStore
            .loadCurrentUser()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    toggleSidebar() {
        this.sidebarCollapsed.update((v) => !v);
    }
}
