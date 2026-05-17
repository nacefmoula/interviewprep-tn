package com.microservice.resourceservice.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@Slf4j
public class CacheErrorHandlerConfig {

    /**
     * Prevents Redis cache outages from breaking read/write endpoints.
     */
    @Bean
    public CacheErrorHandler cacheErrorHandler() {
        return new CacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Cache GET error. cache={}, key={}, err={}", cacheName(cache), key, exception.getMessage());
            }

            @Override
            public void handleCachePutError(RuntimeException exception, Cache cache, Object key, Object value) {
                log.warn("Cache PUT error. cache={}, key={}, err={}", cacheName(cache), key, exception.getMessage());
            }

            @Override
            public void handleCacheEvictError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Cache EVICT error. cache={}, key={}, err={}", cacheName(cache), key, exception.getMessage());
            }

            @Override
            public void handleCacheClearError(RuntimeException exception, Cache cache) {
                log.warn("Cache CLEAR error. cache={}, err={}", cacheName(cache), exception.getMessage());
            }
        };
    }

    private static String cacheName(Cache cache) {
        try {
            return cache != null ? cache.getName() : "unknown";
        } catch (Exception e) {
            return "unknown";
        }
    }
}

