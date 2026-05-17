package com.interviewprep.community_service.dto;

import com.interviewprep.community_service.model.DifficultyEnum;
import com.interviewprep.community_service.model.InterviewTypeEnum;
import com.interviewprep.community_service.model.OutcomeEnum;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CompanyReviewResponseDTO {

    private Long id;
    private String companyNameDisplay;
    private String companyNameNormalized;
    private String roleTitle;
    private InterviewTypeEnum interviewType;
    private DifficultyEnum difficulty;
    private OutcomeEnum outcome;
    private Integer overallRating;
    private String reviewText;
    private String processDescription;
    private boolean isAnonymous;
    private Integer helpfulCount;
    private LocalDateTime createdAt;
    // null when isAnonymous = true
    private String authorKeycloakId;
    private String authorDisplayName;
}
