package com.microservice.resourceservice.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResourceEngagementRequest {

    private String status;

    @Min(0)
    @Max(100)
    private Short progressPct;

    @Size(max = 600)
    private String notes;
}
