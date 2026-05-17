package com.interviewprep.community_service.dto;

import com.interviewprep.community_service.model.CareerWizardResponse;
import com.interviewprep.community_service.model.Post;
import java.time.LocalDateTime;
import java.util.List;

public class CareerRecommendationResult {
    private List<JobMatchDTO> topJobs;
    private List<String> skillsGap;
    private List<String> peopleToFollow;
    private List<Post> postsToRead;
    private CareerWizardResponse profile;
    private LocalDateTime generatedAt;

    public CareerRecommendationResult() {}

    public CareerRecommendationResult(List<JobMatchDTO> topJobs, List<String> skillsGap,
                                     List<String> peopleToFollow, List<Post> postsToRead,
                                     CareerWizardResponse profile, LocalDateTime generatedAt) {
        this.topJobs = topJobs;
        this.skillsGap = skillsGap;
        this.peopleToFollow = peopleToFollow;
        this.postsToRead = postsToRead;
        this.profile = profile;
        this.generatedAt = generatedAt;
    }

    public List<JobMatchDTO> getTopJobs() {
        return topJobs;
    }

    public void setTopJobs(List<JobMatchDTO> topJobs) {
        this.topJobs = topJobs;
    }

    public List<String> getSkillsGap() {
        return skillsGap;
    }

    public void setSkillsGap(List<String> skillsGap) {
        this.skillsGap = skillsGap;
    }

    public List<String> getPeopleToFollow() {
        return peopleToFollow;
    }

    public void setPeopleToFollow(List<String> peopleToFollow) {
        this.peopleToFollow = peopleToFollow;
    }

    public List<Post> getPostsToRead() {
        return postsToRead;
    }

    public void setPostsToRead(List<Post> postsToRead) {
        this.postsToRead = postsToRead;
    }

    public CareerWizardResponse getProfile() {
        return profile;
    }

    public void setProfile(CareerWizardResponse profile) {
        this.profile = profile;
    }

    public LocalDateTime getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(LocalDateTime generatedAt) {
        this.generatedAt = generatedAt;
    }
}
