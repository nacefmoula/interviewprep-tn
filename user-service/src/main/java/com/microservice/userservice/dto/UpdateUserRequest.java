package com.microservice.userservice.dto;

import java.util.List;

import com.microservice.userservice.enums.IndustryEnum;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateUserRequest {

    @Size(min = 2, max = 50)
    private String firstName;

    @Size(min = 2, max = 50)
    private String lastName;

    private String phoneNumber;
    private String city;

    @Size(max = 500, message = "Bio cannot exceed 500 characters")
    private String bio;

    private String avatarUrl;
    private IndustryEnum preferredIndustry;
    private String preferredLanguage;
    private Boolean emailNotificationsEnabled;
    private Boolean pushNotificationsEnabled;
    private Boolean profileVisible;
    private String experiencesJson;
    private String educationsJson;
    private List<String> skills;
}
