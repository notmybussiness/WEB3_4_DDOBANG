package com.ddobang.backend.domain.alarm.event;

import java.time.LocalDateTime;
import java.util.UUID;

import com.ddobang.backend.domain.alarm.entity.AlarmType;
import com.ddobang.backend.global.event.DomainEvent;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Builder;
import lombok.Getter;
import lombok.ToString;

/**
 * 알림 이벤트 도메인 모델
 * 
 * RabbitMQ 메시지로 발행되는 알림 이벤트를 표현
 * - 직렬화/역직렬화 지원 (JSON)
 * - 메시지 큐를 통한 비동기 처리
 * - SSE 실시간 알림과 연동
 */
@Getter
@ToString
@Builder
public class AlarmEvent implements DomainEvent {
    
    // 이벤트 메타데이터
    @Builder.Default
    private final String eventId = UUID.randomUUID().toString();  // 고유 이벤트 ID
    @Builder.Default
    private final LocalDateTime timestamp = LocalDateTime.now();  // 이벤트 발생 시각
    
    // 알림 데이터
    private final Long receiverId;         // 수신자 ID
    private final String title;            // 알림 제목
    private final String content;          // 알림 내용
    private final AlarmType alarmType;     // 알림 유형 (enum)
    private final Long relId;              // 관련 엔티티 ID (파티, 메시지 등)
    private final String relUrl;           // 관련 URL
    
    // 처리 메타데이터
    @Builder.Default
    private final Integer retryCount = 0;  // 재시도 횟수
    @Builder.Default
    private final Integer priority = 3;    // 우선순위 (1: 높음, 5: 낮음)

    /**
     * Jackson 역직렬화용 생성자
     */
    @JsonCreator
    public AlarmEvent(
            @JsonProperty("eventId") String eventId,
            @JsonProperty("timestamp") LocalDateTime timestamp,
            @JsonProperty("receiverId") Long receiverId,
            @JsonProperty("title") String title,
            @JsonProperty("content") String content,
            @JsonProperty("alarmType") AlarmType alarmType,
            @JsonProperty("relId") Long relId,
            @JsonProperty("relUrl") String relUrl,
            @JsonProperty("retryCount") Integer retryCount,
            @JsonProperty("priority") Integer priority) {
        this.eventId = eventId != null ? eventId : UUID.randomUUID().toString();
        this.timestamp = timestamp != null ? timestamp : LocalDateTime.now();
        this.receiverId = receiverId;
        this.title = title;
        this.content = content;
        this.alarmType = alarmType;
        this.relId = relId;
        this.relUrl = relUrl;
        this.retryCount = retryCount != null ? retryCount : 0;
        this.priority = priority != null ? priority : 3; // 기본 우선순위: 보통
    }

    /**
     * DomainEvent 인터페이스 구현
     */
    @Override
    public String getEventType() {
        return "ALARM_EVENT";
    }

    /**
     * 재시도용 이벤트 생성
     */
    public AlarmEvent withRetry() {
        return AlarmEvent.builder()
                .eventId(this.eventId)
                .timestamp(LocalDateTime.now()) // 재시도 시점으로 갱신
                .receiverId(this.receiverId)
                .title(this.title)
                .content(this.content)
                .alarmType(this.alarmType)
                .relId(this.relId)
                .relUrl(this.relUrl)
                .retryCount(this.retryCount + 1)
                .priority(this.priority)
                .build();
    }

    /**
     * 높은 우선순위 이벤트인지 확인
     */
    public boolean isHighPriority() {
        return this.priority <= 2;
    }

    /**
     * 최대 재시도 횟수 도달 여부 확인
     */
    public boolean isMaxRetryReached() {
        return this.retryCount >= 3; // 최대 3회 재시도
    }

    /**
     * 라우팅 키 생성 (RabbitMQ용)
     */
    public String getRoutingKey() {
        return String.format("notification.%s.%s", 
            alarmType.name().toLowerCase(), 
            isHighPriority() ? "high" : "normal");
    }
}