package com.microservice.userservice.dto;

import java.util.List;

import com.microservice.userservice.enums.IndustryEnum;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateUserRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 50)
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 50)
    private String lastName;

    private String phoneNumber;
    private String city;
    private IndustryEnum preferredIndustry;
    private String preferredLanguage;
    private List<String> skills;
}

