import {
    Component,
    inject,
    OnInit,
    ChangeDetectorRef
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { SectionHeaderComponent } from "../../shared/components/section-header/section-header.component";
import {
    BadgeComponent,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    SkeletonComponent,
} from "../../shared/components/ui";
import { environment } from "../../../environments/environment";
import { Router } from "@angular/router";
import {
    CurrentUserStoreService,
    UserApiService,
    UserProfile,
} from "../../core/services";
import { AuthService } from "../../core/auth/auth.service";

type CompletionState = "complete" | "incomplete" | "pending" | "rejected";

interface CompletionItem {
    key: string;
    label: string;
    points: number;
    state: CompletionState;
}

interface CompletionSection {
    title: string;
    items: CompletionItem[];
    totalPoints: number;
    earnedPoints: number;
}

interface ExperienceItem {
    id: string;
    title: string;
    company: string;
    location?: string;
    employmentType?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description?: string;
}

interface EducationItem {
    id: string;
    school: string;
    degree: string;
    fieldOfStudy?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description?: string;
}

interface AvatarUploadResponse {
    url: string;
}

type ActiveEditSection =
    | "photo"
    | "about"
    | "skills"
    | "experience"
    | "education"
    | "preferences"
    | null;

@Component({
    selector: "app-profile",
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        SectionHeaderComponent,
        BadgeComponent,
        ButtonComponent,
        CardComponent,
        EmptyStateComponent,
        SkeletonComponent,
    ],
    templateUrl: "./profile.component.html",
    styleUrls: ["./profile.component.css"],
})
export class ProfileComponent implements OnInit {
    private http = inject(HttpClient);
    private userApi = inject(UserApiService);
    private currentUserStore = inject(CurrentUserStoreService);
    private authService = inject(AuthService);
    private cdr = inject(ChangeDetectorRef);
    private router = inject(Router);

    user: UserProfile | null = null;
    profileLoading = true;
    profileLoadError = "";
    initials = "";
    memberSinceLabel = "";
    editing = false;
    saving = false;
    saveError = "";
    saveSuccess = false;
    localDraftNotice = "";
    activeEditSection: ActiveEditSection = null;
    cvUploadLoading = false;
    cvUploadError = "";
    cvUploadSuccess = "";
    selectedCvFileName = "";
    cvLink = "";
    cvFileName = "";
    preferredLanguageLabel = "";
    completionScore = 0;
    completionSections: CompletionSection[] = [];
    avatarInputMode: "upload" | "url" = "upload";
    avatarUploadLoading = false;
    avatarUploadError = "";
    avatarPreviewUrl = "";
    selectedAvatarFile: File | null = null;
    private avatarObjectUrl: string | null = null;
    selectedSkills: string[] = [];
    experiences: ExperienceItem[] = [];
    educations: EducationItem[] = [];
    editingExperienceIndex: number | null = null;
    editingEducationIndex: number | null = null;
    showExperienceForm = false;
    showEducationForm = false;
    experienceForm: ExperienceItem = this.createEmptyExperience();
    educationForm: EducationItem = this.createEmptyEducation();

    editForm = {
        firstName: "",
        lastName: "",
        bio: "",
        avatarUrl: "",
        phoneNumber: "",
        city: "",
        preferredIndustry: "",
        preferredLanguage: "fr",
        skills: [] as string[],
        emailNotificationsEnabled: true,
        pushNotificationsEnabled: false,
        profileVisible: true,
    };

    customSkill = "";
    suggestedSkills = [
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

    preferences = [
        { label: "Interview format", value: "Video call" },
        { label: "Preferred language", value: "Not set" },
        { label: "Session length", value: "45 min" },
        { label: "Availability", value: "Weekday evenings" },
        { label: "City", value: "Not set" },
    ];

    ngOnInit(): void {
        this.loadProfile();
    }

    loadProfile(): void {
        this.profileLoading = true;
        this.profileLoadError = "";
        this.userApi.getCurrentUser().subscribe({
            next: (user) => {
                this.profileLoading = false;

                if (!user || typeof user !== "object") {
                    this.profileLoadError = "Unexpected profile response.";
                    this.cdr.detectChanges();
                    return;
                }

                const normalized: UserProfile = {
                    ...(user as UserProfile),
                    skills: Array.isArray((user as UserProfile).skills)
                        ? (user as UserProfile).skills
                        : [],
                };

                this.user = normalized;

                try {
                    this.initials = this.computeInitials(
                        normalized.firstName,
                        normalized.lastName,
                    );
                    setTimeout(() => this.currentUserStore.setCurrentUser(normalized));
                    this.avatarPreviewUrl = normalized.avatarUrl || "";
                    this.selectedSkills = [...normalized.skills];
                    this.experiences = this.parseExperiences(normalized.experiencesJson);
          this.educations = this.parseEducations(normalized.educationsJson);
                    this.selectedCvFileName = this.extractFileNameFromUrl(
                        normalized.cvUrl || null,
                    );
                    this.refreshDerivedFields();
                    this.refreshCompletion();
                    this.syncPreferences();
                    this.cdr.detectChanges();
                } catch (e) {
                    console.error("Profile initialization error:", e);
                    this.cdr.detectChanges();
                }
            },
            error: (err) => {
                this.profileLoading = false;
                console.error("Profile load error:", err);
                if (err.status === 404) {
                    this.router.navigate(["/complete-profile"]);
                    return;
                }

                if (err.status === 0) {
                    this.profileLoadError =
                        "Failed to load profile (network/CORS).";
                } else if (err.status) {
                    this.profileLoadError = `Failed to load profile (HTTP ${err.status}).`;
                } else {
                    this.profileLoadError = "Failed to load profile.";
                }
                this.cdr.detectChanges();
            },
        });
    }

    syncPreferences(): void {
        if (!this.user) return;
        this.preferences = [
            { label: "Interview format", value: "Video call" },
            {
                label: "Preferred language",
                value: this.getLanguageLabel(this.user.preferredLanguage),
            },
            { label: "Session length", value: "45 min" },
            { label: "Availability", value: "Weekday evenings" },
            { label: "City", value: this.user.city || "Not set" },
        ];
    }

    toggleEdit(): void {
        if (this.editing) {
            this.saveProfile();
            return;
        }
        this.enterEditMode();
        this.activeEditSection = null;
    }

    openPhotoEditor(): void {
        this.enterEditMode();
        this.activeEditSection = "photo";
        this.scrollToEditSection("photo");
    }

    openAboutEditor(): void {
        this.enterEditMode();
        this.activeEditSection = "about";
        this.scrollToEditSection("about");
    }

    openSkillsEditor(): void {
        this.enterEditMode();
        this.activeEditSection = "skills";
        this.scrollToEditSection("skills");
    }

    openExperienceEditor(): void {
        this.enterEditMode();
        this.activeEditSection = "experience";
        this.startAddExperience();
        this.scrollToEditSection("experience");
    }

    openExperienceItemEditor(index: number): void {
        this.enterEditMode();
        this.activeEditSection = "experience";
        this.startEditExperience(index);
        this.scrollToEditSection("experience");
    }

    openEducationEditor(): void {
        this.enterEditMode();
        this.activeEditSection = "education";
        this.startAddEducation();
        this.scrollToEditSection("education");
    }

    openEducationItemEditor(index: number): void {
        this.enterEditMode();
        this.activeEditSection = "education";
        this.startEditEducation(index);
        this.scrollToEditSection("education");
    }

    openPreferencesEditor(): void {
        this.enterEditMode();
        this.activeEditSection = "preferences";
        this.scrollToEditSection("preferences");
    }

    saveProfile(): void {
        this.saving = true;
        this.saveError = "";
        this.saveSuccess = false;

        if (!this.user) {
            this.saving = false;
            return;
        }

        const payload = {
            firstName: this.editForm.firstName,
            lastName: this.editForm.lastName,
            phoneNumber: this.editForm.phoneNumber,
            city: this.editForm.city,
            bio: this.editForm.bio,
            avatarUrl: this.editForm.avatarUrl,
            preferredIndustry: this.editForm.preferredIndustry?.trim()
                ? this.editForm.preferredIndustry
                : null,
            preferredLanguage: this.editForm.preferredLanguage,
            emailNotificationsEnabled: this.editForm.emailNotificationsEnabled,
            pushNotificationsEnabled: this.editForm.pushNotificationsEnabled,
            profileVisible: this.editForm.profileVisible,
            educationsJson: this.serializeEducations(this.educations),
            experiencesJson: this.serializeExperiences(this.experiences),
            skills: this.selectedSkills,
        };

        this.userApi.updateCurrentUser(payload).subscribe({
            next: (updated) => {
                updated.skills = updated.skills || [];
                this.user = updated;
                this.initials = this.computeInitials(updated.firstName, updated.lastName);
                this.currentUserStore.setCurrentUser(updated);
                this.avatarPreviewUrl = updated.avatarUrl || "";
                this.avatarUploadLoading = false;
                this.avatarUploadError = "";
                this.selectedAvatarFile = null;
                this.clearAvatarObjectUrl();
                this.selectedSkills = [...updated.skills];
                this.editForm.skills = [...this.selectedSkills];
                this.experiences = this.parseExperiences(
                    updated.experiencesJson,
                );
                this.educations = this.parseEducations(updated.educationsJson);
                this.selectedCvFileName = this.extractFileNameFromUrl(
                    updated.cvUrl || null,
                );
                this.refreshDerivedFields();
                this.refreshCompletion();
                this.editing = false;
                this.localDraftNotice = "";
                this.activeEditSection = null;
                this.showExperienceForm = false;
                this.showEducationForm = false;
                this.saving = false;
                this.saveSuccess = true;
                this.syncPreferences();
                setTimeout(() => {
                    this.saveSuccess = false;
                }, 3000);
            },
            error: () => {
                this.saving = false;
                this.saveError = "Failed to save. Please try again.";
            },
        });
    }

    cancelEdit(): void {
        this.editing = false;
        this.localDraftNotice = "";
        this.activeEditSection = null;
        this.saveError = "";
        this.showExperienceForm = false;
        this.showEducationForm = false;
        this.editingExperienceIndex = null;
        this.editingEducationIndex = null;
        this.experienceForm = this.createEmptyExperience();
        this.educationForm = this.createEmptyEducation();
        if (this.user) {
            this.selectedSkills = [...(this.user.skills || [])];
            this.editForm.skills = [...this.selectedSkills];
            this.editForm.avatarUrl = this.user.avatarUrl || "";
            this.avatarPreviewUrl = this.user.avatarUrl || "";
            this.avatarUploadError = "";
            this.avatarUploadLoading = false;
            this.selectedAvatarFile = null;
            this.setAvatarInputMode(this.editForm.avatarUrl ? "url" : "upload");
            this.clearAvatarObjectUrl();
            this.experiences = this.parseExperiences(this.user.experiencesJson);
            this.educations = this.parseEducations(this.user.educationsJson);
            this.refreshDerivedFields();
            this.refreshCompletion();
        }
    }

    addSkill(event?: Event): void {
        if (event) {
            event.preventDefault();
        }

        const normalized = this.customSkill.trim();
        if (!normalized) {
            return;
        }

        if (!this.selectedSkills.includes(normalized)) {
            this.selectedSkills = [...this.selectedSkills, normalized];
            this.editForm.skills = [...this.selectedSkills];
            this.refreshCompletion();
        }
        this.customSkill = "";
    }

    removeSkill(skill: string): void {
        this.selectedSkills = this.selectedSkills.filter((s) => s !== skill);
        this.editForm.skills = [...this.selectedSkills];
        this.refreshCompletion();
    }

    toggleSuggestedSkill(skill: string): void {
        if (this.selectedSkills.includes(skill)) {
            this.removeSkill(skill);
            return;
        }
        this.selectedSkills = [...this.selectedSkills, skill];
        this.editForm.skills = [...this.selectedSkills];
        this.refreshCompletion();
    }

    hasSkill(skill: string): boolean {
        return this.selectedSkills.includes(skill);
    }

    setAvatarInputMode(mode: "upload" | "url"): void {
        this.avatarInputMode = mode;
        this.avatarUploadError = "";
        if (mode === "url") {
            this.clearAvatarObjectUrl();
            this.selectedAvatarFile = null;
            this.onAvatarUrlChange();
        }
    }

    onAvatarUrlChange(): void {
        this.clearAvatarObjectUrl();
        this.avatarUploadError = "";
        this.selectedAvatarFile = null;
        this.avatarPreviewUrl = this.editForm.avatarUrl?.trim() || "";
        this.refreshCompletion();
    }

    onAvatarFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) {
            return;
        }

        this.avatarUploadError = "";

        const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            this.avatarUploadError =
                "Only PNG, JPEG, and WEBP images are allowed.";
            input.value = "";
            return;
        }

        const maxSizeBytes = 5 * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            this.avatarUploadError = "Image size must be 5MB or less.";
            input.value = "";
            return;
        }

        this.selectedAvatarFile = file;
        this.clearAvatarObjectUrl();
        this.avatarObjectUrl = URL.createObjectURL(file);
        this.avatarPreviewUrl = this.avatarObjectUrl;
        this.uploadAvatar(file);
    }

    removeAvatar(): void {
        this.editForm.avatarUrl = "";
        this.avatarPreviewUrl = "";
        this.selectedAvatarFile = null;
        this.avatarUploadError = "";
        this.avatarUploadLoading = false;
        this.clearAvatarObjectUrl();
        this.refreshCompletion();
    }

    onCvFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) {
            return;
        }

        this.cvUploadError = "";

        if (file.type !== "application/pdf") {
            this.cvUploadError = "Only PDF files are allowed.";
            input.value = "";
            return;
        }

        const maxSizeBytes = 5 * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            this.cvUploadError = "CV size must be 5MB or less.";
            input.value = "";
            return;
        }

        this.uploadCv(file);
        input.value = "";
    }

    startAddExperience(): void {
        this.activeEditSection = "experience";
        this.localDraftNotice = "";
        this.showEducationForm = false;
        this.editingEducationIndex = null;
        this.editingExperienceIndex = null;
        this.experienceForm = this.createEmptyExperience();
        this.showExperienceForm = true;
    }

    startEditExperience(index: number): void {
        this.activeEditSection = "experience";
        this.localDraftNotice = "";
        this.showEducationForm = false;
        this.editingEducationIndex = null;
        this.editingExperienceIndex = index;
        this.experienceForm = { ...this.experiences[index] };
        this.showExperienceForm = true;
    }

    saveExperience(): void {
        if (!this.isValidExperience(this.experienceForm)) {
            return;
        }

        const normalized: ExperienceItem = {
            ...this.experienceForm,
            endDate: this.experienceForm.current
                ? ""
                : this.experienceForm.endDate,
        };

        if (this.editingExperienceIndex === null) {
            this.experiences = [...this.experiences, normalized];
        } else {
            this.experiences = this.experiences.map((exp, index) =>
                index === this.editingExperienceIndex ? normalized : exp,
            );
        }

        this.editingExperienceIndex = null;
        this.experienceForm = this.createEmptyExperience();
        this.showExperienceForm = false;
        this.localDraftNotice =
            "Experience saved locally. Click Save Changes to persist.";
        this.refreshCompletion();
    }

    removeExperience(index: number): void {
        this.experiences = this.experiences.filter((_, i) => i !== index);
        if (this.editingExperienceIndex === index) {
            this.cancelExperienceEdit();
        }
        this.refreshCompletion();
    }

    cancelExperienceEdit(): void {
        this.editingExperienceIndex = null;
        this.experienceForm = this.createEmptyExperience();
        this.showExperienceForm = false;
    }

    startAddEducation(): void {
        this.activeEditSection = "education";
        this.localDraftNotice = "";
        this.showExperienceForm = false;
        this.editingExperienceIndex = null;
        this.editingEducationIndex = null;
        this.educationForm = this.createEmptyEducation();
        this.showEducationForm = true;
    }

    startEditEducation(index: number): void {
        this.activeEditSection = "education";
        this.localDraftNotice = "";
        this.showExperienceForm = false;
        this.editingExperienceIndex = null;
        this.editingEducationIndex = index;
        this.educationForm = { ...this.educations[index] };
        this.showEducationForm = true;
    }

    saveEducation(): void {
        if (!this.isValidEducation(this.educationForm)) {
            return;
        }

        const normalized: EducationItem = {
            ...this.educationForm,
            endDate: this.educationForm.current
                ? ""
                : this.educationForm.endDate,
        };

        if (this.editingEducationIndex === null) {
            this.educations = [...this.educations, normalized];
        } else {
            this.educations = this.educations.map((edu, index) =>
                index === this.editingEducationIndex ? normalized : edu,
            );
        }

        this.editingEducationIndex = null;
        this.educationForm = this.createEmptyEducation();
        this.showEducationForm = false;
        this.localDraftNotice =
            "Education saved locally. Click Save Changes to persist.";
        this.refreshCompletion();
    }

    removeEducation(index: number): void {
        this.educations = this.educations.filter((_, i) => i !== index);

        if (this.editingEducationIndex === index) {
            this.cancelEducationEdit();
        }

        this.refreshCompletion();
    }

    cancelEducationEdit(): void {
        this.editingEducationIndex = null;
        this.educationForm = this.createEmptyEducation();
        this.showEducationForm = false;
    }

    getCompleteness(): number {
        return this.completionScore;
    }

    getInitials(): string {
        return this.initials;
    }

    getPlanVariant(): "primary" | "info" | "neutral" {
        const plan = (this.user?.plan || "").toUpperCase();
        if (plan === "PREMIUM") return "primary";
        if (plan === "STUDENT") return "info";
        return "neutral";
    }

    getRoleLabel(): string {
        const role = (this.user?.role || "").replace(/^ROLE_/, "");
        if (!role) return "";
        return role.charAt(0) + role.slice(1).toLowerCase();
    }

    getCompletionTone(): "success" | "primary" | "warning" {
        if (this.completionScore >= 80) return "success";
        if (this.completionScore >= 50) return "primary";
        return "warning";
    }

    private computeInitials(firstName?: string | null, lastName?: string | null): string {
        const first = firstName?.trim()?.[0] || "";
        const last = lastName?.trim()?.[0] || "";
        return (first + last).toUpperCase();
    }

    getLanguageLabel(lang: string): string {
        const map: Record<string, string> = {
            fr: "Francais",
            en: "English",
            ar: "Arabic",
        };
        return map[lang] || lang || "Not set";
    }

    private refreshCompletion(): void {
        if (!this.user) {
            this.completionSections = [];
            this.completionScore = 0;
            return;
        }

        const currentFirstName = this.editing
            ? this.editForm.firstName
            : this.user.firstName;
        const currentLastName = this.editing
            ? this.editForm.lastName
            : this.user.lastName;
        const currentCity = this.editing ? this.editForm.city : this.user.city;
        const currentIndustry = this.editing
            ? this.editForm.preferredIndustry
            : this.user.preferredIndustry;
        const currentLanguage = this.editing
            ? this.editForm.preferredLanguage
            : this.user.preferredLanguage;
        const currentBio = this.editing ? this.editForm.bio : this.user.bio;
        const currentAvatarUrl = this.editing
            ? this.editForm.avatarUrl
            : this.user.avatarUrl;
        const currentCvUrl = this.user.cvUrl;

        const coreItems: CompletionItem[] = [
            this.buildItem(
                "name",
                "Name completed",
                15,
                this.hasText(currentFirstName) && this.hasText(currentLastName),
            ),
            this.buildItem("city", "City added", 10, this.hasText(currentCity)),
            this.buildItem(
                "industry",
                "Preferred industry set",
                10,
                this.hasText(currentIndustry),
            ),
            this.buildItem(
                "language",
                "Preferred language set",
                5,
                this.hasText(currentLanguage),
            ),
            this.buildItem(
                "bio",
                "Bio quality",
                15,
                this.hasStrongBio(currentBio),
            ),
            this.buildItem(
                "avatar",
                "Profile photo",
                5,
                this.hasText(currentAvatarUrl),
            ),
            this.buildItem(
                "skills",
                "Skills added",
                15,
                this.selectedSkills.length > 0,
            ),
            this.buildItem("cv", "CV uploaded", 10, this.hasText(currentCvUrl)),
        ];

        const professionalItems: CompletionItem[] = [
            this.buildItem(
                "experience",
                "Work experience",
                10,
                this.experiences.length > 0,
            ),
            this.buildItem(
                "education",
                "Education added",
                10,
                this.educations.length > 0,
            ),
        ];

        const trustItems: CompletionItem[] = [
            this.buildItem(
                "adminVerification",
                "Admin verification approved",
                5,
                !!this.user.isVerified,
            ),
        ];

        this.completionSections = [
            this.buildSection("Core Profile", coreItems),
            this.buildSection("Professional Readiness", professionalItems),
            this.buildSection("Trust & Identity", trustItems),
        ];

        const earnedPoints = this.completionSections.reduce(
            (total, section) => total + section.earnedPoints,
            0,
        );
        const totalPoints = this.completionSections.reduce(
            (total, section) => total + section.totalPoints,
            0,
        );

        this.completionScore = totalPoints
            ? Math.round((earnedPoints / totalPoints) * 100)
            : 0;
    }

    private buildItem(
        key: string,
        label: string,
        points: number,
        completed: boolean,
    ): CompletionItem {
        return {
            key,
            label,
            points,
            state: completed ? "complete" : "incomplete",
        };
    }

    private buildSection(
        title: string,
        items: CompletionItem[],
    ): CompletionSection {
        const totalPoints = items.reduce((sum, item) => sum + item.points, 0);
        const earnedPoints = items
            .filter((item) => item.state === "complete")
            .reduce((sum, item) => sum + item.points, 0);

        return {
            title,
            items,
            totalPoints,
            earnedPoints,
        };
    }

    private hasText(value: string | null | undefined): boolean {
        return !!value && value.trim().length > 0;
    }

    private hasStrongBio(bio: string | null | undefined): boolean {
        return !!bio && bio.trim().length >= 30;
    }

    private uploadAvatar(file: File): void {
        this.avatarUploadLoading = true;
        this.avatarUploadError = "";

        const formData = new FormData();
        formData.append("file", file);

        this.http
            .post<AvatarUploadResponse>(
                `${environment.apiUrl}/api/users/me/avatar`,
                formData,
            )
            .subscribe({
                next: (response) => {
                    this.editForm.avatarUrl = response.url;
                    this.avatarPreviewUrl = response.url;

                    if (this.user) {
                        const updatedUser = {
                            ...this.user,
                            avatarUrl: response.url,
                        };
                        this.user = updatedUser;
                        this.currentUserStore.setCurrentUser(updatedUser);
                    }

                    this.avatarUploadLoading = false;
                    this.avatarUploadError = "";
                    this.clearAvatarObjectUrl();
                    this.refreshDerivedFields();
                    this.refreshCompletion();
                },
                error: () => {
                    this.avatarUploadLoading = false;
                    this.avatarUploadError =
                        "Avatar upload failed. Please try again.";
                },
            });
    }

    private clearAvatarObjectUrl(): void {
        if (this.avatarObjectUrl) {
            URL.revokeObjectURL(this.avatarObjectUrl);
            this.avatarObjectUrl = null;
        }
    }

    private enterEditMode(): void {
        if (this.editing) {
            return;
        }

        if (this.user) {
            this.editForm = {
                firstName: this.user.firstName || "",
                lastName: this.user.lastName || "",
                bio: this.user.bio || "",
                avatarUrl: this.user.avatarUrl || "",
                phoneNumber: this.user.phoneNumber || "",
                city: this.user.city || "",
                preferredIndustry: this.user.preferredIndustry || "",
                preferredLanguage: this.user.preferredLanguage || "fr",
                skills: [...(this.user.skills || [])],
                emailNotificationsEnabled:
                    this.user.emailNotificationsEnabled ?? true,
                pushNotificationsEnabled:
                    this.user.pushNotificationsEnabled ?? false,
                profileVisible: this.user.profileVisible ?? true,
            };
            this.avatarPreviewUrl = this.user.avatarUrl || "";
            this.avatarUploadError = "";
            this.avatarUploadLoading = false;
            this.selectedAvatarFile = null;
            this.setAvatarInputMode(this.editForm.avatarUrl ? "url" : "upload");
            this.selectedSkills = [...(this.user.skills || [])];
            this.experiences = this.parseExperiences(this.user.experiencesJson);
            this.educations = this.parseEducations(this.user.educationsJson);
        }

        this.showExperienceForm = false;
        this.showEducationForm = false;
        this.editingExperienceIndex = null;
        this.editingEducationIndex = null;
        this.localDraftNotice = "";
        this.experienceForm = this.createEmptyExperience();
        this.educationForm = this.createEmptyEducation();
        this.editing = true;
        this.saveError = "";
        this.saveSuccess = false;
        this.refreshCompletion();
    }

    private scrollToEditSection(
        section: Exclude<ActiveEditSection, null>,
    ): void {
        const targetIdBySection: Record<
            Exclude<ActiveEditSection, null>,
            string
        > = {
            photo: "photo-edit-section",
            about: "about-edit-section",
            skills: "skills-edit-section",
            experience: "experience-edit-section",
            education: "education-edit-section",
            preferences: "preferences-edit-section",
        };

        const targetId = targetIdBySection[section];
        setTimeout(() => {
            const element = document.getElementById(targetId);
            element?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
    }

    private uploadCv(file: File): void {
        this.cvUploadLoading = true;
        this.cvUploadError = "";
        this.cvUploadSuccess = "";

        this.userApi.uploadCv(file).subscribe({
            next: (updated) => {
                updated.skills = updated.skills || [];
                this.user = updated;
                this.currentUserStore.setCurrentUser(updated);

                this.selectedSkills = [...updated.skills];
                this.editForm.skills = [...updated.skills];

                this.experiences = this.parseExperiences(updated.experiencesJson);
                this.educations = this.parseEducations(updated.educationsJson);

                // Always sync bio regardless of edit mode
                if (updated.bio) {
                    if (this.editing) {
                        this.editForm.bio = updated.bio;
                    }
                }

                this.selectedCvFileName = this.extractFileNameFromUrl(
                    updated.cvUrl || null,
                );

                this.cvUploadLoading = false;
                this.cvUploadError = "";

                if (updated.cvParsingApplied === true) {
                    this.cvUploadSuccess =
                        "CV uploaded and profile auto-filled from your CV.";
                } else if (updated.cvParsingApplied === false) {
                    this.cvUploadSuccess =
                        "CV uploaded. Profile auto-fill is unavailable right now — you can fill in your details manually.";
                } else {
                    this.cvUploadSuccess = "CV uploaded successfully.";
                }

                setTimeout(() => {
                    this.cvUploadSuccess = "";
                    this.cdr.detectChanges();
                }, 6000);

                this.refreshDerivedFields();
                this.refreshCompletion();
                this.syncPreferences();
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.cvUploadLoading = false;
                this.cvUploadError =
                    err?.error?.message ||
                    "CV upload failed. Please try again.";
                this.cdr.detectChanges();
            },
        });
    }

    getCvFileName(): string {
        return this.cvFileName;
    }

    getCvLink(): string {
        return this.cvLink;
    }

    private refreshDerivedFields(): void {
        if (!this.user) {
            this.memberSinceLabel = "";
            this.cvLink = "";
            this.cvFileName = "";
            this.preferredLanguageLabel = "";
            return;
        }

        this.memberSinceLabel = this.formatMonthYear(this.user.createdAt);

        const cvUrl = this.user.cvUrl || "";
        this.cvFileName =
            this.selectedCvFileName || this.extractFileNameFromUrl(cvUrl || null);

        if (!cvUrl) {
            this.cvLink = "";
        } else if (cvUrl.startsWith("http://") || cvUrl.startsWith("https://")) {
            this.cvLink = cvUrl;
        } else if (cvUrl.startsWith("/uploads/")) {
            this.cvLink = `${environment.apiUrl}${cvUrl}`;
        } else if (cvUrl.startsWith("/")) {
            this.cvLink = `${environment.apiUrl}${cvUrl}`;
        } else {
            this.cvLink = `${environment.apiUrl}/uploads/${cvUrl}`;
        }

        this.preferredLanguageLabel = this.getLanguageLabel(
            this.user.preferredLanguage,
        );
    }

    private formatMonthYear(value: string | null | undefined): string {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleString(undefined, { month: "short", year: "numeric" });
    }

    private extractFileNameFromUrl(cvUrl: string | null): string {
        if (!cvUrl) {
            return "";
        }

        const sanitized = cvUrl.split("?")[0];
        const segments = sanitized.split("/").filter(Boolean);
        return segments.length ? segments[segments.length - 1] : "";
    }

    private createEmptyExperience(): ExperienceItem {
        return {
            id: crypto.randomUUID(),
            title: "",
            company: "",
            location: "",
            employmentType: "",
            startDate: "",
            endDate: "",
            current: false,
            description: "",
        };
    }

    private createEmptyEducation(): EducationItem {
        return {
            id: crypto.randomUUID(),
            school: "",
            degree: "",
            fieldOfStudy: "",
            startDate: "",
            endDate: "",
            current: false,
            description: "",
        };
    }

    private parseExperiences(raw: string | null | undefined): ExperienceItem[] {
        if (!raw) return [];

        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];

            return parsed
                .filter((item) => item && typeof item === "object")
                .slice(0, 100)
                .map((item) => ({
                    id: item.id || crypto.randomUUID(),
                    title: item.title || "",
                    company: item.company || "",
                    location: item.location || "",
                    employmentType: item.employmentType || "",
                    startDate: item.startDate || "",
                    endDate: item.endDate || "",
                    current: !!item.current,
                    description: item.description || "",
                }));
        } catch {
            return [];
        }
    }

    private serializeExperiences(items: ExperienceItem[]): string {
        return JSON.stringify(items);
    }

    private parseEducations(raw: string | null | undefined): EducationItem[] {
        if (!raw) return [];

        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];

            return parsed
                .filter((item) => item && typeof item === "object")
                .slice(0, 100)
                .map((item) => ({
                    id: item.id || crypto.randomUUID(),
                    school: item.school || "",
                    degree: item.degree || "",
                    fieldOfStudy: item.fieldOfStudy || "",
                    startDate: item.startDate || "",
                    endDate: item.endDate || "",
                    current: !!item.current,
                    description: item.description || "",
                }));
        } catch {
            return [];
        }
    }

    private serializeEducations(items: EducationItem[]): string {
        return JSON.stringify(items);
    }

    private isValidExperience(exp: ExperienceItem): boolean {
        if (!exp.title.trim()) return false;
        if (!exp.company.trim()) return false;
        if (!exp.startDate) return false;
        if (!exp.current && !exp.endDate) return false;
        return true;
    }

    private isValidEducation(edu: EducationItem): boolean {
        if (!edu.school.trim()) return false;
        if (!edu.degree.trim()) return false;
        if (!edu.startDate) return false;
        if (!edu.current && !edu.endDate) return false;
        return true;
    }
}
