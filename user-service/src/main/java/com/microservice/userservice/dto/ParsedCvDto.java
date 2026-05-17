package com.microservice.userservice.dto;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.Data;

@JsonIgnoreProperties(ignoreUnknown = true)
@Data
public class ParsedCvDto {
    private String bio;
    private List<String> skills = new ArrayList<>();
    private List<CvEducationDto> educations = new ArrayList<>();
    private List<CvExperienceDto> experiences = new ArrayList<>();
}