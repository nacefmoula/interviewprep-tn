package com.quizservice.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

    // On crée le topic pour les résultats de quiz
    @Bean
    public NewTopic quizResultsTopic() {
        return TopicBuilder.name("quiz-results-topic")
                .partitions(3)
                .replicas(1)
                .build();
    }
}