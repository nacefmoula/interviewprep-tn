package com.interviewprep.community_service.service;

import com.interviewprep.community_service.model.CareerWizardResponse;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class SkillsGapService {

    private static final Map<String, List<String>> ROLE_SKILLS = Map.of(
        "backend engineer",     List.of("Java","Spring Boot","Docker","Kubernetes","PostgreSQL","REST API","Kafka"),
        "frontend developer",   List.of("Angular","TypeScript","RxJS","HTML","CSS","Git","Jest"),
        "devops engineer",      List.of("Docker","Kubernetes","Jenkins","Terraform","AWS","Linux","Git"),
        "data scientist",       List.of("Python","Machine Learning","Pandas","SQL","TensorFlow","Statistics"),
        "data engineer",        List.of("Python","Spark","Kafka","Airflow","SQL","Docker","ETL"),
        "mobile developer",     List.of("React Native","Flutter","TypeScript","REST API","Git"),
        "fullstack developer",  List.of("Angular","Spring Boot","PostgreSQL","Docker","TypeScript","REST API"),
        "cloud engineer",       List.of("AWS","Azure","Terraform","Docker","Kubernetes","Linux")
    );

    public List<String> computeGap(CareerWizardResponse profile) {
        Set<String> missingSkills = new LinkedHashSet<>();
        List<String> userSkills = profile.getSkillList();

        for (String targetRole : profile.getTargetRoleList()) {
            String key = findBestMatchingRole(targetRole);
            if (key != null) {
                List<String> requiredSkills = ROLE_SKILLS.get(key);
                for (String skill : requiredSkills) {
                    boolean hasSkill = userSkills.stream()
                        .anyMatch(s -> s.equalsIgnoreCase(skill));
                    if (!hasSkill && missingSkills.size() < 8) {
                        missingSkills.add(skill);
                    }
                }
            }
        }

        return new ArrayList<>(missingSkills);
    }

    private String findBestMatchingRole(String targetRole) {
        String lower = targetRole.toLowerCase();
        for (String key : ROLE_SKILLS.keySet()) {
            if (key.contains(lower) || lower.contains(key)) {
                return key;
            }
        }
        // Default to first role if no match
        return ROLE_SKILLS.keySet().iterator().next();
    }
}
