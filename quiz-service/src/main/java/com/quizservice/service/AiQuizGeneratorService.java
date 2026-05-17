package com.quizservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quizservice.dto.request.CreateAnswerRequest;
import com.quizservice.dto.request.CreateQuestionRequest;
import com.quizservice.dto.request.CreateQuizRequest;
import com.quizservice.dto.response.QuizResponse;
import com.quizservice.enums.QuestionType;
import com.quizservice.enums.QuizDifficulty;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiQuizGeneratorService {

    private final WebClient groqWebClient;
    private final QuizService quizService;
    private final ObjectMapper objectMapper;

    @Value("${groq.model:llama3-8b-8192}")
    private String model;

    public Mono<QuizResponse> generateQuizFromModule(GenerateQuizRequest req) {
        log.info("Groq quiz generation — module='{}' questions={} level={}",
                req.moduleTitle(), req.questionCount(), req.difficulty());
        return callGroq(buildPrompt(req))
                .flatMap(json -> parseAndPersistQuiz(json, req));
    }

    private Mono<String> callGroq(String prompt) {
        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM_PROMPT),
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.7
        );

        return groqWebClient.post()
                .uri("/chat/completions")
                .bodyValue(body)
                .retrieve()
                .onStatus(status -> status.is4xxClientError(), response ->
                        response.bodyToMono(String.class).flatMap(b -> {
                            log.error("Groq 4xx error: {}", b);
                            try {
                                JsonNode err = objectMapper.readTree(b);
                                String msg = err.path("error").path("message").asText(b);
                                return Mono.error(new RuntimeException("Groq erreur: " + msg));
                            } catch (Exception e) {
                                return Mono.error(new RuntimeException("Groq 4xx: " + b));
                            }
                        })
                )
                .onStatus(status -> status.is5xxServerError(), response ->
                        response.bodyToMono(String.class).flatMap(b ->
                                Mono.error(new RuntimeException("Groq serveur indisponible: " + b))
                        )
                )
                .bodyToMono(String.class)
                .map(raw -> {
                    try {
                        JsonNode root = objectMapper.readTree(raw);
                        String text = root.path("choices").get(0)
                                .path("message")
                                .path("content")
                                .asText();
                        log.debug("Groq response preview: {}",
                                text.substring(0, Math.min(150, text.length())));
                        return text;
                    } catch (Exception e) {
                        throw new RuntimeException("Groq response parse failed: " + e.getMessage(), e);
                    }
                });
    }

    private String buildPrompt(GenerateQuizRequest req) {
        String diff = req.difficulty() != null ? req.difficulty().name() : "MEDIUM";
        String lang = req.language() != null ? req.language() : "fr";
        return String.format("""
                Module: %s
                Catégorie: %s
                Nombre de questions: %d
                Difficulté: %s
                Langue: %s

                Contenu:
                %s
                """,
                req.moduleTitle(),
                req.moduleCategory() != null ? req.moduleCategory() : "GENERAL",
                req.questionCount() != null ? req.questionCount() : 10,
                diff, lang,
                req.moduleContent() != null ? req.moduleContent() : req.moduleTitle()
        );
    }

    @Transactional
    public Mono<QuizResponse> parseAndPersistQuiz(String jsonText, GenerateQuizRequest req) {
        try {
            String clean = jsonText
                    .replaceAll("(?s)```json\\s*", "")
                    .replaceAll("(?s)```\\s*", "")
                    .trim();

            JsonNode quiz = objectMapper.readTree(clean);
            log.info("Groq generated {} questions", quiz.path("questions").size());

            List<CreateQuestionRequest> questions = new ArrayList<>();
            int orderIdx = 0;
            for (JsonNode q : quiz.path("questions")) {
                List<CreateAnswerRequest> answers = new ArrayList<>();
                String typeStr = q.path("type").asText("SINGLE_CHOICE");

                // ─── VALIDATION POST-PARSING : TRUE_FALSE mal assigné ──────────────────
                // Si le type est TRUE_FALSE mais que la question n'est pas une affirmation
                // binaire (détection heuristique), on la convertit en SINGLE_CHOICE
                if ("TRUE_FALSE".equals(typeStr)) {
                    typeStr = validateTrueFalseType(q.path("content").asText(""));
                }

                // TRUE_FALSE : générer automatiquement si vide
                if ("TRUE_FALSE".equals(typeStr) && q.path("answers").isEmpty()) {
                    answers.add(new CreateAnswerRequest("Vrai", false, ""));
                    answers.add(new CreateAnswerRequest("Faux", false, ""));
                } else if ("TRUE_FALSE".equals(typeStr)) {
                    // TRUE_FALSE avec answers fournis par l'IA
                    for (JsonNode a : q.path("answers")) {
                        boolean isCorrect = a.path("isCorrect").isBoolean()
                                ? a.path("isCorrect").asBoolean()
                                : Boolean.parseBoolean(a.path("isCorrect").asText("false"));
                        answers.add(new CreateAnswerRequest(
                                a.path("content").asText(),
                                isCorrect,
                                ""
                        ));
                    }
                    // Vérifier qu'il y a exactement une bonne réponse
                    long correctCount = answers.stream().filter(CreateAnswerRequest::isCorrect).count();
                    if (correctCount == 0 || correctCount == answers.size()) {
                        // L'IA n'a pas mis de bonne réponse — fallback
                        answers.clear();
                        answers.add(new CreateAnswerRequest("Vrai", true, ""));
                        answers.add(new CreateAnswerRequest("Faux", false, ""));
                    }
                } else {
                    for (JsonNode a : q.path("answers")) {
                        boolean isCorrect = a.path("isCorrect").isBoolean()
                                ? a.path("isCorrect").asBoolean()
                                : Boolean.parseBoolean(a.path("isCorrect").asText("false"));
                        answers.add(new CreateAnswerRequest(
                                a.path("content").asText(),
                                isCorrect,
                                ""
                        ));
                    }
                    // Si SINGLE_CHOICE/MULTIPLE_CHOICE a des answers Vrai/Faux → convertir en TRUE_FALSE serait incorrect
                    // Si pas assez d'options → loguer mais laisser passer
                    if (answers.isEmpty()) {
                        log.warn("Question '{}' has no answers — skipping", q.path("content").asText());
                        continue;
                    }
                }

                // Pour OPEN_ENDED, stocker la réponse attendue dans explanation
                String explanation = q.path("explanation").asText("");
                if ("OPEN_ENDED".equals(typeStr) && !q.path("expectedAnswer").isMissingNode()) {
                    explanation = q.path("expectedAnswer").asText(explanation);
                }

                questions.add(new CreateQuestionRequest(
                        q.path("content").asText(),
                        QuestionType.valueOf(typeStr),
                        10,
                        orderIdx++,
                        explanation,
                        null,
                        null,
                        answers
                ));
            }

            CreateQuizRequest createReq = CreateQuizRequest.builder()
                    .title(quiz.path("title").asText(req.moduleTitle() + " — Quiz IA"))
                    .description(quiz.path("description").asText("Généré par Groq AI"))
                    .moduleId(req.moduleId()) // <-- Remplace null par req.moduleId()
                    .category(req.moduleCategory())
                    .difficulty(req.difficulty() != null ? req.difficulty() : QuizDifficulty.MEDIUM)
                    .questions(questions)
                    .passingScore(60.0)
                    .build();

            UUID creatorId;
            try {
                creatorId = UUID.fromString(req.createdByUserId());
            } catch (Exception e) {
                creatorId = new UUID(0L, 0L);
            }

            final UUID finalCreatorId = creatorId;
            return Mono.fromCallable(() ->
                    quizService.createQuiz(createReq, finalCreatorId)
            );

        } catch (Exception e) {
            log.error("parseAndPersistQuiz failed: {}", e.getMessage(), e);
            return Mono.error(new RuntimeException("Parsing échoué: " + e.getMessage(), e));
        }
    }

    /**
     * Vérifie si une question est vraiment binaire (TRUE_FALSE).
     * Si la question commence par un mot interrogatif ouvert (quel, quels, comment,
     * pourquoi, qu'est-ce, combien, où, qui, que) → elle ne peut pas être TRUE_FALSE.
     * Dans ce cas on retourne SINGLE_CHOICE.
     */
    private String validateTrueFalseType(String questionContent) {
        if (questionContent == null || questionContent.isBlank()) return "SINGLE_CHOICE";
        String q = questionContent.toLowerCase().trim();
        // Patterns de questions ouvertes incompatibles avec TRUE_FALSE
        String[] openPatterns = {
                "quel ", "quels ", "quelle ", "quelles ",
                "comment ", "pourquoi ", "qu'est-ce", "qu est-ce",
                "combien ", "où ", "qui est", "que fait",
                "quelles sont", "quels sont", "quel est", "quelle est",
                "what ", "which ", "how ", "why ", "when ", "where ", "who "
        };
        for (String pattern : openPatterns) {
            if (q.startsWith(pattern)) {
                log.warn("TRUE_FALSE incorrectly assigned to open question '{}' — converting to SINGLE_CHOICE",
                        questionContent.length() > 60 ? questionContent.substring(0, 60) + "…" : questionContent);
                return "SINGLE_CHOICE";
            }
        }
        return "TRUE_FALSE";
    }

    private static final String SYSTEM_PROMPT = """
        Tu es un expert en création de quiz pour des plateformes de formation.
        Génère un quiz varié avec DIFFÉRENTS types de questions.

        Types disponibles UNIQUEMENT :
        - SINGLE_CHOICE : 4 options, exactement 1 correcte
        - MULTIPLE_CHOICE : 4 options, 2 ou 3 correctes
        - TRUE_FALSE : exactement 2 options "Vrai" et "Faux" — SEULEMENT pour des affirmations factuelles binaires du type "X est vrai ou faux", "X existe ou n'existe pas", "X se passe avant/après Y" — JAMAIS pour des questions ouvertes, des questions "quel est...", "quels sont...", "comment...", "pourquoi...", "qu'est-ce que..."

        Règles STRICTES :
        - Varier les types : 60% SINGLE_CHOICE, 25% MULTIPLE_CHOICE, 15% TRUE_FALSE
        - Exactement 4 options pour SINGLE_CHOICE et MULTIPLE_CHOICE
        - TRUE_FALSE UNIQUEMENT si la question peut se répondre par "Vrai" ou "Faux" — i.e. la question est une affirmation ou une proposition booléenne. Exemple valide : "La communication non-verbale représente plus de 50% du message." Exemple INVALIDE (ne pas mettre TRUE_FALSE) : "Quel est l'importance de la clarté dans la communication ?" — cette question a plusieurs réponses possibles donc c'est SINGLE_CHOICE
        - Inclure une explication pour chaque question
        - Respecter la langue demandée
        - isCorrect doit être un booléen JSON : true ou false

        Réponds UNIQUEMENT avec du JSON valide sans backticks ni markdown :
        {
          "title": "string",
          "description": "string",
          "questions": [
            {
              "content": "string",
              "type": "SINGLE_CHOICE|MULTIPLE_CHOICE|TRUE_FALSE",
              "explanation": "string",
              "answers": [
                { "content": "string", "isCorrect": true },
                { "content": "string", "isCorrect": false }
              ]
            }
          ]
        }
        """;

    public record GenerateQuizRequest(
            Long moduleId,
            String moduleTitle,
            String moduleCategory,
            String moduleContent,
            Integer questionCount,
            QuizDifficulty difficulty,
            String language,
            String createdByUserId
    ) {}
}