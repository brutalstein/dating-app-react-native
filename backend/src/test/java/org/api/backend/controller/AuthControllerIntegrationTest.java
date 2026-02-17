package org.api.backend.controller;

import org.api.backend.dto.OnboardingRequest;
import org.api.backend.dto.UserProfileResponse;
import org.api.backend.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerIntegrationTest {

    @Mock
    private AuthService authService;

    private AuthController controller;

    @BeforeEach
    void setUp() {
        controller = new AuthController(authService);
    }

    @Test
    void login_returnsToken_whenCredentialsAreValid() {
        when(authService.login("alice@uni.edu.tr", "StrongPass123")).thenReturn("jwt-token");

        ResponseEntity<?> response = controller.login(Map.of("email", "alice@uni.edu.tr", "password", "StrongPass123"));

        assertEquals(200, response.getStatusCode().value());
        Map<?, ?> body = assertInstanceOf(Map.class, response.getBody());
        assertEquals("jwt-token", body.get("token"));
    }

    @Test
    void login_returnsBadRequest_whenCredentialsAreInvalid() {
        when(authService.login("alice@uni.edu.tr", "wrong")).thenThrow(new RuntimeException("Invalid email or password."));

        ResponseEntity<?> response = controller.login(Map.of("email", "alice@uni.edu.tr", "password", "wrong"));

        assertEquals(400, response.getStatusCode().value());
        Map<?, ?> body = assertInstanceOf(Map.class, response.getBody());
        assertEquals("Invalid email or password.", body.get("message"));
    }

    @Test
    void onboarding_returnsProfile_whenPayloadValid() {
        OnboardingRequest request = new OnboardingRequest(
                "2000-05-12",
                "Computer Engineering",
                "Coffee and long walks",
                "MALE",
                "FEMALE",
                List.of("Music", "Travel"),
                List.of("https://cdn/a.jpg", "https://cdn/b.jpg", "https://cdn/c.jpg")
        );

        when(authService.completeOnboarding(eq("Bearer valid-token"), any(OnboardingRequest.class)))
                .thenReturn(new UserProfileResponse(
                        "Alice",
                        "Doe",
                        "alice@uni.edu.tr",
                        "Demo Uni",
                        "Computer Engineering",
                        "2000-05-12",
                        25,
                        "Coffee and long walks",
                        "MALE",
                        "FEMALE",
                        List.of("Music", "Travel"),
                        List.of("https://cdn/a.jpg", "https://cdn/b.jpg", "https://cdn/c.jpg"),
                        true
                ));

        ResponseEntity<?> response = controller.completeOnboarding("Bearer valid-token", request);

        assertEquals(200, response.getStatusCode().value());
        UserProfileResponse body = assertInstanceOf(UserProfileResponse.class, response.getBody());
        assertEquals(true, body.onboardingCompleted());
    }

    @Test
    void onboarding_returnsBadRequest_whenPayloadInvalid() {
        OnboardingRequest request = new OnboardingRequest(
                "2012-01-01",
                null,
                null,
                "MALE",
                "FEMALE",
                List.of("Music"),
                List.of("https://cdn/a.jpg", "https://cdn/b.jpg")
        );

        when(authService.completeOnboarding(eq("Bearer valid-token"), any(OnboardingRequest.class)))
                .thenThrow(new RuntimeException("You must be at least 18 years old to use this app."));

        ResponseEntity<?> response = controller.completeOnboarding("Bearer valid-token", request);

        assertEquals(400, response.getStatusCode().value());
        Map<?, ?> body = assertInstanceOf(Map.class, response.getBody());
        assertEquals("You must be at least 18 years old to use this app.", body.get("message"));
    }
}
