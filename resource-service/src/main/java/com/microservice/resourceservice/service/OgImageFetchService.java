package com.microservice.resourceservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extracts og:image / twitter:image meta tags from a web page,
 * and handles well-known platform shortcuts (YouTube, GitHub) via direct URL derivation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OgImageFetchService {

    private final RestTemplate restTemplate;

    /* property first, then content */
    private static final Pattern OG_A = Pattern.compile(
        "<meta[^>]+property=[\"']og:image[\"'][^>]+content=[\"']([^\"'\\s>]+)[\"']",
        Pattern.CASE_INSENSITIVE);
    /* content first, then property */
    private static final Pattern OG_B = Pattern.compile(
        "<meta[^>]+content=[\"']([^\"'\\s>]+)[\"'][^>]+property=[\"']og:image[\"']",
        Pattern.CASE_INSENSITIVE);
    /* twitter:image fallback */
    private static final Pattern TW_A = Pattern.compile(
        "<meta[^>]+name=[\"']twitter:image(?::src)?[\"'][^>]+content=[\"']([^\"'\\s>]+)[\"']",
        Pattern.CASE_INSENSITIVE);
    private static final Pattern TW_B = Pattern.compile(
        "<meta[^>]+content=[\"']([^\"'\\s>]+)[\"'][^>]+name=[\"']twitter:image(?::src)?[\"']",
        Pattern.CASE_INSENSITIVE);

    /**
     * Returns the best image URL for the given resource URL.
     * First tries platform-specific shortcuts (no network call needed),
     * then falls back to fetching the page and parsing OG meta tags.
     */
    public Optional<String> resolve(String resourceUrl) {
        if (resourceUrl == null || resourceUrl.isBlank()) return Optional.empty();

        Optional<String> shortcut = platformShortcut(resourceUrl);
        if (shortcut.isPresent()) return shortcut;

        return fetchOgImage(resourceUrl);
    }

    // ── Platform shortcuts ────────────────────────────────────────────────

    private Optional<String> platformShortcut(String url) {
        try {
            URI uri = URI.create(url);
            String host = uri.getHost();
            if (host == null) return Optional.empty();
            host = host.replaceFirst("^www\\.", "");

            // YouTube
            if (host.equals("youtube.com") || host.equals("youtu.be")) {
                String vid = host.equals("youtu.be")
                    ? uri.getPath().replaceFirst("^/", "").split("\\?")[0]
                    : queryParam(uri.getRawQuery(), "v");
                if (vid != null && !vid.isBlank()) {
                    return Optional.of("https://img.youtube.com/vi/" + vid + "/hqdefault.jpg");
                }
            }

            // GitHub repository
            if (host.equals("github.com")) {
                String[] parts = uri.getPath().split("/");
                if (parts.length >= 3 && !parts[1].isBlank() && !parts[2].isBlank()) {
                    return Optional.of(
                        "https://opengraph.githubassets.com/1/" + parts[1] + "/" + parts[2]);
                }
            }

            // Spotify (podcast / episode) — OEmbed thumbnail
            if (host.equals("open.spotify.com")) {
                String path = uri.getPath();
                // e.g. /episode/4rOoJ6Egrf8K2IrywzwOMk → embed works
                if (path.startsWith("/episode") || path.startsWith("/show")) {
                    return Optional.of("https://embed.spotify.com/oembed/?url="
                        + java.net.URLEncoder.encode(url, java.nio.charset.StandardCharsets.UTF_8));
                    // Note: this returns JSON, not a direct image — handled below by fallback
                }
            }

        } catch (Exception e) {
            log.debug("Platform shortcut failed for {}: {}", url, e.getMessage());
        }
        return Optional.empty();
    }

    // ── Generic OG fetch ──────────────────────────────────────────────────

    private Optional<String> fetchOgImage(String pageUrl) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent",
                "Mozilla/5.0 (compatible; ResourceBot/1.0; +https://interviewprep.tn)");
            headers.set("Accept", "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8");
            headers.set("Accept-Language", "en,fr;q=0.8");

            ResponseEntity<String> resp = restTemplate.exchange(
                pageUrl, HttpMethod.GET, new HttpEntity<>(headers), String.class);

            if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
                return Optional.empty();
            }
            String html = resp.getBody();
            // Parse only <head> — faster and sufficient for meta tags
            int headEnd = html.indexOf("</head>");
            String head = headEnd > 0
                ? html.substring(0, headEnd + 7)
                : html.substring(0, Math.min(html.length(), 12_000));

            for (Pattern p : List.of(OG_A, OG_B, TW_A, TW_B)) {
                Matcher m = p.matcher(head);
                if (m.find()) {
                    String img = m.group(1).trim();
                    if (!img.isEmpty() && (img.startsWith("https://") || img.startsWith("http://"))) {
                        return Optional.of(img);
                    }
                }
            }
        } catch (Exception e) {
            log.debug("OG fetch skipped for {}: {}", pageUrl, e.getMessage());
        }
        return Optional.empty();
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private static String queryParam(String rawQuery, String name) {
        if (rawQuery == null) return null;
        for (String pair : rawQuery.split("&")) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2 && kv[0].equals(name)) return kv[1];
        }
        return null;
    }
}
