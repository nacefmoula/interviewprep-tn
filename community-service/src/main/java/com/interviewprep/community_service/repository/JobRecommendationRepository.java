package com.interviewprep.community_service.repository;

import com.interviewprep.community_service.model.JobRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface JobRecommendationRepository extends JpaRepository<JobRecommendation, Long> {
    List<JobRecommendation> findByUserKeycloakIdOrderByMatchScoreDesc(String keycloakId);
    void deleteByUserKeycloakId(String keycloakId);
}
