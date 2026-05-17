package com.interviewprep.community_service.repository;

import com.interviewprep.community_service.model.Follow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FollowRepository extends JpaRepository<Follow, Long> {
    Optional<Follow> findByFollowerKeycloakIdAndFollowingKeycloakId(String followerKeycloakId, String followingKeycloakId);
    List<Follow> findByFollowingKeycloakId(String followingKeycloakId);
    List<Follow> findByFollowerKeycloakId(String followerKeycloakId);
    boolean existsByFollowerKeycloakIdAndFollowingKeycloakId(String followerKeycloakId, String followingKeycloakId);
}
