package com.microservice.trainingservice.repository;

import com.microservice.trainingservice.model.BadgeCategory;
import com.microservice.trainingservice.model.UserBadge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;

@Repository
public interface UserBadgeRepository extends JpaRepository<UserBadge, Long> {
    
    @Query("SELECT ub FROM UserBadge ub WHERE ub.userId = :userId ORDER BY ub.earnedDate DESC")
    List<UserBadge> findByUserId(@Param("userId") String userId);
    
    @Query("SELECT ub FROM UserBadge ub WHERE ub.userId = :userId AND ub.badge.id = :badgeId")
    Optional<UserBadge> findByUserIdAndBadgeId(@Param("userId") String userId, @Param("badgeId") Long badgeId);
    
    @Query("SELECT ub FROM UserBadge ub WHERE ub.userId = :userId AND ub.badge.category = :category")
    List<UserBadge> findByUserIdAndCategory(@Param("userId") String userId, @Param("category") BadgeCategory category);
    
    @Query("SELECT ub FROM UserBadge ub WHERE ub.earnedDate BETWEEN :startDate AND :endDate")
    List<UserBadge> findRecentlyEarned(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT COUNT(ub) FROM UserBadge ub WHERE ub.userId = :userId")
    long findBadgeCountByUserId(@Param("userId") String userId);
    
    @Query(value = "SELECT ub.* FROM user_badges ub " +
                   "WHERE ub.user_id = :userId AND ub.progress IS NOT NULL " +
                   "ORDER BY ub.progress DESC",
           nativeQuery = true)
    List<UserBadge> findInProgressBadgesByUserId(@Param("userId") String userId);
    
    boolean existsByUserIdAndBadge_Id(String userId, Long badgeId);
}
