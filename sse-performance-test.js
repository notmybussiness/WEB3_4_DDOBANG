/**
 * DDOBANG SSE 성능 테스트 스크립트
 * Node.js 환경에서 실행
 */

const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';
const TEST_DURATION = 30000; // 30초
const MAX_CONNECTIONS = 50;   // 최대 동시 연결 수

class SSEPerformanceTester {
    constructor() {
        this.connections = [];
        this.metrics = {
            totalConnections: 0,
            successfulConnections: 0,
            failedConnections: 0,
            messagesReceived: 0,
            connectionDurations: [],
            errors: []
        };
        this.startTime = Date.now();
    }

    // SSE 연결 생성
    createSSEConnection(connectionId) {
        return new Promise((resolve) => {
            const connectionStart = Date.now();
            
            const req = http.request({
                hostname: 'localhost',
                port: 8080,
                path: '/api/v1/alarms/subscribe',
                method: 'GET',
                headers: {
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                }
            }, (res) => {
                console.log(`🔗 연결 ${connectionId}: 상태 코드 ${res.statusCode}`);
                
                if (res.statusCode === 200) {
                    this.metrics.successfulConnections++;
                    
                    res.on('data', (chunk) => {
                        this.metrics.messagesReceived++;
                        console.log(`📨 연결 ${connectionId}: 메시지 수신 - ${chunk.toString().trim()}`);
                    });
                    
                    res.on('end', () => {
                        const duration = Date.now() - connectionStart;
                        this.metrics.connectionDurations.push(duration);
                        console.log(`⏱️ 연결 ${connectionId}: 종료 (지속시간: ${duration}ms)`);
                        resolve();
                    });
                    
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

    // 성능 테스트 실행
    async runTest() {
        console.log('🚀 DDOBANG SSE 성능 테스트 시작');
        console.log(`📋 설정: 최대 ${MAX_CONNECTIONS}개 연결, ${TEST_DURATION/1000}초 지속`);
        console.log('─'.repeat(60));

        // 서버 상태 확인
        await this.collectServerMetrics();

        // 점진적으로 연결 수 증가
        const connectionPromises = [];
        
        for (let i = 1; i <= MAX_CONNECTIONS; i++) {
            this.metrics.totalConnections++;
            
            // 연결 생성
            connectionPromises.push(this.createSSEConnection(i));
            
            // 100ms 간격으로 연결 생성
            if (i % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
                await this.collectServerMetrics();
            }
        }

        // 모든 연결이 설정될 때까지 대기 후 일정 시간 유지
        console.log('⏳ 모든 연결 설정 완료 대기 중...');
        
        // 테스트 종료까지 주기적으로 메트릭 수집
        const metricsInterval = setInterval(() => {
            this.collectServerMetrics();
        }, 2000);

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
            setTimeout(() => this.printResults(), 1000);
            
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
        console.log('📈 === SSE 성능 테스트 결과 ===');
        console.log('─'.repeat(60));
        console.log(`⏱️  총 테스트 시간: ${totalDuration / 1000}초`);
        console.log(`🔗 총 연결 시도: ${this.metrics.totalConnections}개`);
        console.log(`✅ 성공한 연결: ${this.metrics.successfulConnections}개`);
        console.log(`❌ 실패한 연결: ${this.metrics.failedConnections}개`);
        console.log(`📊 성공률: ${((this.metrics.successfulConnections / this.metrics.totalConnections) * 100).toFixed(1)}%`);
        console.log(`📨 수신한 메시지: ${this.metrics.messagesReceived}개`);
        console.log(`⏰ 평균 연결 지속시간: ${avgConnectionDuration.toFixed(0)}ms`);
        
        if (this.metrics.errors.length > 0) {
            console.log('');
            console.log('🚨 오류 목록:');
            this.metrics.errors.forEach(error => console.log(`   - ${error}`));
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
            console.log('테스트 완료! 서버를 확인하세요: http://localhost:8080/actuator/metrics');
        }, 1000);
    }
}

// 테스트 실행
if (require.main === module) {
    const tester = new SSEPerformanceTester();
    tester.runTest().catch(console.error);
}