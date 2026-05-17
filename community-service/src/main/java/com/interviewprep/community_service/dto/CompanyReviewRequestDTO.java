package com.interviewprep.community_service.dto;

import com.interviewprep.community_service.model.DifficultyEnum;
import com.interviewprep.community_service.model.InterviewTypeEnum;
import com.interviewprep.community_service.model.OutcomeEnum;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompanyReviewRequestDTO {

    @NotBlank
    private String companyNameDisplay;

    @NotBlank
    private String roleTitle;

    @NotNull
    private InterviewTypeEnum interviewType;

    @NotNull
    private DifficultyEnum difficulty;

    @NotNull
    private OutcomeEnum outcome;

    @NotNull
    @Min(1)
    @Max(5)
    private Integer overallRating;

    @NotBlank
    @Size(min = 20, max = 2000)
    private String reviewText;

    private String processDescription;

    private boolean isAnonymous;
}
