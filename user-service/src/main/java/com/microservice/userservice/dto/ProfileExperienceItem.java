package com.microservice.userservice.dto;

import lombok.Data;

@Data
public class ProfileExperienceItem {
    private String id;
    private String title;
    private String company;
    private String location;
    private String employmentType;
    private String startDate;
    private String endDate;
    private Boolean current;
    private String description;
}