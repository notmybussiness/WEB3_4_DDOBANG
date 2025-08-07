import http from 'k6/http';
import { check } from 'k6';

// 간단한 부하 테스트 설정
export const options = {
    stages: [
        { duration: '30s', target: 10 },  // 10명 동시 사용자로 증가
        { duration: '1m', target: 10 },   // 1분간 10명 유지
        { duration: '30s', target: 0 },   // 사용자 수 감소
    ],
    thresholds: {
        'http_req_duration': ['p(95)<1000'], // 95%가 1초 이내
        'http_req_failed': ['rate<0.1'],     // 실패율 10% 미만
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// JWT 토큰 생성
function getAuthToken() {
    const response = http.get(`${BASE_URL}/api/v1/test/auth/token`);
    
    check(response, {
        'JWT 토큰 생성 성공': (r) => r.status === 200
    });
    
    if (response.status === 200) {
        return JSON.parse(response.body).data.accessToken;
    }
    return null;
}

// 메인 테스트 시나리오
export default function() {
    // 1. JWT 토큰 생성
    const token = getAuthToken();
    if (!token) return;

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // 2. 기본 API 테스트
    const endpoints = [
        { name: '지역 목록', url: '/api/v1/regions' },
        { name: '테마 목록', url: '/api/v1/themes' },
        { name: '파티 목록', url: '/api/v1/parties' },
        { name: '알림 시스템 상태', url: '/api/v1/monitoring/alarms/status' }
    ];

    endpoints.forEach(endpoint => {
        const response = http.get(`${BASE_URL}${endpoint.url}`, { headers });
        
        check(response, {
            [`${endpoint.name} 응답 성공`]: (r) => r.status === 200,
            [`${endpoint.name} 응답 시간 OK`]: (r) => r.timings.duration < 1000
        });
    });

    // 3. SSE 연결 테스트 (간단 버전)
    const sseResponse = http.get(`${BASE_URL}/api/v1/alarms/subscribe`, {
        headers: {
            ...headers,
            'Accept': 'text/event-stream'
        },
        timeout: '5s'
    });

    check(sseResponse, {
        'SSE 연결 시도 성공': (r) => r.status === 200
    });
}

export function teardown(data) {
    console.log('부하 테스트 완료');
}