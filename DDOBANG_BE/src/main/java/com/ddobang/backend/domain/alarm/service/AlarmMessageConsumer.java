package com.ddobang.backend.domain.alarm.service;

import java.time.LocalDateTime;

import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import com.ddobang.backend.domain.alarm.dto.response.AlarmResponse;
import com.ddobang.backend.domain.alarm.event.AlarmEvent;
import com.ddobang.backend.global.config.RabbitMQConfig;
import com.rabbitmq.client.Channel;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 알림 메시지 소비자
 * 
 * RabbitMQ에서 알림 이벤트를 소비하여 실제 SSE 알림으로 전송하는 서비스
 * - 메시지 큐에서 알림 이벤트 수신
 * - SSE를 통한 실시간 알림 전송
 * - 실패 시 재시도 및 DLQ 처리
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "spring.rabbitmq.host") // RabbitMQ 설정이 있을 때만 활성화
public class AlarmMessageConsumer {

    private final AlarmEventService alarmEventService; // 기존 SSE 서비스 활용
    private final AlarmMessagePublisher alarmMessagePublisher; // 재시도용
    
    // Metrics
    private final Counter consumedCounter;
    private final Counter processingFailedCounter;
    private final Timer processingTimer;

    public AlarmMessageConsumer(
            AlarmEventService alarmEventService,
            AlarmMessagePublisher alarmMessagePublisher,
            MeterRegistry meterRegistry) {
        this.alarmEventService = alarmEventService;
        this.alarmMessagePublisher = alarmMessagePublisher;
        
        // 메트릭 초기화
        this.consumedCounter = Counter.builder("rabbitmq.messages.consumed")
                .description("Total number of consumed messages")
                .register(meterRegistry);
                
        this.processingFailedCounter = Counter.builder("rabbitmq.messages.processing.failed")
                .description("Total number of failed message processing")
                .register(meterRegistry);
                
        this.processingTimer = Timer.builder("rabbitmq.processing.duration")
                .description("Time taken to process messages")
                .register(meterRegistry);
    }

    /**
     * 파티 알림 메시지 소비자
     */
    @RabbitListener(queues = RabbitMQConfig.PARTY_NOTIFICATION_QUEUE)
    public void handlePartyNotification(
            @Payload AlarmEvent alarmEvent,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag,
            @Header(AmqpHeaders.REDELIVERED) boolean redelivered,
            Channel channel,
            Message message) {
        
        processAlarmEvent(alarmEvent, deliveryTag, redelivered, channel, "PARTY");
    }

    /**
     * 메시지 알림 소비자
     */
    @RabbitListener(queues = RabbitMQConfig.MESSAGE_NOTIFICATION_QUEUE)
    public void handleMessageNotification(
            @Payload AlarmEvent alarmEvent,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag,
            @Header(AmqpHeaders.REDELIVERED) boolean redelivered,
            Channel channel,
            Message message) {
        
        processAlarmEvent(alarmEvent, deliveryTag, redelivered, channel, "MESSAGE");
    }

    /**
     * 게시판 알림 소비자
     */
    @RabbitListener(queues = RabbitMQConfig.BOARD_NOTIFICATION_QUEUE)
    public void handleBoardNotification(
            @Payload AlarmEvent alarmEvent,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag,
            @Header(AmqpHeaders.REDELIVERED) boolean redelivered,
            Channel channel,
            Message message) {
        
        processAlarmEvent(alarmEvent, deliveryTag, redelivered, channel, "BOARD");
    }

    /**
     * 공통 알림 이벤트 처리 로직
     */
    private void processAlarmEvent(
            AlarmEvent alarmEvent, 
            long deliveryTag, 
            boolean redelivered, 
            Channel channel, 
            String queueType) {
        
        Timer.Sample sample = Timer.start();
        
        try {
            log.debug("알림 메시지 처리 시작: eventId={}, queueType={}, redelivered={}", 
                alarmEvent.getEventId(), queueType, redelivered);

            // 1. 메시지 유효성 검증
            if (!validateAlarmEvent(alarmEvent)) {
                log.warn("유효하지 않은 알림 이벤트: eventId={}", alarmEvent.getEventId());
                acknowledgeMessage(channel, deliveryTag); // 유효하지 않은 메시지는 ACK 처리
                return;
            }

            // 2. AlarmResponse 변환
            AlarmResponse alarmResponse = convertToAlarmResponse(alarmEvent);

            // 3. SSE를 통한 실시간 알림 전송
            alarmEventService.sendNotification(alarmEvent.getReceiverId(), alarmResponse);

            // 4. 성공 처리
            acknowledgeMessage(channel, deliveryTag);
            consumedCounter.increment();
            
            log.info("알림 메시지 처리 완료: eventId={}, receiverId={}, queueType={}", 
                alarmEvent.getEventId(), alarmEvent.getReceiverId(), queueType);

        } catch (Exception e) {
            handleProcessingError(alarmEvent, deliveryTag, channel, e, queueType);
        } finally {
            sample.stop(processingTimer);
        }
    }

    /**
     * 알림 이벤트 유효성 검증
     */
    private boolean validateAlarmEvent(AlarmEvent alarmEvent) {
        return alarmEvent != null 
            && alarmEvent.getReceiverId() != null 
            && alarmEvent.getTitle() != null 
            && !alarmEvent.getTitle().trim().isEmpty()
            && alarmEvent.getAlarmType() != null;
    }

    /**
     * AlarmEvent를 AlarmResponse로 변환
     */
    private AlarmResponse convertToAlarmResponse(AlarmEvent alarmEvent) {
        return AlarmResponse.builder()
            .id(alarmEvent.getRelId()) // 실제 알림 ID는 별도 생성 로직 필요
            .title(alarmEvent.getTitle())
            .content(alarmEvent.getContent())
            .alarmType(alarmEvent.getAlarmType())
            .readStatus(false) // 신규 알림은 읽지 않음 상태
            .createdAt(alarmEvent.getTimestamp())
            .build();
    }

    /**
     * 메시지 처리 오류 핸들링
     */
    private void handleProcessingError(
            AlarmEvent alarmEvent, 
            long deliveryTag, 
            Channel channel, 
            Exception error, 
            String queueType) {
        
        processingFailedCounter.increment();
        log.error("알림 메시지 처리 실패: eventId={}, queueType={}, 오류={}", 
            alarmEvent.getEventId(), queueType, error.getMessage(), error);

        try {
            // 최대 재시도 횟수 확인
            if (alarmEvent.isMaxRetryReached()) {
                log.warn("최대 재시도 횟수 도달, DLQ로 이동: eventId={}, retryCount={}", 
                    alarmEvent.getEventId(), alarmEvent.getRetryCount());
                acknowledgeMessage(channel, deliveryTag); // ACK 처리하여 DLQ로 이동
            } else {
                // 재시도 메시지 발행
                boolean retryPublished = alarmMessagePublisher.publishRetryEvent(alarmEvent);
                
                if (retryPublished) {
                    acknowledgeMessage(channel, deliveryTag); // 재시도 메시지 발행 성공 시 ACK
                    log.info("재시도 메시지 발행 성공: eventId={}", alarmEvent.getEventId());
                } else {
                    rejectMessage(channel, deliveryTag); // 재시도 발행 실패 시 REJECT
                    log.error("재시도 메시지 발행 실패: eventId={}", alarmEvent.getEventId());
                }
            }
        } catch (Exception e) {
            log.error("메시지 처리 오류 핸들링 중 예외: eventId={}, 오류={}", 
                alarmEvent.getEventId(), e.getMessage(), e);
            
            // 마지막 수단: REJECT (재큐잉 방지)
            rejectMessage(channel, deliveryTag);
        }
    }

    /**
     * 메시지 ACK 처리
     */
    private void acknowledgeMessage(Channel channel, long deliveryTag) {
        try {
            channel.basicAck(deliveryTag, false);
        } catch (Exception e) {
            log.error("메시지 ACK 처리 실패: deliveryTag={}, 오류={}", deliveryTag, e.getMessage(), e);
        }
    }

    /**
     * 메시지 REJECT 처리 (재큐잉 방지)
     */
    private void rejectMessage(Channel channel, long deliveryTag) {
        try {
            channel.basicReject(deliveryTag, false); // requeue=false로 설정하여 DLQ로 이동
        } catch (Exception e) {
            log.error("메시지 REJECT 처리 실패: deliveryTag={}, 오류={}", deliveryTag, e.getMessage(), e);
        }
    }

    /**
     * 처리 통계 조회 (모니터링용)
     */
    public ProcessingStats getProcessingStats() {
        return ProcessingStats.builder()
            .totalConsumed((long) consumedCounter.count())
            .totalFailed((long) processingFailedCounter.count())
            .averageProcessingTime(processingTimer.mean(java.util.concurrent.TimeUnit.MILLISECONDS))
            .build();
    }

    /**
     * 처리 통계 DTO
     */
    @lombok.Builder
    @lombok.Getter
    public static class ProcessingStats {
        private final Long totalConsumed;
        private final Long totalFailed;
        private final Double averageProcessingTime;
        
        public Double getSuccessRate() {
            long total = totalConsumed + totalFailed;
            return total > 0 ? (double) totalConsumed / total * 100 : 0.0;
        }
    }
}