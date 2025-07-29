package com.ddobang.backend.domain.alarm.infra;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.ddobang.backend.domain.alarm.exception.AlarmErrorCode;
import com.ddobang.backend.domain.alarm.exception.SseException;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class EmitterRepository {
	// 사용자 ID를 키로, SseEmitter를 값으로 저장하는 맵
	private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();
	
	// Metrics
	private final Counter connectionCounter;
	private final Counter connectionFailedCounter;
	private final Counter notificationSentCounter;
	private final Counter notificationFailedCounter;
	
	public EmitterRepository(MeterRegistry meterRegistry) {
		this.connectionCounter = Counter.builder("sse.connections.created")
				.description("Total number of SSE connections created")
				.register(meterRegistry);
		this.connectionFailedCounter = Counter.builder("sse.connections.failed")
				.description("Total number of failed SSE connections")
				.register(meterRegistry);
		this.notificationSentCounter = Counter.builder("notifications.sent")
				.description("Total number of notifications sent")
				.register(meterRegistry);
		this.notificationFailedCounter = Counter.builder("notifications.failed")
				.description("Total number of failed notification attempts")
				.register(meterRegistry);
		
		// SSE 연결 수를 실시간으로 추적하는 Gauge
		Gauge.builder("sse.connections.active", this, EmitterRepository::getActiveConnectionCount)
			.description("Number of active SSE connections")
			.register(meterRegistry);
	}

	// 새로운 SseEmitter 등록
	public SseEmitter save(Long userId, SseEmitter emitter) {
		emitters.put(userId, emitter);
		connectionCounter.increment();
		log.info("SSE 연결 저장 완료 - 사용자 ID: {}", userId);
		return emitter;
	}

	// 특정 사용자의 SseEmitter 조회
	public SseEmitter get(Long userId) {
		return emitters.get(userId);
	}

	// 특정 사용자의 SseEmitter 제거
	public void remove(Long userId) {
		SseEmitter removed = emitters.remove(userId);
		if (removed != null) {
			log.info("SSE 연결 제거 완료 - 사용자 ID: {}", userId);
		}
	}

	// 특정 사용자에게 이벤트 전송
	public void sendToUser(Long userId, Object data, String eventName, String id) {
		SseEmitter emitter = this.get(userId);
		if (emitter != null) {
			try {
				emitter.send(SseEmitter.event()
					.id(id)
					.name(eventName)
					.data(data));
				notificationSentCounter.increment();
				log.debug("사용자 {}에게 이벤트 전송 성공: {}", userId, eventName);
			} catch (IOException e) {
				notificationFailedCounter.increment();
				log.error("사용자 {}에게 이벤트 전송 실패: {}", userId, e.getMessage());
				this.remove(userId);
				throw new SseException(AlarmErrorCode.SSE_SEND_ERROR, e);
			}
		} else {
			notificationFailedCounter.increment();
			log.warn("사용자 {}의 SSE 연결을 찾을 수 없음", userId);
		}
	}

	// 연결된 모든 사용자 수 반환
	public int getActiveConnectionCount() {
		return emitters.size();
	}
}