package com.interviewprep.community_service.repository;

import com.interviewprep.community_service.model.JobCatalog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface JobCatalogRepository extends JpaRepository<JobCatalog, Long> {
    List<JobCatalog> findByActiveTrue();
    List<JobCatalog> findByActiveTrueAndSource(String source);
    List<JobCatalog> findByActiveTrueAndIndustryContainingIgnoreCase(String industry);
    Page<JobCatalog> findByActiveTrueAndSubmittedBy(String keycloakId, Pageable pageable);
    boolean existsByJobUrl(String jobUrl);

    @Query("SELECT j FROM JobCatalog j WHERE j.active = true AND (:industry IS NULL OR LOWER(j.industry) LIKE LOWER(CONCAT('%', CAST(:industry AS string), '%'))) AND (:workType IS NULL OR j.workType = CAST(:workType AS string)) AND (:keyword IS NULL OR LOWER(j.title) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) OR LOWER(j.requiredSkills) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')))")
    Page<JobCatalog> findWithFilters(@Param("industry") String industry, @Param("workType") String workType, @Param("keyword") String keyword, Pageable pageable);
}
