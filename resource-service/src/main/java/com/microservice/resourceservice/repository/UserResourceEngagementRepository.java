package com.microservice.resourceservice.repository;

import com.microservice.resourceservice.model.UserResourceEngagement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserResourceEngagementRepository extends JpaRepository<UserResourceEngagement, UUID> {
    List<UserResourceEngagement> findByUserId(UUID userId);
    Optional<UserResourceEngagement> findByUserIdAndResource_Id(UUID userId, UUID resourceId);
    boolean existsByUserIdAndResource_Id(UUID userId, UUID resourceId);
}
