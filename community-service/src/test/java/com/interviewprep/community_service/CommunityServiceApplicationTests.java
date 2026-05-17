package com.interviewprep.community_service;

import org.junit.jupiter.api.Test;

/**
 * Verifies the full Spring application context boots against real (Dockerized)
 * Postgres and Redis provided by {@link AbstractIntegrationTest}, running all
 * Flyway migrations. Hermetic: requires only Docker.
 */
class CommunityServiceApplicationTests extends AbstractIntegrationTest {

	@Test
	void contextLoads() {
	}

}
