package com.interviewprep.community_service.repository;

import com.interviewprep.community_service.model.CareerWizardResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CareerWizardRepository extends JpaRepository<CareerWizardResponse, Long> {
    Optional<CareerWizardResponse> findByUserKeycloakId(String keycloakId);
    boolean existsByUserKeycloakId(String keycloakId);
    List<CareerWizardResponse> findByCompletedTrue();
}
