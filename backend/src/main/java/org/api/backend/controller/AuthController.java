package org.api.backend.controller;

import lombok.RequiredArgsConstructor;
import org.api.backend.entity.User;
import org.api.backend.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {
    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<String> register(@RequestBody User user) {
        try{
            String message =  authService.register(user);
            return ResponseEntity.ok(message);
        }
        catch(Exception e){
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    @PostMapping("/verify")
    public ResponseEntity<?> verify(@RequestBody Map<String, String> req) {
        try{
            String email = req.get("email");
            String code = req.get("code");
            String token = authService.verifyCode(email, code);
            return ResponseEntity.ok(Map.of("token", token));
        }
        catch(Exception e){
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> req) {
        try {
            String email = req.get("email");
            String password = req.get("password");
            String token = authService.login(email, password);
            return ResponseEntity.ok(Map.of("token", token));
        }
        catch(Exception e){
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/resend-code")
    public ResponseEntity<String> resendCode(@RequestBody String email) {
        try{
            authService.sendVerificationCode(email);
            return ResponseEntity.ok("Yeni kod gönderildi");
        }
        catch(Exception e){
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
