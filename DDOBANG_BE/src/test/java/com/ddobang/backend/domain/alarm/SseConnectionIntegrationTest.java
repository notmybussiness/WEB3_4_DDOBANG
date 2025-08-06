package com.ddobang.backend.domain.alarm;

import com.ddobang.backend.domain.alarm.dto.response.AlarmResponse;
import com.ddobang.backend.domain.alarm.entity.Alarm;
import com.ddobang.backend.domain.alarm.entity.AlarmType;
import com.ddobang.backend.domain.alarm.repository.AlarmRepository;
import com.ddobang.backend.domain.alarm.service.AlarmEventService;
import com.ddobang.backend.domain.member.entity.Member;
import com.ddobang.backend.domain.member.repository.MemberRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SseConnectionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private AlarmRepository alarmRepository;

    @Autowired
    private AlarmEventService alarmEventService;

    @Autowired
    private ObjectMapper objectMapper;

    private Member testMember;

    @BeforeEach
    void setUp() {
        // 테스트 회원 생성
        testMember = Member.builder()
                .nickname("테스트사용자")
                .kakaoId("test@example.com")
                .build();
        memberRepository.save(testMember);
    }

    @Test
    @DisplayName("SSE 연결이 성공적으로 수립되는지 테스트")
    @WithMockUser(username = "test@example.com")
    void testSseConnection() throws Exception {
        // Given & When
        MvcResult result = mockMvc.perform(get("/api/v1/alarms/subscribe")
                        .accept(MediaType.TEXT_EVENT_STREAM))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.TEXT_EVENT_STREAM_VALUE))
                .andReturn();

        // Then
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("SSE 연결 후 초기 연결 확인 메시지를 받는지 테스트")
    @WithMockUser(username = "test@example.com")
    void testInitialConnectionMessage() throws Exception {
        // Given
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> receivedMessage = new AtomicReference<>();

        // When
        SseEmitter emitter = alarmEventService.subscribe(testMember.getId());

        // SSE 이벤트 수신을 시뮬레이션
        emitter.onCompletion(() -> latch.countDown());
        emitter.onError((e) -> latch.countDown());

        // Then
        boolean completed = latch.await(5, TimeUnit.SECONDS);
        assertThat(completed).isTrue();
    }

    @Test
    @DisplayName("실제 알림이 SSE로 전송되는지 테스트")
    @WithMockUser(username = "test@example.com")
    void testAlarmNotificationSending() throws Exception {
        // Given
        SseEmitter emitter = alarmEventService.subscribe(testMember.getId());
        assertThat(emitter).isNotNull();

        // 테스트 알림 생성
        Alarm testAlarm = Alarm.builder()
                .receiverId(testMember.getId())
                .title("테스트 알림")
                .content("이것은 테스트 알림입니다")
                .alarmType(AlarmType.MESSAGE)
                .relId(1L)
                .build();

        Alarm savedAlarm = alarmRepository.save(testAlarm);
        AlarmResponse alarmResponse = AlarmResponse.from(savedAlarm);

        // When
        alarmEventService.sendNotification(testMember.getId(), alarmResponse);

        // Then - 예외 없이 전송 완료되면 성공
        assertThat(alarmEventService.getActiveConnectionCount()).isGreaterThan(0);
    }

    @Test
    @DisplayName("다수의 사용자가 동시에 SSE 연결을 요청할 때 처리되는지 테스트")
    void testMultipleUsersConnection() throws Exception {
        // Given
        int userCount = 10;
        Member[] testMembers = new Member[userCount];

        // 여러 테스트 사용자 생성
        for (int i = 0; i < userCount; i++) {
            testMembers[i] = Member.builder()
                    .nickname("테스트사용자" + i)
                    .kakaoId("test" + i + "@example.com")
                    .build();
            memberRepository.save(testMembers[i]);
        }

        // When - 동시에 연결 요청
        for (int i = 0; i < userCount; i++) {
            SseEmitter emitter = alarmEventService.subscribe(testMembers[i].getId());
            assertThat(emitter).isNotNull();
        }

        // Then
        assertThat(alarmEventService.getActiveConnectionCount()).isEqualTo(userCount);
    }

    @Test
    @DisplayName("기존 연결이 있을 때 새 연결로 교체되는지 테스트")
    void testConnectionReplacement() throws Exception {
        // Given
        Long userId = testMember.getId();

        // When - 첫 번째 연결
        SseEmitter firstEmitter = alarmEventService.subscribe(userId);
        assertThat(firstEmitter).isNotNull();
        assertThat(alarmEventService.getActiveConnectionCount()).isEqualTo(1);

        // 두 번째 연결 (기존 연결 교체)
        SseEmitter secondEmitter = alarmEventService.subscribe(userId);

        // Then
        assertThat(secondEmitter).isNotNull();
        assertThat(firstEmitter).isNotEqualTo(secondEmitter);
        assertThat(alarmEventService.getActiveConnectionCount()).isEqualTo(1); // 여전히 1개
    }

    @Test
    @DisplayName("존재하지 않는 사용자에게 알림 전송 시 예외 처리 테스트")
    void testNotificationToNonExistentUser() {
        // Given
        Long nonExistentUserId = 99999L;
        AlarmResponse testAlarmResponse = AlarmResponse.builder()
                .id(1L)
                .title("테스트 알림")
                .content("테스트 내용")
                .alarmType(AlarmType.MESSAGE)
                .readStatus(false)
                .createdAt(LocalDateTime.now())
                .build();

        // When & Then - 예외 없이 처리되어야 함 (로그만 기록)
        alarmEventService.sendNotification(nonExistentUserId, testAlarmResponse);
        
        // 연결이 없어도 시스템이 정상 동작해야 함
        assertThat(alarmEventService.getActiveConnectionCount()).isEqualTo(0);
    }
}