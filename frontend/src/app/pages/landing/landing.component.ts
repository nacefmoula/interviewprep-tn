import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { CommonModule } from "@angular/common";
import { TestimonialCardComponent } from "../../shared/components/testimonial-card/testimonial-card.component";
import { MOCK_TESTIMONIALS, MOCK_PRICING } from "../../core/data/mock-data";
import { AuthService } from "../../core/auth/auth.service";

@Component({
    selector: "app-landing",
    standalone: true,
    imports: [RouterLink, CommonModule, TestimonialCardComponent],
    templateUrl: "./landing.component.html",
    styleUrls: ["./landing.component.css"],
})
export class LandingComponent {
    private authService = inject(AuthService);

    testimonials = MOCK_TESTIMONIALS;
    pricing = MOCK_PRICING;

    stats = [
        { value: "50,000+", label: "Students Prepared" },
        { value: "92%", label: "Interview Success Rate" },
        { value: "500+", label: "Curated Resources" },
        { value: "120+", label: "Expert Mentors" },
    ];

    modules = [
        {
            icon: '<i class="bi bi-mic-fill"></i>',
            title: "Mock Interviews",
            desc: "AI-powered practice sessions with real-time scoring and detailed feedback on every answer.",
            color: "teal",
        },
        {
            icon: '<i class="bi bi-pencil-square"></i>',
            title: "Quiz & Assessments",
            desc: "Topic-based quizzes across technical, behavioral, and product thinking domains.",
            color: "cyan",
        },
        {
            icon: '<i class="bi bi-rocket-fill"></i>',
            title: "Training Paths",
            desc: "Gamified learning journeys with XP, streaks, badges, and daily challenges.",
            color: "mint",
        },
        {
            icon: '<i class="bi bi-bar-chart-fill"></i>',
            title: "Performance Reports",
            desc: "Deep analytics on your communication, confidence, clarity, and readiness scores.",
            color: "sky",
        },
        {
            icon: '<i class="bi bi-people-fill"></i>',
            title: "Expert Mentors",
            desc: "Book 1:1 sessions with industry professionals from Google, Meta, Stripe, and more.",
            color: "peach",
        },
        {
            icon: '<i class="bi bi-chat-fill"></i>',
            title: "Community",
            desc: "Join a vibrant community of candidates sharing tips, success stories, and motivation.",
            color: "purple",
        },
        {
            icon: '<i class="bi bi-book-fill"></i>',
            title: "Resource Library",
            desc: "Curated articles, videos, podcasts, templates and exercises for every career stage.",
            color: "sand",
        },
    ];

    steps = [
        {
            step: "01",
            title: "Build Your Profile",
            desc: "Set your target roles, skills, and interview goals to get a personalized experience.",
        },
        {
            step: "02",
            title: "Practice & Assess",
            desc: "Complete mock interviews, quizzes, and training modules at your own pace.",
        },
        {
            step: "03",
            title: "Get Feedback",
            desc: "Receive detailed AI reports scoring your communication, confidence, and structure.",
        },
        {
            step: "04",
            title: "Land the Role",
            desc: "Connect with mentors, refine your approach, and walk into interviews with confidence.",
        },
    ];

    faqItems = [
        {
            q: "How is InterviewPrepTN different from other prep platforms?",
            a: "InterviewPrepTN combines AI-powered feedback, structured training paths, live mentorship, and community — all in one platform designed specifically for students and early-career candidates.",
        },
        {
            q: "Do I need to pay to start?",
            a: "No. Our Free plan gives you 5 mock sessions, 3 quizzes, and access to community and library resources — forever. Upgrade when you're ready for unlimited access.",
        },
        {
            q: "Are the mock interviews like real interviews?",
            a: "Yes. Our question bank is curated from real interview experiences at top companies. The AI evaluates your answers on communication, structure, confidence, and relevance.",
        },
    ];

    mentorAvatars = [
        { initials: "PK", name: "Dr. Priya Kapoor", company: "Google" },
        { initials: "JO", name: "James Okafor", company: "Stripe" },
        { initials: "SR", name: "Sofia Reyes", company: "Spotify" },
        { initials: "RM", name: "Raj Malhotra", company: "McKinsey" },
    ];

    openFaq: number | null = null;

    toggleFaq(i: number): void {
        this.openFaq = this.openFaq === i ? null : i;
    }

    login(): void {
        this.authService.login();
    }

    register(): void {
        this.authService.register();
    }

    loginWithGoogle(): void {
        this.authService.loginWithGoogle();
    }

    loginWithLinkedIn(): void {
        this.authService.loginWithLinkedIn();
    }

    loginWithGitHub(): void {
        this.authService.loginWithGitHub();
    }

    loginWithPasskey(): void {
        this.authService.loginWithPasskey();
    }
}
