package com.interviewprep.community_service.repository;

import com.interviewprep.community_service.model.KarmaScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface KarmaRepository extends JpaRepository<KarmaScore, Long> {
    Optional<KarmaScore> findByKeycloakId(String keycloakId);
    List<KarmaScore> findTop10ByOrderByTotalKarmaDesc();
}
