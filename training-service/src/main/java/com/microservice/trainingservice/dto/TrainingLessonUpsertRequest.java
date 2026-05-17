package com.microservice.trainingservice.dto;

import com.microservice.trainingservice.model.LessonDifficulty;
import com.microservice.trainingservice.model.LessonFormat;
import com.microservice.trainingservice.model.TrainingCategory;
import lombok.*;

import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingLessonUpsertRequest {
    private TrainingCategory category;
    private String title;
    private LessonFormat format;
    private String summary;
    private String contentMarkdown;
    private String videoUrl;
    private Integer estimatedMinutes;
    private LessonDifficulty difficulty;
    private String language;
    private Boolean active;
    private Set<String> tags;
}
