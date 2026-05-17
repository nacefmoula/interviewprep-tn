package com.microservice.trainingservice.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "training_modules", indexes = {
    @Index(name = "idx_training_modules_path_id", columnList = "path_id"),
    @Index(name = "idx_training_modules_status", columnList = "status"),
    @Index(name = "idx_training_modules_category", columnList = "category")
})
@Data
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingModule {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    @ToString.Include
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "path_id", nullable = false)
    private TrainingPath trainingPath;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 50)
    private TrainingCategory category;
    
    @Column(name = "title", nullable = false, length = 500)
    private String title;
    
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "lessons", nullable = false)
    private Integer lessons;
    
    @Column(name = "completed_lessons", nullable = false)
    private Integer completedLessons;
    
    @Column(name = "progress", nullable = false)
    private Integer progress; // 0-100
    
    @Column(name = "xp_reward", nullable = false)
    private Integer xpReward;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ModuleStatus status;

    @OneToMany(mappedBy = "module", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private Set<TrainingModuleLesson> moduleLessons = new LinkedHashSet<>();
    
    @Column(name = "unlock_at")
    private LocalDateTime unlockedAt;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    public void updateProgress() {
        if (lessons > 0) {
            this.progress = Math.min(100, (completedLessons * 100) / lessons);
        }
    }
    
    public boolean isLocked() {
        return ModuleStatus.LOCKED == status;
    }
    
    public boolean isCompleted() {
        return ModuleStatus.COMPLETED == status;
    }
    
    public boolean isInProgress() {
        return ModuleStatus.IN_PROGRESS == status;
    }

    public void addModuleLesson(TrainingModuleLesson lesson) {
        moduleLessons.add(lesson);
        lesson.setModule(this);
    }

    public void removeModuleLesson(TrainingModuleLesson lesson) {
        moduleLessons.remove(lesson);
        lesson.setModule(null);
    }
}
