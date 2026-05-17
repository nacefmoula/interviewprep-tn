package com.microservice.trainingservice.dto;

import com.microservice.trainingservice.model.PathStatus;
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
public class TrainingPathUpsertRequest {

    @NotBlank
    private String userId;

    @NotNull
    private PathStatus status;

    @NotNull
    @Min(0)
    private Integer xpThreshold;
}
