package com.microservice.userservice;

import org.junit.jupiter.api.Test;

/**
 * Verifies the full Spring application context boots successfully against
 * real (Dockerized) Postgres, Kafka and Redis provided by
 * {@link AbstractIntegrationTest}. Hermetic: requires only Docker.
 */
class UserServiceApplicationTests extends AbstractIntegrationTest {

	@Test
	void contextLoads() {
	}

}
