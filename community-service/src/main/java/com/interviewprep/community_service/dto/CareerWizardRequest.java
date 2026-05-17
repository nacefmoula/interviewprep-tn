package com.interviewprep.community_service.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.util.List;

public class CareerWizardRequest {
    @Size(max = 255)
    private String currentRole;
    @Size(max = 50)
    private List<@Size(max = 255) String> targetRoles;
    @Min(0)
    @Max(80)
    private Integer experienceYears;
    @Size(max = 100)
    private String careerLevel;
    @Size(max = 100)
    private List<@Size(max = 255) String> skills;
    @Size(max = 50)
    private List<@Size(max = 255) String> targetIndustries;
    @Size(max = 100)
    private String workType;
    @Size(max = 100)
    private String availability;
    @Min(0)
    private Integer salaryMin;
    @Min(0)
    private Integer salaryMax;

    public CareerWizardRequest() {}

    public CareerWizardRequest(String currentRole, List<String> targetRoles, Integer experienceYears,
                              String careerLevel, List<String> skills, List<String> targetIndustries,
                              String workType, String availability, Integer salaryMin, Integer salaryMax) {
        this.currentRole = currentRole;
        this.targetRoles = targetRoles;
        this.experienceYears = experienceYears;
        this.careerLevel = careerLevel;
        this.skills = skills;
        this.targetIndustries = targetIndustries;
        this.workType = workType;
        this.availability = availability;
        this.salaryMin = salaryMin;
        this.salaryMax = salaryMax;
    }

    public String getCurrentRole() {
        return currentRole;
    }

    public void setCurrentRole(String currentRole) {
        this.currentRole = currentRole;
    }

    public List<String> getTargetRoles() {
        return targetRoles;
    }

    public void setTargetRoles(List<String> targetRoles) {
        this.targetRoles = targetRoles;
    }

    public Integer getExperienceYears() {
        return experienceYears;
    }

    public void setExperienceYears(Integer experienceYears) {
        this.experienceYears = experienceYears;
    }

    public String getCareerLevel() {
        return careerLevel;
    }

    public void setCareerLevel(String careerLevel) {
        this.careerLevel = careerLevel;
    }

    public List<String> getSkills() {
        return skills;
    }

    public void setSkills(List<String> skills) {
        this.skills = skills;
    }

    public List<String> getTargetIndustries() {
        return targetIndustries;
    }

    public void setTargetIndustries(List<String> targetIndustries) {
        this.targetIndustries = targetIndustries;
    }

    public String getWorkType() {
        return workType;
    }

    public void setWorkType(String workType) {
        this.workType = workType;
    }

    public String getAvailability() {
        return availability;
    }

    public void setAvailability(String availability) {
        this.availability = availability;
    }

    public Integer getSalaryMin() {
        return salaryMin;
    }

    public void setSalaryMin(Integer salaryMin) {
        this.salaryMin = salaryMin;
    }

    public Integer getSalaryMax() {
        return salaryMax;
    }

    public void setSalaryMax(Integer salaryMax) {
        this.salaryMax = salaryMax;
    }
}
