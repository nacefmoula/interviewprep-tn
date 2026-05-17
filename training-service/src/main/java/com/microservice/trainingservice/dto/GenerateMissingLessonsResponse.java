package com.microservice.trainingservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GenerateMissingLessonsResponse {

    private String category;
    private String language;

    private int existingActiveCount;
    private int targetActiveCount;
    private int missingCount;

    private int generatedCount;
    private List<Long> generatedLessonIds;
}
