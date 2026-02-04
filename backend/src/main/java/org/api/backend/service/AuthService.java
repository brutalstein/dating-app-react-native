package org.api.backend.service;


import lombok.RequiredArgsConstructor;
import org.api.backend.entity.University;
import org.api.backend.entity.User;
import org.api.backend.entity.VerificationCode;
import org.api.backend.repos.UniversityRepository;
import org.api.backend.repos.UserRepository;
import org.api.backend.repos.CodeRepository;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final UniversityRepository universityRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CodeRepository codeRepository;
    private final JavaMailSender mailSender;

    @Transactional
    public String register(User user){
        if (user.getEmail() == null || !user.getEmail().endsWith(".edu.tr")){
            throw new IllegalArgumentException("Sadece Universite ogrencileri girebilir");
        }
        if(userRepository.existsByEmail(user.getEmail())){
            throw new RuntimeException("Bu mail zaten kayitli");
        }

        String domain = getDomain(user.getEmail());
        University university = universityRepository.findByDomain(domain)
                .orElseThrow(() -> new RuntimeException("Üniversiteniz sistemde tanımlı değil: " + domain));
        user.setUniversity(university);
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setVerified(false);

        userRepository.save(user);
        sendVerificationCode(user.getEmail());
        return "Kayıt başarılı. Lütfen mail adresine gelen kodu doğrula.";
    }

    public String login(String email, String password){
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("Kullanici bulunamadi"));
        if(!passwordEncoder.matches(password, user.getPassword())){
            throw new  RuntimeException("Hatali sifre");
        }
        return jwtService.generateToken(user.getEmail(), new HashMap<>());
    }

    @Transactional
    public void sendVerificationCode(String email){
        codeRepository.deleteByEmail(email);
        String code = String.format("%06d", new Random().nextInt(999999));
        VerificationCode verificationCode = VerificationCode.builder()
                .email(email)
                .code(code)
                .expiryDate(LocalDateTime.now().plusMinutes(10))
                .build();
        codeRepository.save(verificationCode);
        sendEmail(email, code);
    }

    public void sendEmail(String to, String code){
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("dpu.forum.noreply@gmail.com");
        message.setTo(to);
        message.setSubject("Bloom Doğrulama Kodu");
        message.setText("Bloom'a hoş geldin! \n\n" +
                "Üniversite kimliğini doğrulamak için kullanacağın kod: " + code + "\n\n" +
                "Bu kod 10 dakika boyunca geçerlidir. Eğer bu talebi sen yapmadıysan bu maili görmezden gelebilirsin.");
        mailSender.send(message);
    }

    @Transactional
    public String verifyCode(String email, String code) {
        VerificationCode vCode = codeRepository.findByEmailAndCode(email, code)
                .orElseThrow(() -> new RuntimeException("Kod hatalı veya geçersiz."));

        if (vCode.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Kodun süresi dolmuş. Yeni bir kod isteyin.");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı."));
        user.setVerified(true);
        userRepository.save(user);
        codeRepository.delete(vCode);
        return jwtService.generateToken(user.getEmail(), new HashMap<>());
    }

    public String getDomain(String email){
        String domain = email.substring(email.indexOf("@")+1);
        String[] parts = domain.split("\\.");
        if(parts.length >= 3){
            return parts[parts.length - 3] + "." + parts[parts.length - 2] + "." + parts[parts.length - 1];
        }
        return domain;
    }
}
