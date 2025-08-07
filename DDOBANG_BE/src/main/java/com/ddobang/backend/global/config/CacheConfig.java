package com.ddobang.backend.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * CacheConfig
 * Redis 기반 캐싱 설정
 * @author 100minha
 */
@EnableCaching
@Configuration
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
        
        // Key-Value Serializer 설정
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        
        template.afterPropertiesSet();
        return template;
    }

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        // 기본 캐시 설정
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
