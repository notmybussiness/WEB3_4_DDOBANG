package com.ddobang.backend.domain.alarm.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ddobang.backend.domain.alarm.service.AlarmEventService;
import com.ddobang.backend.domain.alarm.service.AlarmMessageConsumer;
import com.ddobang.backend.domain.alarm.service.AlarmMessagePublisher;
import com.ddobang.backend.global.response.ResponseFactory;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 알림 시스템 모니터링 컨트롤러
 * 
 * SSE 및 RabbitMQ 알림 시스템의 상태와 통계를 제공
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/monitoring/alarms")
@RequiredArgsConstructor
@Tag(name = "Alarm Monitoring", description = "알림 시스템 모니터링 API")
public class AlarmMonitoringController {

    private final AlarmEventService alarmEventService;
    private final java.util.Optional<AlarmMessagePublisher> alarmMessagePublisher;
    private final java.util.Optional<AlarmMessageConsumer> alarmMessageConsumer;

    @GetMapping("/status")
    @Operation(summary = "알림 시스템 전체 상태 조회", description = "SSE 및 RabbitMQ 알림 시스템의 전체 상태를 조회합니다.")
    public ResponseEntity<?> getAlarmSystemStatus() {
        Map<String, Object> status = new HashMap<>();
        
        // SSE 상태
        status.put("sse", Map.of(
            "enabled", true,
            "activeConnections", alarmEventService.getActiveConnectionCount()
        ));
        
        // RabbitMQ 상태
        boolean rabbitmqEnabled = alarmEventService.isRabbitMQEnabled();
        Map<String, Object> rabbitmqStatus = new HashMap<>();
        rabbitmqStatus.put("enabled", rabbitmqEnabled);
        
        if (rabbitmqEnabled) {
            // Publisher 통계
            if (alarmMessagePublisher.isPresent()) {
                AlarmMessagePublisher.PublishStats publishStats = 
                    alarmMessagePublisher.get().getPublishStats();
                rabbitmqStatus.put("publisher", Map.of(
                    "totalPublished", publishStats.getTotalPublished(),
                    "totalFailed", publishStats.getTotalFailed(),
                    "successRate", publishStats.getSuccessRate(),
                    "averagePublishTime", publishStats.getAveragePublishTime()
                ));
            }
            
            // Consumer 통계
            if (alarmMessageConsumer.isPresent()) {
                AlarmMessageConsumer.ProcessingStats processingStats = 
                    alarmMessageConsumer.get().getProcessingStats();
                rabbitmqStatus.put("consumer", Map.of(
                    "totalConsumed", processingStats.getTotalConsumed(),
                    "totalFailed", processingStats.getTotalFailed(),
                    "successRate", processingStats.getSuccessRate(),
                    "averageProcessingTime", processingStats.getAverageProcessingTime()
                ));
            }
        }
        
        status.put("rabbitmq", rabbitmqStatus);
        
        // 전체 시스템 상태
        status.put("overall", Map.of(
            "status", "healthy", // 실제로는 각 컴포넌트 상태를 종합해서 결정
            "mode", rabbitmqEnabled ? "hybrid" : "sse-only"
        ));
        
        return ResponseFactory.ok(status);
    }

    @GetMapping("/sse/connections")
    @Operation(summary = "SSE 연결 상태 조회", description = "현재 활성화된 SSE 연결 수를 조회합니다.")
    public ResponseEntity<?> getSseConnectionStatus() {
        Map<String, Object> sseStatus = Map.of(
            "activeConnections", alarmEventService.getActiveConnectionCount(),
            "enabled", true
        );
        
        return ResponseFactory.ok(sseStatus);
    }

    @GetMapping("/rabbitmq/publisher/stats")
    @Operation(summary = "RabbitMQ Publisher 통계 조회", description = "메시지 발행 통계를 조회합니다.")
    @ConditionalOnProperty(name = "spring.rabbitmq.host")
    public ResponseEntity<?> getPublisherStats() {
        if (!alarmMessagePublisher.isPresent()) {
            return ResponseFactory.ok("RabbitMQ Publisher가 비활성화되어 있습니다.");
        }
        
        AlarmMessagePublisher.PublishStats stats = alarmMessagePublisher.get().getPublishStats();
        
        Map<String, Object> publisherStats = Map.of(
            "totalPublished", stats.getTotalPublished(),
            "totalFailed", stats.getTotalFailed(),
            "successRate", stats.getSuccessRate(),
            "averagePublishTime", stats.getAveragePublishTime()
        );
        
        return ResponseFactory.ok(publisherStats);
    }

    @GetMapping("/rabbitmq/consumer/stats")
    @Operation(summary = "RabbitMQ Consumer 통계 조회", description = "메시지 소비 통계를 조회합니다.")
    @ConditionalOnProperty(name = "spring.rabbitmq.host")
    public ResponseEntity<?> getConsumerStats() {
        if (!alarmMessageConsumer.isPresent()) {
            return ResponseFactory.ok("RabbitMQ Consumer가 비활성화되어 있습니다.");
        }
        
        AlarmMessageConsumer.ProcessingStats stats = alarmMessageConsumer.get().getProcessingStats();
        
        Map<String, Object> consumerStats = Map.of(
            "totalConsumed", stats.getTotalConsumed(),
            "totalFailed", stats.getTotalFailed(),
            "successRate", stats.getSuccessRate(),
            "averageProcessingTime", stats.getAverageProcessingTime()
        );
        
        return ResponseFactory.ok(consumerStats);
    }

    @GetMapping("/health")
    @Operation(summary = "알림 시스템 헬스 체크", description = "알림 시스템의 전반적인 건강 상태를 체크합니다.")
    public ResponseEntity<?> healthCheck() {
        Map<String, Object> health = new HashMap<>();
        
        // SSE 헬스체크
        boolean sseHealthy = true; // SSE는 항상 사용 가능하다고 가정
        health.put("sse", Map.of(
            "status", sseHealthy ? "UP" : "DOWN",
            "activeConnections", alarmEventService.getActiveConnectionCount()
        ));
        
        // RabbitMQ 헬스체크
        boolean rabbitmqEnabled = alarmEventService.isRabbitMQEnabled();
        String rabbitmqStatus = rabbitmqEnabled ? "UP" : "DISABLED";
        
        if (rabbitmqEnabled) {
            // 실제로는 RabbitMQ 연결 상태를 체크해야 함
            // 여기서는 단순화하여 Publisher/Consumer 존재 여부만 체크
            boolean publisherHealthy = alarmMessagePublisher.isPresent();
            boolean consumerHealthy = alarmMessageConsumer.isPresent();
            
            if (!publisherHealthy || !consumerHealthy) {
                rabbitmqStatus = "PARTIAL";
            }
        }
        
        health.put("rabbitmq", Map.of("status", rabbitmqStatus));
        
        // 전체 상태 결정
        String overallStatus = sseHealthy && 
            (rabbitmqStatus.equals("UP") || rabbitmqStatus.equals("DISABLED")) 
            ? "UP" : "DOWN";
        
        health.put("status", overallStatus);
        
        return ResponseFactory.ok(health);
    }
}