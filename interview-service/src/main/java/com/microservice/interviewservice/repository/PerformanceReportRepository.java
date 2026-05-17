// repository/PerformanceReportRepository.java
package com.microservice.interviewservice.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.microservice.interviewservice.model.PerformanceReport;

@Repository
public interface PerformanceReportRepository extends JpaRepository<PerformanceReport, Long> {
    Optional<PerformanceReport> findBySessionId(Long sessionId);
}