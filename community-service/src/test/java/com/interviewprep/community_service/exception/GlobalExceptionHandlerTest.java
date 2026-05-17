package com.interviewprep.community_service.exception;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * Hermetic regression guard for C2 / theme T-C: handleAll must not echo the
 * exception simple name or message.
 */
class GlobalExceptionHandlerTest {

    private static final String SECRET = "SENSITIVE-redis-uri-leak-7";

    @Test
    void handleAll_returns_500_without_classname_or_message_leak() {
        ResponseEntity<Map<String, Object>> resp =
                new GlobalExceptionHandler().handleAll(new IllegalArgumentException(SECRET));

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(resp.getBody()).isNotNull();
        assertThat(resp.getBody().get("error")).isEqualTo("Internal Server Error");
        assertThat(resp.getBody().get("message"))
                .isEqualTo("An unexpected error occurred. Please try again later.");
        assertThat(resp.getBody().toString())
                .doesNotContain(SECRET)
                .doesNotContain("IllegalArgumentException");
    }
}
