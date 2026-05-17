
package com.microservice.interviewservice.dto.live;

public record LiveVoiceSpeakRequest(
        String text,
        String lang,
        String voice
) {}