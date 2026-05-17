package com.microservice.interviewservice.ennum;

/**
 * Languages supported by the multilingual Vosk STT pipeline.
 * Stored on {@link com.microservice.interviewservice.model.InterviewSession}
 * so every transcription call can be routed to the right acoustic model.
 */
public enum InterviewLanguage {
    /** English (US). Uses vosk-model-en-us-0.22-lgraph. */
    EN,
    /** French. Uses vosk-model-small-fr-0.22. */
    FR,
    /** Tunisian Arabic. Uses vosk-model-small-ar-tn-0.1-linto. */
    AR_TN
}