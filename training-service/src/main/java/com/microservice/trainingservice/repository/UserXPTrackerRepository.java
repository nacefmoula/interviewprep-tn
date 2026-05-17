package com.microservice.trainingservice.repository;

import com.microservice.trainingservice.model.UserXPTracker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface UserXPTrackerRepository extends JpaRepository<UserXPTracker, Long> {
    
    Optional<UserXPTracker> findByUserId(String userId);
    
    @Query("SELECT uxt FROM UserXPTracker uxt ORDER BY uxt.totalXp DESC")
    List<UserXPTracker> findTopByOrderByTotalXpDesc(Pageable pageable);
    
    @Query("SELECT uxt FROM UserXPTracker uxt ORDER BY uxt.currentLevel DESC, uxt.totalXp DESC")
    List<UserXPTracker> findLeaderboard(Pageable pageable);
    
    @Query("SELECT uxt FROM UserXPTracker uxt WHERE uxt.currentLevel >= :minLevel ORDER BY uxt.currentLevel DESC")
    List<UserXPTracker> findByMinLevel(@Param("minLevel") Integer minLevel);
    
    @Query("SELECT uxt FROM UserXPTracker uxt WHERE uxt.currentStreak >= :minStreak ORDER BY uxt.currentStreak DESC")
    List<UserXPTracker> findByMinStreak(@Param("minStreak") Integer minStreak);
    
    @Query("SELECT uxt FROM UserXPTracker uxt WHERE uxt.currentStreak > 0 ORDER BY uxt.currentStreak DESC, uxt.totalXp DESC")
    List<UserXPTracker> findActiveStreakUsers(Pageable pageable);
    
    @Query(value = "SELECT uxt.* FROM user_xp_tracker uxt ORDER BY uxt.total_xp DESC LIMIT :limit",
           nativeQuery = true)
    List<UserXPTracker> findTopUsers(@Param("limit") int limit);
    
    long countByCurrentLevelGreaterThan(Integer level);
}
