package com.microservice.resourceservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiResourceSummaryResponse implements Serializable {

    private static final long serialVersionUID = 1L;

    private UUID resourceId;
    private String provider;
    private String summary;

    @Builder.Default
    private List<String> keyPoints = new ArrayList<>();

    private LocalDateTime generatedAt;
}

