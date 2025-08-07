import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// 커스텀 메트릭 정의
export const errorRate = new Rate('errors');

// 테스트 옵션 설정
export const options = {
  stages: [
    { duration: '2m', target: 20 }, // 2분 동안 20명까지 증가
    { duration: '5m', target: 20 }, // 5분 동안 20명 유지
    { duration: '2m', target: 40 }, // 2분 동안 40명까지 증가
    { duration: '5m', target: 40 }, // 5분 동안 40명 유지
    { duration: '2m', target: 0 },  // 2분 동안 0명까지 감소
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95%의 요청이 500ms 이하
    'http_req_failed': ['rate<0.01'],   // 에러율 1% 미만
    'errors': ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost:8080';

// 테스트 데이터
const testPartyData = {
  themeId: 1,
  title: `부하테스트 파티 ${Math.random()}`,
  content: '성능 테스트를 위한 파티입니다.',
  scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 내일
  participantsNeeded: 3,
  totalParticipants: 4,
  rookieAvailable: true
};

// JWT 토큰 획득 함수
function getAuthToken() {
  const loginResponse = http.get(`${BASE_URL}/api/v1/test/jwt`);
  
  if (loginResponse.status === 200) {
    const token = loginResponse.json('token');
    return token;
  }
  
  console.error('토큰 획득 실패:', loginResponse.status);
  return null;
}

export default function () {
  // 인증 토큰 획득
  const token = getAuthToken();
  
  if (!token) {
    errorRate.add(1);
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 1. 공개 API 테스트 - 파티 목록 조회
  let response = http.get(`${BASE_URL}/api/v1/parties?page=0&size=20`);
  check(response, {
    '파티 목록 조회 성공': (r) => r.status === 200,
    '응답 시간 < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(response.status !== 200);

  sleep(1);

  // 2. 테마 목록 조회
  response = http.get(`${BASE_URL}/api/v1/themes?page=0&size=20`);
  check(response, {
    '테마 목록 조회 성공': (r) => r.status === 200,
    '응답 시간 < 300ms': (r) => r.timings.duration < 300,
  });
  errorRate.add(response.status !== 200);

  sleep(1);

  // 3. 지역 목록 조회
  response = http.get(`${BASE_URL}/api/v1/regions`);
  check(response, {
    '지역 목록 조회 성공': (r) => r.status === 200,
    '응답 시간 < 200ms': (r) => r.timings.duration < 200,
  });
  errorRate.add(response.status !== 200);

  sleep(1);

  // 4. 인증 필요 API 테스트 - 파티 생성 (10% 확률로만 실행)
  if (Math.random() < 0.1) {
    response = http.post(
      `${BASE_URL}/api/v1/parties`,
      JSON.stringify(testPartyData),
      { headers }
    );
    
    check(response, {
      '파티 생성 응답 확인': (r) => r.status === 201 || r.status === 400 || r.status === 404,
      '파티 생성 응답 시간 < 1000ms': (r) => r.timings.duration < 1000,
    });
    
    // 400, 404는 정상적인 비즈니스 에러 (테마 없음 등)
    errorRate.add(response.status >= 500);
  }

  sleep(1);

  // 5. 내 정보 조회 (인증 필요)
  response = http.get(`${BASE_URL}/api/v1/members/me`, { headers });
  check(response, {
    '내 정보 조회 성공': (r) => r.status === 200,
    '응답 시간 < 300ms': (r) => r.timings.duration < 300,
  });
  errorRate.add(response.status !== 200);

  sleep(2);
}

// 테스트 완료 후 실행
export function teardown() {
  console.log('부하 테스트 완료');
}