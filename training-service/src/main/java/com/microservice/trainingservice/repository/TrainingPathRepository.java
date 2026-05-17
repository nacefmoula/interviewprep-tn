package com.microservice.trainingservice.repository;

import com.microservice.trainingservice.model.TrainingPath;
import com.microservice.trainingservice.model.PathStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TrainingPathRepository extends JpaRepository<TrainingPath, Long> {

    boolean existsByUserIdAndStatusNot(String userId, PathStatus status);

    boolean existsByUserIdAndStatusNotAndIdNot(String userId, PathStatus status, Long id);

    @Query("SELECT DISTINCT tp FROM TrainingPath tp LEFT JOIN FETCH tp.modules m WHERE tp.userId = :userId AND tp.status <> :archived ORDER BY tp.createdAt DESC")
    List<TrainingPath> findNonArchivedByUserIdEagerModulesOrderByCreatedAtDesc(
        @Param("userId") String userId,
        @Param("archived") PathStatus archived
    );

    @Query("SELECT DISTINCT tp FROM TrainingPath tp LEFT JOIN FETCH tp.modules m WHERE tp.userId = :userId ORDER BY tp.createdAt DESC")
    List<TrainingPath> findAllByUserIdEagerModulesOrderByCreatedAtDesc(@Param("userId") String userId);
    
    @Query("SELECT tp FROM TrainingPath tp WHERE tp.status = :status")
    List<TrainingPath> findByStatus(@Param("status") PathStatus status);
    
    @Query(value = "SELECT tp.* FROM training_paths tp WHERE tp.xp_threshold > :minXp AND tp.status = 'ACTIVE'", 
           nativeQuery = true)
    List<TrainingPath> findAdvancedPathsByMinXp(@Param("minXp") Integer minXp);
    
    long countByStatus(PathStatus status);
}
