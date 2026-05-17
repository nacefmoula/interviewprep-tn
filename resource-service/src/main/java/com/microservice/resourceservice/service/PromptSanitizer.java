package com.microservice.resourceservice.service;

/**
 * Strips characters that can break out of JSON prompt delimiters or inject
 * new instructions into an LLM prompt (prompt injection hardening).
 */
public final class PromptSanitizer {

    private static final int MAX_TITLE_LENGTH       = 200;
    private static final int MAX_DESCRIPTION_LENGTH = 1000;

    private PromptSanitizer() {}

    public static String sanitizeTitle(String input) {
        return sanitize(input, MAX_TITLE_LENGTH);
    }

    public static String sanitizeDescription(String input) {
        return sanitize(input, MAX_DESCRIPTION_LENGTH);
    }

    private static String sanitize(String input, int maxLength) {
        if (input == null) return "";
        String trimmed = input.trim();
        // Remove characters that could escape JSON string values or inject markdown headings
        String cleaned = trimmed
            .replace("\"", "'")
            .replace("\\", " ")
            .replace("\n", " ")
            .replace("\r", " ")
            .replace("\t", " ")
            // Strip common prompt-injection patterns
            .replaceAll("(?i)ignore\\s+(previous|above|all|prior)", "")
            .replaceAll("(?i)(system|assistant|user)\\s*:", "");
        // Collapse whitespace
        cleaned = cleaned.replaceAll("\\s{2,}", " ").trim();
        if (cleaned.length() > maxLength) {
            cleaned = cleaned.substring(0, maxLength).trim();
        }
        return cleaned;
    }
}
