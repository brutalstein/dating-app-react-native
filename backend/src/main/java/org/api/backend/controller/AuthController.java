package org.api.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.api.backend.dto.OnboardingRequest;
import org.api.backend.dto.PhotoUpdateRequest;
import org.api.backend.entity.User;
import org.api.backend.service.AbuseProtectionService;
import org.api.backend.service.AuthService;
import org.api.backend.service.TooManyRequestsException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

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
            throw e;
        } catch (Exception e) {
            abuseProtectionService.registerAuthFailure(ip, email);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
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
            throw e;
        } catch (Exception e) {
            abuseProtectionService.registerAuthFailure(ip, email);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
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
            throw e;
        } catch (Exception e) {
            abuseProtectionService.registerAuthFailure(ip, email);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
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
            throw e;
        } catch (Exception e) {
            abuseProtectionService.registerAuthFailure(ip, email);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
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
