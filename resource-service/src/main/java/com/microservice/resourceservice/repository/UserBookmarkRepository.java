package com.microservice.resourceservice.repository;

import com.microservice.resourceservice.model.UserBookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserBookmarkRepository extends JpaRepository<UserBookmark, UUID> {

    List<UserBookmark> findByUserId(UUID userId);

    Optional<UserBookmark> findByUserIdAndResource_Id(UUID userId, UUID resourceId);

    boolean existsByUserIdAndResource_Id(UUID userId, UUID resourceId);

    void deleteByUserIdAndResource_Id(UUID userId, UUID resourceId);

    long countByResource_Id(UUID resourceId);
}
