package com.microservice.userservice.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.Data;

@JsonIgnoreProperties(ignoreUnknown = true)
@Data
public class CvExperienceDto {
    private String jobTitle;
    private String company;
    private String startDate;
    private String endDate;
    private Boolean current;
    private String description;
}