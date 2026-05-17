package com.microservice.trainingservice.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.json.JsonReadFeature;
import com.microservice.trainingservice.dto.GenerateMissingLessonsRequest;
import com.microservice.trainingservice.dto.GenerateMissingLessonsResponse;
import com.microservice.trainingservice.model.LessonDifficulty;
import com.microservice.trainingservice.model.LessonFormat;
import com.microservice.trainingservice.model.TrainingLesson;
import com.microservice.trainingservice.repository.TrainingLessonRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class AiMissingLessonGenerationService {

    private static final Logger log = LoggerFactory.getLogger(AiMissingLessonGenerationService.class);

    private final OllamaGenerateContentClient aiClient;
    private final ObjectMapper objectMapper;
    private final TrainingLessonRepository lessonRepository;

    @Value("${training.ai.generation-enabled:true}")
    private boolean generationEnabled;

    @Transactional
    public GenerateMissingLessonsResponse generateMissingDraftLessons(GenerateMissingLessonsRequest request) {
        if (!generationEnabled) {
            throw new IllegalStateException("AI lesson generation is disabled (training.ai.generation-enabled=false)");
        }
        if (!aiClient.isConfigured()) {
            throw new IllegalStateException("Ollama is not configured");
        }

        String lang = normalizeLang(request.getLanguage());
        int target = request.getTargetActiveCount() == null ? 0 : request.getTargetActiveCount();
        int maxGenerate = request.getMaxGenerate() == null ? 0 : request.getMaxGenerate();

        long existingActive = lessonRepository.countByActiveTrueAndCategoryAndLanguage(request.getCategory(), lang);
        int missing = Math.max(0, target - (int) existingActive);
        int toGenerate = Math.min(missing, maxGenerate);

        List<Long> createdIds = new ArrayList<>();
        if (toGenerate > 0) {
            // Ensure variety: avoid generating/saving near-duplicates.
            Set<String> avoidTitleNorm = new HashSet<>();
            try {
                List<String> existingTitles = lessonRepository.findTitlesByCategoryAndLanguage(request.getCategory(), lang);
                if (existingTitles != null) {
                    for (String t : existingTitles) {
                        String n = normalizeTitle(t);
                        if (n != null) avoidTitleNorm.add(n);
                    }
                }
            } catch (Exception ignored) {
                // If the query fails for any reason, continue without preloaded titles.
            }

            Set<String> avoidContentSig = new HashSet<>();
            List<String> topicHints = topicHintsForCategory(request);

            int created = 0;
            int attempts = 0;
            int maxAttempts = Math.max(toGenerate * 5, 10);
            while (created < toGenerate && attempts < maxAttempts) {
                attempts++;
                String focusTopic = pickTopicHint(topicHints);

                List<TrainingLesson> batch = generateChunk(request, lang, 1, avoidTitleNorm, focusTopic);
                if (batch == null || batch.isEmpty()) {
                    continue;
                }
                TrainingLesson l = batch.getFirst();

                String titleNorm = normalizeTitle(l.getTitle());
                String contentSig = signature(l);
                boolean dupTitle = titleNorm != null && avoidTitleNorm.contains(titleNorm);
                boolean dupContent = contentSig != null && avoidContentSig.contains(contentSig);
                if (dupTitle || dupContent) {
                    continue;
                }

                TrainingLesson saved = lessonRepository.save(l);
                createdIds.add(saved.getId());
                created++;
                if (titleNorm != null) avoidTitleNorm.add(titleNorm);
                if (contentSig != null) avoidContentSig.add(contentSig);
            }
        }

        return GenerateMissingLessonsResponse.builder()
            .category(request.getCategory() == null ? null : request.getCategory().name())
            .language(lang)
            .existingActiveCount((int) existingActive)
            .targetActiveCount(target)
            .missingCount(missing)
            .generatedCount(createdIds.size())
            .generatedLessonIds(createdIds)
            .build();
    }

    private List<TrainingLesson> generateChunk(
        GenerateMissingLessonsRequest request,
        String lang,
        int count,
        Set<String> avoidTitleNorm,
        String focusTopic
    ) {
        String system = "You generate training lessons. Output ONLY valid JSON. No markdown fences, no extra text.";
        String prompt = buildPrompt(request, lang, count, avoidTitleNorm, focusTopic);

        // Use higher temperature here for variety; keep reranker deterministic.
        String raw = aiClient.generateJson(system, List.of(
            new GeminiGenerateContentClient.Content("user", List.of(new GeminiGenerateContentClient.Part(prompt)))
        ), 0.8);

        String json = extractJson(raw);
        JsonNode root;
        try {
            root = objectMapper.readTree(json);
        } catch (Exception primaryParseError) {
            // Gemini sometimes returns JSON-ish output containing unescaped newlines in strings.
            // Be tolerant here so we don't silently generate 0 lessons.
            ObjectMapper lenient = objectMapper
                .copy()
                .configure(JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS.mappedFeature(), true)
                .configure(JsonReadFeature.ALLOW_SINGLE_QUOTES.mappedFeature(), true)
                .configure(JsonReadFeature.ALLOW_TRAILING_COMMA.mappedFeature(), true);
            try {
                root = lenient.readTree(json);
            } catch (Exception lenientParseError) {
                log.warn(
                    "AI lesson generation invalid JSON. category={}, lang={}, rawPreview={}",
                    request.getCategory(),
                    lang,
                    preview(raw),
                    primaryParseError);
                throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "AI returned invalid JSON while generating lessons. Please retry.",
                    primaryParseError);
            }
        }

        try {
            JsonNode lessonsNode = root.get("lessons");
            if (lessonsNode == null || !lessonsNode.isArray()) {
                log.warn(
                    "AI lesson generation missing lessons array. category={}, lang={}, rawPreview={}",
                    request.getCategory(),
                    lang,
                    preview(raw));
                throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "AI response is missing the expected 'lessons' array. Please retry.");
            }

            List<TrainingLesson> out = new ArrayList<>();
            for (JsonNode node : lessonsNode) {
                TrainingLesson lesson = new TrainingLesson();
                lesson.setCategory(request.getCategory());
                lesson.setFormat(LessonFormat.TEXT);
                lesson.setLanguage(lang);
                lesson.setActive(false); // admin reviewed

                String title = safeText(node.get("title"), 500);
                String summary = safeText(node.get("summary"), 2000);
                String content = safeText(node.get("contentMarkdown"), 20000);

                lesson.setTitle(title == null ? "Untitled Lesson" : title);
                lesson.setSummary(summary);
                lesson.setContentMarkdown(content);
                lesson.setVideoUrl(null);

                Integer minutes = safeInt(node.get("estimatedMinutes"), 5);
                lesson.setEstimatedMinutes(Math.max(3, Math.min(45, minutes)));

                LessonDifficulty difficulty = request.getDifficulty();
                if (difficulty == null) {
                    difficulty = parseDifficulty(node.get("difficulty"));
                }
                lesson.setDifficulty(difficulty == null ? LessonDifficulty.BEGINNER : difficulty);

                Set<String> tags = new LinkedHashSet<>();
                tags.add("ai-generated");
                tags.add("review-required");
                JsonNode tagsNode = node.get("tags");
                if (tagsNode != null && tagsNode.isArray()) {
                    for (JsonNode t : tagsNode) {
                        String tag = safeTag(t.asText(null));
                        if (tag != null) tags.add(tag);
                    }
                }
                lesson.setTags(tags);

                out.add(lesson);
            }

            return out;
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn(
                "AI lesson generation parse failure. category={}, lang={}, rawPreview={}",
                request.getCategory(),
                lang,
                preview(raw),
                ex);
            throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Failed to parse AI lesson generation output. Please retry.",
                ex);
        }
    }

    private String preview(String raw) {
        if (raw == null) return "<null>";
        String t = raw.trim();
        if (t.isEmpty()) return "<empty>";
        t = t.replace("\r", "");
        int max = 2000;
        if (t.length() <= max) {
            return t;
        }
        return t.substring(0, max) + "…";
    }

    private String buildPrompt(
        GenerateMissingLessonsRequest request,
        String lang,
        int count,
        Set<String> avoidTitleNorm,
        String focusTopic
    ) {
        String difficulty = request.getDifficulty() == null ? "AUTO" : request.getDifficulty().name();

        String avoidTitlesLine = buildAvoidTitlesLine(avoidTitleNorm);
        String topicLine = (focusTopic == null || focusTopic.isBlank())
            ? ""
            : "- Focus topic: " + focusTopic + " (pick a NEW angle and avoid generic repeats)\n";

        return "Generate " + count + " NEW training lessons as JSON for the following constraints:\n" +
            "- Category: " + request.getCategory().name() + "\n" +
            "- Language: " + lang + " (must be written in this language)\n" +
            "- Format: TEXT (markdown content)\n" +
            "- Difficulty: " + difficulty + " (if AUTO, choose a reasonable level)\n" +
            topicLine +
            "\n" +
            "Return ONLY JSON with this exact shape:\n" +
            "{\n" +
            "  \"lessons\": [\n" +
            "    {\n" +
            "      \"title\": string,\n" +
            "      \"summary\": string,\n" +
            "      \"contentMarkdown\": string,\n" +
            "      \"estimatedMinutes\": number,\n" +
            "      \"difficulty\": \"BEGINNER\"|\"INTERMEDIATE\"|\"ADVANCED\",\n" +
            "      \"tags\": [string]\n" +
            "    }\n" +
            "  ]\n" +
            "}\n" +
            "\n" +
            "Guidelines:\n" +
            "- Make lessons practical and actionable for interview preparation.\n" +
            "- Use short sections and bullet points in contentMarkdown.\n" +
            "- Keep contentMarkdown concise (aim for 400-900 characters; max ~1200).\n" +
            "- The title MUST be specific and different from previous lessons (avoid generic titles).\n" +
            avoidTitlesLine +
            "- Do not include any personally identifying info.\n";
    }

    private String buildAvoidTitlesLine(Set<String> avoidTitleNorm) {
        if (avoidTitleNorm == null || avoidTitleNorm.isEmpty()) {
            return "";
        }
        // Keep prompt size bounded.
        List<String> sample = new ArrayList<>();
        int cap = 20;
        for (String t : avoidTitleNorm) {
            if (t == null || t.isBlank()) continue;
            sample.add(t);
            if (sample.size() >= cap) break;
        }
        if (sample.isEmpty()) return "";
        return "- Do NOT reuse or closely imitate any of these titles (case-insensitive): " + String.join(" | ", sample) + "\n";
    }

    private String normalizeTitle(String title) {
        if (title == null) return null;
        String t = title.trim().toLowerCase(Locale.ROOT);
        if (t.isBlank()) return null;
        t = t.replaceAll("\\s+", " ");
        if (t.length() > 200) t = t.substring(0, 200);
        return t;
    }

    private String normalizeForSig(String s, int maxLen) {
        if (s == null) return "";
        String t = s.trim().toLowerCase(Locale.ROOT);
        if (t.isBlank()) return "";
        t = t.replaceAll("\\s+", " ");
        if (t.length() > maxLen) t = t.substring(0, maxLen);
        return t;
    }

    private String signature(TrainingLesson l) {
        if (l == null) return null;
        String a = normalizeForSig(l.getTitle(), 160);
        String b = normalizeForSig(l.getSummary(), 240);
        String c = normalizeForSig(l.getContentMarkdown(), 400);
        String sig = a + "|" + b + "|" + c;
        return sig.isBlank() ? null : sig;
    }

    private List<String> topicHintsForCategory(GenerateMissingLessonsRequest request) {
        if (request == null || request.getCategory() == null) return List.of();
        return switch (request.getCategory()) {
            case COMMUNICATION -> List.of(
                "active listening + paraphrasing",
                "asking clarifying questions",
                "structured answers (STAR, CAR, PREP) — but not STAR-only",
                "handling interruptions / talking too much",
                "communicating tradeoffs and decisions",
                "storytelling with measurable impact"
            );
            case STRESS_MANAGEMENT -> List.of(
                "pre-interview anxiety routine",
                "breathing + grounding in interviews",
                "recovering after a bad answer",
                "time pressure handling",
                "managing imposter syndrome",
                "mindset reframing"
            );
            case CONTENT_PREP -> List.of(
                "company research checklist",
                "role requirements mapping",
                "building a portfolio talking script",
                "preparing questions for interviewer",
                "salary discussion preparation",
                "weaknesses + gaps framing"
            );
            case BODY_LANGUAGE -> List.of(
                "camera / posture / eye contact",
                "speaking pace + pauses",
                "confident handshake / greeting (in-person)",
                "gestures + fidgeting control",
                "smile and tone calibration",
                "voice projection"
            );
            case INDUSTRY_SPECIFIC -> List.of(
                "tailoring examples to industry keywords",
                "regulatory / compliance talk",
                "customer-centric language",
                "data-driven impact framing",
                "stakeholder management",
                "domain terminology without jargon overload"
            );
        };
    }

    private String pickTopicHint(List<String> hints) {
        if (hints == null || hints.isEmpty()) return null;
        int idx = ThreadLocalRandom.current().nextInt(hints.size());
        return hints.get(idx);
    }

    private String normalizeLang(String lang) {
        String l = (lang == null ? "" : lang.trim().toLowerCase(Locale.ROOT));
        if (l.equals("en") || l.equals("fr") || l.equals("ar")) {
            return l;
        }
        return "en";
    }

    private String safeText(JsonNode node, int maxLen) {
        if (node == null || node.isNull()) return null;
        String s = node.asText(null);
        if (s == null) return null;
        String t = s.trim();
        if (t.isBlank()) return null;
        if (t.length() > maxLen) {
            return t.substring(0, maxLen);
        }
        return t;
    }

    private Integer safeInt(JsonNode node, int fallback) {
        if (node == null || node.isNull()) return fallback;
        if (node.canConvertToInt()) return node.asInt(fallback);
        try {
            return Integer.parseInt(node.asText(String.valueOf(fallback)));
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private LessonDifficulty parseDifficulty(JsonNode node) {
        if (node == null || node.isNull()) return null;
        String s = node.asText("").trim().toUpperCase(Locale.ROOT);
        try {
            return LessonDifficulty.valueOf(s);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String safeTag(String raw) {
        if (raw == null) return null;
        String t = raw.trim().toLowerCase(Locale.ROOT);
        if (t.isBlank()) return null;
        t = t.replaceAll("[^a-z0-9_. -]+", "").trim();
        if (t.isBlank()) return null;
        if (t.length() > 80) t = t.substring(0, 80);
        return t;
    }

    private String extractJson(String raw) {
        if (raw == null) return "{}";

        String trimmed = raw.trim();
        if (trimmed.isEmpty()) return "{}";

        // Strip markdown fences if present.
        if (trimmed.startsWith("```")) {
            int firstNewline = trimmed.indexOf('\n');
            if (firstNewline >= 0) {
                trimmed = trimmed.substring(firstNewline + 1);
            }
            int fenceEnd = trimmed.lastIndexOf("```");
            if (fenceEnd >= 0) {
                trimmed = trimmed.substring(0, fenceEnd);
            }
            trimmed = trimmed.trim();
        }

        // Find the first complete JSON object/array in the text.
        int objStart = trimmed.indexOf('{');
        int arrStart = trimmed.indexOf('[');
        int start;
        if (objStart < 0 && arrStart < 0) {
            return trimmed;
        } else if (objStart < 0) {
            start = arrStart;
        } else if (arrStart < 0) {
            start = objStart;
        } else {
            start = Math.min(objStart, arrStart);
        }

        int end = findJsonEnd(trimmed, start);
        if (end > start) {
            return trimmed.substring(start, end);
        }
        return trimmed.substring(start);
    }

    /** Returns the index AFTER the end of the first JSON structure starting at start, or -1 if not found. */
    private int findJsonEnd(String s, int start) {
        char open = s.charAt(start);
        char close = (open == '{') ? '}' : (open == '[' ? ']' : 0);
        if (close == 0) return -1;

        int depth = 0;
        boolean inString = false;
        boolean escape = false;
        for (int i = start; i < s.length(); i++) {
            char c = s.charAt(i);
            if (escape) {
                escape = false;
                continue;
            }
            if (c == '\\' && inString) {
                escape = true;
                continue;
            }
            if (c == '"') {
                inString = !inString;
                continue;
            }
            if (inString) continue;

            if (c == open) depth++;
            else if (c == close) {
                depth--;
                if (depth == 0) {
                    return i + 1;
                }
            }
        }
        return -1;
    }
}
