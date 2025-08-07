# Phase 2: Redis 캐싱 최적화 구현

## 구현 배경

Phase 1에서 측정한 성능 기준선 분석 결과:
- 평균 응답시간: 4-8ms (우수)
- Redis 캐싱 적용 시 예상 개선: 50-70%
- 주요 대상: 지역, 테마, 파티 목록 조회 API

## Redis 캐싱 구현

### 1. 의존성 및 설정

#### 기존 설정 확인
```gradle
// build.gradle - 이미 존재
implementation 'org.springframework.boot:spring-boot-starter-data-redis'
```

#### application.yml 설정 추가
```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
      timeout: 2000ms
      lettuce:
        pool:
          max-active: 8
          max-idle: 8
          min-idle: 0
          max-wait: -1ms

custom:
  cache:
    ttl:
      regions: 3600    # 지역 데이터 캐시 TTL (1시간)
      themes: 1800     # 테마 데이터 캐시 TTL (30분)  
      parties: 300     # 파티 목록 캐시 TTL (5분)
```

### 2. 캐시 설정 클래스 구현

#### CacheConfig.java 개선
```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Value("${custom.cache.ttl.regions:3600}")
    private long regionsCacheTtl;

    @Value("${custom.cache.ttl.themes:1800}")
    private long themesCacheTtl;

    @Value("${custom.cache.ttl.parties:300}")
    private long partiesCacheTtl;

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        
        // Serializer 설정
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        
        return template;
    }

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer()));

        // 캐시별 TTL 설정
        Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();
        cacheConfigurations.put("regions", defaultConfig.entryTtl(Duration.ofSeconds(regionsCacheTtl)));
        cacheConfigurations.put("themes", defaultConfig.entryTtl(Duration.ofSeconds(themesCacheTtl)));
        cacheConfigurations.put("parties", defaultConfig.entryTtl(Duration.ofSeconds(partiesCacheTtl)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigurations)
                .build();
    }
}
```

### 3. 서비스 계층 캐싱 적용

#### RegionService 캐싱
```java
@Service
@RequiredArgsConstructor
public class RegionService {

    @Cacheable(value = "regions", key = "#majorRegion")
    public List<SubRegionsResponse> getSubRegionsByMajorRegion(String majorRegion) {
        // 데이터베이스 조회 로직
        return regionRepository.findSubRegionsByMajorRegion(majorRegion);
    }

    @Cacheable(value = "regions", key = "'region-' + #id")
    public Region findById(Long id) {
        return regionRepository.findById(id)
            .orElseThrow(() -> new RegionException(RegionErrorCode.REGION_NOT_FOUND));
    }
}
```

#### ThemeService 캐싱 확장
```java
@Service
@RequiredArgsConstructor
public class ThemeService {

    // 기존 캐싱 확장
    @Cacheable(value = "themes", key = "#filterRequest.toString() + '-' + #page + '-' + #size")
    public SliceDto<ThemesResponse> getThemesWithFilter(ThemeFilterRequest filterRequest, int page, int size) {
        // 데이터베이스 조회 로직
    }

    @Cacheable(value = "themes", key = "'detail-' + #id")
    public ThemeDetailResponse getThemeWithStat(Long id) {
        // 테마 상세 조회 로직
    }

    @Cacheable(value = "themes", key = "'all-tags'")
    public List<ThemeTagResponse> getAllThemeTags() {
        return themeTagService.getAllTags();
    }

    // 기존 스케줄링 기반 캐시 초기화 유지
    @Scheduled(cron = "0 0 0 * * *")
    @CacheEvict(cacheNames = {"popularThemesByTag", "newestThemesByTag"}, allEntries = true)
    public void clearThemeCachesDaily() {
        log.info("매일 자정 캐시 초기화 완료");
    }
}
```

#### PartyService 캐싱
```java
@Service
@RequiredArgsConstructor
public class PartyService {

    @Cacheable(value = "parties", key = "'upcoming'")
    public List<PartyMainResponse> getUpcomingParties() {
        List<Party> parties = partyRepository.findTop12ByStatusOrderByScheduledAtAsc(PartyStatus.RECRUITING);
        return parties.stream().map(PartyMainResponse::from).collect(Collectors.toList());
    }
    
    // 참고: 동적 데이터는 짧은 TTL(5분) 적용
}
```

## 캐싱 전략 분석

### 1. 캐시 키 설계 원칙

#### 고유성 보장
```java
// 단일 매개변수
@Cacheable(value = "regions", key = "#majorRegion")

// 복합 키 생성
@Cacheable(value = "themes", key = "#filterRequest.toString() + '-' + #page + '-' + #size")

// 접두사 활용
@Cacheable(value = "regions", key = "'region-' + #id")
```

#### TTL 차별화 전략
- **정적 데이터**: 1시간 (지역 정보)
- **준정적 데이터**: 30분 (테마 정보)  
- **동적 데이터**: 5분 (파티 목록)

### 2. 캐시 적용 대상 선정

#### 적용 대상
✅ 읽기 빈도가 높은 API
✅ 데이터 변경 빈도가 낮은 조회
✅ 복잡한 쿼리나 조인이 필요한 조회
✅ 외부 API 호출이나 무거운 연산

#### 적용 제외 대상
❌ 실시간 데이터 (알림, 메시지)
❌ 사용자별 개인화 데이터
❌ 빈번한 업데이트가 발생하는 데이터
❌ 단순한 단일 테이블 조회

## 테스트 환경 설정

### application-test.yml 설정
```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
      timeout: 2000ms

custom:
  cache:
    ttl:
      regions: 3600
      themes: 1800
      parties: 300
```

## 성능 개선 예상 효과

### 기준선 대비 예상 개선
| API 엔드포인트 | 현재 평균 | 캐싱 후 예상 | 개선율 |
|----------------|-----------|-------------|--------|
| `/api/v1/regions` | 4.5ms | 1-2ms | 60-70% |
| `/api/v1/themes` | 5.5ms | 2-3ms | 50-60% |
| `/api/v1/parties` | 4.8ms | 2-3ms | 40-50% |

### 시스템 부하 감소 효과
- **데이터베이스 부하**: 캐시 히트율에 따라 50-80% 감소
- **응답 시간 안정성**: 편차 감소로 일관된 성능 제공
- **동시 처리 능력**: DB 병목 해소로 처리량 향상

## 모니터링 포인트

### 1. 캐시 효율성 지표
- 캐시 히트율 (Hit Rate)
- 캐시 미스율 (Miss Rate)  
- 평균 응답 시간 개선률

### 2. Redis 성능 지표
- 메모리 사용량
- 키 만료 및 정리 상태
- 연결 풀 사용률

### 3. 비즈니스 영향 지표
- API 응답 시간 분포
- 동시 사용자 처리 능력
- 시스템 안정성 개선

## 다음 단계

### Phase 2C: 성능 검증
1. Redis 서버 시작 및 애플리케이션 구동
2. 캐시 워밍업 후 성능 측정
3. 캐시 히트/미스 비율 분석
4. 실제 개선 효과 검증

### 추가 최적화 방향
1. 캐시 워밍업 전략 구현
2. 캐시 무효화 정책 세분화
3. Redis Cluster 구성 검토 (고가용성)
4. 캐시 모니터링 대시보드 구축

## 기술적 의의

이번 Redis 캐싱 구현을 통해 다음과 같은 기술적 역량을 입증했다:

1. **캐싱 설계 능력**: 데이터 특성에 따른 차별화된 TTL 설정
2. **성능 최적화 전문성**: 측정 기반 개선 접근법
3. **스프링 생태계 활용**: Spring Cache 추상화와 Redis 통합
4. **모니터링 인프라**: 성능 개선 효과의 정량적 검증

다음 Phase에서는 실제 성능 개선 효과를 측정하여 이론적 예상치를 검증할 예정이다.