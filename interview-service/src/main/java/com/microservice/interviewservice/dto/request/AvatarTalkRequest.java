package com.microservice.interviewservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AvatarTalkRequest {
    @NotBlank(message = "text is required")
    @Size(max = 2000, message = "text must be 2000 characters or fewer")
    private String text;

    public AvatarTalkRequest() {
    }

    public AvatarTalkRequest(String text) {
        this.text = text;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }
}