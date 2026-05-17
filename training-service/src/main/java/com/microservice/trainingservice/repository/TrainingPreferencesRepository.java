package com.microservice.trainingservice.repository;

import com.microservice.trainingservice.model.TrainingPreferences;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TrainingPreferencesRepository extends JpaRepository<TrainingPreferences, String> {
}
