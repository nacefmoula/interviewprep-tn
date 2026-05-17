package com.microservice.mentorshipservice.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailSendException;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.UUID;

@Service
public class AsyncEmailSendService {

    private static final Logger log = LoggerFactory.getLogger(AsyncEmailSendService.class);

    private static final int RATE_LIMIT_MAX_ATTEMPTS = 3;
    private static final long RATE_LIMIT_BASE_BACKOFF_MS = 7000;

    private final EmailService emailService;

    public AsyncEmailSendService(EmailService emailService) {
        this.emailService = emailService;
    }

    @Async
    public void sendTwoSequentialBestEffort(
            String firstTo,
            String firstSubject,
            String firstHtml,
            String firstPurpose,
            String secondTo,
            String secondSubject,
            String secondHtml,
            String secondPurpose,
            UUID requestId
    ) {
        sendOneBestEffort(firstTo, firstSubject, firstHtml, firstPurpose, requestId);
        sendOneBestEffort(secondTo, secondSubject, secondHtml, secondPurpose, requestId);
    }

    private void sendOneBestEffort(String to, String subject, String html, String purpose, UUID requestId) {
        if (!StringUtils.hasText(to)) {
            return;
        }

        String trimmed = to.trim();

        for (int attempt = 1; attempt <= RATE_LIMIT_MAX_ATTEMPTS; attempt++) {
            try {
                emailService.sendHtml(trimmed, subject, html);
                return;
            } catch (MailSendException ex) {
                if (isRateLimit(ex) && attempt < RATE_LIMIT_MAX_ATTEMPTS) {
                    long backoff = RATE_LIMIT_BASE_BACKOFF_MS * attempt;
                    log.warn("Rate limited sending {} email (attempt {}/{}). Retrying in {}ms (requestId={}, to={})",
                            purpose, attempt, RATE_LIMIT_MAX_ATTEMPTS, backoff, requestId, trimmed);
                    sleepSilently(backoff);
                    continue;
                }

                log.warn("Failed sending {} email (requestId={}, to={})", purpose, requestId, trimmed, ex);
                return;
            } catch (Exception ex) {
                log.warn("Failed sending {} email (requestId={}, to={})", purpose, requestId, trimmed, ex);
                return;
            }
        }
    }

    private static boolean isRateLimit(Throwable ex) {
        return hasCauseMessageContaining(ex, "too many emails per second");
    }

    private static boolean hasCauseMessageContaining(Throwable ex, String needleLowerCase) {
        Throwable cur = ex;
        while (cur != null) {
            String msg = cur.getMessage();
            if (msg != null && msg.toLowerCase().contains(needleLowerCase)) {
                return true;
            }
            cur = cur.getCause();
        }
        return false;
    }

    private static void sleepSilently(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }
}
