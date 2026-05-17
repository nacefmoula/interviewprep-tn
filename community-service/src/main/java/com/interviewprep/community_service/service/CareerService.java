package com.interviewprep.community_service.service;

import com.interviewprep.community_service.dto.*;
import com.interviewprep.community_service.model.CareerWizardResponse;
import com.interviewprep.community_service.model.Follow;
import com.interviewprep.community_service.model.JobCatalog;
import com.interviewprep.community_service.model.JobRecommendation;
import com.interviewprep.community_service.model.Post;
import com.interviewprep.community_service.repository.CareerWizardRepository;
import com.interviewprep.community_service.repository.FollowRepository;
import com.interviewprep.community_service.repository.JobCatalogRepository;
import com.interviewprep.community_service.repository.JobRecommendationRepository;
import com.interviewprep.community_service.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class CareerService {

    private final CareerWizardRepository careerWizardRepository;
    private final JobCatalogRepository jobCatalogRepository;
    private final JobRecommendationRepository jobRecommendationRepository;
    private final JobRecommendationEngine recommendationEngine;
    private final SkillsGapService skillsGapService;
    private final PostRepository postRepository;
    private final FollowRepository followRepository;

    // ── Wizard ──────────────────────────────────────────────────────────────

    public CareerWizardResponse saveOrUpdateWizard(String keycloakId, CareerWizardRequest request) {
        CareerWizardResponse wizard = careerWizardRepository.findByUserKeycloakId(keycloakId)
            .orElse(new CareerWizardResponse());

        wizard.setUserKeycloakId(keycloakId);
        wizard.setCurrentRole(request.getCurrentRole());
        wizard.setTargetRoles(String.join(",", request.getTargetRoles() != null ? request.getTargetRoles() : List.of()));
        wizard.setExperienceYears(request.getExperienceYears());
        wizard.setCareerLevel(request.getCareerLevel());
        wizard.setSkills(String.join(",", request.getSkills() != null ? request.getSkills() : List.of()));
        wizard.setTargetIndustries(String.join(",", request.getTargetIndustries() != null ? request.getTargetIndustries() : List.of()));
        wizard.setWorkType(request.getWorkType());
        wizard.setAvailability(request.getAvailability());
        wizard.setSalaryMin(request.getSalaryMin());
        wizard.setSalaryMax(request.getSalaryMax());

        return careerWizardRepository.save(wizard);
    }

    public CareerRecommendationResult completeWizard(String keycloakId, CareerWizardRequest request) {
        CareerWizardResponse wizard = saveOrUpdateWizard(keycloakId, request);
        wizard.setCompleted(true);
        careerWizardRepository.save(wizard);

        return generateRecommendations(keycloakId);
    }

    public Optional<CareerWizardResponse> getWizardProgress(String keycloakId) {
        return careerWizardRepository.findByUserKeycloakId(keycloakId);
    }

    // ── Recommendations ─────────────────────────────────────────────────────

    public CareerRecommendationResult generateRecommendations(String keycloakId) {
        CareerWizardResponse profile = careerWizardRepository.findByUserKeycloakId(keycloakId)
            .orElseThrow(() -> new IllegalArgumentException("Wizard not completed"));

        // Delete old recommendations
        jobRecommendationRepository.deleteByUserKeycloakId(keycloakId);

        // Score all active jobs
        List<JobCatalog> allJobs = jobCatalogRepository.findByActiveTrue();
        List<JobRecommendation> recommendations = new ArrayList<>();

        for (JobCatalog job : allJobs) {
            int score = recommendationEngine.score(profile, job);
            if (score > 0) {
                JobRecommendation rec = new JobRecommendation();
                rec.setUserKeycloakId(keycloakId);
                rec.setJob(job);
                rec.setMatchScore(score);
                List<String> reasons = recommendationEngine.reasons(profile, job, score);
                rec.setMatchReasons(String.join(",", reasons));
                recommendations.add(rec);
            }
        }

        // Sort by score desc, take top 10
        recommendations.sort(Comparator.comparingInt(JobRecommendation::getMatchScore).reversed());
        recommendations = recommendations.stream().limit(10).collect(Collectors.toList());

        // Save
        jobRecommendationRepository.saveAll(recommendations);

        // Return full result
        return getRecommendations(keycloakId);
    }

    public CareerRecommendationResult getRecommendations(String keycloakId) {
        CareerWizardResponse profile = careerWizardRepository.findByUserKeycloakId(keycloakId)
            .orElseThrow(() -> new IllegalArgumentException("Wizard not found"));

        List<JobRecommendation> recs = jobRecommendationRepository.findByUserKeycloakIdOrderByMatchScoreDesc(keycloakId);

        List<JobMatchDTO> topJobs = recs.stream()
            .map(rec -> new JobMatchDTO(
                rec.getJob(),
                rec.getMatchScore(),
                rec.getMatchReasonList()
            ))
            .collect(Collectors.toList());

        List<String> skillsGap = skillsGapService.computeGap(profile);

        return new CareerRecommendationResult(
            topJobs,
            skillsGap,
            findPeopleToFollow(keycloakId, profile),
            findRelevantPosts(profile),
            profile,
            LocalDateTime.now()
        );
    }

    private List<Post> findRelevantPosts(CareerWizardResponse profile) {
        Map<Long, Post> seen = new LinkedHashMap<>();

        for (String skill : profile.getSkillList()) {
            if (skill == null || skill.isBlank()) continue;
            postRepository.searchPosts(skill.trim(), PageRequest.of(0, 2))
                .forEach(p -> seen.putIfAbsent(p.getId(), p));
        }

        for (String role : profile.getTargetRoleList()) {
            if (role == null || role.isBlank()) continue;
            postRepository.searchPosts(role.trim(), PageRequest.of(0, 2))
                .forEach(p -> seen.putIfAbsent(p.getId(), p));
        }

        if (seen.size() < 3) {
            for (String industry : profile.getTargetIndustryList()) {
                if (industry == null || industry.isBlank()) continue;
                postRepository.findByIndustryIgnoreCase(industry.trim(), PageRequest.of(0, 3))
                    .forEach(p -> seen.putIfAbsent(p.getId(), p));
            }
        }

        return seen.values().stream().limit(5).collect(Collectors.toList());
    }

    private List<String> findPeopleToFollow(String keycloakId, CareerWizardResponse profile) {
        Set<String> alreadyFollowing = followRepository.findByFollowerKeycloakId(keycloakId)
            .stream()
            .map(Follow::getFollowingKeycloakId)
            .collect(Collectors.toSet());

        Set<String> userSkills = new HashSet<>(profile.getSkillList());
        Set<String> userRoles = new HashSet<>(profile.getTargetRoleList());

        return careerWizardRepository.findByCompletedTrue().stream()
            .filter(w -> !w.getUserKeycloakId().equals(keycloakId))
            .filter(w -> !alreadyFollowing.contains(w.getUserKeycloakId()))
            .map(w -> {
                long overlap = w.getTargetRoleList().stream().filter(userRoles::contains).count()
                             + w.getSkillList().stream().filter(userSkills::contains).count();
                return Map.entry(w.getUserKeycloakId(), overlap);
            })
            .filter(e -> e.getValue() > 0)
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
            .limit(5)
            .map(Map.Entry::getKey)
            .collect(Collectors.toList());
    }

    // ── Jobs ────────────────────────────────────────────────────────────────

    public JobCatalog submitJob(String keycloakId, JobSubmission submission) {
        JobCatalog job = new JobCatalog();
        job.setTitle(submission.getTitle());
        job.setCompany(submission.getCompany());
        job.setLocation(submission.getLocation());
        job.setRequiredSkills(String.join(",", submission.getRequiredSkills() != null ? submission.getRequiredSkills() : List.of()));
        job.setIndustry(submission.getIndustry());
        job.setCareerLevel(submission.getCareerLevel());
        job.setWorkType(submission.getWorkType());
        job.setSalaryMin(submission.getSalaryMin());
        job.setSalaryMax(submission.getSalaryMax());
        job.setJobUrl(submission.getJobUrl());
        job.setSource("USER_SUBMITTED");
        job.setSubmittedBy(keycloakId);
        job.setActive(true);

        return jobCatalogRepository.save(job);
    }
}
