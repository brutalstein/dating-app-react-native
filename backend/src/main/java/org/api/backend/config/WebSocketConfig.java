package org.api.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.api.backend.service.JwtService;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.security.Principal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtService jwtService;
    private final WebSocketRateLimitInterceptor webSocketRateLimitInterceptor;
    
    // Session tracking for connection limits
    private final Map<String, Integer> userSessionCount = new ConcurrentHashMap<>();
    private static final int MAX_SESSIONS_PER_USER = 3;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS()
                .setHeartbeatTime(25000);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/app");
        registry.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[]{10000, 10000})
                .setTaskExecutor(java.util.concurrent.Executors.newScheduledThreadPool(10))
                .setCacheLimit(1000);
        registry.setUserDestinationPrefix("/user");
        registry.setPreservePublishOrder(true);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.taskExecutor().corePoolSize(4).maxPoolSize(16);
        registration.interceptors(authChannelInterceptor(), webSocketRateLimitInterceptor, connectionLimitInterceptor());
    }

    private ChannelInterceptor connectionLimitInterceptor() {
        return new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    Principal principal = accessor.getUser();
                    if (principal != null) {
                        String email = principal.getName();
                        int count = userSessionCount.getOrDefault(email, 0);
                        if (count >= MAX_SESSIONS_PER_USER) {
                            log.warn("event=websocket_connection_limit_exceeded user={} sessions={}", email, count);
                            accessor.setNativeHeader("reject-reason", "Maximum session limit reached");
                            throw new RuntimeException("Maximum number of concurrent connections reached");
                        }
                    }
                } else if (StompCommand.DISCONNECT.equals(accessor.getCommand())) {
                    Principal principal = accessor.getUser();
                    if (principal != null) {
                        String email = principal.getName();
                        userSessionCount.compute(email, (k, v) -> (v == null || v <= 1) ? null : v - 1);
                    }
                }
                return message;
            }

            @Override
            public void afterSendCompletion(Message<?> message, MessageChannel channel, boolean sent, Exception ex) {
                StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
                if (StompCommand.CONNECT.equals(accessor.getCommand()) && accessor.getUser() != null) {
                    String email = accessor.getUser().getName();
                    userSessionCount.merge(email, 1, Integer::sum);
                    log.info("event=websocket_connected user={} totalSessions={}", email, userSessionCount.get(email));
                }
            }
        };
    }

    private ChannelInterceptor authChannelInterceptor() {
        return new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String auth = accessor.getFirstNativeHeader("Authorization");
                    if (auth != null && auth.startsWith("Bearer ")) {
                        String token = auth.substring(7);
                        try {
                            if (jwtService.isTokenValid(token)) {
                                String email = jwtService.extractEmail(token);
                                List<Map.Entry<String, Object>> claims = jwtService.extractAllClaims(token).entrySet()
                                        .stream()
                                        .map(e -> new java.util.AbstractMap.SimpleEntry<>(e.getKey(), (Object) e.getValue()))
                                        .toList();
                                
                                Principal principal = new UsernamePasswordAuthenticationToken(
                                        email,
                                        null,
                                        Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))
                                );
                                accessor.setUser(principal);
                                log.debug("event=websocket_authenticated user={}", email);
                            } else {
                                log.warn("event=websocket_auth_failed reason=invalid_token");
                                accessor.setNativeHeader("reject-reason", "Invalid token");
                            }
                        } catch (Exception e) {
                            log.error("event=websocket_auth_error error={}", e.getMessage());
                            accessor.setNativeHeader("reject-reason", "Authentication error: " + e.getMessage());
                        }
                    } else {
                        log.warn("event=websocket_auth_failed reason=missing_authorization_header");
                        accessor.setNativeHeader("reject-reason", "Missing authorization header");
                    }
                }
                return message;
            }
        };
    }
}
