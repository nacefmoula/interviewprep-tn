package com.microservice.interviewservice.service.impl;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.EnumMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.vosk.Model;
import org.vosk.Recognizer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.interviewservice.ennum.InterviewLanguage;
import com.microservice.interviewservice.service.SpeechToTextService;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;

/**
 * Vosk-backed STT with three acoustic models loaded in parallel at startup:
 * English (lgraph), French (small), and Tunisian Arabic (small-linto).
 *
 * <p>Only active when {@code app.stt.provider=vosk} (the default).  Switch to
 * {@code app.stt.provider=whisper} to use {@link WhisperSpeechToTextServiceImpl}
 * instead — only one STT bean is present at runtime, so the rest of the
 * code (which autowires {@link SpeechToTextService}) doesn't change.
 *
 * <p>Vosk {@link Model} objects are thread-safe once constructed; we instantiate
 * a fresh {@link Recognizer} per transcription because recognizers are not
 * thread-safe and hold per-utterance state.
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "app.stt.provider", havingValue = "vosk", matchIfMissing = true)
public class VoskSpeechToTextServiceImpl implements SpeechToTextService {

    private final Map<InterviewLanguage, Model> models = new EnumMap<>(InterviewLanguage.class);
    private final float sampleRate;
    private final ObjectMapper objectMapper;

    public VoskSpeechToTextServiceImpl(
            @Value("${app.vosk.model-path-en:}")    String modelPathEn,
            @Value("${app.vosk.model-path-fr:}")    String modelPathFr,
            @Value("${app.vosk.model-path-ar-tn:}") String modelPathArTn,
            @Value("${app.vosk.sample-rate:16000}") float sampleRate,
            ObjectMapper objectMapper) throws IOException {

        this.sampleRate = sampleRate;
        this.objectMapper = objectMapper;

        loadModelIfPresent(InterviewLanguage.EN,    modelPathEn,    "English");
        loadModelIfPresent(InterviewLanguage.FR,    modelPathFr,    "French");
        loadModelIfPresent(InterviewLanguage.AR_TN, modelPathArTn,  "Tunisian Arabic");

        if (models.isEmpty()) {
            throw new IllegalStateException(
                "No Vosk models configured. Set at least one of " +
                "app.vosk.model-path-en / model-path-fr / model-path-ar-tn.");
        }
        log.info("Vosk multilingual STT ready. Loaded models: {}", models.keySet());
    }

    private void loadModelIfPresent(InterviewLanguage lang, String path, String label) throws IOException {
        if (path == null || path.isBlank()) {
            log.warn("No {} model configured — transcription requests for {} will fail.", label, lang);
            return;
        }
        if (!Files.exists(Path.of(path))) {
            log.warn("{} model path does not exist, skipping: {}", label, path);
            return;
        }
        Model model = new Model(path);
        models.put(lang, model);
        log.info("Loaded Vosk {} model from {}", label, path);
    }

    @Override
    public String transcribeBase64Pcm16(String pcm16Base64, InterviewLanguage language) {
        if (pcm16Base64 == null || pcm16Base64.isBlank()) {
            return "";
        }

        InterviewLanguage effective = language != null ? language : InterviewLanguage.EN;
        Model model = models.get(effective);

        if (model == null) {
            Map.Entry<InterviewLanguage, Model> fallback = models.entrySet().iterator().next();
            log.warn("Requested language {} has no model loaded. Falling back to {}.",
                    effective, fallback.getKey());
            model = fallback.getValue();
            effective = fallback.getKey();
        }

        try {
            byte[] audio = Base64.getDecoder().decode(pcm16Base64);
            log.debug("Transcribing {} bytes of audio with {} model.", audio.length, effective);

            try (Recognizer recognizer = new Recognizer(model, sampleRate)) {
                recognizer.acceptWaveForm(audio, audio.length);
                String finalJson = recognizer.getFinalResult();
                Map<?, ?> parsed = objectMapper.readValue(finalJson, Map.class);
                Object text = parsed.get("text");
                return text == null ? "" : String.valueOf(text).trim();
            }
        } catch (Exception ex) {
            log.error("Vosk transcription failed for language {}", effective, ex);
            return "";
        }
    }

    @PreDestroy
    public void close() {
        models.forEach((lang, model) -> {
            try {
                model.close();
            } catch (Exception ex) {
                log.warn("Error closing Vosk {} model: {}", lang, ex.getMessage());
            }
        });
        models.clear();
    }
}