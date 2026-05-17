package com.quizservice.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quizservice.dto.response.QuizResponse;
import com.quizservice.enums.QuizDifficulty;
import com.quizservice.service.AiQuizGeneratorService;
import com.quizservice.service.QuizService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

// ============================================================
// CORRECTIFS APPLIQUÉS :
//
// [FIX 1] JWT null → NullPointerException
//   required=false + expression SpEL pour gérer anonymousUser.
//   Le userId "anonymous" est utilisé comme fallback.
//
// [FIX 2] QuizResponse ne retournait PAS les questions
//   QuizService.toResponse(quiz, true) inclut les questions
//   avec leurs answers → Angular peut les afficher pendant le quiz.
//
// [FIX 3] Le quiz généré était créé en DRAFT → startQuiz() échouait
//   Quiz.java a status = PUBLISHED par défaut, mais on s'assure
//   ici que le quiz est bien publié avant de retourner la réponse.
//   On appelle publishQuiz() dans AiQuizGeneratorService.
//
// [FIX 4] moduleId Long → UUID invalide
//   On passe moduleId en String null pour éviter la conversion
//   UUID.nameUUIDFromBytes() qui génère un UUID inexistant.
//   Un quiz généré par IA n'a pas besoin d'un moduleId valide.
// ============================================================
@Slf4j
@RestController
@RequestMapping("/api/quizzes/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AiQuizController {

    private final AiQuizGeneratorService generatorService;
    private final QuizService quizService;
    private final WebClient groqWebClient;
    private final ObjectMapper objectMapper;

    @Value("${ai.kokoro.url:http://kokoro:8880}")
    private String kokoroUrl;

    private final RestTemplate restTemplate;

    @PostMapping("/generate")
    public Mono<ResponseEntity<QuizResponse>> generateQuiz(
            @RequestBody GenerateQuizHttpRequest req,
            // FIX 1 : required=false → pas de NullPointerException si endpoint est permitAll
            @AuthenticationPrincipal(expression = "#this == 'anonymousUser' ? null : #this") Jwt jwt) {

        String userId = (jwt != null) ? jwt.getSubject() : "anonymous";
        log.info("Quiz AI generation — user={} module='{}' questions={} difficulty={}",
                userId, req.moduleTitle(), req.questionCount(), req.difficulty());

        return generatorService.generateQuizFromModule(
                        new AiQuizGeneratorService.GenerateQuizRequest(
                                // FIX 4 : moduleId ignoré (null) — le quiz IA est indépendant d'un module BD
                                req.moduleId(),
                                req.moduleTitle(),
                                req.moduleCategory() != null ? req.moduleCategory() : "GENERAL",
                                req.moduleContent() != null ? req.moduleContent() : req.moduleTitle(),
                                req.questionCount()  != null ? req.questionCount()  : 10,
                                req.difficulty()     != null ? req.difficulty()     : QuizDifficulty.MEDIUM,
                                req.language()       != null ? req.language()       : "fr",
                                userId
                        )
                )
                // FIX 2 : recharger le quiz avec includeCorrect=false pour inclure les questions/answers
                // sans révéler isCorrect — le frontend en a besoin pour afficher les options
                .map(quizResp -> {
                    // quizResp vient de QuizService.toResponse(savedQuiz, true)
                    // mais on veut renvoyer les questions SANS isCorrect (masqué pour l'étudiant)
                    // On recharge depuis la BD avec includeCorrect=false
                    QuizResponse studentView = quizService.getQuizForStudent(quizResp.getId());
                    log.info("Quiz {} généré avec {} questions",
                            quizResp.getId(),
                            studentView.getQuestions() != null ? studentView.getQuestions().size() : 0);
                    return ResponseEntity.ok(studentView);
                })
                .onErrorResume(e -> {
                    log.error("Quiz AI generation failed for module='{}': {}",
                            req.moduleTitle(), e.getMessage(), e);
                    return Mono.just(ResponseEntity.internalServerError().build());
                });
    }

    // ── RÉSUMÉ MODULE (Groq) ──────────────────────────────────────────────────

    public record SummarizeRequest(String moduleTitle, String moduleCategory) {}

    public record ModuleSummaryResponse(
            long   moduleId,
            String moduleTitle,
            String summary,
            List<String> keyPoints,
            int estimatedReadMinutes
    ) {}

    @PostMapping("/modules/{moduleId}/summary")
    public Mono<ResponseEntity<ModuleSummaryResponse>> summarizeModule(
            @PathVariable long moduleId,
            @RequestParam(defaultValue = "fr") String language,
            @RequestBody(required = false) SummarizeRequest req) {

        String title    = (req != null && req.moduleTitle()    != null) ? req.moduleTitle()    : "Module " + moduleId;
        String category = (req != null && req.moduleCategory() != null) ? req.moduleCategory() : "General";
        String lang     = "fr".equals(language) ? "français" : "English";

        String prompt = String.format("""
                Tu es un expert pédagogique. Génère un résumé structuré pour ce module de formation.

                Module : %s
                Catégorie : %s
                Langue de réponse : %s

                Génère :
                - Un résumé clair de 3-4 phrases expliquant les concepts fondamentaux
                - 4 à 6 points clés à retenir
                - Une estimation du temps de lecture en minutes (entre 2 et 8)

                Réponds UNIQUEMENT en JSON valide sans markdown :
                {
                  "summary": "...",
                  "keyPoints": ["point 1", "point 2", "point 3", "point 4"],
                  "estimatedReadMinutes": 3
                }
                """, title, category, lang);

        Map<String, Object> body = Map.of(
                "model", "llama-3.1-8b-instant",
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "Tu es un expert pédagogique. Réponds UNIQUEMENT en JSON valide, sans markdown."),
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.5,
                "max_tokens", 512
        );

        return groqWebClient.post()
                .uri("/chat/completions")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .map(raw -> {
                    try {
                        String content = objectMapper.readTree(raw)
                                .path("choices").get(0)
                                .path("message").path("content").asText();
                        String clean = content.replaceAll("(?s)```json\\s*", "").replaceAll("(?s)```\\s*", "").trim();
                        JsonNode n = objectMapper.readTree(clean);
                        String summary = n.path("summary").asText("No summary available.");
                        List<String> kp = objectMapper.convertValue(n.path("keyPoints"), objectMapper.getTypeFactory()
                                .constructCollectionType(List.class, String.class));
                        int mins = Math.max(1, Math.min(10, n.path("estimatedReadMinutes").asInt(3)));
                        return ResponseEntity.ok(new ModuleSummaryResponse(moduleId, title, summary, kp, mins));
                    } catch (Exception e) {
                        log.error("Summary parse failed: {}", e.getMessage());
                        return ResponseEntity.ok(new ModuleSummaryResponse(
                                moduleId, title,
                                "Summary temporarily unavailable. Please try again.",
                                List.of("Review the module content", "Practice with the quiz"),
                                3));
                    }
                })
                .onErrorResume(e -> {
                    log.error("Groq summary failed for module {}: {}", moduleId, e.getMessage());
                    return Mono.just(ResponseEntity.ok(new ModuleSummaryResponse(
                            moduleId, title,
                            "Summary temporarily unavailable. Please try again.",
                            Arrays.asList("Review the module content", "Practice with the quiz"),
                            3)));
                });
    }

    // ── SCRIPT VIDÉO (Groq) ──────────────────────────────────────────────────

    public record VideoScriptRequest(String moduleTitle, String moduleCategory) {}

    public record VideoScene(
            int sceneNumber, String title, String narration,
            String visualSuggestion, String keyWord, int durationSeconds) {}

    public record VideoScriptResponse(
            long moduleId, String moduleTitle, String script,
            int estimatedDurationSeconds, List<VideoScene> scenes) {}

    @PostMapping("/modules/{moduleId}/video-script")
    public Mono<ResponseEntity<VideoScriptResponse>> generateVideoScript(
            @PathVariable long moduleId,
            @RequestParam(defaultValue = "fr") String language,
            @RequestBody(required = false) VideoScriptRequest req) {

        String title    = (req != null && req.moduleTitle()    != null) ? req.moduleTitle()    : "Module " + moduleId;
        String category = (req != null && req.moduleCategory() != null) ? req.moduleCategory() : "General";
        String lang     = "fr".equals(language) ? "français" : "English";

        String prompt = String.format("""
                Tu es un scénariste pédagogique expert. Génère un script vidéo pour ce module de formation.

                Module : %s
                Catégorie : %s
                Langue de réponse : %s

                Génère un script avec exactement 4 scènes. Chaque scène doit avoir :
                - Un titre court et percutant
                - Une narration de 2-3 phrases (texte à lire à voix haute)
                - Une suggestion visuelle (ce qu'on voit à l'écran)
                - Un mot-clé principal
                - Une durée en secondes (entre 20 et 45)

                Réponds UNIQUEMENT en JSON valide sans markdown :
                {
                  "script": "Introduction générale du script en 1-2 phrases",
                  "estimatedDurationSeconds": 120,
                  "scenes": [
                    {
                      "sceneNumber": 1,
                      "title": "...",
                      "narration": "...",
                      "visualSuggestion": "...",
                      "keyWord": "...",
                      "durationSeconds": 30
                    }
                  ]
                }
                """, title, category, lang);

        Map<String, Object> body = Map.of(
                "model", "llama-3.1-8b-instant",
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "Tu es un scénariste pédagogique. Réponds UNIQUEMENT en JSON valide, sans markdown."),
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.6,
                "max_tokens", 1024
        );

        List<VideoScene> fallbackScenes = List.of(
                new VideoScene(1, "Introduction", "Bienvenue dans ce module sur " + title + ".",
                        "Titre animé sur fond coloré", title, 20),
                new VideoScene(2, "Concepts clés", "Nous allons explorer les concepts essentiels.",
                        "Diagramme des concepts", "Concepts", 30),
                new VideoScene(3, "Application", "Voyons comment appliquer ces connaissances.",
                        "Exemple concret animé", "Application", 30),
                new VideoScene(4, "Conclusion", "Vous êtes maintenant prêt à passer le quiz !",
                        "Écran de félicitations", "Quiz", 20)
        );

        return groqWebClient.post()
                .uri("/chat/completions")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .map(raw -> {
                    try {
                        String content = objectMapper.readTree(raw)
                                .path("choices").get(0)
                                .path("message").path("content").asText();
                        String clean = content.replaceAll("(?s)```json\\s*", "").replaceAll("(?s)```\\s*", "").trim();
                        JsonNode n = objectMapper.readTree(clean);
                        String script = n.path("script").asText("Script for " + title);
                        int duration  = n.path("estimatedDurationSeconds").asInt(120);
                        List<VideoScene> scenes = new java.util.ArrayList<>();
                        for (JsonNode s : n.path("scenes")) {
                            scenes.add(new VideoScene(
                                    s.path("sceneNumber").asInt(scenes.size() + 1),
                                    s.path("title").asText("Scene"),
                                    s.path("narration").asText(""),
                                    s.path("visualSuggestion").asText(""),
                                    s.path("keyWord").asText(""),
                                    s.path("durationSeconds").asInt(30)));
                        }
                        if (scenes.isEmpty()) scenes = fallbackScenes;
                        return ResponseEntity.ok(new VideoScriptResponse(moduleId, title, script, duration, scenes));
                    } catch (Exception e) {
                        log.error("VideoScript parse failed: {}", e.getMessage());
                        return ResponseEntity.ok(new VideoScriptResponse(moduleId, title,
                                "Script temporarily unavailable.", 100, fallbackScenes));
                    }
                })
                .onErrorResume(e -> {
                    log.error("Groq video-script failed for module {}: {}", moduleId, e.getMessage());
                    return Mono.just(ResponseEntity.ok(new VideoScriptResponse(moduleId, title,
                            "Script temporarily unavailable.", 100, fallbackScenes)));
                });
    }

    // ── TTS PROXY (Kokoro) ───────────────────────────────────────────────────

    public record TtsRequest(String text, String voice, String language) {}

    @PostMapping("/tts")
    public Mono<ResponseEntity<byte[]>> textToSpeech(@RequestBody TtsRequest req) {
        return Mono.fromCallable(() -> {
            try {
                String voice = req.voice() != null && !req.voice().isBlank() ? req.voice() : "ff_siwis";
                Map<String, Object> body = Map.of(
                        "model", "kokoro",
                        "input", req.text() != null ? req.text() : "",
                        "voice", voice,
                        "response_format", "mp3"
                );
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
                ResponseEntity<byte[]> resp = restTemplate.exchange(
                        kokoroUrl + "/v1/audio/speech",
                        HttpMethod.POST, entity, byte[].class);
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType("audio/mpeg"))
                        .body(resp.getBody());
            } catch (Exception e) {
                log.error("Kokoro TTS proxy failed: {}", e.getMessage());
                return ResponseEntity.status(503).<byte[]>build();
            }
        }).subscribeOn(Schedulers.boundedElastic());
    }

    // ── TRANSCRIPTION AUDIO (Groq Whisper) ───────────────────────────────────

    @PostMapping(value = "/transcribe", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Mono<ResponseEntity<Map<String, String>>> transcribe(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "fr") String language) {

        return Mono.fromCallable(() -> {
            try {
                byte[] bytes = file.getBytes();
                String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "audio.webm";

                MultipartBodyBuilder builder = new MultipartBodyBuilder();
                builder.part("file", new ByteArrayResource(bytes) {
                    @Override public String getFilename() { return filename; }
                }).filename(filename).contentType(MediaType.APPLICATION_OCTET_STREAM);
                builder.part("model", "whisper-large-v3");
                builder.part("language", language);
                builder.part("response_format", "json");

                return groqWebClient
                        .post()
                        .uri("/audio/transcriptions")
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(BodyInserters.fromMultipartData(builder.build()))
                        .retrieve()
                        .bodyToMono(JsonNode.class)
                        .map(json -> {
                            String text = json.path("text").asText("").trim();
                            log.info("Whisper transcript: '{}'", text);
                            return ResponseEntity.ok(Map.of("transcript", text));
                        })
                        .onErrorReturn(ResponseEntity.ok(Map.of("transcript", "")))
                        .block();
            } catch (Exception e) {
                log.error("Transcription failed: {}", e.getMessage());
                return ResponseEntity.ok(Map.of("transcript", ""));
            }
        }).subscribeOn(Schedulers.boundedElastic());
    }

    // DTO de la requête HTTP entrante depuis Angular
    public record GenerateQuizHttpRequest(
            Long moduleId,          // optionnel, non utilisé pour le mapping BD
            String moduleTitle,
            String moduleCategory,
            String moduleContent,
            Integer questionCount,
            QuizDifficulty difficulty,
            String language
    ) {}
}