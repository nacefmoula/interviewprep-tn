package com.microservice.resourceservice.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI resourceServiceOpenApi() {
        return new OpenAPI()
            .info(new Info()
                .title("Resource Library API")
                .description("MS-7 — InterviewPrep TN resource management service. " +
                    "Public endpoints need no auth. Write operations require an admin JWT from Keycloak.")
                .version("1.0.0")
                .contact(new Contact().name("InterviewPrep TN").email("contact@interviewprep.tn")))
            .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME))
            .components(new Components()
                .addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                    .name(BEARER_SCHEME)
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
                    .description("Paste your Keycloak access token here (without 'Bearer ' prefix)")));
    }
}
