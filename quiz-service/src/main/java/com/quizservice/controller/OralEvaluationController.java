package com.quizservice.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quizservice.service.QuizService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

/**
 * POST /api/quizzes/ai/evaluate-oral
 * Évalue sémantiquement la réponse orale via Groq (LLM).
 * Retourne : score (0-100), feedback pédagogique complet avec réponse correcte, isCorrect.
 */
@Slf4j
@RestController
@RequestMapping("/api/quizzes/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OralEvaluationController {

    private final WebClient groqWebClient;
    private final ObjectMapper objectMapper;
    private final QuizService quizService;
    public record OralEvalRequest(
            String attemptId,      // <--- AJOUT : ID de la tentative en cours
            String questionId,     // <--- AJOUT : ID de la question
            String questionText,
            String correctAnswer,
            String userTranscription,
            String explanation,
            String language
    ) {}

    public record OralEvalResponse(
            int     score,
            String  feedback,
            boolean isCorrect
    ) {}

    @PostMapping("/evaluate-oral")
    public Mono<ResponseEntity<OralEvalResponse>> evaluate(@RequestBody OralEvalRequest req) {

        // Réponse vide
        if (req.userTranscription() == null || req.userTranscription().isBlank()) {
            String expl = req.explanation() != null && !req.explanation().isBlank()
                    ? " " + req.explanation()
                    : "";
            String fb = String.format("Aucune réponse enregistrée. La bonne réponse était : \"%s\".%s",
                    req.correctAnswer(), expl);
            return Mono.just(ResponseEntity.ok(new OralEvalResponse(0, fb, false)));
        }

        return callGroq(buildPrompt(req))
                .map(this::parse)
                .map(ResponseEntity::ok)
                .onErrorResume(e -> {
                    log.warn("Oral eval fallback (Groq unavailable): {}", e.getMessage());
                    int sc = fallbackScore(req.userTranscription(), req.correctAnswer());
                    String fb = buildFallbackFeedback(sc, req.correctAnswer(), req.explanation());
                    return Mono.just(ResponseEntity.ok(new OralEvalResponse(sc, fb, sc >= 60)));
                });
    }

    private String buildPrompt(OralEvalRequest req) {
        String lang = "fr".equals(req.language()) ? "français" : "English";
        String explSection = (req.explanation() != null && !req.explanation().isBlank())
                ? "EXPLICATION PÉDAGOGIQUE : " + req.explanation()
                : "";
        return String.format("""
                Tu es un correcteur pédagogique expert. Évalue la réponse orale d'un étudiant.

                QUESTION         : %s
                BONNE RÉPONSE    : %s
                %s
                RÉPONSE ÉTUDIANT : %s

                Critères :
                • Accepte les formulations différentes mais sémantiquement correctes
                • Vérifie la présence des concepts clés même paraphrasés
                • Score 90-100 : tous les concepts, parfaitement compris
                • Score 70-89  : concepts essentiels présents
                • Score 50-69  : partiellement correct
                • Score 0-49   : incorrect ou hors sujet

                IMPORTANT : Le feedback DOIT TOUJOURS mentionner la bonne réponse ET l'explication.
                Format du feedback : commencer par le résultat (Bravo / Pas tout à fait), puis dire
                "La bonne réponse est : [réponse]", puis inclure l'explication pédagogique si disponible.

                Réponds UNIQUEMENT en JSON valide (langue : %s), sans markdown :
                {"score":<0-100>,"feedback":"<2-3 phrases complètes>","isCorrect":<true/false>}
                """,
                req.questionText(), req.correctAnswer(), explSection,
                req.userTranscription(), lang
        );
    }

    private Mono<String> callGroq(String prompt) {
        Map<String, Object> body = Map.of(
                "model", "llama3-8b-8192",
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "Tu es un correcteur pédagogique. Réponds UNIQUEMENT en JSON valide, sans markdown ni texte additionnel."),
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.2,
                "max_tokens", 256
        );
        return groqWebClient.post()
                .uri("/chat/completions")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .map(raw -> {
                    try {
                        return objectMapper.readTree(raw)
                                .path("choices").get(0)
                                .path("message").path("content").asText();
                    } catch (Exception e) {
                        throw new RuntimeException("Groq parse error");
                    }
                });
    }

    private OralEvalResponse parse(String json) {
        try {
            String clean = json.replaceAll("(?s)```json\\s*","").replaceAll("(?s)```\\s*","").trim();
            JsonNode n = objectMapper.readTree(clean);
            int sc    = Math.max(0, Math.min(100, n.path("score").asInt(0)));
            String fb = n.path("feedback").asText("Bonne tentative !");
            boolean ok = n.path("isCorrect").asBoolean(sc >= 60);
            return new OralEvalResponse(sc, fb, ok);
        } catch (Exception e) {
            log.warn("OralEval parse failed: {}", e.getMessage());
            return new OralEvalResponse(0, "Erreur d'évaluation.", false);
        }
    }

    private String buildFallbackFeedback(int score, String correct, String expl) {
        String explPart = (expl != null && !expl.isBlank()) ? " " + expl : "";
        if (score >= 70) {
            return String.format("Très bonne réponse ! La bonne réponse est : \"%s\".%s", correct, explPart);
        }
        return String.format("La bonne réponse est : \"%s\".%s Relisez ce point du module.", correct, explPart);
    }

    private int fallbackScore(String user, String correct) {
        if (correct == null || correct.isBlank()) return 0;
        String u = user.toLowerCase().replaceAll("[^a-z0-9\\s]", "");
        String[] cw = correct.toLowerCase().replaceAll("[^a-z0-9\\s]", "").split("\\s+");
        long m = java.util.Arrays.stream(cw)
                .filter(w -> w.length() > 2 && u.contains(w))
                .count();
        return (int) Math.min(100, Math.round((double) m / Math.max(1, cw.length) * 100));
    }
}