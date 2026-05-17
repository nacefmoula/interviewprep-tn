package com.microservice.interviewservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DbDebugConfig {

    @Bean
    CommandLineRunner debugDb(
            @Value("${spring.datasource.url}") String url,
            @Value("${spring.datasource.username}") String username,
            @Value("${spring.datasource.password}") String password) {
        return args -> {
            System.out.println("DB_URL=[" + url + "]");
            System.out.println("DB_USER=[" + username + "]");
            System.out.println("DB_PASS=[configured]");
        };
    }
}