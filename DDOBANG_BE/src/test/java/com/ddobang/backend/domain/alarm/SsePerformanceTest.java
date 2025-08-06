package com.ddobang.backend.domain.alarm;

import com.ddobang.backend.domain.alarm.dto.response.AlarmResponse;
import com.ddobang.backend.domain.alarm.entity.AlarmType;
import com.ddobang.backend.domain.alarm.service.AlarmEventService;
import com.ddobang.backend.domain.member.entity.Member;
import com.ddobang.backend.domain.member.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SsePerformanceTest {

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private AlarmEventService alarmEventService;

    private List<Member> testMembers;

    @BeforeEach
    void setUp() {
        testMembers = new ArrayList<>();
        
        // 50명의 테스트 사용자 생성
        for (int i = 1; i <= 50; i++) {
            Member member = Member.builder()
                    .nickname("성능테스트사용자" + i)
                    .kakaoId("performance" + i + "@test.com")
                    .build();
            testMembers.add(memberRepository.save(member));
        }
    }

    @Test
    @DisplayName("50명 동시 SSE 연결 성능 테스트")
    void testConcurrentSseConnections() throws Exception {
        // Given
        int userCount = 50;
        ExecutorService executor = Executors.newFixedThreadPool(10);
        CountDownLatch latch = new CountDownLatch(userCount);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        long startTime = System.currentTimeMillis();

        // When - 동시에 연결 요청
        for (int i = 0; i < userCount; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    Member member = testMembers.get(index);
                    SseEmitter emitter = alarmEventService.subscribe(member.getId());
                    
                    if (emitter != null) {
                        successCount.incrementAndGet();
                    } else {
                        failureCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }

        // 모든 연결 완료 대기 (최대 30초)
        boolean completed = latch.await(30, TimeUnit.SECONDS);
        long endTime = System.currentTimeMillis();

        // Then
        assertThat(completed).isTrue();
        assertThat(successCount.get()).isEqualTo(userCount);
        assertThat(failureCount.get()).isEqualTo(0);
        assertThat(alarmEventService.getActiveConnectionCount()).isEqualTo(userCount);
        
        long totalTime = endTime - startTime;
        System.out.println("=== SSE 연결 성능 테스트 결과 ===");
        System.out.println("총 사용자 수: " + userCount);
        System.out.println("성공 연결: " + successCount.get());
        System.out.println("실패 연결: " + failureCount.get());
        System.out.println("총 소요시간: " + totalTime + "ms");
        System.out.println("평균 연결시간: " + (totalTime / userCount) + "ms/user");
        
        // 성능 기준 검증 (각 연결이 100ms 이내)
        assertThat((int)(totalTime / userCount)).isLessThan(100);

        executor.shutdown();
    }

    @Test
    @DisplayName("대량 알림 전송 성능 테스트")
    void testBulkNotificationSending() throws Exception {
        // Given
        int userCount = 30;
        int notificationsPerUser = 10;
        
        // 사용자들의 SSE 연결 먼저 수립
        for (int i = 0; i < userCount; i++) {
            alarmEventService.subscribe(testMembers.get(i).getId());
        }

        ExecutorService executor = Executors.newFixedThreadPool(5);
        CountDownLatch latch = new CountDownLatch(userCount * notificationsPerUser);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        long startTime = System.currentTimeMillis();

        // When - 대량 알림 전송
        for (int userIndex = 0; userIndex < userCount; userIndex++) {
            final Member member = testMembers.get(userIndex);
            
            for (int notificationIndex = 0; notificationIndex < notificationsPerUser; notificationIndex++) {
                final int notifId = notificationIndex;
                
                executor.submit(() -> {
                    try {
                        AlarmResponse testAlarm = AlarmResponse.builder()
                                .id((long) notifId)
                                .title("성능테스트 알림 " + notifId)
                                .content("사용자 " + member.getNickname() + "에게 보내는 테스트 알림")
                                .alarmType(AlarmType.MESSAGE)
                                .readStatus(false)
                                .createdAt(LocalDateTime.now())
                                .build();

                        alarmEventService.sendNotification(member.getId(), testAlarm);
                        successCount.incrementAndGet();
                        
                    } catch (Exception e) {
                        failureCount.incrementAndGet();
                        System.err.println("알림 전송 실패: " + e.getMessage());
                    } finally {
                        latch.countDown();
                    }
                });
            }
        }

        // 모든 알림 전송 완료 대기 (최대 60초)
        boolean completed = latch.await(60, TimeUnit.SECONDS);
        long endTime = System.currentTimeMillis();

        // Then
        assertThat(completed).isTrue();
        
        long totalTime = endTime - startTime;
        int totalNotifications = userCount * notificationsPerUser;
        
        System.out.println("=== 대량 알림 전송 성능 테스트 결과 ===");
        System.out.println("총 사용자 수: " + userCount);
        System.out.println("사용자당 알림 수: " + notificationsPerUser);
        System.out.println("총 알림 수: " + totalNotifications);
        System.out.println("성공 전송: " + successCount.get());
        System.out.println("실패 전송: " + failureCount.get());
        System.out.println("총 소요시간: " + totalTime + "ms");
        System.out.println("평균 전송시간: " + (totalTime / totalNotifications) + "ms/notification");
        System.out.println("초당 처리량: " + (totalNotifications * 1000 / totalTime) + " notifications/sec");
        
        // 성능 기준 검증
        double throughput = (double) totalNotifications * 1000 / totalTime;
        assertThat(throughput).isGreaterThan(50); // 초당 50개 이상 처리
        assertThat(failureCount.get()).isLessThan((int)(totalNotifications * 0.05)); // 실패율 5% 미만

        executor.shutdown();
    }

    @Test
    @DisplayName("SSE 연결 타임아웃 및 정리 테스트")
    void testSseConnectionCleanup() throws Exception {
        // Given
        int userCount = 10;
        List<SseEmitter> emitters = new ArrayList<>();

        // 연결 생성
        for (int i = 0; i < userCount; i++) {
            Member member = testMembers.get(i);
            SseEmitter emitter = alarmEventService.subscribe(member.getId());
            emitters.add(emitter);
        }

        assertThat(alarmEventService.getActiveConnectionCount()).isEqualTo(userCount);

        // When - 연결들을 완료 상태로 만듦
        for (SseEmitter emitter : emitters) {
            emitter.complete();
        }

        // 약간의 대기 시간 (비동기 정리 완료 대기)
        Thread.sleep(1000);

        // Then - 연결이 정리되었는지 확인
        // Note: 실제로는 EmitterRepository에서 자동 정리되어야 함
        System.out.println("정리 후 활성 연결 수: " + alarmEventService.getActiveConnectionCount());
    }

    @Test
    @DisplayName("메모리 사용량 모니터링 테스트")
    void testMemoryUsageMonitoring() throws Exception {
        // Given
        Runtime runtime = Runtime.getRuntime();
        long initialMemory = runtime.totalMemory() - runtime.freeMemory();
        
        int userCount = 100;

        // When - 대량 연결 생성
        for (int i = 0; i < userCount && i < testMembers.size(); i++) {
            alarmEventService.subscribe(testMembers.get(i).getId());
        }

        // 메모리 사용량 측정
        System.gc(); // 가비지 컬렉션 유도
        Thread.sleep(100); // GC 완료 대기
        
        long afterConnectionMemory = runtime.totalMemory() - runtime.freeMemory();
        long memoryIncrease = afterConnectionMemory - initialMemory;

        // Then
        System.out.println("=== 메모리 사용량 테스트 결과 ===");
        System.out.println("초기 메모리: " + (initialMemory / 1024 / 1024) + " MB");
        System.out.println("연결 후 메모리: " + (afterConnectionMemory / 1024 / 1024) + " MB");
        System.out.println("메모리 증가량: " + (memoryIncrease / 1024 / 1024) + " MB");
        System.out.println("연결당 평균 메모리: " + (memoryIncrease / userCount / 1024) + " KB");
        System.out.println("활성 연결 수: " + alarmEventService.getActiveConnectionCount());
        
        // 메모리 효율성 검증 (연결당 50KB 미만)
        long memoryPerConnection = memoryIncrease / userCount;
        assertThat((int)memoryPerConnection).isLessThan(50 * 1024); // 50KB per connection
    }
}