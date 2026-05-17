package com.microservice.userservice.service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.userservice.dto.CvEducationDto;
import com.microservice.userservice.dto.CvExperienceDto;
import com.microservice.userservice.dto.ParsedCvDto;
import com.microservice.userservice.dto.ProfileEducationItem;
import com.microservice.userservice.dto.ProfileExperienceItem;
import com.microservice.userservice.model.User;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CvProfileEnrichmentService {

    private final ObjectMapper objectMapper;

    public void applyToUser(User user, ParsedCvDto parsedCv) {
        if (user == null) {
            throw new IllegalArgumentException("User must not be null");
        }

        if (parsedCv == null) {
            return;
        }

        String cleanedBio = clean(parsedCv.getBio());
        if (cleanedBio != null) {
            user.setBio(cleanedBio);
        }

        try {
            if (parsedCv.getSkills() != null && !parsedCv.getSkills().isEmpty()) {
                user.setSkillsJson(objectMapper.writeValueAsString(parsedCv.getSkills()));
            }

            List<ProfileExperienceItem> mappedExperiences = mapExperiences(parsedCv.getExperiences());
            if (!mappedExperiences.isEmpty()) {
                user.setExperiencesJson(objectMapper.writeValueAsString(mappedExperiences));
            }

            List<ProfileEducationItem> mappedEducations = mapEducations(parsedCv.getEducations());
            if (!mappedEducations.isEmpty()) {
                user.setEducationsJson(objectMapper.writeValueAsString(mappedEducations));
            }

        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize CV sections to JSON", ex);
        }
    }

    private List<ProfileExperienceItem> mapExperiences(List<CvExperienceDto> items) {
        if (items == null) return List.of();

        return items.stream()
                .map(item -> {
                    ProfileExperienceItem mapped = new ProfileExperienceItem();
                    mapped.setId(UUID.randomUUID().toString());
                    mapped.setTitle(clean(item.getJobTitle()));
                    mapped.setCompany(clean(item.getCompany()));
                    mapped.setLocation(null);
                    mapped.setEmploymentType(null);

                    DateRange range = DateRangeParser.parse(item.getStartDate(), item.getEndDate());
                    mapped.setStartDate(range.startDate());

                    // Trust the model's explicit current flag first; fall back to DateRangeParser
                    boolean isCurrent = item.getCurrent() != null ? item.getCurrent() : range.current();
                    mapped.setCurrent(isCurrent);
                    mapped.setEndDate(isCurrent ? null : range.endDate());
                    mapped.setDescription(clean(item.getDescription()));

                    return mapped;
                })
                .filter(item -> !isExperienceEmpty(item))
                .collect(Collectors.toList());
    }

    private List<ProfileEducationItem> mapEducations(List<CvEducationDto> items) {
        if (items == null) return List.of();

        return items.stream()
                .map(item -> {
                    ProfileEducationItem mapped = new ProfileEducationItem();
                    mapped.setId(UUID.randomUUID().toString());
                    mapped.setSchool(clean(item.getInstitution()));
                    mapped.setDegree(clean(item.getDegree()));
                    mapped.setFieldOfStudy(clean(item.getDescription()));

                    DateRange range = DateRangeParser.parse(item.getStartDate(), item.getEndDate());
                    mapped.setStartDate(range.startDate());

                    boolean isCurrent = item.getCurrent() != null ? item.getCurrent() : range.current();
                    mapped.setCurrent(isCurrent);
                    mapped.setEndDate(isCurrent ? null : range.endDate());
                    mapped.setDescription(null);

                    return mapped;
                })
                .filter(item -> !isEducationEmpty(item))
                .collect(Collectors.toList());
    }

    private boolean isExperienceEmpty(ProfileExperienceItem item) {
        return item.getTitle() == null
                && item.getCompany() == null
                && item.getStartDate() == null
                && item.getEndDate() == null
                && item.getDescription() == null;
    }

    private boolean isEducationEmpty(ProfileEducationItem item) {
        return item.getSchool() == null
                && item.getDegree() == null
                && item.getFieldOfStudy() == null
                && item.getStartDate() == null
                && item.getEndDate() == null
                && item.getDescription() == null;
    }

    private String clean(String value) {
        if (value == null) return null;
        String cleaned = value.replaceAll("\\s+", " ").trim();
        return cleaned.isBlank() ? null : cleaned;
    }
}