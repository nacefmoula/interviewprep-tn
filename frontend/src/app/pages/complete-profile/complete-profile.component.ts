import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";
import { UserApiService } from "../../core/services/user-api.service";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";

@Component({
    selector: "app-complete-profile",
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="cp-page">
            <div class="cp-card">
                <div class="cp-logo">
                    <div class="logo-icon">i</div>
                    <span>InterviewPrepTN</span>
                </div>

                <div class="cp-header">
                    <h1>Welcome to InterviewPrepTN! 🎉</h1>
                    <p>
                        Complete your profile to get started. This takes less
                        than a minute.
                    </p>
                </div>

                <div *ngIf="error" class="cp-error">
                    {{ error }}
                </div>

                <form (ngSubmit)="submit()" class="cp-form">
                    <div class="cp-row">
                        <div class="cp-field">
                            <label>First Name *</label>
                            <input
                                class="input"
                                type="text"
                                [(ngModel)]="form.firstName"
                                name="firstName"
                                placeholder="e.g. Amara"
                                required
                            />
                        </div>
                        <div class="cp-field">
                            <label>Last Name *</label>
                            <input
                                class="input"
                                type="text"
                                [(ngModel)]="form.lastName"
                                name="lastName"
                                placeholder="e.g. Osei"
                                required
                            />
                        </div>
                    </div>

                    <div class="cp-field">
                        <label>Phone Number</label>
                        <input
                            class="input"
                            type="tel"
                            [(ngModel)]="form.phoneNumber"
                            name="phoneNumber"
                            placeholder="e.g. +21612345678"
                        />
                    </div>

                    <div class="cp-field">
                        <label>City</label>
                        <input
                            class="input"
                            type="text"
                            [(ngModel)]="form.city"
                            name="city"
                            placeholder="e.g. Tunis"
                        />
                    </div>

                    <div class="cp-field">
                        <label>Preferred Industry</label>
                        <select
                            class="input"
                            [(ngModel)]="form.preferredIndustry"
                            name="preferredIndustry"
                        >
                            <option value="">Select your industry</option>
                            <option value="TECHNOLOGY">Technology</option>
                            <option value="FINANCE">Finance</option>
                            <option value="HEALTHCARE">Healthcare</option>
                            <option value="EDUCATION">Education</option>
                            <option value="MARKETING">Marketing</option>
                            <option value="ENGINEERING">Engineering</option>
                            <option value="LEGAL">Legal</option>
                            <option value="CONSULTING">Consulting</option>
                            <option value="MEDIA">Media</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>

                    <div class="cp-field">
                        <label>Preferred Language</label>
                        <select
                            class="input"
                            [(ngModel)]="form.preferredLanguage"
                            name="preferredLanguage"
                        >
                            <option value="fr">Français</option>
                            <option value="en">English</option>
                            <option value="ar">العربية</option>
                        </select>
                    </div>

                    <div class="cp-field">
                        <label>Skills</label>
                        <div class="skills-chip-grid">
                            <button
                                type="button"
                                class="skill-chip"
                                *ngFor="let skill of predefinedSkills"
                                [class.selected]="isSkillSelected(skill)"
                                (click)="toggleSkill(skill)"
                            >
                                {{ skill }}
                            </button>
                        </div>

                        <div class="custom-skill-row">
                            <input
                                class="input"
                                type="text"
                                [(ngModel)]="customSkill"
                                name="customSkill"
                                placeholder="Add your own skill"
                                (keydown.enter)="addCustomSkill($event)"
                            />
                            <button
                                type="button"
                                class="btn btn-ghost"
                                (click)="addCustomSkill()"
                            >
                                Add
                            </button>
                        </div>

                        <div
                            class="selected-skills"
                            *ngIf="selectedSkills.length"
                        >
                            <span
                                class="selected-skill"
                                *ngFor="let skill of selectedSkills"
                            >
                                {{ skill }}
                                <button
                                    type="button"
                                    (click)="removeSkill(skill)"
                                >
                                    ×
                                </button>
                            </span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        class="btn btn-primary"
                        style="width: 100%; margin-top: 0.5rem;"
                        [disabled]="loading"
                    >
                        {{
                            loading
                                ? "Setting up your account..."
                                : "Complete Profile →"
                        }}
                    </button>
                </form>
            </div>
        </div>
    `,
    styles: [
        `
            .cp-page {
                min-height: 100vh;
                background: var(--color-bg);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: var(--space-8) var(--space-4);
            }

            .cp-card {
                width: 100%;
                max-width: 520px;
                background: var(--color-surface);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                padding: var(--space-8);
                box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
            }

            .cp-logo {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                margin-bottom: var(--space-6);
                font-family: var(--font-display);
                font-size: 1.25rem;
                color: var(--color-text);
            }

            .logo-icon {
                width: 32px;
                height: 32px;
                border-radius: var(--radius-md);
                background: linear-gradient(
                    135deg,
                    var(--teal-500),
                    var(--cyan-400)
                );
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 700;
                font-style: italic;
            }

            .cp-logo strong {
                color: var(--teal-600);
                font-weight: 700;
            }

            .cp-header {
                margin-bottom: var(--space-6);
            }

            .cp-header h1 {
                font-size: var(--text-2xl);
                font-weight: 700;
                color: var(--color-text);
                margin: 0 0 var(--space-2);
            }

            .cp-header p {
                font-size: var(--text-sm);
                color: var(--color-text-muted);
                margin: 0;
            }

            .cp-error {
                background: var(--error-50);
                color: var(--error-500);
                border: 1px solid var(--error-500);
                border-radius: var(--radius-md);
                padding: var(--space-3) var(--space-4);
                font-size: var(--text-sm);
                margin-bottom: var(--space-4);
            }

            .cp-form {
                display: flex;
                flex-direction: column;
                gap: var(--space-4);
            }

            .cp-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: var(--space-4);
            }

            .cp-field {
                display: flex;
                flex-direction: column;
                gap: var(--space-2);
            }

            .cp-field label {
                font-size: var(--text-sm);
                font-weight: 500;
                color: var(--color-text);
            }

            .skills-chip-grid {
                display: flex;
                flex-wrap: wrap;
                gap: var(--space-2);
            }

            .skill-chip {
                border: 1px solid var(--color-border);
                background: var(--color-surface);
                color: var(--color-text);
                border-radius: var(--radius-full);
                padding: 0.35rem 0.75rem;
                font-size: var(--text-xs);
                cursor: pointer;
            }

            .skill-chip.selected {
                background: var(--teal-50);
                border-color: var(--teal-300);
                color: var(--teal-700);
                font-weight: 600;
            }

            .custom-skill-row {
                margin-top: var(--space-2);
                display: flex;
                gap: var(--space-2);
            }

            .selected-skills {
                margin-top: var(--space-2);
                display: flex;
                flex-wrap: wrap;
                gap: var(--space-2);
            }

            .selected-skill {
                display: inline-flex;
                align-items: center;
                gap: 0.35rem;
                background: var(--teal-50);
                color: var(--teal-700);
                border: 1px solid var(--teal-200);
                border-radius: var(--radius-full);
                padding: 0.3rem 0.65rem;
                font-size: var(--text-xs);
            }

            .selected-skill button {
                border: none;
                background: transparent;
                cursor: pointer;
                color: var(--teal-700);
                font-weight: 700;
                line-height: 1;
            }

            @media (max-width: 480px) {
                .cp-row {
                    grid-template-columns: 1fr;
                }
                .cp-card {
                    padding: var(--space-6);
                }
            }
        `,
    ],
})
export class CompleteProfileComponent implements OnInit {
    private authService = inject(AuthService);
    private router = inject(Router);
    private http = inject(HttpClient);

    loading = false;
    error = "";

    form = {
        firstName: "",
        lastName: "",
        phoneNumber: "",
        city: "",
        preferredIndustry: "",
        preferredLanguage: "fr",
    };

    predefinedSkills = [
        "Java",
        "Spring Boot",
        "Angular",
        "TypeScript",
        "SQL",
        "Docker",
        "Kubernetes",
        "AWS",
        "Git",
        "REST API",
    ];

    selectedSkills: string[] = [];
    customSkill = "";

    ngOnInit(): void {
        if (!this.authService.isAuthenticated()) {
            this.authService.login();
            return;
        }
        this.form.firstName = this.authService.getFirstName();
        this.form.lastName = this.authService.getLastName();
    }

    async submit(): Promise<void> {
        if (!this.form.firstName || !this.form.lastName) {
            this.error = "First name and last name are required.";
            return;
        }

        this.loading = true;
        this.error = "";

        try {
            const token = await this.authService.getToken();
            const payload = {
                email: this.authService.getEmail(),
                firstName: this.form.firstName,
                lastName: this.form.lastName,
                phoneNumber: this.form.phoneNumber,
                city: this.form.city,
                preferredIndustry: this.form.preferredIndustry || null,
                preferredLanguage: this.form.preferredLanguage,
                skills: this.selectedSkills,
            };

            this.http
                .post(`${environment.apiUrl}/api/users/register`, payload, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                .subscribe({
                    next: () => {
                        this.router.navigate(["/dashboard"]);
                    },
                    error: (err) => {
                        console.error("Registration error:", err);
                        if (err.status === 409) {
                            this.router.navigate(["/dashboard"]);
                        } else if (err.status === 0) {
                            this.error =
                                "Cannot connect to server. Make sure Spring Boot is running.";
                        } else {
                            this.error = `Registration failed (${err.status}): ${err.error?.message || "Please try again."}`;
                        }
                        this.loading = false;
                    },
                });
        } catch (e) {
            this.error = "Authentication error. Please refresh and try again.";
            this.loading = false;
        }
    }

    isSkillSelected(skill: string): boolean {
        return this.selectedSkills.includes(skill);
    }

    toggleSkill(skill: string): void {
        if (this.isSkillSelected(skill)) {
            this.selectedSkills = this.selectedSkills.filter(
                (s) => s !== skill,
            );
            return;
        }
        this.selectedSkills = [...this.selectedSkills, skill];
    }

    addCustomSkill(event?: Event): void {
        if (event) {
            event.preventDefault();
        }

        const normalized = this.customSkill.trim();
        if (!normalized) {
            return;
        }

        if (!this.selectedSkills.includes(normalized)) {
            this.selectedSkills = [...this.selectedSkills, normalized];
        }
        this.customSkill = "";
    }

    removeSkill(skill: string): void {
        this.selectedSkills = this.selectedSkills.filter((s) => s !== skill);
    }
}
