package com.microservice.resourceservice.service.ai;

import com.microservice.resourceservice.enums.IndustryEnum;
import com.microservice.resourceservice.enums.ResourceLevelEnum;
import com.microservice.resourceservice.enums.ResourceTypeEnum;
import com.microservice.resourceservice.model.ResourceCategory;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Curated stub provider. Generates credible-looking drafts with real public URLs
 * (YouTube search, dev.to, freeCodeCamp News, Spotify search, Goodreads) and stable
 * random thumbnails from picsum.photos. The goal is to produce results visually
 * indistinguishable from a real AI catalog even when no LLM is available.
 */
@Component
public class StubAiResourceProvider implements AiResourceProvider {

    private static final Random RNG = new Random();

    // ===================== TOPIC POOLS (comprehensive) =====================
    // Triple-sized pools covering modern (2024-2026) themes across every major discipline.
    private static final Map<IndustryEnum, String[]> TOPICS = Map.ofEntries(
        Map.entry(IndustryEnum.TECHNOLOGY, new String[]{
            // Software engineering core
            "API design", "REST vs GraphQL", "gRPC streaming", "WebSockets at scale",
            "distributed systems", "microservices patterns", "service mesh",
            "caching strategies", "CDN optimization", "database indexing", "SQL vs NoSQL tradeoffs",
            "vector databases", "event-driven architecture", "Kafka streaming", "CQRS and Event Sourcing",
            "Redis patterns", "PostgreSQL performance", "MongoDB aggregation",
            // Cloud / DevOps
            "Kubernetes fundamentals", "Docker best practices", "Terraform modules",
            "AWS cost optimization", "serverless tradeoffs", "CI/CD pipelines", "GitHub Actions",
            "Blue/Green deployments", "Canary releases", "Chaos engineering",
            // Languages / runtimes
            "TypeScript deep-dive", "Rust ownership model", "Go concurrency", "Python asyncio",
            "JVM tuning", "Node.js event loop", "WebAssembly",
            // Frontend
            "React Server Components", "Next.js 15", "Angular Signals", "Vue Composition API",
            "Tailwind patterns", "accessibility audits", "Web Vitals",
            // AI / ML
            "LLM prompt engineering", "RAG pipelines", "fine-tuning open models",
            "embeddings & semantic search", "LangChain patterns", "MLOps basics",
            "model evaluation", "AI safety & alignment",
            // Security
            "OWASP Top 10", "zero-trust architecture", "OAuth2 and OIDC", "JWT pitfalls",
            "supply chain security", "secrets management",
            // Observability
            "OpenTelemetry", "structured logging", "SLOs and error budgets", "distributed tracing",
            // Modern architecture
            "Edge computing", "CRDT and offline-first", "multi-tenant SaaS",
            "feature flags at scale", "system design interviews", "clean architecture"
        }),
        Map.entry(IndustryEnum.FINANCE, new String[]{
            // Personal finance
            "personal budgeting", "emergency funds", "debt payoff strategies",
            "retirement planning", "tax optimization", "estate planning basics",
            // Investing
            "index investing", "dollar-cost averaging", "portfolio diversification",
            "factor investing", "ETFs vs mutual funds", "real estate investing 101",
            "dividend strategies", "bond ladders",
            // Corporate finance
            "financial modeling", "DCF valuation", "LBO modeling", "capital structure",
            "working capital management", "M&A fundamentals", "IPO process",
            // Markets / instruments
            "options basics", "futures and hedging", "FX markets", "interest rate curves",
            "derivatives 101", "credit analysis", "bond pricing",
            // Risk / compliance
            "risk management", "Basel III essentials", "AML & KYC",
            "SOX compliance", "counterparty risk",
            // Macro / behavioral
            "monetary policy", "inflation & yields", "behavioral finance",
            "market psychology", "economic indicators",
            // Fintech / crypto
            "fintech payments", "open banking", "BNPL economics",
            "crypto custody", "DeFi basics", "stablecoins explained", "CBDCs",
            // Career
            "breaking into banking", "CFA exam strategy", "financial analyst interviews"
        }),
        Map.entry(IndustryEnum.HEALTHCARE, new String[]{
            // Clinical
            "evidence-based practice", "patient safety", "clinical workflows",
            "differential diagnosis", "medication reconciliation", "chronic disease management",
            "pediatric care basics", "geriatric care", "palliative care principles",
            // Digital health
            "telemedicine", "medical imaging AI", "EHR optimization", "digital triage",
            "wearables and remote monitoring", "clinical decision support",
            // Data / policy
            "health data privacy", "HIPAA essentials", "GDPR for health data",
            "public health data", "epidemiology basics", "health equity",
            // Operations
            "hospital operations", "lean healthcare", "quality improvement",
            "infection control", "patient experience design", "staffing models",
            // Mental health
            "mental health first aid", "burnout prevention", "CBT principles",
            "mindfulness at work", "trauma-informed care",
            // Nutrition / wellbeing
            "nutrition science", "sleep hygiene", "exercise physiology basics",
            "behavior change models", "habit formation",
            // Specialties
            "women's health", "men's health", "preventive medicine",
            "emergency medicine fundamentals", "cardiology basics",
            // Regulatory / ethics
            "bioethics essentials", "IRB process", "FDA approval pathways"
        }),
        Map.entry(IndustryEnum.EDUCATION, new String[]{
            // Learning science
            "active learning", "spaced repetition", "retrieval practice",
            "deliberate practice", "memory techniques", "dual coding",
            "metacognition", "growth mindset",
            // Instructional design
            "instructional design", "Backward design", "Bloom's taxonomy",
            "ADDIE framework", "assessment design", "rubric design",
            "formative feedback", "peer review",
            // Pedagogy
            "differentiation", "Socratic questioning", "flipped classroom",
            "project-based learning", "inquiry-based learning",
            "culturally responsive teaching", "Universal Design for Learning",
            // EdTech
            "EdTech tools", "LMS setup", "micro-credentials",
            "video-based learning", "mobile learning design",
            // Curriculum
            "curriculum mapping", "learning pathways", "competency-based education",
            // Study skills
            "study habits", "note-taking systems", "Zettelkasten method",
            "essay writing", "exam preparation",
            // Higher ed / L&D
            "instructional coaching", "faculty development",
            "corporate L&D program design", "coaching vs mentoring",
            // Inclusion / equity
            "accessibility in education", "neurodiverse learners",
            "multilingual classrooms", "student wellbeing"
        }),
        Map.entry(IndustryEnum.MARKETING, new String[]{
            // Strategy
            "positioning", "jobs-to-be-done", "category design",
            "brand storytelling", "messaging frameworks", "customer research",
            "ICP definition", "value proposition design",
            // Content
            "content strategy", "editorial calendars", "SEO fundamentals",
            "on-page SEO", "technical SEO", "keyword research",
            "long-form content", "newsletter growth", "content repurposing",
            // Paid / acquisition
            "paid acquisition", "Google Ads", "Meta Ads",
            "LinkedIn Ads for B2B", "TikTok ads", "retargeting funnels",
            "performance creative testing",
            // Email / lifecycle
            "email marketing", "lifecycle automation", "drip campaigns",
            "cold outreach that works",
            // Social / community
            "LinkedIn organic", "Twitter/X growth", "YouTube strategy",
            "community building", "influencer collaborations",
            // Analytics / growth
            "marketing analytics", "attribution models", "growth loops",
            "retention funnels", "cohort analysis",
            // Product marketing
            "product marketing", "launch playbook", "sales enablement",
            "competitive intelligence",
            // CRO / conversion
            "landing page optimization", "A/B testing", "pricing page design"
        }),
        Map.entry(IndustryEnum.ENGINEERING, new String[]{
            // Design / architecture
            "system design", "architecture patterns", "DDD patterns",
            "hexagonal architecture", "modular monolith", "strangler fig pattern",
            // Quality
            "testing strategies", "test pyramids", "mutation testing",
            "contract testing", "end-to-end testing",
            // CI/CD / ops
            "CI/CD pipelines", "trunk-based development", "feature flags",
            "deployment strategies", "incident response", "postmortems",
            "SRE fundamentals", "reliability engineering",
            // Performance
            "performance tuning", "profiling tools", "memory leaks",
            "database query optimization", "caching layers",
            // Code craft
            "code review craft", "refactoring playbook", "legacy code rescue",
            "technical debt management", "naming and readability",
            // Leadership
            "technical leadership", "staff engineer path", "mentoring juniors",
            "running RFCs", "cross-team collaboration",
            // Security
            "security by design", "threat modeling", "secure code review",
            // Hardware / systems
            "embedded systems basics", "real-time systems",
            // Platform
            "platform engineering", "developer experience", "golden paths",
            // Hiring
            "hiring engineers", "interview loops", "onboarding engineers"
        }),
        Map.entry(IndustryEnum.LEGAL, new String[]{
            // Commercial
            "contract drafting", "contract negotiation tactics",
            "NDAs explained", "SaaS MSAs", "DPA essentials",
            // IP
            "intellectual property", "patent basics", "trademarks 101",
            "copyright in digital content", "open-source licensing",
            // Privacy / data
            "GDPR essentials", "CCPA vs GDPR", "data protection",
            "cross-border data transfers", "biometric data law",
            // Regulatory
            "compliance programs", "regulatory strategy", "fintech regulation",
            "healthcare regulations", "AI regulation (EU AI Act)",
            // Labor / HR
            "employment law", "non-compete enforceability",
            "remote work policies", "workplace investigations",
            // Corporate
            "startup legal stack", "cap tables and SAFEs",
            "fundraising legal docs", "shareholder agreements",
            // Litigation / arbitration
            "arbitration basics", "mediation strategy", "case research",
            "legal writing", "depositions 101",
            // Ethics / policy
            "legal ethics", "policy drafting", "government relations",
            // Misc
            "contract lifecycle management", "redlining efficiency",
            "tax law basics for founders"
        }),
        Map.entry(IndustryEnum.CONSULTING, new String[]{
            // Problem solving
            "problem framing", "MECE thinking", "hypothesis-driven analysis",
            "issue trees", "root cause analysis", "first-principles thinking",
            // Frameworks
            "McKinsey frameworks", "BCG matrix", "Porter's five forces",
            "SWOT done right", "value chain analysis",
            // Communication
            "slide storytelling", "executive presence", "pyramid principle",
            "data visualization for execs", "stakeholder management",
            // Client work
            "client discovery", "scope definition", "SOWs and proposals",
            "managing client expectations",
            // Delivery
            "delivery planning", "PMO essentials", "change management",
            "transformation playbook",
            // Strategy
            "strategic roadmapping", "OKR cascades", "benchmarking",
            "competitive strategy", "scenario planning",
            // Pricing / org
            "pricing strategy", "org design", "operating model design",
            "digital transformation",
            // Domain
            "retail consulting basics", "public sector consulting",
            "nonprofit strategy",
            // Consulting career
            "case interview prep", "consulting networking",
            "exit opportunities from consulting"
        }),
        Map.entry(IndustryEnum.MEDIA, new String[]{
            // Video
            "video editing workflow", "color grading", "lighting for video",
            "cinematic framing", "b-roll strategy", "DaVinci Resolve basics",
            "Premiere Pro shortcuts",
            // Audio / podcast
            "podcast production", "podcast launch checklist",
            "audio mixing basics", "noise reduction", "voice-over craft",
            "interviewing techniques",
            // Content / platform
            "YouTube strategy", "TikTok content patterns", "Instagram Reels",
            "thumbnail design", "platform algorithms", "creator economy",
            "Substack growth", "newsletter monetization",
            // Storytelling
            "storytelling craft", "three-act structure", "character arcs",
            "hooks and openings", "scriptwriting",
            // Production
            "production planning", "shooting schedules", "on-set etiquette",
            "location scouting",
            // Photography
            "photography composition", "portrait lighting",
            "photo editing in Lightroom", "color theory",
            // Design & visual
            "motion graphics basics", "After Effects", "typography in video",
            // Distribution / growth
            "distribution strategy", "audience growth", "community building",
            "live streaming", "paid promotion for creators",
            // Business
            "brand deals negotiation", "media kits", "creator taxes",
            "content licensing"
        }),
        Map.entry(IndustryEnum.OTHER, new String[]{
            // Productivity
            "time management", "deep work", "Pomodoro technique",
            "GTD methodology", "second brain / PKM",
            "inbox zero", "meeting hygiene", "async communication",
            // Communication
            "communication skills", "giving feedback", "active listening",
            "difficult conversations", "nonviolent communication",
            "writing clear emails", "executive summaries",
            // Leadership / management
            "1:1s that work", "managing up", "coaching vs directing",
            "decision making frameworks", "OKRs for teams",
            // Career
            "career transitions", "job search playbook",
            "resume and LinkedIn optimization", "networking authentically",
            "salary negotiation", "personal branding",
            // Mindset
            "mental models", "critical thinking", "bias detection",
            "growth mindset", "stoic practices", "resilience training",
            // Wellbeing
            "stress management", "sleep hygiene", "burnout recovery",
            "mindfulness basics", "journaling for clarity",
            // Learning
            "learning how to learn", "reading more books",
            "building study rituals",
            // Remote / collaboration
            "remote collaboration", "async-first teams",
            "running effective retrospectives", "virtual facilitation",
            // Public speaking
            "public speaking", "presentation design", "storytelling for pitches",
            "handling Q&A under pressure",
            // Decision making
            "decision journals", "premortems", "probabilistic thinking"
        })
    );

    // ===================== TITLE PATTERNS =====================
    private static final String[] TITLE_TEMPLATES = {
        "%s: the %s guide",
        "Mastering %s in %s minutes",
        "%s from scratch — a %s walkthrough",
        "The modern %s playbook (%s edition)",
        "%s deep dive",
        "Why %s matters: a %s perspective",
        "%s, explained simply",
        "Rethinking %s for %s",
        "Practical %s: %s patterns that work",
        "%s — field notes from a %s practitioner",
        "Beyond the basics of %s",
        "The art of %s"
    };

    private static final String[] DESCRIPTION_TEMPLATES = {
        "A hands-on walkthrough of %s, with real-world examples and common pitfalls to avoid. Ideal for %s learners.",
        "An in-depth look at %s. Covers the mental models, trade-offs, and practical patterns that separate theory from production.",
        "Learn %s the efficient way. Concrete case studies, curated references, and exercises to lock in the fundamentals.",
        "Everything you need to level up on %s — from first principles to advanced techniques — distilled for busy %s professionals.",
        "A curated resource on %s. Clear structure, rich examples, and actionable takeaways you can apply immediately.",
        "A deep dive into %s that goes beyond surface-level advice. Explores the why, not just the how."
    };

    // Numeric flavor (duration, year, etc.) used in title templates
    private static final String[] TIME_FLAVORS = {"15", "30", "45", "60", "90", "120"};

    @Override
    public List<AiResourceDraft> generate(
        ResourceCategory category,
        int count,
        IndustryEnum industry,
        ResourceLevelEnum level,
        ResourceTypeEnum type
    ) {
        List<AiResourceDraft> drafts = new ArrayList<>();
        IndustryEnum resolvedIndustry = industry != null ? industry : category.getIndustry();
        String[] topicPool = TOPICS.getOrDefault(resolvedIndustry, TOPICS.get(IndustryEnum.OTHER));

        for (int i = 0; i < count; i++) {
            ResourceTypeEnum resolvedType = type != null ? type : pickTypeVaried(i);
            ResourceLevelEnum resolvedLevel = level != null ? level : pickLevelVaried(i);

            String topic = pick(topicPool, i + seedOffset(category));
            String title = buildTitle(topic, resolvedType, resolvedLevel, i);
            String description = buildDescription(topic, resolvedLevel);
            String url = buildUrl(topic, resolvedType, title);
            String thumbUrl = buildThumb(topic, resolvedType, i);

            drafts.add(new AiResourceDraft(
                title,
                description,
                url,
                resolvedType,
                resolvedLevel,
                resolvedIndustry,
                thumbUrl,
                category.getId()
            ));
        }

        return drafts;
    }

    // ===================== BUILDERS =====================

    private static String buildTitle(String topic, ResourceTypeEnum type, ResourceLevelEnum level, int i) {
        String template = pick(TITLE_TEMPLATES, i);
        String topicCased = capitalize(topic);
        String flavor;
        if (template.contains("%s minutes")) {
            flavor = pick(TIME_FLAVORS, i);
        } else if (template.contains("%s edition")) {
            flavor = "2026";
        } else if (template.contains("%s guide")) {
            flavor = humanLevel(level);
        } else if (template.contains("%s walkthrough")) {
            flavor = humanLevel(level);
        } else if (template.contains("%s perspective")) {
            flavor = humanLevel(level);
        } else if (template.contains("%s patterns")) {
            flavor = pick(new String[]{"3", "5", "7", "10"}, i);
        } else if (template.contains("%s practitioner")) {
            flavor = pick(new String[]{"senior", "staff", "principal", "experienced"}, i);
        } else if (template.contains("for %s")) {
            flavor = pick(new String[]{"2026", "modern teams", "remote work", "a distracted world"}, i);
        } else {
            flavor = humanLevel(level);
        }

        String base = template.formatted(topicCased, flavor);
        // Type prefix for variety
        String prefix = switch (type) {
            case VIDEO -> pick(new String[]{"Watch: ", "Video · ", "", ""}, i);
            case PODCAST -> pick(new String[]{"Podcast · ", "Listen · ", "", ""}, i);
            case ARTICLE -> pick(new String[]{"", "Read · ", "", ""}, i);
            case BOOK -> pick(new String[]{"Book · ", "", ""}, i);
            case QUIZ -> pick(new String[]{"Quiz · ", "Practice · ", ""}, i);
        };
        return prefix + base;
    }

    private static String buildDescription(String topic, ResourceLevelEnum level) {
        String template = DESCRIPTION_TEMPLATES[RNG.nextInt(DESCRIPTION_TEMPLATES.length)];
        return template.formatted(topic, humanLevel(level));
    }

    private static String buildUrl(String topic, ResourceTypeEnum type, String title) {
        String encoded = URLEncoder.encode(topic, StandardCharsets.UTF_8);
        return switch (type) {
            case VIDEO -> "https://www.youtube.com/results?search_query=" + encoded;
            case PODCAST -> "https://open.spotify.com/search/" + encoded + "/podcasts";
            case ARTICLE -> {
                String slug = URLEncoder.encode(topic.toLowerCase().replace(' ', '-'), StandardCharsets.UTF_8);
                yield "https://dev.to/search?q=" + slug;
            }
            case BOOK -> "https://www.goodreads.com/search?q=" + encoded;
            case QUIZ -> "https://www.codewars.com/kata/search/?q=" + encoded;
        };
    }

    /**
     * Real-looking thumbnails from picsum.photos (deterministic seed → cached).
     * For video: 16:9; for others: 16:10. Always works, no 404s, no CORS.
     */
    private static String buildThumb(String topic, ResourceTypeEnum type, int i) {
        String seed = URLEncoder.encode(topic + "-" + type.name().toLowerCase() + "-" + i, StandardCharsets.UTF_8);
        return "https://picsum.photos/seed/" + seed + "/640/360";
    }

    // ===================== UTILS =====================

    private static ResourceTypeEnum pickTypeVaried(int i) {
        // Bias toward video + article (most engaging), sprinkle others
        ResourceTypeEnum[] rotation = {
            ResourceTypeEnum.VIDEO, ResourceTypeEnum.ARTICLE, ResourceTypeEnum.VIDEO,
            ResourceTypeEnum.ARTICLE, ResourceTypeEnum.PODCAST, ResourceTypeEnum.VIDEO,
            ResourceTypeEnum.ARTICLE, ResourceTypeEnum.BOOK, ResourceTypeEnum.VIDEO,
            ResourceTypeEnum.QUIZ, ResourceTypeEnum.ARTICLE, ResourceTypeEnum.PODCAST
        };
        return rotation[Math.floorMod(i, rotation.length)];
    }

    private static ResourceLevelEnum pickLevelVaried(int i) {
        // Roughly 40/40/20 beginner/intermediate/advanced
        ResourceLevelEnum[] rotation = {
            ResourceLevelEnum.BEGINNER, ResourceLevelEnum.INTERMEDIATE, ResourceLevelEnum.BEGINNER,
            ResourceLevelEnum.INTERMEDIATE, ResourceLevelEnum.ADVANCED, ResourceLevelEnum.BEGINNER,
            ResourceLevelEnum.INTERMEDIATE, ResourceLevelEnum.ADVANCED, ResourceLevelEnum.INTERMEDIATE,
            ResourceLevelEnum.BEGINNER
        };
        return rotation[Math.floorMod(i, rotation.length)];
    }

    private static <T> T pick(T[] pool, int i) {
        return pool[Math.floorMod(i, pool.length)];
    }

    private static int seedOffset(ResourceCategory category) {
        // Make different categories start at different points in the topic pool
        return category == null || category.getName() == null ? 0 : Math.abs(category.getName().hashCode()) % 7;
    }

    private static String capitalize(String s) {
        if (s == null || s.isBlank()) return "Topic";
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private static String humanLevel(ResourceLevelEnum level) {
        return switch (level) {
            case BEGINNER -> "beginner";
            case INTERMEDIATE -> "intermediate";
            case ADVANCED -> "advanced";
        };
    }
}
