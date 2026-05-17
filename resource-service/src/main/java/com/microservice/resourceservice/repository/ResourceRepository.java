package com.microservice.resourceservice.repository;

import com.microservice.resourceservice.enums.IndustryEnum;
import com.microservice.resourceservice.enums.ResourceLevelEnum;
import com.microservice.resourceservice.enums.ResourceTypeEnum;
import com.microservice.resourceservice.model.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResourceRepository extends JpaRepository<Resource, UUID> {

    Optional<Resource> findByUrl(String url);

    boolean existsByUrl(String url);

    Page<Resource> findByIndustry(IndustryEnum industry, Pageable pageable);

    Page<Resource> findByLevel(ResourceLevelEnum level, Pageable pageable);

    Page<Resource> findByType(ResourceTypeEnum type, Pageable pageable);

    Page<Resource> findByIndustryAndLevel(IndustryEnum industry, ResourceLevelEnum level, Pageable pageable);

    // Full-text search using the generated search_vector column and GIN index.
    // Falls back to LIKE when query contains characters not tokenised by plainto_tsquery.
    // Native query is required because TSVECTOR is not a JPA type.
    @Query(value = "SELECT r.* FROM resources r " +
        "WHERE r.search_vector @@ plainto_tsquery('simple', :query) " +
        "  AND r.deleted_at IS NULL " +
        "ORDER BY ts_rank(r.search_vector, plainto_tsquery('simple', :query)) DESC",
        countQuery = "SELECT COUNT(*) FROM resources r " +
        "WHERE r.search_vector @@ plainto_tsquery('simple', :query) " +
        "  AND r.deleted_at IS NULL",
        nativeQuery = true)
    Page<Resource> searchFullText(@Param("query") String query, Pageable pageable);

    // LIKE fallback kept for compatibility with tests and pre-V3 databases.
    @Query("SELECT r FROM Resource r WHERE LOWER(r.title) LIKE LOWER(CONCAT('%', :query, '%')) " +
        "OR LOWER(r.description) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<Resource> searchByTitleOrDescription(@Param("query") String query, Pageable pageable);

    // Soft-delete-safe, limited list for in-memory similarity scoring
    @Query("SELECT r FROM Resource r ORDER BY r.createdAt DESC")
    List<Resource> findTopActive(Pageable pageable);

    // Dynamic multi-criteria filter (all params optional)
    @Query("SELECT r FROM Resource r WHERE " +
        "(:type IS NULL OR r.type = :type) AND " +
        "(:industry IS NULL OR r.industry = :industry) AND " +
        "(:level IS NULL OR r.level = :level) AND " +
        "(:categoryId IS NULL OR r.category.id = :categoryId)")
    Page<Resource> findFiltered(
        @Param("type") ResourceTypeEnum type,
        @Param("industry") IndustryEnum industry,
        @Param("level") ResourceLevelEnum level,
        @Param("categoryId") UUID categoryId,
        Pageable pageable);

    // --- Stats helpers (used by ResourceService.getStats()) ---
    long countByType(ResourceTypeEnum type);

    long countByCreatedAtAfter(LocalDateTime after);
}
