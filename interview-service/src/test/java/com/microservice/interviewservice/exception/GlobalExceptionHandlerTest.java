package com.microservice.interviewservice.exception;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * Hermetic regression guard for I10 / theme T-C: the catch-all handler must
 * not echo ex.getMessage() nor the exception class name.
 */
class GlobalExceptionHandlerTest {

    private static final String SECRET = "SENSITIVE-internal-stacktrace-99";

    @Test
    void generic_handler_returns_500_without_message_or_classname_leak() {
        ResponseEntity<Map<String, Object>> resp =
                new GlobalExceptionHandler().handleGeneric(new IllegalStateException(SECRET));

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(resp.getBody()).isNotNull();
        assertThat(resp.getBody().get("message"))
                .isEqualTo("An unexpected error occurred. Please try again later.");
        assertThat(resp.getBody()).doesNotContainKey("exception");
        assertThat(resp.getBody().toString())
                .doesNotContain(SECRET)
                .doesNotContain("IllegalStateException");
    }
}
