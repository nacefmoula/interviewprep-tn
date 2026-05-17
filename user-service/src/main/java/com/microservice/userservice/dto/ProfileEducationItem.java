package com.microservice.userservice.dto;

import lombok.Data;

@Data
public class ProfileEducationItem {
    private String id;
    private String school;
    private String degree;
    private String fieldOfStudy;
    private String startDate;
    private String endDate;
    private Boolean current;
    private String description;
}