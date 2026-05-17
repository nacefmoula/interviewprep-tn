package com.microservice.trainingservice.dto;

import com.microservice.trainingservice.model.BadgeCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BadgeResponse {
	private Long id;
	private String name;
	private String description;
	private String icon;
	private BadgeCategory category;
	private Integer xpReward;
	private String criteriaJson;
	private Boolean isActive;
}
