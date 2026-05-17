package com.microservice.trainingservice.exception;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

/**
 * Hermetic regression guard for T9 / theme T-C: the catch-all handler must
 * not append ex.getMessage() to the 500 body.
 */
class GlobalExceptionHandlerTest {

    private static final String SECRET = "SENSITIVE-kafka-bootstrap-leak-3";

    @Test
    void generic_handler_returns_500_without_message_leak() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/training/x");

        ResponseEntity<Map<String, Object>> resp =
                new GlobalExceptionHandler().handleGeneric(new RuntimeException(SECRET), request);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(resp.getBody()).isNotNull();
        assertThat(resp.getBody().get("message"))
                .isEqualTo("An unexpected error occurred. Please try again later.");
        assertThat(resp.getBody().toString()).doesNotContain(SECRET);
    }
}
