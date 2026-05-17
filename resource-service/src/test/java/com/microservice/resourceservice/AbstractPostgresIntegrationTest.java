package com.microservice.resourceservice;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Shared base providing a throwaway Dockerized Postgres for the integration
 * suite. Replaces the previous hardcoded {@code localhost:5432/resourcedb_test}
 * assumption (which also had {@code flyway.clean-disabled:false} and could wipe
 * a real database). Redis/Kafka/JwtDecoder/AI/ObjectStorage are @MockitoBean in
 * the concrete tests, so Postgres is the only real infra required.
 */
@Testcontainers
public abstract class AbstractPostgresIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", POSTGRES::getDriverClassName);
    }
}
