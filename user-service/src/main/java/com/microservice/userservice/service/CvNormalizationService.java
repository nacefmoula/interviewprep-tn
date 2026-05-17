package com.microservice.userservice.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.microservice.userservice.dto.CvEducationDto;
import com.microservice.userservice.dto.CvExperienceDto;
import com.microservice.userservice.dto.ParsedCvDto;

@Service
public class CvNormalizationService {

    private static final int MAX_BIO_LENGTH = 500;

    public ParsedCvDto normalize(ParsedCvDto input) {
        if (input == null) {
            ParsedCvDto empty = new ParsedCvDto();
            empty.setSkills(new ArrayList<>());
            empty.setEducations(new ArrayList<>());
            empty.setExperiences(new ArrayList<>());
            return empty;
        }

        ParsedCvDto output = new ParsedCvDto();

        output.setBio(normalizeBio(input.getBio()));
        output.setSkills(normalizeSkills(input.getSkills()));
        output.setEducations(normalizeEducations(input.getEducations()));
        output.setExperiences(normalizeExperiences(input.getExperiences()));

        return output;
    }

    private String normalizeBio(String bio) {
        String value = clean(bio);
        if (value == null) {
            return null;
        }

        if (value.length() > MAX_BIO_LENGTH) {
            value = value.substring(0, MAX_BIO_LENGTH).trim();
        }

        return value;
    }

    private List<String> normalizeSkills(List<String> skills) {
        if (skills == null || skills.isEmpty()) {
            return new ArrayList<>();
        }

        Map<String, String> dedup = new LinkedHashMap<>();

        for (String skill : skills) {
            String cleaned = clean(skill);
            if (cleaned == null) {
                continue;
            }

            String normalized = normalizeSkillName(cleaned);
            String dedupKey = normalized.toLowerCase(Locale.ROOT);

            dedup.putIfAbsent(dedupKey, normalized);
        }

        return new ArrayList<>(dedup.values());
    }

    private String normalizeSkillName(String skill) {
        String key = skill.toLowerCase(Locale.ROOT);

        return switch (key) {
            case "spring boot", "springboot" -> "Spring Boot";
            case "postgres", "postgresql" -> "PostgreSQL";
            case "js", "javascript" -> "JavaScript";
            case "ts", "typescript" -> "TypeScript";
            case "node", "nodejs", "node.js" -> "Node.js";
            case "html" -> "HTML";
            case "css" -> "CSS";
            case "sql" -> "SQL";
            case "java" -> "Java";
            case "python" -> "Python";
            case "docker" -> "Docker";
            case "kubernetes", "k8s" -> "Kubernetes";
            case "c sharp", "c#", "csharp" -> "C#";
            case "c plus plus", "c++", "cpp" -> "C++";
            default -> skill.trim();
        };
    }

    private List<CvEducationDto> normalizeEducations(List<CvEducationDto> educations) {
        List<CvEducationDto> result = new ArrayList<>();
        if (educations == null || educations.isEmpty()) {
            return result;
        }

        for (CvEducationDto item : educations) {
            if (item == null) {
                continue;
            }

            CvEducationDto normalized = new CvEducationDto();
            normalized.setDegree(clean(item.getDegree()));
            normalized.setInstitution(clean(item.getInstitution()));
            normalized.setStartDate(clean(item.getStartDate()));
            normalized.setEndDate(clean(item.getEndDate()));
            normalized.setDescription(clean(item.getDescription()));

            if (!isEducationEmpty(normalized)) {
                result.add(normalized);
            }
        }

        return result;
    }

    private List<CvExperienceDto> normalizeExperiences(List<CvExperienceDto> experiences) {
        List<CvExperienceDto> result = new ArrayList<>();
        if (experiences == null || experiences.isEmpty()) {
            return result;
        }

        for (CvExperienceDto item : experiences) {
            if (item == null) {
                continue;
            }

            CvExperienceDto normalized = new CvExperienceDto();
            normalized.setJobTitle(clean(item.getJobTitle()));
            normalized.setCompany(clean(item.getCompany()));
            normalized.setStartDate(clean(item.getStartDate()));
            normalized.setEndDate(clean(item.getEndDate()));
            normalized.setDescription(clean(item.getDescription()));

            if (!isExperienceEmpty(normalized)) {
                result.add(normalized);
            }
        }

        return result;
    }

    private boolean isEducationEmpty(CvEducationDto item) {
        return item.getDegree() == null
                && item.getInstitution() == null
                && item.getStartDate() == null
                && item.getEndDate() == null
                && item.getDescription() == null;
    }

    private boolean isExperienceEmpty(CvExperienceDto item) {
        return item.getJobTitle() == null
                && item.getCompany() == null
                && item.getStartDate() == null
                && item.getEndDate() == null
                && item.getDescription() == null;
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }

        String cleaned = value
                .replaceAll("\\s+", " ")
                .trim();

        return cleaned.isBlank() ? null : cleaned;
    }
}