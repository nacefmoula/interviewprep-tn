package com.quizservice.model;

import com.quizservice.enums.*;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "quizzes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Quiz {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;
    @Column(columnDefinition = "TEXT")
    private String description;

    // Lien avec le module de cours (ID venant de l'autre service)
    @Column(name = "module_id")
    private Long moduleId; // au lieu de UUID moduleId private UUID moduleId;

    // Catégorie ex: Java, Spring, SQL, Docker...
    private String category;

    @Enumerated(EnumType.STRING)
    private QuizDifficulty difficulty;

    // Temps limite en minutes (null = pas de limite)
    private Integer timeLimit;

    // Nombre max de tentatives (null = illimité)
    private Integer maxAttempts;

    // Score minimum pour valider le quiz (ex: 60%)
    @Builder.Default
    private double passingScore = 60.0;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private QuizStatus status = QuizStatus.PUBLISHED;;

    // Mélanger les questions à chaque tentative
    @Builder.Default
    private boolean shuffleQuestions = false;

    // Mélanger les réponses à chaque tentative
    @Builder.Default
    private boolean shuffleAnswers = false;

    // Afficher la correction immédiatement après soumission
    @Builder.Default
    private boolean showCorrectionImmediately = true;

    // ID du créateur (vient du token JWT)
    private UUID createdBy;


    @OrderBy("orderIndex ASC")
    @Builder.Default // <--- IMPORTANT : Dit à Lombok de garder cette initialisation
    // Dans Quiz.java
    @OneToMany(mappedBy = "quiz", fetch = FetchType.EAGER, cascade = CascadeType.ALL)
    private List<Question> questions = new ArrayList<>();

    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL)
    private List<QuizAttempt> attempts = new ArrayList<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Méthode utilitaire
    // Dans Quiz.java (vers la ligne 90)
    public int getTotalPoints() {
        if (questions == null || questions.isEmpty()) {
            return 0;
        }
        return questions.stream()
                .mapToInt(Question::getPoints)
                .sum();
    }
}