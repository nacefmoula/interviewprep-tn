package com.quizservice;

import org.junit.jupiter.api.Test;

/**
 * Verifies the full Spring application context boots against real (Dockerized)
 * Postgres, Kafka and Redis provided by {@link AbstractIntegrationTest}.
 * Hermetic: requires only Docker.
 */
class QuizServiceApplicationTests extends AbstractIntegrationTest {

    @Test
    void contextLoads() {
    }

}
