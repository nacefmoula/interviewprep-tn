import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { MenteeViewComponent } from './mentee/mentee-view.component';
import { MentorViewComponent } from './mentor/mentor-view.component';
import { AdminViewComponent } from './admin-mentorship/admin-view.component';

@Component({
  selector: 'app-mentorship',
  standalone: true,
  imports: [CommonModule, MenteeViewComponent, MentorViewComponent, AdminViewComponent],
  template: `
    <app-admin-mentorship-view *ngIf="isAdmin"></app-admin-mentorship-view>
    <app-mentor-view *ngIf="!isAdmin && isMentor"></app-mentor-view>
    <app-mentee-view *ngIf="!isAdmin && !isMentor"></app-mentee-view>
  `
})
export class MentorshipComponent {
  private authService = inject(AuthService);

  private get roles(): string[] {
    return this.authService.getUserRoles().map((r) => String(r).toUpperCase());
  }

  get isAdmin(): boolean {
    return this.roles.includes('ADMIN') || this.roles.includes('ROLE_ADMIN');
  }

  get isMentor(): boolean {
    return this.roles.includes('MENTOR') || this.roles.includes('ROLE_MENTOR');
  }
}