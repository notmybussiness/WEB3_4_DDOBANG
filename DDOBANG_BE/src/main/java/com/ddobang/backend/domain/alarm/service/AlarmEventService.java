package com.ddobang.backend.domain.alarm.service;

import java.io.IOException;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.ddobang.backend.domain.alarm.dto.response.AlarmResponse;
import com.ddobang.backend.domain.alarm.event.AlarmEvent;
import com.ddobang.backend.domain.alarm.exception.AlarmErrorCode;
import com.ddobang.backend.domain.alarm.exception.SseException;
import com.ddobang.backend.domain.alarm.infra.EmitterRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlarmEventService {
	private final EmitterRepository emitterRepository;
	private final Optional<AlarmMessagePublisher> alarmMessagePublisher; // RabbitMQ 사용 가능 시에만 주입
	
	@Value("${custom.sse.timeout}")
	private Long sseTimeout;

	// SSE 연결 수립 (구독)
	public SseEmitter subscribe(Long userId) {
		log.info("사용자 {}의 SSE 구독 시작", userId);

		// 기존 연결이 있으면 제거
		emitterRepository.remove(userId);

		// 새 이미터 생성 (1시간 타임아웃)
		SseEmitter emitter = new SseEmitter(sseTimeout);

		// 완료, 타임아웃, 에러 발생 시 이미터 제거 및 로깅
		emitter.onCompletion(() -> {
			log.info("사용자 {}의 SSE 연결 완료", userId);
			emitterRepository.remove(userId);
		});

		emitter.onTimeout(() -> {
			log.warn("사용자 {}의 SSE 연결 타임아웃", userId);
			emitterRepository.remove(userId);
			throw new SseException(AlarmErrorCode.SSE_TIMEOUT);
		});

		emitter.onError((e) -> {
			log.error("사용자 {}의 SSE 연결 오류: {}", userId, e.getMessage());
			emitterRepository.remove(userId);
			if (e instanceof IOException) {
				throw new SseException(AlarmErrorCode.SSE_CONNECTION_ERROR, (IOException)e);
			}
		});

		// 이미터 저장
		emitterRepository.save(userId, emitter);

		// 연결 성공 이벤트 전송
		try {
			emitter.send(SseEmitter.event()
				.id("connect")
				.name("connect")
				.data("연결이 성공적으로 수립되었습니다."));
			log.info("사용자 {}에게 SSE 연결 확인 이벤트 전송", userId);
		} catch (IOException e) {
			log.error("사용자 {}에게 SSE 연결 확인 이벤트 전송 실패: {}", userId, e.getMessage());
			emitterRepository.remove(userId);
			throw new SseException(AlarmErrorCode.SSE_CONNECTION_ERROR, e);
		}

		return emitter;
	}

	// 알림 이벤트 전송
	public void sendNotification(Long userId, AlarmResponse alarm) {
		log.info("사용자 {}에게 알림 전송 시도: {}", userId, alarm.getTitle());
		try {
			emitterRepository.sendToUser(
				userId,
				alarm,
				"alarm",
				alarm.getId().toString()
			);
		} catch (SseException e) {
			log.error("알림 전송 중 오류 발생: {}", e.getMessage());
			// 여기서는 예외를 전파하지 않고 로깅만 수행
			// 알림 전송 실패가 비즈니스 로직 전체를 중단시키지 않도록 함
		}
	}

	/**
	 * RabbitMQ를 통한 비동기 알림 전송
	 * 
	 * @param alarmEvent 알림 이벤트
	 * @return 발행 성공 여부
	 */
	public boolean sendNotificationAsync(AlarmEvent alarmEvent) {
		log.info("비동기 알림 전송 시도: receiverId={}, title={}", 
			alarmEvent.getReceiverId(), alarmEvent.getTitle());

		// RabbitMQ가 활성화된 경우 메시지 큐를 통한 비동기 처리
		if (alarmMessagePublisher.isPresent()) {
			boolean published = alarmMessagePublisher.get().publishAlarmEvent(alarmEvent);
			
			if (published) {
				log.info("RabbitMQ를 통한 비동기 알림 발행 성공: eventId={}", alarmEvent.getEventId());
				return true;
			} else {
				log.warn("RabbitMQ 발행 실패, 직접 SSE 전송으로 fallback: eventId={}", alarmEvent.getEventId());
				return fallbackToDirectSse(alarmEvent);
			}
		} else {
			// RabbitMQ가 없는 경우 직접 SSE 전송
			log.debug("RabbitMQ 미활성화, 직접 SSE 전송: receiverId={}", alarmEvent.getReceiverId());
			return fallbackToDirectSse(alarmEvent);
		}
	}

	/**
	 * RabbitMQ 실패 시 직접 SSE 전송으로 fallback
	 */
	private boolean fallbackToDirectSse(AlarmEvent alarmEvent) {
		try {
			AlarmResponse alarmResponse = AlarmResponse.builder()
				.id(alarmEvent.getRelId())
				.title(alarmEvent.getTitle())
				.content(alarmEvent.getContent())
				.alarmType(alarmEvent.getAlarmType())
				.readStatus(false)
				.createdAt(alarmEvent.getTimestamp())
				.build();

			sendNotification(alarmEvent.getReceiverId(), alarmResponse);
			log.info("직접 SSE 전송 성공: receiverId={}", alarmEvent.getReceiverId());
			return true;
			
		} catch (Exception e) {
			log.error("직접 SSE 전송 실패: receiverId={}, 오류={}", 
				alarmEvent.getReceiverId(), e.getMessage(), e);
			return false;
		}
	}

	/**
	 * 알림 전송 방식 자동 선택
	 * - RabbitMQ 활성화: 비동기 처리
	 * - RabbitMQ 비활성화: 직접 SSE 전송
	 */
	public boolean sendNotificationSmart(AlarmEvent alarmEvent) {
		return sendNotificationAsync(alarmEvent);
	}

	// 활성 연결 수 조회 (모니터링용)
	public int getActiveConnectionCount() {
		return emitterRepository.getActiveConnectionCount();
	}

	/**
	 * RabbitMQ 활성화 상태 확인
	 */
	public boolean isRabbitMQEnabled() {
		return alarmMessagePublisher.isPresent();
	}
}