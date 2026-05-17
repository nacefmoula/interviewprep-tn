package com.microservice.resourceservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DuplicateCheckRequest {
    @NotBlank(message = "title is required")
    @Size(max = 255, message = "title must be 255 characters or fewer")
    private String title;

    @Size(max = 5000, message = "description must be 5000 characters or fewer")
    private String description;
}
