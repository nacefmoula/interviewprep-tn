package com.microservice.trainingservice.repository;

import com.microservice.trainingservice.model.DailyActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.List;

@Repository
public interface DailyActivityRepository extends JpaRepository<DailyActivity, Long> {
    
    @Query("SELECT da FROM DailyActivity da WHERE da.userId = :userId AND da.activityDate = :date")
    Optional<DailyActivity> findByUserIdAndDate(@Param("userId") String userId, @Param("date") LocalDate date);
    
    @Query("SELECT da FROM DailyActivity da WHERE da.userId = :userId ORDER BY da.activityDate DESC")
    List<DailyActivity> findByUserId(@Param("userId") String userId);
    
    @Query("SELECT da FROM DailyActivity da WHERE da.userId = :userId AND da.activityDate BETWEEN :startDate AND :endDate ORDER BY da.activityDate DESC")
    List<DailyActivity> findByUserIdAndDateRange(@Param("userId") String userId, 
                                                  @Param("startDate") LocalDate startDate, 
                                                  @Param("endDate") LocalDate endDate);
    
    @Query("SELECT SUM(da.xpEarned) FROM DailyActivity da WHERE da.userId = :userId AND da.activityDate BETWEEN :startDate AND :endDate")
    Long findTotalXpByUserIdAndDateRange(@Param("userId") String userId, 
                                         @Param("startDate") LocalDate startDate, 
                                         @Param("endDate") LocalDate endDate);
    
    @Query("SELECT COUNT(da) FROM DailyActivity da WHERE da.userId = :userId AND da.sessionCompleted = true")
    long findCompletedSessionCount(@Param("userId") String userId);
    
    @Query(value = "SELECT COUNT(*) FROM daily_activities " +
                   "WHERE user_id = :userId " +
                   "AND activity_date BETWEEN :startDate AND :endDate " +
                   "AND xp_earned > 0",
           nativeQuery = true)
    long findActiveDayCount(@Param("userId") String userId,
                             @Param("startDate") LocalDate startDate, 
                             @Param("endDate") LocalDate endDate);
    
    boolean existsByUserIdAndActivityDate(String userId, LocalDate date);
}
