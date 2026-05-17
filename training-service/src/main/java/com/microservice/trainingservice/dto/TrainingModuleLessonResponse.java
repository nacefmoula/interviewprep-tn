package com.microservice.trainingservice.dto;

import com.microservice.trainingservice.model.LessonFormat;
import com.microservice.trainingservice.model.LessonProgressStatus;
import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingModuleLessonResponse {
    private Long id;
    private Long moduleId;
    private Long lessonId;
    private String title;
    private LessonFormat format;
    private String contentMarkdown;
    private String videoUrl;
    private Integer estimatedMinutes;
    private Integer orderIndex;
    private LessonProgressStatus status;
    private LocalDateTime completedAt;
}
