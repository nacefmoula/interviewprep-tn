package com.interviewprep.community_service.repository;

import com.interviewprep.community_service.model.CompanyReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CompanyReviewRepository extends JpaRepository<CompanyReview, Long> {

    Page<CompanyReview> findByCompanyNameNormalized(String name, Pageable pageable);

    List<CompanyReview> findByAuthorKeycloakId(String authorKeycloakId);

    @Query("SELECT DISTINCT c.companyNameDisplay FROM CompanyReview c WHERE c.companyNameNormalized LIKE CONCAT('%', :query, '%')")
    List<String> searchCompanyNames(@Param("query") String query);

    long countByCompanyNameNormalized(String name);
}
