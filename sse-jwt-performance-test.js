/**
 * DDOBANG SSE 성능 테스트 스크립트 (JWT 인증 버전)
 * Node.js 환경에서 실행
 */

const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';
const TEST_DURATION = 30000; // 30초
const MAX_CONNECTIONS = 100;  // 최대 동시 연결 수

class JWTSSEPerformanceTester {
    constructor() {
        this.connections = [];
        this.jwtCookies = new Map(); // 연결별 JWT 쿠키 저장
        this.metrics = {
            totalConnections: 0,
            successfulConnections: 0,
            failedConnections: 0,
            messagesReceived: 0,
            connectionDurations: [],
            authErrors: 0,
            errors: []
        };
        this.startTime = Date.now();
    }

    // JWT 토큰 생성
    async generateJWT(userId) {
        return new Promise((resolve, reject) => {
            const postData = '';
            const options = {
                hostname: 'localhost',
                port: 8080,
                path: `/api/v1/test/jwt?userId=${userId}&nickname=testuser${userId}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                
                // 쿠키 추출
                const cookies = res.headers['set-cookie'];
                let jwtCookie = '';
                if (cookies) {
                    cookies.forEach(cookie => {
                        if (cookie.includes('accessToken=')) {
                            jwtCookie += cookie.split(';')[0] + '; ';
                        }
                        if (cookie.includes('refreshToken=')) {
                            jwtCookie += cookie.split(';')[0] + '; ';
                        }
                    });
                }

                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200 && jwtCookie) {
                        console.log(`🔑 사용자 ${userId} JWT 토큰 생성 성공`);
                        resolve(jwtCookie.trim());
                    } else {
                        console.error(`❌ 사용자 ${userId} JWT 생성 실패: ${res.statusCode}`);
                        reject(new Error(`JWT generation failed: ${res.statusCode}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }

    // SSE 연결 생성 (JWT 인증)
    async createSSEConnection(connectionId) {
        return new Promise(async (resolve) => {
            const connectionStart = Date.now();
            
            try {
                // JWT 토큰 생성
                const jwtCookie = await this.generateJWT(connectionId);
                this.jwtCookies.set(connectionId, jwtCookie);

                const req = http.request({
                    hostname: 'localhost',
                    port: 8080,
                    path: '/api/v1/alarms/subscribe',
                    method: 'GET',
                    headers: {
                        'Accept': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'Cookie': jwtCookie
                    }
                }, (res) => {
                    console.log(`🔗 연결 ${connectionId}: 상태 코드 ${res.statusCode}`);
                    
                    if (res.statusCode === 200) {
                        this.metrics.successfulConnections++;
                        
                        res.on('data', (chunk) => {
                            this.metrics.messagesReceived++;
                            const message = chunk.toString().trim();
                            if (message) {
                                console.log(`📨 연결 ${connectionId}: ${message}`);
                            }
                        });
                        
                        res.on('end', () => {
                            const duration = Date.now() - connectionStart;
                            this.metrics.connectionDurations.push(duration);
                            console.log(`⏱️ 연결 ${connectionId}: 종료 (지속시간: ${duration}ms)`);
                            resolve();
                        });
                        
                    } else if (res.statusCode === 401) {
                        this.metrics.authErrors++;
                        this.metrics.failedConnections++;
                        this.metrics.errors.push(`연결 ${connectionId}: 인증 실패 (401)`);
                        resolve();
                    } else {
                        this.metrics.failedConnections++;
                        this.metrics.errors.push(`연결 ${connectionId}: HTTP ${res.statusCode}`);
                        resolve();
                    }
                });
                
                req.on('error', (error) => {
                    this.metrics.failedConnections++;
                    this.metrics.errors.push(`연결 ${connectionId}: ${error.message}`);
                    console.error(`❌ 연결 ${connectionId} 오류:`, error.message);
                    resolve();
                });
                
                req.setTimeout(35000, () => {
                    console.log(`⏰ 연결 ${connectionId}: 타임아웃`);
                    req.destroy();
                    resolve();
                });
                
                req.end();
                this.connections.push(req);

            } catch (error) {
                this.metrics.failedConnections++;
                this.metrics.errors.push(`연결 ${connectionId}: JWT 생성 실패 - ${error.message}`);
                console.error(`❌ 연결 ${connectionId} JWT 생성 오류:`, error.message);
                resolve();
            }
        });
    }

    // 서버 메트릭 수집
    async collectServerMetrics() {
        try {
            const metricsReq = http.request({
                hostname: 'localhost',
                port: 8080,
                path: '/actuator/metrics/sse.connections.active',
                method: 'GET'
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const metrics = JSON.parse(data);
                        console.log(`📊 서버 활성 SSE 연결 수: ${metrics.measurements[0].value}`);
                        
                        // 추가 메트릭 수집
                        this.collectAdditionalMetrics();
                    } catch (e) {
                        console.error('메트릭 파싱 오류:', e.message);
                    }
                });
            });
            
            metricsReq.on('error', (error) => {
                console.error('메트릭 수집 오류:', error.message);
            });
            
            metricsReq.end();
        } catch (error) {
            console.error('메트릭 수집 실패:', error.message);
        }
    }

    // 추가 메트릭 수집 
    collectAdditionalMetrics() {
        // JVM 메모리 사용량
        const memoryReq = http.request({
            hostname: 'localhost',
            port: 8080,
            path: '/actuator/metrics/jvm.memory.used',
            method: 'GET'
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const metrics = JSON.parse(data);
                    const memoryMB = (metrics.measurements[0].value / 1024 / 1024).toFixed(1);
                    console.log(`💾 JVM 메모리 사용량: ${memoryMB}MB`);
                } catch (e) {
                    console.error('메모리 메트릭 파싱 오류:', e.message);
                }
            });
        });
        memoryReq.on('error', () => {});
        memoryReq.end();

        // 알림 전송 메트릭
        const notificationReq = http.request({
            hostname: 'localhost',
            port: 8080,
            path: '/actuator/metrics/notifications.sent',
            method: 'GET'
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const metrics = JSON.parse(data);
                    console.log(`📤 총 알림 전송 수: ${metrics.measurements[0].value}`);
                } catch (e) {
                    console.error('알림 메트릭 파싱 오류:', e.message);
                }
            });
        });
        notificationReq.on('error', () => {});
        notificationReq.end();
    }

    // 성능 테스트 실행
    async runTest() {
        console.log('🚀 DDOBANG JWT SSE 성능 테스트 시작');
        console.log(`📋 설정: 최대 ${MAX_CONNECTIONS}개 연결, ${TEST_DURATION/1000}초 지속`);
        console.log('─'.repeat(60));

        // 초기 서버 상태 확인
        await this.collectServerMetrics();

        // 점진적으로 연결 수 증가 (10개씩 배치)
        const connectionPromises = [];
        
        for (let batch = 0; batch < Math.ceil(MAX_CONNECTIONS / 10); batch++) {
            const batchStart = batch * 10 + 1;
            const batchEnd = Math.min((batch + 1) * 10, MAX_CONNECTIONS);
            
            console.log(`📦 배치 ${batch + 1}: 연결 ${batchStart}-${batchEnd} 생성 중...`);
            
            for (let i = batchStart; i <= batchEnd; i++) {
                this.metrics.totalConnections++;
                connectionPromises.push(this.createSSEConnection(i));
            }
            
            // 배치 간 200ms 대기
            if (batchEnd < MAX_CONNECTIONS) {
                await new Promise(resolve => setTimeout(resolve, 200));
                await this.collectServerMetrics();
            }
        }

        console.log('⏳ 모든 연결 설정 완료 대기 중...');
        
        // 테스트 종료까지 주기적으로 메트릭 수집
        const metricsInterval = setInterval(() => {
            this.collectServerMetrics();
        }, 3000);

        // 지정된 시간 후 연결 종료
        setTimeout(() => {
            console.log('🛑 테스트 종료 - 모든 연결 닫는 중...');
            clearInterval(metricsInterval);
            
            this.connections.forEach(req => {
                try {
                    req.destroy();
                } catch (e) {
                    // 이미 닫힌 연결 무시
                }
            });
            
            // 결과 출력
            setTimeout(() => this.printResults(), 2000);
            
        }, TEST_DURATION);

        // Promise 대기 (실제로는 타임아웃에 의해 종료됨)
        await Promise.allSettled(connectionPromises);
    }

    // 결과 출력
    printResults() {
        const totalDuration = Date.now() - this.startTime;
        const avgConnectionDuration = this.metrics.connectionDurations.length > 0
            ? this.metrics.connectionDurations.reduce((a, b) => a + b, 0) / this.metrics.connectionDurations.length
            : 0;

        console.log('');
        console.log('📈 === JWT SSE 성능 테스트 결과 ===');
        console.log('─'.repeat(60));
        console.log(`⏱️  총 테스트 시간: ${totalDuration / 1000}초`);
        console.log(`🔗 총 연결 시도: ${this.metrics.totalConnections}개`);
        console.log(`✅ 성공한 연결: ${this.metrics.successfulConnections}개`);
        console.log(`❌ 실패한 연결: ${this.metrics.failedConnections}개`);
        console.log(`🔒 인증 오류: ${this.metrics.authErrors}개`);
        console.log(`📊 성공률: ${((this.metrics.successfulConnections / this.metrics.totalConnections) * 100).toFixed(1)}%`);
        console.log(`📨 수신한 메시지: ${this.metrics.messagesReceived}개`);
        console.log(`⏰ 평균 연결 지속시간: ${avgConnectionDuration.toFixed(0)}ms`);
        
        if (this.metrics.errors.length > 0) {
            console.log('');
            console.log('🚨 오류 목록 (최근 10개):');
            this.metrics.errors.slice(-10).forEach(error => console.log(`   - ${error}`));
        }

        console.log('');
        console.log('🎯 === 성능 평가 ===');
        if (this.metrics.successfulConnections >= MAX_CONNECTIONS * 0.9) {
            console.log('✅ 우수: 90% 이상 연결 성공');
        } else if (this.metrics.successfulConnections >= MAX_CONNECTIONS * 0.7) {
            console.log('⚠️  보통: 70% 이상 연결 성공');
        } else {
            console.log('❌ 개선 필요: 70% 미만 연결 성공');
        }

        // 최종 서버 메트릭 수집
        setTimeout(() => {
            this.collectServerMetrics();
            console.log('');
            console.log('테스트 완료! 추가 메트릭:');
            console.log('- 서버 메트릭: http://localhost:8080/actuator/metrics');
            console.log('- 프로메테우스: http://localhost:8080/actuator/prometheus');
        }, 2000);
    }
}

// 테스트 실행
if (require.main === module) {
    const tester = new JWTSSEPerformanceTester();
    tester.runTest().catch(console.error);
}