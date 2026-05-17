package com.microservice.trainingservice.repository;

import com.microservice.trainingservice.model.TrainingUserSignal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TrainingUserSignalRepository extends JpaRepository<TrainingUserSignal, String> {
}
