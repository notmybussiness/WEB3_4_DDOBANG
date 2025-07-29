package com.ddobang.backend.global.config;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MetricsConfig {

    @Bean
    public Counter sseConnectionCounter(MeterRegistry meterRegistry) {
        return Counter.builder("sse.connections.created")
                .description("Total number of SSE connections created")
                .register(meterRegistry);
    }

    @Bean
    public Counter sseConnectionFailedCounter(MeterRegistry meterRegistry) {
        return Counter.builder("sse.connections.failed")
                .description("Total number of failed SSE connections")
                .register(meterRegistry);
    }

    @Bean
    public Counter notificationSentCounter(MeterRegistry meterRegistry) {
        return Counter.builder("notifications.sent")
                .description("Total number of notifications sent")
                .register(meterRegistry);
    }

    @Bean
    public Counter notificationFailedCounter(MeterRegistry meterRegistry) {
        return Counter.builder("notifications.failed")
                .description("Total number of failed notification attempts")
                .register(meterRegistry);
    }

    @Bean
    public Timer notificationSendTimer(MeterRegistry meterRegistry) {
        return Timer.builder("notifications.send.duration")
                .description("Time taken to send notifications")
                .register(meterRegistry);
    }

    @Bean
    public Timer sseConnectionDuration(MeterRegistry meterRegistry) {
        return Timer.builder("sse.connection.duration")
                .description("Duration of SSE connections")
                .register(meterRegistry);
    }
}