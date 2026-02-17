package org.api.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.api.backend.entity.User;
import org.api.backend.service.AbuseProtectionService;
import org.api.backend.service.TooManyRequestsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class ApiRateLimitFilter extends OncePerRequestFilter {

    private final AbuseProtectionService abuseProtectionService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path == null || !path.startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String scope = resolveScope(request);
        String key = resolveRateLimitKey(request);

        try {
            abuseProtectionService.enforceHttpRateLimit(scope, key);
            filterChain.doFilter(request, response);
        } catch (TooManyRequestsException e) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.setHeader("Retry-After", String.valueOf(e.getRetryAfterSeconds()));
            response.getWriter().write("{\"status\":429,\"error\":\"TOO_MANY_REQUESTS\",\"message\":\"" + escape(e.getMessage()) + "\",\"retryAfterSeconds\":" + e.getRetryAfterSeconds() + "}");
        }
    }

    private String resolveScope(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();

        if (path.startsWith("/api/auth/")) {
            return "AUTH";
        }

        if (path.startsWith("/api/explore-hub") && "GET".equalsIgnoreCase(method)) {
            return "EXPLORE_HUB";
        }

        if ((path.startsWith("/api/likes/") && "POST".equalsIgnoreCase(method))
                || (path.startsWith("/api/conversations/") && path.endsWith("/read") && "POST".equalsIgnoreCase(method))
                || (path.startsWith("/api/recommendations/") && "POST".equalsIgnoreCase(method))) {
            return "CRITICAL";
        }

        return "DEFAULT";
    }

    private String resolveRateLimitKey(HttpServletRequest request) {
        String userKey = resolveUserKey();
        if (!"anon".equals(userKey)) {
            return "user:" + userKey;
        }
        return "ip:" + resolveClientIp(request);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    private String resolveUserKey() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return "anon";
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof User user && user.getId() != null) {
            return user.getId().toString();
        }

        return String.valueOf(authentication.getName());
    }

    private String escape(String raw) {
        return raw.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
