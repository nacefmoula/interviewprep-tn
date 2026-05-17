package com.microservice.trainingservice.dto;

import com.microservice.trainingservice.model.LessonDifficulty;
import com.microservice.trainingservice.model.TrainingCategory;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GenerateMissingLessonsRequest {

    @NotNull
    private TrainingCategory category;

    /** Allowed: en, fr, ar */
    @NotBlank
    private String language;

    /** Ensure there are at least this many ACTIVE lessons for (category, language). */
    @NotNull
    @Min(0)
    @Max(5000)
    private Integer targetActiveCount;

    /** Safety cap for one request. */
    @NotNull
    @Min(0)
    @Max(50)
    private Integer maxGenerate;

    /** Optional: force difficulty, else AI picks a reasonable level. */
    private LessonDifficulty difficulty;
}
