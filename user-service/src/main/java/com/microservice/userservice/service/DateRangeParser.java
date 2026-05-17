package com.microservice.userservice.service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class DateRangeParser {

    private static final Pattern YYYY_MM = Pattern.compile("^(\\d{4})-(\\d{2})$");
    private static final Pattern MM_YYYY = Pattern.compile("^(\\d{2})/(\\d{4})$");
    private static final Pattern YEAR_ONLY = Pattern.compile("^(\\d{4})$");

    private DateRangeParser() {}

    public static DateRange parse(String startDate, String endDate) {
        String normalizedStart = normalizeSingle(startDate);
        String normalizedEnd = normalizeSingle(endDate);

        boolean current = false;

        if (containsPresent(endDate)) {
            normalizedEnd = null;
            current = true;
        }

        if (containsPresent(startDate) && normalizedStart == null) {
            current = true;
        }

        return new DateRange(normalizedStart, normalizedEnd, current);
    }

    public static String normalizeSingle(String raw) {
        if (raw == null || raw.isBlank()) return null;

        String value = raw.trim();

        if (containsPresent(value)) {
            return null;
        }

        Matcher yyyyMm = YYYY_MM.matcher(value);
        if (yyyyMm.matches()) {
            return value;
        }

        Matcher mmYyyy = MM_YYYY.matcher(value);
        if (mmYyyy.matches()) {
            return mmYyyy.group(2) + "-" + mmYyyy.group(1);
        }

        Matcher yearOnly = YEAR_ONLY.matcher(value);
        if (yearOnly.matches()) {
            return yearOnly.group(1) + "-01";
        }

        // Handles values like "2022 – Present" or "06/2025 – 08/2025"
        String[] parts = value.split("\\s*[–-]\\s*");
        if (parts.length >= 1) {
            return normalizeSingle(parts[0]);
        }

        return null;
    }

    private static boolean containsPresent(String value) {
        if (value == null) return false;
        String v = value.toLowerCase();
        return v.contains("present") || v.contains("current") || v.contains("présent");
    }
}