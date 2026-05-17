package com.microservice.interviewservice.config;

import com.microservice.interviewservice.event.SessionCompletedEvent;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.*;
import org.springframework.kafka.support.serializer.JsonSerializer;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class KafkaProducerConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Bean
    public ProducerFactory<String, SessionCompletedEvent> producerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        config.put(JsonSerializer.ADD_TYPE_INFO_HEADERS, false);

        // FIX: Fail fast when the broker is unreachable instead of blocking
        // for the default 60 000 ms (max.block.ms). With the fire-and-forget
        // publishEventSafely() wrapper in InterviewSessionServiceImpl these
        // timeouts only affect the async callback — the HTTP response is
        // already on its way before they fire.
        config.put(ProducerConfig.MAX_BLOCK_MS_CONFIG, 3_000);         // metadata fetch / buffer-full wait
        config.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, 3_000);   // broker ack wait
        config.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 5_000);  // total send lifecycle
        config.put(ProducerConfig.RETRIES_CONFIG, 1);                   // one retry, then give up

        return new DefaultKafkaProducerFactory<>(config);
    }

    @Bean
    public KafkaTemplate<String, SessionCompletedEvent> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }
}