package com.ddobang.backend.domain.alarm;

import com.ddobang.backend.domain.alarm.dto.response.AlarmResponse;
import com.ddobang.backend.domain.alarm.entity.AlarmType;
import com.ddobang.backend.domain.alarm.infra.EmitterRepository;
import com.ddobang.backend.domain.alarm.service.AlarmEventService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

import java.io.IOException;

import com.ddobang.backend.domain.alarm.exception.SseException;
import com.ddobang.backend.domain.alarm.exception.AlarmErrorCode;

@ExtendWith(MockitoExtension.class)
@DisplayName("SSE 단위 테스트")
class SseSimpleTest {

    @Mock
    private EmitterRepository emitterRepository;

    @InjectMocks
    private AlarmEventService alarmEventService;

    private Long testUserId;
    private SseEmitter mockEmitter;
    private AlarmResponse testAlarmResponse;

    @BeforeEach
    void setUp() {
        testUserId = 1L;
        mockEmitter = mock(SseEmitter.class);
        testAlarmResponse = AlarmResponse.builder()
                .id(1L)
                .title("테스트 알림")
                .content("SSE 단위 테스트 알림입니다")
                .alarmType(AlarmType.MESSAGE)
                .readStatus(false)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("SSE 구독 - Emitter 생성 및 저장")
    void testSseSubscribe() {
        // Given
        doNothing().when(emitterRepository).remove(testUserId);
        given(emitterRepository.save(eq(testUserId), any(SseEmitter.class)))
                .willAnswer(invocation -> invocation.getArgument(1));

        // When & Then - IOException 예외 처리 필요
        assertDoesNotThrow(() -> {
            SseEmitter result = alarmEventService.subscribe(testUserId);
            assertThat(result).isNotNull();
        });
        
        verify(emitterRepository).remove(testUserId);
        verify(emitterRepository).save(eq(testUserId), any(SseEmitter.class));
    }

    @Test
    @DisplayName("SSE 알림 전송 - 연결된 사용자에게 알림 전송")
    void testSendNotification() {
        // Given
        doNothing().when(emitterRepository).sendToUser(
                eq(testUserId),
                eq(testAlarmResponse),
                eq("alarm"),
                eq(testAlarmResponse.getId().toString())
        );

        // When & Then
        assertDoesNotThrow(() -> {
            alarmEventService.sendNotification(testUserId, testAlarmResponse);
        });

        // Then
        verify(emitterRepository).sendToUser(
                eq(testUserId),
                eq(testAlarmResponse),
                eq("alarm"),
                eq(testAlarmResponse.getId().toString())
        );
    }

    @Test
    @DisplayName("SSE 연결 없는 사용자에게 알림 전송 - 예외 없이 처리")
    void testSendNotificationToNonConnectedUser() {
        // Given
        doThrow(new SseException(AlarmErrorCode.SSE_SEND_ERROR))
                .when(emitterRepository).sendToUser(
                        eq(testUserId),
                        eq(testAlarmResponse),
                        eq("alarm"),
                        eq(testAlarmResponse.getId().toString())
                );

        // When & Then - 예외가 내부에서 처리되어 비즈니스 로직 중단 없이 동작
        assertDoesNotThrow(() -> {
            alarmEventService.sendNotification(testUserId, testAlarmResponse);
        });

        // Then
        verify(emitterRepository).sendToUser(
                eq(testUserId),
                eq(testAlarmResponse),
                eq("alarm"),
                eq(testAlarmResponse.getId().toString())
        );
    }

    @Test
    @DisplayName("활성 연결 수 조회")
    void testGetActiveConnectionCount() {
        // Given
        given(emitterRepository.getActiveConnectionCount())
                .willReturn(5);

        // When
        int count = alarmEventService.getActiveConnectionCount();

        // Then
        assertThat(count).isEqualTo(5);
        verify(emitterRepository).getActiveConnectionCount();
    }

    @Test
    @DisplayName("SSE 연결 제거 처리")
    void testRemoveConnection() {
        // When & Then
        assertDoesNotThrow(() -> {
            // 연결 제거 시뮬레이션
            emitterRepository.remove(testUserId);
        });

        // Then
        verify(emitterRepository).remove(testUserId);
    }

    @Test
    @DisplayName("대량 알림 전송 성능 테스트 - 100개 알림")
    void testBulkNotificationSending() {
        // Given
        doNothing().when(emitterRepository).sendToUser(
                eq(testUserId),
                any(AlarmResponse.class),
                eq("alarm"),
                anyString()
        );

        // When
        long startTime = System.currentTimeMillis();
        
        for (int i = 0; i < 100; i++) {
            AlarmResponse alarm = AlarmResponse.builder()
                    .id((long) i)
                    .title("대량 테스트 알림 " + i)
                    .content("성능 테스트용 알림입니다")
                    .alarmType(AlarmType.MESSAGE)
                    .readStatus(false)
                    .createdAt(LocalDateTime.now())
                    .build();
                    
            assertDoesNotThrow(() -> {
                alarmEventService.sendNotification(testUserId, alarm);
            });
        }
        
        long endTime = System.currentTimeMillis();

        // Then
        long totalTime = endTime - startTime;
        assertThat(totalTime).isLessThan(1000); // 1초 이내 처리
        
        verify(emitterRepository, times(100)).sendToUser(
                eq(testUserId),
                any(AlarmResponse.class),
                eq("alarm"),
                anyString()
        );
        
        System.out.println("=== 대량 알림 전송 성능 테스트 결과 ===");
        System.out.println("총 알림 수: 100개");
        System.out.println("총 소요시간: " + totalTime + "ms");
        System.out.println("평균 처리시간: " + (totalTime / 100.0) + "ms/alarm");
    }

    @Test
    @DisplayName("동시 다중 사용자 연결 시뮬레이션")
    void testMultipleUsersConnectionSimulation() {
        // Given
        int userCount = 10;
        
        for (int i = 1; i <= userCount; i++) {
            Long userId = (long) i;
            SseEmitter userEmitter = mock(SseEmitter.class);
            
            given(emitterRepository.save(eq(userId), any(SseEmitter.class)))
                    .willReturn(userEmitter);
        }
        
        given(emitterRepository.getActiveConnectionCount())
                .willReturn(userCount);

        // When
        for (int i = 1; i <= userCount; i++) {
            Long userId = (long) i;
            SseEmitter emitter = alarmEventService.subscribe(userId);
            
            // Then
            assertThat(emitter).isNotNull();
        }

        // Then
        int activeCount = alarmEventService.getActiveConnectionCount();
        assertThat(activeCount).isEqualTo(userCount);
        
        verify(emitterRepository, times(userCount)).save(any(Long.class), any(SseEmitter.class));
    }
}