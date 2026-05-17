package com.interviewprep.community_service.service;

import com.interviewprep.community_service.model.CareerWizardResponse;
import com.interviewprep.community_service.model.JobCatalog;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;

@Service
public class JobRecommendationEngine {

    public int score(CareerWizardResponse profile, JobCatalog job) {
        int score = 0;

        // 1. Target role match (30 pts)
        List<String> targetRoles = profile.getTargetRoleList();
        String jobTitle = job.getTitle().toLowerCase();
        boolean roleMatch = targetRoles.stream()
            .anyMatch(role -> jobTitle.contains(role.toLowerCase()) ||
                              role.toLowerCase().contains(jobTitle.split(" ")[0].toLowerCase()));
        if (roleMatch) score += 30;

        // 2. Skills overlap (25 pts)
        List<String> userSkills = profile.getSkillList().stream()
            .map(String::toLowerCase).toList();
        List<String> jobSkills = job.getRequiredSkillList().stream()
            .map(String::toLowerCase).toList();
        if (!userSkills.isEmpty() && !jobSkills.isEmpty()) {
            long overlap = jobSkills.stream().filter(userSkills::contains).count();
            double ratio = (double) overlap / jobSkills.size();
            score += (int) (ratio * 25);
        }

        // 3. Industry match (20 pts)
        if (profile.getTargetIndustryList().stream()
                .anyMatch(ind -> ind.equalsIgnoreCase(job.getIndustry()))) {
            score += 20;
        }

        // 4. Career level match (15 pts)
        if (job.getCareerLevel() == null || job.getCareerLevel().equals("ANY") ||
            job.getCareerLevel().equalsIgnoreCase(profile.getCareerLevel())) {
            score += 15;
        }

        // 5. Work type match (10 pts)
        if (job.getWorkType() == null || job.getWorkType().equals("ANY") ||
            job.getWorkType().equalsIgnoreCase(profile.getWorkType()) ||
            "ANY".equalsIgnoreCase(profile.getWorkType())) {
            score += 10;
        }

        return Math.min(score, 100);
    }

    public List<String> reasons(CareerWizardResponse profile, JobCatalog job, int score) {
        List<String> reasons = new ArrayList<>();

        // role
        List<String> targetRoles = profile.getTargetRoleList();
        String jobTitle = job.getTitle().toLowerCase();
        if (targetRoles.stream().anyMatch(r -> jobTitle.contains(r.toLowerCase()))) {
            reasons.add("Matches your target role");
        }

        // skills
        List<String> overlap = profile.getSkillList().stream()
            .filter(s -> job.getRequiredSkillList().stream()
                .anyMatch(js -> js.equalsIgnoreCase(s)))
            .limit(3).toList();
        if (!overlap.isEmpty()) {
            reasons.add("Your skills match: " + String.join(", ", overlap));
        }

        // industry
        if (profile.getTargetIndustryList().stream()
                .anyMatch(i -> i.equalsIgnoreCase(job.getIndustry()))) {
            reasons.add("In your target industry: " + job.getIndustry());
        }

        // work type
        if (job.getWorkType() != null && !job.getWorkType().equals("ANY") &&
            job.getWorkType().equalsIgnoreCase(profile.getWorkType())) {
            reasons.add(job.getWorkType().charAt(0) +
                job.getWorkType().substring(1).toLowerCase() + " position");
        }

        if (score >= 80) reasons.add("Excellent overall match");
        else if (score >= 60) reasons.add("Strong match for your profile");

        return reasons;
    }
}
