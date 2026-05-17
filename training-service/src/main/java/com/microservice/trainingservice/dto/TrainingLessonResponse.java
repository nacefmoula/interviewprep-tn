package com.microservice.trainingservice.dto;

import com.microservice.trainingservice.model.LessonDifficulty;
import com.microservice.trainingservice.model.LessonFormat;
import com.microservice.trainingservice.model.TrainingCategory;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingLessonResponse {
    private Long id;
    private TrainingCategory category;
    private String title;
    private LessonFormat format;
    private String summary;
    private String contentMarkdown;
    private String videoUrl;
    private Integer estimatedMinutes;
    private LessonDifficulty difficulty;
    private String language;
    private boolean active;
    private Set<String> tags;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
