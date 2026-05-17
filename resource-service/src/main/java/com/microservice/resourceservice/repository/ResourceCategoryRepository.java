package com.microservice.resourceservice.repository;

import com.microservice.resourceservice.enums.IndustryEnum;
import com.microservice.resourceservice.model.ResourceCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResourceCategoryRepository extends JpaRepository<ResourceCategory, UUID> {

    Optional<ResourceCategory> findByName(String name);

    List<ResourceCategory> findByIndustry(IndustryEnum industry);

    boolean existsByName(String name);
}
