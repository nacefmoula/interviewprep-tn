package com.microservice.resourceservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.web.config.PageableHandlerMethodArgumentResolverCustomizer;

@Configuration
public class WebMvcConfig {

    /** Cap page size at 100 to prevent clients from requesting the entire table. */
    @Bean
    public PageableHandlerMethodArgumentResolverCustomizer pageSizeLimiter() {
        return resolver -> resolver.setMaxPageSize(100);
    }
}
