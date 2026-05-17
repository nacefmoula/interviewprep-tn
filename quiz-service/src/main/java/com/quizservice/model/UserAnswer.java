package com.quizservice.model;
import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import java.util.UUID;
@Entity
@Table(name = "user_answers")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAnswer {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id")
    private QuizAttempt attempt;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    private Question question;
    @ManyToMany
    @JoinTable(name = "user_answer_selections",
            joinColumns = @JoinColumn(name = "user_answer_id"),
            inverseJoinColumns = @JoinColumn(name = "answer_id"))
    private List<Answer> selectedAnswers;
    @Column(columnDefinition = "TEXT")
    private String transcription;
    private Integer score;
    private String feedback;
    private boolean isCorrect;
}