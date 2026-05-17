package com.microservice.resourceservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiGenerateResourcesResponse {

    private int requested;
    private int created;
    private int skipped;

    @Builder.Default
    private List<ResourceResponse> resources = new ArrayList<>();

    @Builder.Default
    private List<String> warnings = new ArrayList<>();
}

