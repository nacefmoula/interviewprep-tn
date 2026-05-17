package com.microservice.trainingservice.repository;

import com.microservice.trainingservice.model.TrainingModule;
import com.microservice.trainingservice.model.ModuleStatus;
import com.microservice.trainingservice.model.TrainingCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface TrainingModuleRepository extends JpaRepository<TrainingModule, Long> {

    Optional<TrainingModule> findByIdAndTrainingPathId(Long id, Long trainingPathId);
    
    @Query("SELECT tm FROM TrainingModule tm WHERE tm.trainingPath.userId = :userId AND tm.trainingPath.id = :pathId")
    List<TrainingModule> findByPathIdAndUserId(@Param("pathId") Long pathId, @Param("userId") String userId);
    
    @Query("SELECT tm FROM TrainingModule tm WHERE tm.trainingPath.id = :pathId ORDER BY tm.unlockedAt ASC, tm.category ASC")
    List<TrainingModule> findByPathIdOrdered(@Param("pathId") Long pathId);
    
    @Query("SELECT tm FROM TrainingModule tm WHERE tm.trainingPath.id = :pathId AND tm.status = :status")
    List<TrainingModule> findByPathIdAndStatus(@Param("pathId") Long pathId, @Param("status") ModuleStatus status);
    
    @Query("SELECT tm FROM TrainingModule tm WHERE tm.trainingPath.id = :pathId AND tm.category = :category")
    Optional<TrainingModule> findByPathIdAndCategory(@Param("pathId") Long pathId, @Param("category") TrainingCategory category);
    
    @Query("SELECT COUNT(tm) FROM TrainingModule tm WHERE tm.trainingPath.id = :pathId AND tm.status = 'COMPLETED'")
    long findCompletedCountByPathId(@Param("pathId") Long pathId);
    
    @Query(value = "SELECT tm.* FROM training_modules tm " +
                   "WHERE tm.path_id = :pathId " +
                   "AND tm.progress < 100 " +
                   "ORDER BY tm.progress DESC " +
                   "LIMIT :limit",
           nativeQuery = true)
    List<TrainingModule> findInProgressModulesByPathId(@Param("pathId") Long pathId, @Param("limit") int limit);
}
