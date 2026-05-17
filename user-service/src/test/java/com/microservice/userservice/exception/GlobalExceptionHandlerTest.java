package com.microservice.userservice.exception;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * Hermetic regression guard for U3 / theme T-C: the catch-all handler must
 * NOT echo the exception message or class name to the client.
 */
class GlobalExceptionHandlerTest {

    private static final String SECRET = "SENSITIVE-jdbc-password-leak-42";

    @Test
    void generic_handler_returns_500_and_does_not_leak_exception_message() {
        ResponseEntity<Map<String, Object>> resp =
                new GlobalExceptionHandler().handleGeneral(new RuntimeException(SECRET));

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(resp.getBody()).isNotNull();
        assertThat(resp.getBody().get("message"))
                .isEqualTo("An unexpected error occurred. Please try again later.");
        assertThat(resp.getBody().toString()).doesNotContain(SECRET);
    }
}
