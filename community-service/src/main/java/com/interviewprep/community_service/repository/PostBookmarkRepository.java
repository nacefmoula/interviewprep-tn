package com.interviewprep.community_service.repository;

import com.interviewprep.community_service.model.PostBookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PostBookmarkRepository extends JpaRepository<PostBookmark, Long> {
    Optional<PostBookmark> findByUserKeycloakIdAndPostId(String userKeycloakId, Long postId);

    boolean existsByUserKeycloakIdAndPostId(String userKeycloakId, Long postId);

    List<PostBookmark> findByUserKeycloakIdOrderByCreatedAtDesc(String userKeycloakId);

    void deleteByUserKeycloakIdAndPostId(String userKeycloakId, Long postId);

    @Query("SELECT COUNT(b) FROM PostBookmark b WHERE b.post.id = :postId")
    long countByPostId(@Param("postId") Long postId);
}
