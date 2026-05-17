package com.microservice.mentorshipservice.clients;

import feign.Retryer;
import org.springframework.context.annotation.Bean;

/**
 * Per-client Feign config (not @Configuration — applied only via
 * UserServiceClient#configuration so the Retryer does not leak globally).
 *
 * <p>All UserServiceClient endpoints are idempotent GETs, so retrying on
 * transient I/O failures is safe. Timeouts are set in application.yml under
 * spring.cloud.openfeign.client.config.user-service.</p>
 */
public class UserServiceClientConfig {

    @Bean
    public Retryer userServiceRetryer() {
        // 100ms initial, 1s max, 3 attempts total — retries only on connection
        // I/O failures (default ErrorDecoder does not mark 4xx/5xx retryable).
        return new Retryer.Default(100, 1000, 3);
    }
}
