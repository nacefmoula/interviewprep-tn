package com.interviewprep.community_service.dto;

import lombok.Data;

@Data
public class UpdatePostRequest {
    private String title;
    private String content;
    private String type;
    private String industry;
    private String tags;
}
