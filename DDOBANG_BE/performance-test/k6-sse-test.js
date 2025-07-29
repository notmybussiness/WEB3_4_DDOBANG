import { check, sleep } from 'k6';
import ws from 'k6/ws';
import http from 'k6/http';

// 테스트 시나리오 설정
export let options = {
  scenarios: {
    // SSE 연결 부하테스트
    sse_connections: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '1m', target: 50 },   // 1분간 50명까지
        { duration: '3m', target: 100 },  // 3분간 100명 유지
        { duration: '2m', target: 200 },  // 2분간 200명까지
        { duration: '5m', target: 200 },  // 5분간 200명 유지
        { duration: '2m', target: 0 },    // 2분간 0명으로 감소
      ],
      exec: 'sse_test',
    },
    // API 부하테스트
    api_load: {
      executor: 'constant-vus',
      vus: 20,
      duration: '10m',
      exec: 'api_test',
    },
    // 메시지 전송 부하테스트
    message_spam: {
      executor: 'constant-arrival-rate',
      rate: 10, // 초당 10개 요청
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 5,
      exec: 'message_test',
    }
  },
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%가 500ms 이하
    http_req_failed: ['rate<0.1'],    // 실패율 10% 이하
    'sse_connection_duration': ['p(90)<1000'], // SSE 연결 90%가 1초 이하
  },
};

const BASE_URL = 'http://localhost:8080/api/v1';

// SSE 연결 테스트
export function sse_test() {
  // 로그인 (JWT 토큰 획득)
  const loginResponse = login();
  if (!loginResponse) return;

  // SSE 연결 시뮬레이션
  const sseResponse = http.get(`${BASE_URL}/alarms/subscribe`, {
    headers: {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    timeout: '30s',
  });

  check(sseResponse, {
    'SSE connection established': (r) => r.status === 200,
    'SSE content type correct': (r) => r.headers['Content-Type'].includes('text/event-stream'),
  });

  sleep(Math.random() * 10 + 5); // 5-15초 대기
}

// API 부하테스트
export function api_test() {
  const loginResponse = login();
  if (!loginResponse) return;

  // 파티 목록 조회
  const partiesResponse = http.get(`${BASE_URL}/parties`);
  check(partiesResponse, {
    'parties list status': (r) => r.status === 200,
    'parties response time': (r) => r.timings.duration < 1000,
  });

  // 테마 목록 조회
  const themesResponse = http.get(`${BASE_URL}/themes`);
  check(themesResponse, {
    'themes list status': (r) => r.status === 200,
    'themes response time': (r) => r.timings.duration < 1000,
  });

  // 알림 목록 조회
  const alarmsResponse = http.get(`${BASE_URL}/alarms`);
  check(alarmsResponse, {
    'alarms list status': (r) => r.status === 200,
    'alarms response time': (r) => r.timings.duration < 500,
  });

  sleep(1);
}

// 메시지 전송 테스트
export function message_test() {
  const loginResponse = login();
  if (!loginResponse) return;

  const messagePayload = {
    receiverId: Math.floor(Math.random() * 100) + 1,
    content: `Load test message ${Date.now()}`,
  };

  const messageResponse = http.post(`${BASE_URL}/messages`, JSON.stringify(messagePayload), {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  check(messageResponse, {
    'message sent successfully': (r) => r.status === 201,
    'message response time': (r) => r.timings.duration < 300,
  });
}

// 로그인 헬퍼 함수
function login() {
  // 테스트용 카카오 로그인 시뮬레이션
  const loginData = {
    code: 'test_auth_code',
    state: 'test_state'
  };

  const response = http.post(`${BASE_URL}/auth/login`, JSON.stringify(loginData), {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return check(response, {
    'login successful': (r) => r.status === 200,
  }) ? response : null;
}

// Custom metrics
import { Trend } from 'k6/metrics';
const sseConnectionDuration = new Trend('sse_connection_duration');

export function setup() {
  console.log('Starting performance test for DDOBANG SSE & API');
  console.log(`Target: ${BASE_URL}`);
}

export function teardown() {
  console.log('Performance test completed');
}