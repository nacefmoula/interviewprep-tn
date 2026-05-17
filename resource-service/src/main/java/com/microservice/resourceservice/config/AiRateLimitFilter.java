package com.microservice.resourceservice.config;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.io.IOException;
import java.time.Duration;

/**
 * Simple sliding-window rate limit for AI endpoints, backed by Redis.
 * Counts requests per IP per 60s window on any path containing "/ai/".
 * Exceeding the cap returns 429 with a helpful JSON payload.
 */
@Configuration
@Slf4j
public class AiRateLimitFilter {

    @Value("${ai.ratelimit.requests-per-minute:20}")
    private int limit;

    @Bean
    public FilterRegistrationBean<Filter> aiRateLimitFilterRegistration(StringRedisTemplate redis) {
        FilterRegistrationBean<Filter> reg = new FilterRegistrationBean<>();
        reg.setFilter(new Filter() {
            @Override
            public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
                throws IOException, ServletException {

                HttpServletRequest req = (HttpServletRequest) request;
                HttpServletResponse res = (HttpServletResponse) response;
                String path = req.getRequestURI();

                // Only apply to AI endpoints
                if (path == null || !path.contains("/ai/")) {
                    chain.doFilter(request, response);
                    return;
                }

                String ip = resolveClientIp(req);
                long windowSeconds = 60L;
                long windowBucket = System.currentTimeMillis() / 1000L / windowSeconds;
                String key = "ratelimit:ai:" + ip + ":" + windowBucket;

                Long count;
                try {
                    count = redis.opsForValue().increment(key);
                    if (count != null && count == 1L) {
                        // First hit in this window → set TTL
                        redis.expire(key, Duration.ofSeconds(windowSeconds + 5));
                    }
                } catch (Exception e) {
                    // Redis down → fail open (don't rate limit)
                    log.warn("Rate limit Redis error, allowing request: {}", e.getMessage());
                    chain.doFilter(request, response);
                    return;
                }

                if (count != null && count > limit) {
                    res.setStatus(429);
                    res.setContentType("application/json");
                    res.setHeader("Retry-After", "60");
                    res.setHeader("X-RateLimit-Limit", String.valueOf(limit));
                    res.setHeader("X-RateLimit-Window", "60s");
                    String body = String.format(
                        "{\"status\":429,\"error\":\"Too Many Requests\",\"message\":\"Limite IA atteinte (%d requêtes/minute). Réessayez dans une minute.\"}",
                        limit
                    );
                    res.getWriter().write(body);
                    return;
                }

                chain.doFilter(request, response);
            }
        });
        reg.addUrlPatterns("/api/resources/*");
        reg.setOrder(10); // before auth filter
        reg.setName("aiRateLimitFilter");
        return reg;
    }

    private static String resolveClientIp(HttpServletRequest req) {
        String xf = req.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            int comma = xf.indexOf(',');
            return (comma > 0 ? xf.substring(0, comma) : xf).trim();
        }
        String real = req.getHeader("X-Real-IP");
        if (real != null && !real.isBlank()) return real.trim();
        return req.getRemoteAddr();
    }
}
