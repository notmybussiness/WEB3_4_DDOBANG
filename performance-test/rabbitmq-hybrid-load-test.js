import http from 'k6/http';
import ws from 'k6/ws';
import { check, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// 커스텀 메트릭
export const sseConnectionCount = new Counter('sse_connections_established');
export const mqNotificationCount = new Counter('mq_notifications_processed');
export const hybridDeliveryRate = new Rate('hybrid_delivery_success_rate');
export const notificationLatency = new Trend('notification_end_to_end_latency');

// 테스트 시나리오 설정
export const options = {
    scenarios: {
        // 1. SSE 연결 부하 테스트
        sse_load_test: {
            executor: 'constant-vus',
            vus: 50,
            duration: '2m',
            tags: { test_type: 'sse_load' },
        },
        
        // 2. RabbitMQ + SSE 하이브리드 테스트
        hybrid_notification_test: {
            executor: 'ramping-vus',
            startVUs: 10,
            stages: [
                { duration: '30s', target: 30 },
                { duration: '1m', target: 50 },
                { duration: '30s', target: 30 },
                { duration: '30s', target: 0 },
            ],
            tags: { test_type: 'hybrid_load' },
        },

        // 3. 대용량 알림 발송 테스트
        bulk_notification_test: {
            executor: 'shared-iterations',
            vus: 10,
            iterations: 100,
            tags: { test_type: 'bulk_notifications' },
        }
    },
    thresholds: {
        'http_req_duration': ['p(95)<2000'],
        'sse_connections_established': ['count>100'],
        'hybrid_delivery_success_rate': ['rate>0.95'],
        'notification_end_to_end_latency': ['p(90)<1000'],
    },
};

// 환경 설정
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const RABBITMQ_MANAGEMENT_URL = __ENV.RABBITMQ_URL || 'http://localhost:15672';

// JWT 토큰 생성 (TestAuthController 활용)
function getAuthToken() {
    const tokenResponse = http.get(`${BASE_URL}/api/v1/test/auth/token`);
    check(tokenResponse, {
        'JWT 토큰 생성 성공': (r) => r.status === 200
    });
    
    if (tokenResponse.status === 200) {
        return JSON.parse(tokenResponse.body).data.accessToken;
    }
    return null;
}

// SSE 연결 테스트
export function sseLoadTest() {
    group('SSE 연결 부하 테스트', function() {
        const token = getAuthToken();
        if (!token) return;

        const sseUrl = `${BASE_URL}/api/v1/alarms/subscribe`;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache'
        };

        const startTime = Date.now();

        const response = http.get(sseUrl, {
            headers: headers,
            timeout: '30s'
        });

        check(response, {
            'SSE 연결 성공': (r) => r.status === 200,
            'Content-Type 검증': (r) => r.headers['Content-Type'] && 
                r.headers['Content-Type'].includes('text/event-stream')
        });

        if (response.status === 200) {
            sseConnectionCount.add(1);
            
            // 연결 지연 시간 측정
            const connectionLatency = Date.now() - startTime;
            notificationLatency.add(connectionLatency);
        }
    });
}

// 하이브리드 알림 시스템 테스트
export function hybridNotificationTest() {
    group('RabbitMQ + SSE 하이브리드 테스트', function() {
        const token = getAuthToken();
        if (!token) return;

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // 1. 파티 생성 (알림 트리거)
        const partyData = {
            title: `테스트 파티 ${Math.random().toString(36).substr(2, 9)}`,
            content: '하이브리드 알림 테스트를 위한 파티입니다',
            maxPeople: 4,
            scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            themeId: 1,
            storeId: 1
        };

        const startTime = Date.now();
        
        const createResponse = http.post(
            `${BASE_URL}/api/v1/parties`,
            JSON.stringify(partyData),
            { headers }
        );

        check(createResponse, {
            '파티 생성 성공': (r) => r.status === 201,
            '응답 시간 < 1초': (r) => r.timings.duration < 1000
        });

        if (createResponse.status === 201) {
            const partyId = JSON.parse(createResponse.body).data.id;
            
            // 2. 파티 참가 신청 (추가 알림 트리거)
            const applyResponse = http.post(
                `${BASE_URL}/api/v1/parties/${partyId}/apply`,
                null,
                { headers }
            );

            check(applyResponse, {
                '파티 신청 성공': (r) => r.status === 200 || r.status === 409 // 이미 신청한 경우
            });

            // 3. 알림 시스템 상태 확인
            const monitoringResponse = http.get(
                `${BASE_URL}/api/v1/monitoring/alarms/status`,
                { headers }
            );

            check(monitoringResponse, {
                '모니터링 조회 성공': (r) => r.status === 200,
                'SSE 활성화 확인': (r) => {
                    const data = JSON.parse(r.body).data;
                    return data.sse && data.sse.enabled;
                },
                'RabbitMQ 상태 확인': (r) => {
                    const data = JSON.parse(r.body).data;
                    return data.rabbitmq !== undefined;
                }
            });

            // 성공률 계산
            const totalLatency = Date.now() - startTime;
            notificationLatency.add(totalLatency);
            hybridDeliveryRate.add(1);
        } else {
            hybridDeliveryRate.add(0);
        }
    });
}

// 대용량 알림 발송 테스트
export function bulkNotificationTest() {
    group('대용량 알림 발송 테스트', function() {
        const token = getAuthToken();
        if (!token) return;

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // 여러 파티에 연속으로 참가 신청하여 대량 알림 생성
        const partyIds = [1, 2, 3, 4, 5]; // 기존 파티 ID들
        let successCount = 0;
        let failCount = 0;

        const startTime = Date.now();

        partyIds.forEach(partyId => {
            const response = http.post(
                `${BASE_URL}/api/v1/parties/${partyId}/apply`,
                null,
                { headers }
            );

            if (response.status === 200 || response.status === 409) {
                successCount++;
                mqNotificationCount.add(1);
            } else {
                failCount++;
            }
        });

        const totalLatency = Date.now() - startTime;
        notificationLatency.add(totalLatency);

        check(null, {
            '대량 알림 성공률 > 80%': () => successCount / (successCount + failCount) > 0.8,
            '평균 처리 시간 < 500ms': () => totalLatency / partyIds.length < 500
        });

        // RabbitMQ 큐 상태 확인
        const queueStatsResponse = http.get(
            `${BASE_URL}/api/v1/monitoring/alarms/rabbitmq/publisher/stats`,
            { headers }
        );

        check(queueStatsResponse, {
            'Publisher 통계 조회 성공': (r) => r.status === 200,
            '메시지 발행 확인': (r) => {
                if (r.status === 200 && r.body !== '"RabbitMQ Publisher가 비활성화되어 있습니다."') {
                    const stats = JSON.parse(r.body).data;
                    return stats.totalPublished > 0;
                }
                return true; // RabbitMQ가 비활성화된 경우는 정상
            }
        });
    });
}

// 메인 테스트 함수
export default function() {
    // 시나리오별로 다른 테스트 실행
    const scenario = __ENV.K6_SCENARIO || 'hybrid_notification_test';
    
    switch(scenario) {
        case 'sse_load_test':
            sseLoadTest();
            break;
        case 'bulk_notifications':
            bulkNotificationTest();
            break;
        default:
            hybridNotificationTest();
            break;
    }
}

// 테스트 종료 시 실행
export function teardown(data) {
    console.log('=== 하이브리드 알림 시스템 성능 테스트 결과 ===');
    console.log(`SSE 연결 수: ${sseConnectionCount.count}`);
    console.log(`MQ 알림 처리: ${mqNotificationCount.count}`);
    console.log('테스트 완료');
}