package com.microservice.interviewservice.service;

import com.microservice.interviewservice.dto.response.AvatarTalkResponse;

public interface AvatarService {
    AvatarTalkResponse createTalk(String text);
}