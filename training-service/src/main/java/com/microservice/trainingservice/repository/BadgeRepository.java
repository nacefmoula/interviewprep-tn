package com.microservice.trainingservice.repository;

import com.microservice.trainingservice.model.Badge;
import com.microservice.trainingservice.model.BadgeCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BadgeRepository extends JpaRepository<Badge, Long> {
    
    @Query("SELECT b FROM Badge b WHERE b.isActive = true ORDER BY b.category ASC, b.id ASC")
    List<Badge> findAllActiveBadges();
    
    @Query("SELECT b FROM Badge b WHERE b.category = :category AND b.isActive = true")
    List<Badge> findByCategory(@Param("category") BadgeCategory category);
    
    @Query("SELECT b FROM Badge b WHERE b.xpReward >= :minXp AND b.isActive = true")
    List<Badge> findByMinXpReward(@Param("minXp") Integer minXp);

    List<Badge> findTop5ByIsActiveTrueOrderByXpRewardDesc();
    
    long countByIsActive(Boolean isActive);
    
    long countByCategory(BadgeCategory category);
}
