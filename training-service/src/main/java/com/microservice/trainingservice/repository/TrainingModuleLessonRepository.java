package com.microservice.trainingservice.repository;

import com.microservice.trainingservice.model.TrainingModuleLesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TrainingModuleLessonRepository extends JpaRepository<TrainingModuleLesson, Long> {

    @Query("SELECT ml FROM TrainingModuleLesson ml WHERE ml.module.id = :moduleId ORDER BY ml.orderIndex ASC")
    List<TrainingModuleLesson> findByModuleIdOrdered(@Param("moduleId") Long moduleId);

    @Modifying
    @Query("DELETE FROM TrainingModuleLesson ml WHERE ml.module.id = :moduleId")
    void deleteByModuleId(@Param("moduleId") Long moduleId);
}
