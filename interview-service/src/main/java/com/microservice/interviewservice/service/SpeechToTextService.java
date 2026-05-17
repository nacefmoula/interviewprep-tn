package com.microservice.interviewservice.service;

import com.microservice.interviewservice.ennum.InterviewLanguage;

public interface SpeechToTextService {

    /**
     * Transcribe a PCM16 audio clip (base64-encoded) in the given language.
     *
     * @param pcm16Base64 base64-encoded mono PCM16 audio at 16 kHz
     * @param language    target language for the acoustic model
     * @return the transcribed text, or an empty string if transcription failed
     */
    String transcribeBase64Pcm16(String pcm16Base64, InterviewLanguage language);

    /**
     * Backwards-compatible overload — assumes English.
     * Kept to avoid breaking older callers; prefer the language-aware overload.
     */
    default String transcribeBase64Pcm16(String pcm16Base64) {
        return transcribeBase64Pcm16(pcm16Base64, InterviewLanguage.EN);
    }
}