package com.microservice.resourceservice.dto;

import com.microservice.resourceservice.enums.IndustryEnum;
import com.microservice.resourceservice.enums.ResourceLevelEnum;
import com.microservice.resourceservice.enums.ResourceTypeEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResourceRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must be 255 characters or fewer")
    private String title;

    @Size(max = 5000, message = "Description must be 5000 characters or fewer")
    private String description;

    @NotBlank(message = "URL is required")
    @Size(max = 512, message = "URL must be 512 characters or fewer")
    @Pattern(regexp = "^https?://.*", message = "URL must start with http:// or https://")
    private String url;

    @NotNull(message = "Type is required")
    private ResourceTypeEnum type;

    @NotNull(message = "Level is required")
    private ResourceLevelEnum level;

    @NotNull(message = "Industry is required")
    private IndustryEnum industry;

    @Size(max = 512, message = "Thumbnail URL must be 512 characters or fewer")
    private String thumbUrl;

    private UUID categoryId;
}
