package com.microservice.interviewservice.dto.live;

import java.util.List;

public record CandidateProfile(
        String candidateName,
        String currentRole,
        String targetRole,
        String yearsOfExperience,
        List<String> keySkills,
        String communicationStyle,
        String confidenceSummary,
        String shortBio
) {
    public CandidateProfile {
        keySkills = keySkills == null ? List.of() : keySkills;
    }
}
