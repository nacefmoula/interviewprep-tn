package com.microservice.interviewservice.dto.live;

public record LiveTimelinePoint(
        Double t,
        Double stress,
        Double confidence,
        Double hesitation,
        Double volume,
        Boolean speaking
) {}
