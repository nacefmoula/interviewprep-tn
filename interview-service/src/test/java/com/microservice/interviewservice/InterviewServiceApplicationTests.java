package com.microservice.interviewservice;

import org.junit.jupiter.api.Test;

/**
 * Verifies the full Spring application context boots against real (Dockerized)
 * Postgres and Kafka provided by {@link AbstractIntegrationTest}, running all
 * Flyway migrations. Hermetic: requires only Docker.
 */
class InterviewServiceApplicationTests extends AbstractIntegrationTest {

    @Test
    void contextLoads() {
    }

}
