package com.microservice.trainingservice.mapper;

import com.microservice.trainingservice.dto.*;
import com.microservice.trainingservice.model.*;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface TrainingMapper {
    
    // TrainingPath mappings
    TrainingPathResponse trainingPathToResponse(TrainingPath trainingPath);
    TrainingPath createTrainingPathRequestToTrainingPath(CreateTrainingPathRequest request);
    
    // TrainingModule mappings
    @Mapping(target = "pathId", source = "trainingPath.id")
    TrainingModuleResponse trainingModuleToResponse(TrainingModule module);

    @Mapping(target = "moduleId", source = "module.id")
    @Mapping(target = "lessonId", expression = "java(moduleLesson.getLesson() == null ? null : moduleLesson.getLesson().getId())")
    TrainingModuleLessonResponse trainingModuleLessonToResponse(TrainingModuleLesson moduleLesson);

    // TrainingLesson mappings (admin)
    TrainingLessonResponse trainingLessonToResponse(TrainingLesson lesson);
    
    // Badge mappings
    BadgeResponse badgeToResponse(Badge badge);
    
    // UserBadge mappings
    @Mapping(target = "badgeId", source = "badge.id")
    UserBadgeResponse userBadgeToResponse(UserBadge userBadge);
    
    // UserXPTracker mappings
    UserXPTrackerResponse userXPTrackerToResponse(UserXPTracker tracker);
    
    // DailyActivity mappings
    DailyActivity createDailyActivityRequestToDailyActivity(CreateDailyActivityRequest request);
    DailyActivityResponse dailyActivityToResponse(DailyActivity dailyActivity);
}
