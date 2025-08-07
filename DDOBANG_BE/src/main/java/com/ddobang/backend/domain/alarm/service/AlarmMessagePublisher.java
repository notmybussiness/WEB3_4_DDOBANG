package com.ddobang.backend.domain.alarm.service;

import java.time.LocalDateTime;

import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import com.ddobang.backend.domain.alarm.event.AlarmEvent;
import com.ddobang.backend.global.config.RabbitMQConfig;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 알림 메시지 발행자
 * 
 * RabbitMQ로 알림 이벤트를 발행하는 서비스
 * - 비동기 메시지 발행
 * - 발행 실패 처리 및 모니터링
 * - 메트릭 수집 (발행 성공률, 지연시간)
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "spring.rabbitmq.host") // RabbitMQ 설정이 있을 때만 활성화
public class AlarmMessagePublisher {

    private final RabbitTemplate rabbitTemplate;
    
    // Metrics
    private final Counter publishedCounter;
    private final Counter publishFailedCounter; 
    private final Timer publishTimer;

    public AlarmMessagePublisher(RabbitTemplate rabbitTemplate, MeterRegistry meterRegistry) {
        this.rabbitTemplate = rabbitTemplate;
        
        // 메트릭 초기화
        this.publishedCounter = Counter.builder("rabbitmq.messages.published")
                .description("Total number of published messages")
                .register(meterRegistry);
        
        this.publishFailedCounter = Counter.builder("rabbitmq.messages.publish.failed")
                .description("Total number of failed message publications")
                .register(meterRegistry);
                
        this.publishTimer = Timer.builder("rabbitmq.publish.duration")
                .description("Time taken to publish messages")
                .register(meterRegistry);
    }

    /**
     * 알림 이벤트 발행
     * 
     * @param alarmEvent 발행할 알림 이벤트
     * @return 발행 성공 여부
     */
    public boolean publishAlarmEvent(AlarmEvent alarmEvent) {
        try {
            return publishTimer.recordCallable(() -> {
                try {
                log.debug("알림 이벤트 발행 시작: eventId={}, receiverId={}", 
                    alarmEvent.getEventId(), alarmEvent.getReceiverId());

                // 라우팅 키 결정 (우선순위에 따라)
                String routingKey = determineRoutingKey(alarmEvent);
                
                // 메시지 발행
                rabbitTemplate.convertAndSend(
                    RabbitMQConfig.NOTIFICATION_EXCHANGE,
                    routingKey,
                    alarmEvent,
                    message -> {
                        // 메시지 헤더에 메타데이터 추가
                        message.getMessageProperties().setHeader("eventId", alarmEvent.getEventId());
                        message.getMessageProperties().setHeader("receiverId", alarmEvent.getReceiverId().toString());
                        message.getMessageProperties().setHeader("alarmType", alarmEvent.getAlarmType().name());
                        message.getMessageProperties().setHeader("priority", alarmEvent.getPriority().toString());
                        message.getMessageProperties().setHeader("publishedAt", LocalDateTime.now().toString());
                        
                        // 높은 우선순위 메시지는 expiration 시간 단축
                        if (alarmEvent.isHighPriority()) {
                            message.getMessageProperties().setExpiration("60000"); // 1분
                        } else {
                            message.getMessageProperties().setExpiration("300000"); // 5분
                        }
                        
                        return message;
                    }
                );

                publishedCounter.increment();
                log.info("알림 이벤트 발행 성공: eventId={}, routingKey={}", 
                    alarmEvent.getEventId(), routingKey);
                
                return true;

            } catch (AmqpException e) {
                publishFailedCounter.increment();
                log.error("알림 이벤트 발행 실패: eventId={}, 오류={}", 
                    alarmEvent.getEventId(), e.getMessage(), e);
                
                return false;

            } catch (Exception e) {
                publishFailedCounter.increment();
                log.error("알림 이벤트 발행 중 예기치 못한 오류: eventId={}, 오류={}", 
                    alarmEvent.getEventId(), e.getMessage(), e);
                
                return false;
                }
            });
        } catch (Exception e) {
            publishFailedCounter.increment();
            log.error("알림 이벤트 발행 중 Timer 측정 오류: eventId={}, 오류={}", 
                alarmEvent.getEventId(), e.getMessage(), e);
            return false;
        }
    }

    /**
     * 재시도 이벤트 발행
     * 
     * @param originalEvent 원본 이벤트
     * @return 재시도 이벤트 발행 성공 여부
     */
    public boolean publishRetryEvent(AlarmEvent originalEvent) {
        if (originalEvent.isMaxRetryReached()) {
            log.warn("최대 재시도 횟수 도달, DLQ로 이동: eventId={}, retryCount={}", 
                originalEvent.getEventId(), originalEvent.getRetryCount());
            return false;
        }

        AlarmEvent retryEvent = originalEvent.withRetry();
        log.info("재시도 이벤트 발행: eventId={}, retryCount={}", 
            retryEvent.getEventId(), retryEvent.getRetryCount());
        
        return publishAlarmEvent(retryEvent);
    }

    /**
     * 라우팅 키 결정 로직
     */
    private String determineRoutingKey(AlarmEvent alarmEvent) {
        String baseKey = getBaseRoutingKey(alarmEvent.getAlarmType().name());
        String priorityKey = alarmEvent.isHighPriority() ? "high" : "normal";
        
        return String.format("%s.%s", baseKey, priorityKey);
    }

    /**
     * 알림 타입별 기본 라우팅 키 매핑
     */
    private String getBaseRoutingKey(String alarmType) {
        return switch (alarmType) {
            case "PARTY_APPLY", "PARTY_STATUS" -> RabbitMQConfig.PARTY_ROUTING_KEY;
            case "MESSAGE" -> RabbitMQConfig.MESSAGE_ROUTING_KEY;
            case "POST_REPLY", "SUBSCRIBE" -> RabbitMQConfig.BOARD_ROUTING_KEY;
            default -> RabbitMQConfig.PARTY_ROUTING_KEY; // 기본값
        };
    }

    /**
     * 발행 통계 조회 (모니터링용)
     */
    public PublishStats getPublishStats() {
        return PublishStats.builder()
            .totalPublished((long) publishedCounter.count())
            .totalFailed((long) publishFailedCounter.count())
            .averagePublishTime(publishTimer.mean(java.util.concurrent.TimeUnit.MILLISECONDS))
            .build();
    }

    /**
     * 발행 통계 DTO
     */
    @lombok.Builder
    @lombok.Getter
    public static class PublishStats {
        private final Long totalPublished;
        private final Long totalFailed; 
        private final Double averagePublishTime;
        
        public Double getSuccessRate() {
            long total = totalPublished + totalFailed;
            return total > 0 ? (double) totalPublished / total * 100 : 0.0;
        }
    }
}