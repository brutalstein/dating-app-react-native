package org.api.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.api.backend.dto.OnboardingRequest;
import org.api.backend.dto.PhotoUpdateRequest;
import org.api.backend.entity.User;
import org.api.backend.service.AbuseProtectionService;
import org.api.backend.service.AuthService;
import org.api.backend.service.TooManyRequestsException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {
    private final AuthService authService;
    private final AbuseProtectionService abuseProtectionService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user, HttpServletRequest request) {
        String ip = resolveClientIp(request);
        String email = user != null ? user.getEmail() : null;
        abuseProtectionService.checkAuthBackoff(ip, email);
        try {
            String message = authService.register(user);
            abuseProtectionService.clearAuthFailures(ip, email);
            return ResponseEntity.ok(Map.of("message", message));
        } catch (TooManyRequestsException e) {
            return handleBackoff("register", ip, email, e);
        } catch (Exception e) {
            return handleAuthFailure("register", ip, email, e);
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verify(@RequestBody Map<String, String> req, HttpServletRequest request) {
        String ip = resolveClientIp(request);
        String email = req.get("email");
        abuseProtectionService.checkAuthBackoff(ip, email);
        try {
            String code = req.get("code");
            String token = authService.verifyCode(email, code);
            abuseProtectionService.clearAuthFailures(ip, email);
            return ResponseEntity.ok(Map.of("token", token, "message", "Email verified successfully."));
        } catch (TooManyRequestsException e) {
            return handleBackoff("verify", ip, email, e);
        } catch (Exception e) {
            return handleAuthFailure("verify", ip, email, e);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> req, HttpServletRequest request) {
        String ip = resolveClientIp(request);
        String email = req.get("email");
        abuseProtectionService.checkAuthBackoff(ip, email);
        try {
            String password = req.get("password");
            String token = authService.login(email, password);
            abuseProtectionService.clearAuthFailures(ip, email);
            return ResponseEntity.ok(Map.of("token", token, "message", "Login successful."));
        } catch (TooManyRequestsException e) {
            return handleBackoff("login", ip, email, e);
        } catch (Exception e) {
            return handleAuthFailure("login", ip, email, e);
        }
    }

    @PostMapping("/resend-code")
    public ResponseEntity<?> resendCode(@RequestBody Map<String, String> req, HttpServletRequest request) {
        String ip = resolveClientIp(request);
        String email = req.get("email");
        abuseProtectionService.checkAuthBackoff(ip, email);
        try {
            authService.sendVerificationCode(email);
            abuseProtectionService.clearAuthFailures(ip, email);
            return ResponseEntity.ok(Map.of("message", "A new verification code has been sent."));
        } catch (TooManyRequestsException e) {
            return handleBackoff("resend-code", ip, email, e);
        } catch (Exception e) {
            return handleAuthFailure("resend-code", ip, email, e);
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<?> profile(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        try {
            return ResponseEntity.ok(authService.getProfile(authorizationHeader));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/onboarding")
    public ResponseEntity<?> completeOnboarding(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @RequestBody OnboardingRequest request
    ) {
        try {
            return ResponseEntity.ok(authService.completeOnboarding(authorizationHeader, request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/profile/photos")
    public ResponseEntity<?> updateProfilePhotos(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @RequestBody PhotoUpdateRequest request
    ) {
        try {
            return ResponseEntity.ok(authService.updateProfilePhotos(authorizationHeader, request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    private ResponseEntity<?> handleBackoff(String action, String ip, String email, TooManyRequestsException e) {
        log.warn("event=auth_backoff_blocked action={} ip={} email={} retryAfterSeconds={}", action, ip, email, e.getRetryAfterSeconds());
        throw e;
    }

    private ResponseEntity<?> handleAuthFailure(String action, String ip, String email, Exception e) {
        abuseProtectionService.registerAuthFailure(ip, email);

        String errorMessage = (e.getMessage() == null || e.getMessage().isBlank())
                ? "Authentication request failed."
                : e.getMessage();
        if (isExpectedAuthFailure(errorMessage)) {
            log.info("event=auth_failed_expected action={} ip={} email={} error={}", action, ip, email, errorMessage);
        } else {
            log.warn("event=auth_failed action={} ip={} email={} error={}", action, ip, email, errorMessage);
        }

        return ResponseEntity.badRequest().body(Map.of("message", errorMessage));
    }

    private boolean isExpectedAuthFailure(String errorMessage) {
        if (errorMessage == null || errorMessage.isBlank()) {
            return false;
        }

        String normalized = errorMessage.trim().toLowerCase(Locale.ROOT);
        return normalized.contains("invalid email or password")
                || normalized.contains("no account found")
                || normalized.contains("pending email verification")
                || normalized.contains("not verified")
                || normalized.contains("verification code is invalid")
                || normalized.contains("verification code has expired")
                || normalized.contains("already verified")
                || normalized.contains("no pending registration found")
                || normalized.contains("please provide a valid university email");
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
}
