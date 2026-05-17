package com.microservice.interviewservice.service.impl;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import com.microservice.interviewservice.ennum.InterviewLanguage;
import com.microservice.interviewservice.service.SpeechToTextService;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

/**
 * Whisper-backed STT client. Talks to a local faster-whisper-server container
 * via the OpenAI-compatible /v1/audio/transcriptions endpoint.
 *
 * <p>Frontend audio arrives as base64-encoded mono PCM16 @ 16 kHz. We wrap it
 * in a minimal WAV header and POST as multipart/form-data. No ffmpeg needed.
 *
 * <p>Activated by {@code app.stt.provider=whisper} in application.yaml.
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "app.stt.provider", havingValue = "whisper")
public class WhisperSpeechToTextServiceImpl implements SpeechToTextService {

    private static final int SAMPLE_RATE     = 16_000;
    private static final int CHANNELS        = 1;
    private static final int BITS_PER_SAMPLE = 16;

    private final RestClient whisperClient;
    private final String     whisperBaseUrl;
    private final String     whisperModel;

    public WhisperSpeechToTextServiceImpl(
            @Value("${app.stt.whisper.base-url:http://127.0.0.1:8000}") String whisperBaseUrl,
            @Value("${app.stt.whisper.model:Systran/faster-whisper-small}") String whisperModel) {

        this.whisperBaseUrl = whisperBaseUrl;
        this.whisperModel   = whisperModel;

        // JDK HTTP/1.1 client — same pattern we used for Kokoro. Whisper's
        // Uvicorn rejects the Upgrade headers Spring's default client sends.
        HttpClient jdk = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(5))
                .build();

        JdkClientHttpRequestFactory rf = new JdkClientHttpRequestFactory(jdk);
        // 90 s to be tolerant of cold-start model loading (first real request
        // after container boot can take ~30 s) and long answers.
        rf.setReadTimeout(Duration.ofSeconds(90));

        this.whisperClient = RestClient.builder()
                .baseUrl(whisperBaseUrl)
                .requestFactory(rf)
                .build();

        log.info("Whisper STT configured: baseUrl={}, model={}", whisperBaseUrl, whisperModel);
    }

    /**
     * Send a tiny silent clip at boot so faster-whisper loads the model into
     * memory BEFORE the first real user request. Without this, the very first
     * interview turn after a container restart can take 20-40 s.
     */
    @PostConstruct
    public void warmUp() {
        new Thread(() -> {
            try {
                // 0.5 s of silence at 16 kHz mono PCM16 = 16000 bytes of zeros
                byte[] silence = new byte[16_000];
                String base64  = Base64.getEncoder().encodeToString(silence);
                log.info("Whisper warm-up starting…");
                long t0 = System.currentTimeMillis();
                String result = transcribeBase64Pcm16(base64, InterviewLanguage.EN);
                long elapsed = System.currentTimeMillis() - t0;
                log.info("Whisper warm-up complete in {} ms (result='{}')", elapsed, result);
            } catch (Exception ex) {
                log.warn("Whisper warm-up failed (will still work on first real request, just slower): {}",
                        ex.getMessage());
            }
        }, "whisper-warmup").start();
    }

    @Override
    public String transcribeBase64Pcm16(String pcm16Base64, InterviewLanguage language) {
        if (pcm16Base64 == null || pcm16Base64.isBlank()) {
            return "";
        }

        byte[] pcm = Base64.getDecoder().decode(pcm16Base64);
        if (pcm.length == 0) {
            return "";
        }

        byte[] wav      = pcmToWav(pcm);
        String langCode = toWhisperLang(language);

        log.debug("Transcribing {} bytes (wav={} bytes) with Whisper lang={}",
                pcm.length, wav.length, langCode);

        long t0 = System.currentTimeMillis();
        try {
            MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
            form.add("file", new WavFileResource(wav));
            form.add("model", whisperModel);
            form.add("language", langCode);
            form.add("response_format", "json");
            form.add("temperature", "0");

            @SuppressWarnings("unchecked")
            Map<String, Object> response = whisperClient.post()
                    .uri("/v1/audio/transcriptions")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(form)
                    .retrieve()
                    .body(Map.class);

            long elapsed = System.currentTimeMillis() - t0;

            if (response == null) {
                log.warn("Whisper returned null response (elapsed={}ms)", elapsed);
                return "";
            }

            Object text = response.get("text");
            String result = text == null ? "" : String.valueOf(text).trim();
            log.info("Whisper OK [lang={}, elapsed={}ms, chars={}]: '{}'",
                    langCode, elapsed, result.length(), preview(result));
            return result;

        } catch (RestClientResponseException ex) {
            log.error("Whisper HTTP error. status={} body={}",
                    ex.getStatusCode(), ex.getResponseBodyAsString());
            return "";
        } catch (Exception ex) {
            long elapsed = System.currentTimeMillis() - t0;
            log.error("Whisper transcription failed after {}ms: {}", elapsed, ex.getMessage(), ex);
            return "";
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /** Map our InterviewLanguage enum to Whisper's ISO language codes. */
    private String toWhisperLang(InterviewLanguage lang) {
        if (lang == null) return "en";
        return switch (lang) {
            case EN    -> "en";
            case FR    -> "fr";
            case AR_TN -> "ar";
        };
    }

    /**
     * Wrap a raw PCM16 mono 16 kHz little-endian buffer in a minimal WAV
     * header so Whisper's audio decoder accepts it.
     */
    private static byte[] pcmToWav(byte[] pcm) {
        int byteRate   = SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE / 8;
        int blockAlign = CHANNELS * BITS_PER_SAMPLE / 8;

        byte[] wav = new byte[44 + pcm.length];

        // "RIFF" chunk descriptor
        wav[0] = 'R'; wav[1] = 'I'; wav[2] = 'F'; wav[3] = 'F';
        writeIntLE(wav, 4, 36 + pcm.length);
        wav[8] = 'W'; wav[9] = 'A'; wav[10] = 'V'; wav[11] = 'E';

        // "fmt " sub-chunk
        wav[12] = 'f'; wav[13] = 'm'; wav[14] = 't'; wav[15] = ' ';
        writeIntLE(wav, 16, 16);
        writeShortLE(wav, 20, (short) 1);
        writeShortLE(wav, 22, (short) CHANNELS);
        writeIntLE(wav, 24, SAMPLE_RATE);
        writeIntLE(wav, 28, byteRate);
        writeShortLE(wav, 32, (short) blockAlign);
        writeShortLE(wav, 34, (short) BITS_PER_SAMPLE);

        // "data" sub-chunk
        wav[36] = 'd'; wav[37] = 'a'; wav[38] = 't'; wav[39] = 'a';
        writeIntLE(wav, 40, pcm.length);
        System.arraycopy(pcm, 0, wav, 44, pcm.length);
        return wav;
    }

    private static void writeIntLE(byte[] buf, int offset, int value) {
        buf[offset]     = (byte) (value        & 0xFF);
        buf[offset + 1] = (byte) ((value >> 8)  & 0xFF);
        buf[offset + 2] = (byte) ((value >> 16) & 0xFF);
        buf[offset + 3] = (byte) ((value >> 24) & 0xFF);
    }

    private static void writeShortLE(byte[] buf, int offset, short value) {
        buf[offset]     = (byte) (value        & 0xFF);
        buf[offset + 1] = (byte) ((value >> 8) & 0xFF);
    }

    private static String preview(String s) {
        return s.length() <= 120 ? s : s.substring(0, 120) + "…";
    }

    /**
     * Named ByteArrayResource so Spring's multipart encoder sends a proper
     * "filename" in the Content-Disposition header — Whisper rejects
     * uploads without a filename.
     */
    private static final class WavFileResource extends ByteArrayResource {
        WavFileResource(byte[] bytes) { super(bytes); }
        @Override public String getFilename() { return "audio.wav"; }
    }
}