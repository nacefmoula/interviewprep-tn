package com.interviewprep.community_service.dto;

import com.interviewprep.community_service.model.JobCatalog;
import java.util.List;

public class JobMatchDTO {
    private JobCatalog job;
    private Integer matchScore;
    private List<String> matchReasons;

    public JobMatchDTO() {}

    public JobMatchDTO(JobCatalog job, Integer matchScore, List<String> matchReasons) {
        this.job = job;
        this.matchScore = matchScore;
        this.matchReasons = matchReasons;
    }

    public JobCatalog getJob() {
        return job;
    }

    public void setJob(JobCatalog job) {
        this.job = job;
    }

    public Integer getMatchScore() {
        return matchScore;
    }

    public void setMatchScore(Integer matchScore) {
        this.matchScore = matchScore;
    }

    public List<String> getMatchReasons() {
        return matchReasons;
    }

    public void setMatchReasons(List<String> matchReasons) {
        this.matchReasons = matchReasons;
    }
}
