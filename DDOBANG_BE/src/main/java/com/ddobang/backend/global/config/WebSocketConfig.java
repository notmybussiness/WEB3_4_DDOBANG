package com.ddobang.backend.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

// TODO: 채팅 기능 구현 시 주석 해제
// import com.ddobang.backend.domain.chat.handler.ChatPreHandler;
// import com.ddobang.backend.domain.chat.interceptor.JwtChannelInterceptor;

// import lombok.RequiredArgsConstructor;

/**
 * WebSocket 설정 클래스 (임시 비활성화)
 * 
 * STOMP 프로토콜을 사용한 실시간 채팅 시스템
 * - 파티별 그룹 채팅
 * - 1:1 개인 채팅
 * - JWT 기반 인증
 * - 메시지 영속성 (RabbitMQ와 연동)
 */
@Configuration
@EnableWebSocketMessageBroker
// @RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    // TODO: 채팅 핸들러 구현 후 주석 해제
    // private final JwtChannelInterceptor jwtChannelInterceptor;
    // private final ChatPreHandler chatPreHandler;

    /**
     * STOMP 엔드포인트 등록
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry
            .addEndpoint("/ws/chat")
            .setAllowedOriginPatterns("*") // CORS 허용
            .withSockJS(); // SockJS 폴백 지원
    }

    /**
     * 메시지 브로커 설정
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // 클라이언트에서 서버로 메시지 발송 시 prefix
        registry.setApplicationDestinationPrefixes("/app");
        
        // 서버에서 클라이언트로 메시지 발송 시 prefix
        registry.enableSimpleBroker("/topic", "/queue");
        
        // 개인 메시지 prefix
        registry.setUserDestinationPrefix("/user");

        // RabbitMQ 사용 시 (운영환경)
        // registry.enableStompBrokerRelay("/topic", "/queue")
        //     .setRelayHost("localhost")
        //     .setRelayPort(61613)
        //     .setClientLogin("guest")
        //     .setClientPasscode("guest");
    }

    /**
     * 클라이언트 인바운드 채널 설정 (임시 비활성화)
     */
    @Override
    public void configureClientInboundChannel(org.springframework.messaging.simp.config.ChannelRegistration registration) {
        // TODO: 채팅 인터셉터 구현 후 주석 해제
        // registration.interceptors(jwtChannelInterceptor);
        // registration.setInterceptors(chatPreHandler);
    }
}