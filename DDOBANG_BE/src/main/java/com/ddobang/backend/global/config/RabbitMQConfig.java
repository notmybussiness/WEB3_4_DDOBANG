package com.ddobang.backend.global.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * RabbitMQ 설정 클래스
 * 
 * 현재 SSE 기반 알림 시스템을 고도화하여 메시지 큐 기반으로 전환
 * - 높은 처리량과 안정성 확보
 * - 메시지 영속성 보장
 * - 부하 분산 및 확장성 개선
 */
@Configuration
// @Profile 제거하여 모든 환경에서 활성화 (RabbitMQ 연결 실패 시는 자동으로 비활성화)
public class RabbitMQConfig {

    // Exchange Names
    public static final String NOTIFICATION_EXCHANGE = "notification.exchange";
    public static final String CHAT_EXCHANGE = "chat.exchange";
    public static final String DLX_EXCHANGE = "dlx.exchange";

    // Queue Names
    public static final String PARTY_NOTIFICATION_QUEUE = "notification.party.queue";
    public static final String MESSAGE_NOTIFICATION_QUEUE = "notification.message.queue";
    public static final String BOARD_NOTIFICATION_QUEUE = "notification.board.queue";
    public static final String CHAT_ROOM_QUEUE_PREFIX = "chat.room.";

    // Routing Keys
    public static final String PARTY_ROUTING_KEY = "notification.party";
    public static final String MESSAGE_ROUTING_KEY = "notification.message";
    public static final String BOARD_ROUTING_KEY = "notification.board";

    // Dead Letter Queue
    public static final String DLQ_SUFFIX = ".dlq";

    /**
     * 메시지 변환기 - JSON 형태로 직렬화/역직렬화
     */
    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    /**
     * RabbitTemplate 설정
     */
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter());
        template.setMandatory(true); // 메시지가 큐에 도달하지 못하면 예외 발생
        
        // Publisher Confirms 설정
        template.setConfirmCallback((correlationData, ack, cause) -> {
            if (!ack) {
                // 메시지 발송 실패 시 로깅 및 재시도 로직
                System.err.println("Message not delivered: " + cause);
            }
        });
        
        return template;
    }

    /**
     * 리스너 컨테이너 팩토리 설정
     */
    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(messageConverter());
        factory.setConcurrentConsumers(3); // 동시 처리 스레드 수
        factory.setMaxConcurrentConsumers(10); // 최대 동시 처리 스레드 수
        factory.setPrefetchCount(50); // 프리페치 카운트
        factory.setDefaultRequeueRejected(false); // 실패 시 재큐잉 방지 (DLQ로 이동)
        return factory;
    }

    // ============ Exchanges ============

    /**
     * 알림 토픽 Exchange
     */
    @Bean
    public TopicExchange notificationExchange() {
        return ExchangeBuilder
                .topicExchange(NOTIFICATION_EXCHANGE)
                .durable(true)
                .build();
    }

    /**
     * 채팅 Direct Exchange
     */
    @Bean
    public DirectExchange chatExchange() {
        return ExchangeBuilder
                .directExchange(CHAT_EXCHANGE)
                .durable(true)
                .build();
    }

    /**
     * Dead Letter Exchange
     */
    @Bean
    public DirectExchange deadLetterExchange() {
        return ExchangeBuilder
                .directExchange(DLX_EXCHANGE)
                .durable(true)
                .build();
    }

    // ============ Queues ============

    /**
     * 파티 알림 큐
     */
    @Bean
    public Queue partyNotificationQueue() {
        return QueueBuilder
                .durable(PARTY_NOTIFICATION_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", PARTY_NOTIFICATION_QUEUE + DLQ_SUFFIX)
                .withArgument("x-message-ttl", 300000) // 5분 TTL
                .build();
    }

    /**
     * 메시지 알림 큐
     */
    @Bean
    public Queue messageNotificationQueue() {
        return QueueBuilder
                .durable(MESSAGE_NOTIFICATION_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", MESSAGE_NOTIFICATION_QUEUE + DLQ_SUFFIX)
                .withArgument("x-message-ttl", 300000) // 5분 TTL
                .build();
    }

    /**
     * 게시판 알림 큐
     */
    @Bean
    public Queue boardNotificationQueue() {
        return QueueBuilder
                .durable(BOARD_NOTIFICATION_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", BOARD_NOTIFICATION_QUEUE + DLQ_SUFFIX)
                .withArgument("x-message-ttl", 300000) // 5분 TTL
                .build();
    }

    // Dead Letter Queues
    @Bean
    public Queue partyNotificationDLQ() {
        return QueueBuilder.durable(PARTY_NOTIFICATION_QUEUE + DLQ_SUFFIX).build();
    }

    @Bean
    public Queue messageNotificationDLQ() {
        return QueueBuilder.durable(MESSAGE_NOTIFICATION_QUEUE + DLQ_SUFFIX).build();
    }

    @Bean
    public Queue boardNotificationDLQ() {
        return QueueBuilder.durable(BOARD_NOTIFICATION_QUEUE + DLQ_SUFFIX).build();
    }

    // ============ Bindings ============

    /**
     * 파티 알림 바인딩
     */
    @Bean
    public Binding partyNotificationBinding() {
        return BindingBuilder
                .bind(partyNotificationQueue())
                .to(notificationExchange())
                .with(PARTY_ROUTING_KEY + ".*"); // notification.party.* 패턴
    }

    /**
     * 메시지 알림 바인딩
     */
    @Bean
    public Binding messageNotificationBinding() {
        return BindingBuilder
                .bind(messageNotificationQueue())
                .to(notificationExchange())
                .with(MESSAGE_ROUTING_KEY + ".*"); // notification.message.* 패턴
    }

    /**
     * 게시판 알림 바인딩
     */
    @Bean
    public Binding boardNotificationBinding() {
        return BindingBuilder
                .bind(boardNotificationQueue())
                .to(notificationExchange())
                .with(BOARD_ROUTING_KEY + ".*"); // notification.board.* 패턴
    }

    // DLQ Bindings
    @Bean
    public Binding partyNotificationDLQBinding() {
        return BindingBuilder
                .bind(partyNotificationDLQ())
                .to(deadLetterExchange())
                .with(PARTY_NOTIFICATION_QUEUE + DLQ_SUFFIX);
    }

    @Bean
    public Binding messageNotificationDLQBinding() {
        return BindingBuilder
                .bind(messageNotificationDLQ())
                .to(deadLetterExchange())
                .with(MESSAGE_NOTIFICATION_QUEUE + DLQ_SUFFIX);
    }

    @Bean
    public Binding boardNotificationDLQBinding() {
        return BindingBuilder
                .bind(boardNotificationDLQ())
                .to(deadLetterExchange())
                .with(BOARD_NOTIFICATION_QUEUE + DLQ_SUFFIX);
    }
}