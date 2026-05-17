package com.interviewprep.community_service.repository;

import com.interviewprep.community_service.model.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {
    Page<Post> findByType(String type, Pageable pageable);
    Page<Post> findByIndustry(String industry, Pageable pageable);
    Page<Post> findByTypeAndIndustry(String type, String industry, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE " +
           "LOWER(p.title) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(p.content) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(p.tags) LIKE LOWER(CONCAT('%', :q, '%'))" +
           " ORDER BY p.createdAt DESC")
    Page<Post> searchPosts(@Param("q") String query, Pageable pageable);

    Page<Post> findByAuthorKeycloakIdOrderByCreatedAtDesc(String authorKeycloakId, Pageable pageable);

    Page<Post> findByAuthorKeycloakIdIn(List<String> authorKeycloakIds, Pageable pageable);

    Page<Post> findByAuthorKeycloakId(String authorKeycloakId, Pageable pageable);

    Page<Post> findByIndustryIgnoreCase(String industry, Pageable pageable);
}
