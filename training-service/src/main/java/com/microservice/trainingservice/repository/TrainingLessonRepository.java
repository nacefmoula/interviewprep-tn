package com.microservice.trainingservice.repository;

import com.microservice.trainingservice.model.TrainingCategory;
import com.microservice.trainingservice.model.TrainingLesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TrainingLessonRepository extends JpaRepository<TrainingLesson, Long> {

    @Query("select distinct l from TrainingLesson l left join fetch l.tags t " +
        "where l.active = true and l.category = :category order by l.id asc")
    List<TrainingLesson> findActiveByCategoryWithTags(@Param("category") TrainingCategory category);

    @Query("select l.title from TrainingLesson l where l.category = :category and l.language = :language")
    List<String> findTitlesByCategoryAndLanguage(@Param("category") TrainingCategory category, @Param("language") String language);

    long countByActiveTrueAndCategoryAndLanguage(TrainingCategory category, String language);

    List<TrainingLesson> findByActiveTrueAndCategoryOrderByIdAsc(TrainingCategory category);

    List<TrainingLesson> findByActiveTrueOrderByIdAsc();
}
