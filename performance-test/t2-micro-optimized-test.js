import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// 커스텀 메트릭 정의
export const errorRate = new Rate('errors');
export const memoryUsage = new Trend('memory_usage');

// t2.micro 최적화 테스트 옵션
export const options = {
  scenarios: {
    // 시나리오 1: 일반 사용자 패턴 (읽기 중심)
    normal_users: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 5 },   // 워밍업
        { duration: '3m', target: 15 },  // 일반 부하
        { duration: '2m', target: 25 },  // 피크 시간
        { duration: '1m', target: 15 },  // 안정화
        { duration: '1m', target: 0 },   // 종료
      ],
      gracefulRampDown: '30s',
    },
    
    // 시나리오 2: 메모리 스트레스 테스트
    memory_stress: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      startTime: '8m', // normal_users 완료 후 시작
    },
    
    // 시나리오 3: 스파이크 테스트
    spike_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '10s', target: 50 }, // 급격한 증가
        { duration: '30s', target: 50 }, // 유지
        { duration: '10s', target: 0 },  // 급격한 감소
      ],
      startTime: '11m', // memory_stress 완료 후 시작
    }
  },
  
  thresholds: {
    // t2.micro 환경에 맞춘 임계값
    'http_req_duration': ['p(95)<800'], // 95%의 요청이 800ms 이하 (여유있게 설정)
    'http_req_failed': ['rate<0.05'],   // 에러율 5% 미만 (관대하게 설정)
    'errors': ['rate<0.05'],
    'http_req_duration{scenario:normal_users}': ['p(95)<500'],
    'http_req_duration{scenario:spike_test}': ['p(95)<1500'], // 스파이크 시 더 관대
  },
};

const BASE_URL = 'http://backend:8080'; // Docker 네트워크 내부 통신

// 실제 사용 패턴을 반영한 테스트 데이터
const testData = {
  regions: [1, 2, 3, 4, 5], // 서울, 부산, 대구, 인천, 광주
  searchKeywords: ['강남', '홍대', '건대', '신촌', '명동'],
  partyData: {
    themeId: 1,
    title: '메모리 최적화 테스트 파티',
    content: 't2.micro 환경 테스트를 위한 파티',
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    participantsNeeded: 3,
    totalParticipants: 4,
    rookieAvailable: true
  }
};

// JWT 토큰 캐시 (메모리 효율성)
let cachedToken = null;
let tokenExpiry = 0;

function getAuthToken() {
  // 토큰 재사용으로 메모리 절약
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  
  const loginResponse = http.get(`${BASE_URL}/api/v1/test/jwt`);
  
  if (loginResponse.status === 200) {
    cachedToken = loginResponse.json('token');
    tokenExpiry = Date.now() + (14 * 60 * 1000); // 14분 후 만료
    return cachedToken;
  }
  
  console.error('토큰 획득 실패:', loginResponse.status);
  errorRate.add(1);
  return null;
}

export default function () {
  const scenario = __ENV.SCENARIO || 'normal_users';
  
  // 시나리오별 다른 동작 패턴
  if (scenario === 'memory_stress') {
    memoryStressTest();
  } else if (scenario === 'spike_test') {
    spikeTest();
  } else {
    normalUserTest();
  }
}

function normalUserTest() {
  // 1. 공개 API 테스트 (캐시 활용)
  let response = http.get(`${BASE_URL}/api/v1/regions`);
  check(response, {
    '지역 목록 조회 성공': (r) => r.status === 200,
    '지역 API 응답시간 < 300ms': (r) => r.timings.duration < 300,
  });
  errorRate.add(response.status !== 200);
  
  sleep(Math.random() * 2 + 1); // 1-3초 랜덤 대기
  
  // 2. 테마 목록 조회 (페이징)
  const page = Math.floor(Math.random() * 3); // 0-2 페이지
  response = http.get(`${BASE_URL}/api/v1/themes?page=${page}&size=10`);
  check(response, {
    '테마 목록 조회 성공': (r) => r.status === 200,
    '테마 API 응답시간 < 400ms': (r) => r.timings.duration < 400,
  });
  errorRate.add(response.status !== 200);
  
  sleep(Math.random() * 3 + 1); // 1-4초 랜덤 대기
  
  // 3. 파티 목록 검색 (지역별)
  const regionId = testData.regions[Math.floor(Math.random() * testData.regions.length)];
  response = http.get(`${BASE_URL}/api/v1/parties?regionId=${regionId}&page=0&size=15`);
  check(response, {
    '파티 검색 성공': (r) => r.status === 200,
    '파티 검색 응답시간 < 600ms': (r) => r.timings.duration < 600,
  });
  errorRate.add(response.status !== 200);
  
  // 4. 인증 필요 작업 (20% 확률)
  if (Math.random() < 0.2) {
    authenticatedActions();
  }
  
  sleep(Math.random() * 5 + 2); // 2-7초 대기
}

function authenticatedActions() {
  const token = getAuthToken();
  if (!token) return;
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  // 내 정보 조회
  let response = http.get(`${BASE_URL}/api/v1/members/me`, { headers });
  check(response, {
    '내 정보 조회 성공': (r) => r.status === 200,
    '내 정보 응답시간 < 400ms': (r) => r.timings.duration < 400,
  });
  errorRate.add(response.status !== 200);
  
  // 파티 생성 (5% 확률로만)
  if (Math.random() < 0.05) {
    response = http.post(
      `${BASE_URL}/api/v1/parties`,
      JSON.stringify(testData.partyData),
      { headers }
    );
    
    check(response, {
      '파티 생성 응답': (r) => r.status === 201 || r.status === 400 || r.status === 404,
      '파티 생성 응답시간 < 1000ms': (r) => r.timings.duration < 1000,
    });
    errorRate.add(response.status >= 500);
  }
}

function memoryStressTest() {
  // 메모리 집약적 작업
  for (let i = 0; i < 5; i++) {
    // 대용량 데이터 요청
    let response = http.get(`${BASE_URL}/api/v1/parties?page=${i}&size=50`);
    check(response, {
      '대용량 데이터 응답': (r) => r.status === 200,
      '메모리 스트레스 응답시간 < 1200ms': (r) => r.timings.duration < 1200,
    });
    errorRate.add(response.status !== 200);
    
    sleep(0.5);
  }
  
  // 인증 토큰을 자주 갱신하여 메모리 압박
  const token = getAuthToken();
  if (token) {
    const headers = { 'Authorization': `Bearer ${token}` };
    
    // 여러 API 동시 호출
    const responses = http.batch([
      ['GET', `${BASE_URL}/api/v1/members/me`, null, { headers }],
      ['GET', `${BASE_URL}/api/v1/regions`, null, {}],
      ['GET', `${BASE_URL}/api/v1/themes?page=0&size=20`, null, {}],
    ]);
    
    responses.forEach((response, index) => {
      check(response, {
        [`배치 요청 ${index} 성공`]: (r) => r.status === 200,
      });
      errorRate.add(response.status !== 200);
    });
  }
  
  sleep(1);
}

function spikeTest() {
  // 빠른 연속 요청으로 CPU/메모리 스파이크 테스트
  const endpoints = [
    '/api/v1/regions',
    '/api/v1/themes?page=0&size=10',
    '/api/v1/parties?page=0&size=10',
    '/actuator/health'
  ];
  
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const response = http.get(`${BASE_URL}${endpoint}`);
  
  check(response, {
    '스파이크 테스트 응답': (r) => r.status === 200,
    '스파이크 응답시간 < 2000ms': (r) => r.timings.duration < 2000,
  });
  errorRate.add(response.status !== 200);
  
  // 매우 짧은 대기시간으로 부하 증가
  sleep(0.1);
}

// 셋업: 기본 데이터 확인
export function setup() {
  console.log('t2.micro 최적화 부하테스트 시작...');
  
  // 헬스체크로 서버 준비 확인
  const healthResponse = http.get(`${BASE_URL}/actuator/health`);
  if (healthResponse.status !== 200) {
    console.error('서버가 준비되지 않았습니다.');
    return null;
  }
  
  return {
    startTime: Date.now(),
    serverReady: true
  };
}

// 테어다운: 결과 요약
export function teardown(data) {
  if (data && data.startTime) {
    const duration = (Date.now() - data.startTime) / 1000;
    console.log(`테스트 완료 - 총 소요시간: ${duration}초`);
  }
  console.log('t2.micro 최적화 부하테스트 완료');
}