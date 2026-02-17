package org.api.backend.service;


import lombok.RequiredArgsConstructor;
import org.api.backend.dto.OnboardingRequest;
import org.api.backend.dto.PhotoUpdateRequest;
import org.api.backend.dto.UserProfileResponse;
import org.api.backend.entity.Gender;
import org.api.backend.entity.PendingRegistration;
import org.api.backend.entity.PreferenceCategory;
import org.api.backend.entity.PreferenceCriterion;
import org.api.backend.entity.RelationshipIntent;
import org.api.backend.entity.University;
import org.api.backend.entity.User;
import org.api.backend.entity.UserPreferenceProfile;
import org.api.backend.entity.VerificationCode;
import org.api.backend.repos.UniversityRepository;
import org.api.backend.repos.UserPreferenceProfileRepository;
import org.api.backend.repos.UserRepository;
import org.api.backend.repos.CodeRepository;
import org.api.backend.repos.PendingRegistrationRepository;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final UniversityRepository universityRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CodeRepository codeRepository;
    private final PendingRegistrationRepository pendingRegistrationRepository;
    private final UserPreferenceProfileRepository userPreferenceProfileRepository;
    private final JavaMailSender mailSender;
    private final ExperimentService experimentService;

    private String normalizeEmail(String email) {
        if (email == null) {
            throw new IllegalArgumentException("Email is required.");
        }

        String normalizedEmail = email.trim().toLowerCase();
        if (normalizedEmail.isBlank() || !normalizedEmail.contains("@")) {
            throw new IllegalArgumentException("Please provide a valid university email address.");
        }

        return normalizedEmail;
    }

    @Transactional
    public String register(User user){
        if (user == null) {
            throw new IllegalArgumentException("Registration payload is missing.");
        }

        String normalizedEmail = normalizeEmail(user.getEmail());

        if (!normalizedEmail.endsWith(".edu.tr")){
            throw new IllegalArgumentException("Only .edu.tr university email addresses are accepted.");
        }

        if (user.getFirstName() == null || user.getFirstName().trim().isBlank()) {
            throw new IllegalArgumentException("First name is required.");
        }

        if (user.getPassword() == null || user.getPassword().trim().isBlank()) {
            throw new IllegalArgumentException("Password is required.");
        }

        if(userRepository.existsByEmail(normalizedEmail)){
            throw new RuntimeException("This email is already registered.");
        }

        if (pendingRegistrationRepository.existsByEmail(normalizedEmail)) {
            pendingRegistrationRepository.deleteByEmail(normalizedEmail);
        }

        University university = resolveUniversityByEmail(normalizedEmail);

        PendingRegistration pendingRegistration = PendingRegistration.builder()
                .firstName(user.getFirstName().trim())
                .lastName(user.getLastName() != null ? user.getLastName().trim() : null)
                .email(normalizedEmail)
                .password(passwordEncoder.encode(user.getPassword()))
                .university(university)
                .build();

        pendingRegistrationRepository.save(pendingRegistration);
        sendVerificationCode(normalizedEmail);
        return "Registration request received. Please verify your email address to complete account creation.";
    }

    public String login(String email, String password){
        String normalizedEmail = normalizeEmail(email);

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> {
                    if (pendingRegistrationRepository.existsByEmail(normalizedEmail)) {
                        return new RuntimeException("Your registration is pending email verification. Please verify your email first.");
                    }
                    return new RuntimeException("No account found for this email address.");
                });

        if (!Boolean.TRUE.equals(user.getVerified())) {
            throw new RuntimeException("Your account is not verified yet. Please complete email verification.");
        }

        if(!passwordEncoder.matches(password, user.getPassword())){
            throw new  RuntimeException("Invalid email or password.");
        }
        if (Boolean.TRUE.equals(user.getBanned())) {
            throw new RuntimeException("Your account is banned. Reason: " + (user.getBannedReason() == null ? "policy violation" : user.getBannedReason()));
        }

        return jwtService.generateToken(user.getEmail(), new HashMap<>());
    }

    public UserProfileResponse getProfile(String authorizationHeader) {
        User user = getAuthenticatedUser(authorizationHeader);
        return toUserProfileResponse(user);
    }

    @Transactional
    public UserProfileResponse completeOnboarding(String authorizationHeader, OnboardingRequest request) {
        if (request == null) {
            throw new RuntimeException("Onboarding payload is missing.");
        }

        User user = getAuthenticatedUser(authorizationHeader);

        if (request.birthDate() == null || request.birthDate().trim().isBlank()) {
            throw new RuntimeException("Birth date is required.");
        }

        LocalDate birthDate;
        try {
            birthDate = LocalDate.parse(request.birthDate().trim());
        } catch (Exception e) {
            throw new RuntimeException("Birth date format is invalid. Please use ISO format (yyyy-MM-dd).");
        }

        int age = Period.between(birthDate, LocalDate.now()).getYears();
        if (age < 18) {
            throw new RuntimeException("You must be at least 18 years old to use this app.");
        }

        if (request.gender() == null || request.gender().trim().isBlank()) {
            throw new RuntimeException("Gender is required.");
        }

        if (request.preference() == null || request.preference().trim().isBlank()) {
            throw new RuntimeException("Dating preference is required.");
        }

        if (request.relationshipIntent() == null || request.relationshipIntent().trim().isBlank()) {
            throw new RuntimeException("Relationship intent is required.");
        }

        List<String> interests = sanitizeInterests(request.interests());
        if (interests.isEmpty()) {
            throw new RuntimeException("Please select at least one interest.");
        }

        List<String> photoUrls = sanitizePhotos(request.photoUrls());

        Integer heightCm = request.heightCm();
        if (heightCm == null || heightCm < 120 || heightCm > 230) {
            throw new RuntimeException("Height must be between 120 and 230 cm.");
        }

        Double weightKg = request.weightKg();
        if (weightKg == null || weightKg < 30 || weightKg > 250) {
            throw new RuntimeException("Weight must be between 30 and 250 kg.");
        }

        user.setBirthDate(birthDate);
        user.setDepartment(request.department() != null && !request.department().trim().isBlank() ? request.department().trim() : null);
        user.setHeightCm(heightCm);
        user.setWeightKg(weightKg);
        user.setBio(request.bio() != null && !request.bio().trim().isBlank() ? request.bio().trim() : null);
        user.setGender(parseGender(request.gender()));
        user.setPreference(parseGender(request.preference()));
        user.setRelationshipIntent(parseRelationshipIntent(request.relationshipIntent()));
        user.setInterests(interests);
        user.setPhotoUrls(photoUrls);
        user.setOnboardingCompleted(true);

        userRepository.save(user);
        syncPreferenceProfileFromOnboarding(user);
        experimentService.assign(user, "onboarding_flow_v1", true);
        return toUserProfileResponse(user);
    }

    @Transactional
    public UserProfileResponse updateProfilePhotos(String authorizationHeader, PhotoUpdateRequest request) {
        if (request == null) {
            throw new RuntimeException("Photo update payload is missing.");
        }

        User user = getAuthenticatedUser(authorizationHeader);
        List<String> photoUrls = sanitizePhotos(request.photoUrls());

        user.setPhotoUrls(photoUrls);
        userRepository.save(user);
        return toUserProfileResponse(user);
    }

    private User getAuthenticatedUser(String authorizationHeader) {
        String token = extractBearerToken(authorizationHeader);
        if (token == null) {
            throw new RuntimeException("Authorization token is missing.");
        }

        if (!jwtService.isTokenValid(token)) {
            throw new RuntimeException("Authorization token is invalid or expired.");
        }

        String normalizedEmail = normalizeEmail(jwtService.extractEmail(token));

        return userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new RuntimeException("Authenticated user could not be found."));
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null) {
            return null;
        }

        String trimmed = authorizationHeader.trim();
        if (trimmed.length() < 7 || !trimmed.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return null;
        }

        String token = trimmed.substring(7).trim();
        return token.isBlank() ? null : token;
    }

    private UserProfileResponse toUserProfileResponse(User user) {
        String universityName = user.getUniversity() != null ? user.getUniversity().getName() : "-";

        Integer age = null;
        if (user.getBirthDate() != null) {
            age = Period.between(user.getBirthDate(), LocalDate.now()).getYears();
        }

        List<String> interests = user.getInterests() != null ? List.copyOf(user.getInterests()) : List.of();
        List<String> photoUrls = user.getPhotoUrls() != null ? List.copyOf(user.getPhotoUrls()) : List.of();

        return new UserProfileResponse(
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                universityName,
                user.getDepartment(),
                user.getBirthDate() != null ? user.getBirthDate().toString() : null,
                age,
                user.getHeightCm(),
                user.getWeightKg(),
                user.getBio(),
                user.getGender() != null ? user.getGender().name() : null,
                user.getPreference() != null ? user.getPreference().name() : null,
                user.getRelationshipIntent() != null ? user.getRelationshipIntent().name() : null,
                interests,
                photoUrls,
                user.getOnboardingCompleted(),
                user.getPushEnabled(),
                user.getRole().name(),
                user.getProfileVisibility().name(),
                user.getMessageRequestPolicy().name(),
                user.getLastSeenVisibility().name()
        );
    }

    private List<String> sanitizeInterests(List<String> interests) {
        if (interests == null || interests.isEmpty()) {
            return List.of();
        }

        LinkedHashSet<String> unique = new LinkedHashSet<>();
        for (String interest : interests) {
            if (interest == null) {
                continue;
            }

            String normalized = interest.trim();
            if (!normalized.isBlank()) {
                unique.add(normalized);
            }
        }

        if (unique.size() > 10) {
            throw new RuntimeException("You can select up to 10 interests.");
        }

        return new ArrayList<>(unique);
    }

    private List<String> sanitizePhotos(List<String> photoUrls) {
        if (photoUrls == null) {
            throw new RuntimeException("At least 3 photos are required.");
        }

        LinkedHashSet<String> unique = new LinkedHashSet<>();
        for (String photoUrl : photoUrls) {
            if (photoUrl == null) {
                continue;
            }

            String normalized = photoUrl.trim();
            if (!normalized.isBlank()) {
                unique.add(normalized);
            }
        }

        if (unique.size() < 3) {
            throw new RuntimeException("Please upload at least 3 photos.");
        }

        if (unique.size() > 8) {
            throw new RuntimeException("You can upload up to 8 photos.");
        }

        return new ArrayList<>(unique);
    }

    private Gender parseGender(String rawGender) {
        try {
            return Gender.valueOf(rawGender.trim().toUpperCase());
        } catch (Exception e) {
            throw new RuntimeException("Invalid gender/preference value: " + rawGender);
        }
    }

    private RelationshipIntent parseRelationshipIntent(String rawIntent) {
        try {
            return RelationshipIntent.valueOf(rawIntent.trim().toUpperCase());
        } catch (Exception e) {
            throw new RuntimeException("Invalid relationship intent value: " + rawIntent);
        }
    }

    private void syncPreferenceProfileFromOnboarding(User user) {
        UserPreferenceProfile profile = userPreferenceProfileRepository.findByUser(user).orElseGet(UserPreferenceProfile::new);
        if (profile.getId() == null) {
            profile.setUser(user);
        }

        List<PreferenceCriterion> criteria = new ArrayList<>();
        criteria.add(buildCriterion("preference_alignment", "true", PreferenceCategory.MUST_HAVE, 100));

        if (user.getRelationshipIntent() != null) {
            criteria.add(buildCriterion("relationship_intent", user.getRelationshipIntent().name(), PreferenceCategory.MUST_HAVE, 95));
        }

        if (user.getDepartment() != null && !user.getDepartment().isBlank()) {
            criteria.add(buildCriterion("department", user.getDepartment(), PreferenceCategory.NICE_TO_HAVE, 55));
        }

        if (user.getHeightCm() != null) {
            criteria.add(buildCriterion("height_min_cm", String.valueOf(Math.max(120, user.getHeightCm() - 10)), PreferenceCategory.NICE_TO_HAVE, 45));
            criteria.add(buildCriterion("height_max_cm", String.valueOf(Math.min(230, user.getHeightCm() + 10)), PreferenceCategory.NICE_TO_HAVE, 45));
        }

        if (user.getWeightKg() != null) {
            int minWeight = (int) Math.max(30, Math.floor(user.getWeightKg() - 12));
            int maxWeight = (int) Math.min(250, Math.ceil(user.getWeightKg() + 12));
            criteria.add(buildCriterion("weight_min_kg", String.valueOf(minWeight), PreferenceCategory.NICE_TO_HAVE, 40));
            criteria.add(buildCriterion("weight_max_kg", String.valueOf(maxWeight), PreferenceCategory.NICE_TO_HAVE, 40));
        }

        if (user.getInterests() != null) {
            user.getInterests().stream().limit(2)
                    .forEach(interest -> criteria.add(buildCriterion("interest", interest, PreferenceCategory.NICE_TO_HAVE, 60)));
        }

        profile.setCriteria(criteria);
        profile.setUpdatedAt(LocalDateTime.now());
        userPreferenceProfileRepository.save(profile);
    }

    private PreferenceCriterion buildCriterion(String key, String value, PreferenceCategory category, int weight) {
        PreferenceCriterion criterion = new PreferenceCriterion();
        criterion.setKey(key.trim().toLowerCase());
        criterion.setValue(value.trim().toLowerCase());
        criterion.setCategory(category);
        criterion.setWeight(weight);
        return criterion;
    }

    @Transactional
    public void sendVerificationCode(String email){
        String normalizedEmail = normalizeEmail(email);

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new RuntimeException("This account has already been verified.");
        }

        pendingRegistrationRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new RuntimeException("No pending registration found for this email address."));

        codeRepository.deleteByEmail(normalizedEmail);
        String code = String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));
        VerificationCode verificationCode = VerificationCode.builder()
                .email(normalizedEmail)
                .code(code)
                .expiryDate(LocalDateTime.now().plusMinutes(10))
                .build();
        codeRepository.save(verificationCode);
        sendEmail(normalizedEmail, code);
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
        String normalizedEmail = normalizeEmail(email);

        if (code == null || code.trim().isBlank()) {
            throw new RuntimeException("Verification code is required.");
        }

        String normalizedCode = code.trim();

        VerificationCode vCode = codeRepository.findByEmailAndCode(normalizedEmail, normalizedCode)
                .orElseThrow(() -> new RuntimeException("Verification code is invalid."));

        if (vCode.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Verification code has expired. Please request a new one.");
        }

        if (userRepository.existsByEmail(normalizedEmail)) {
            codeRepository.delete(vCode);
            throw new RuntimeException("This account is already verified.");
        }

        PendingRegistration pendingRegistration = pendingRegistrationRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new RuntimeException("No pending registration found for this email address."));

        User user = new User();
        user.setFirstName(pendingRegistration.getFirstName());
        user.setLastName(pendingRegistration.getLastName());
        user.setEmail(pendingRegistration.getEmail());
        user.setPassword(pendingRegistration.getPassword());
        user.setUniversity(pendingRegistration.getUniversity());
        user.setVerified(true);

        userRepository.save(user);
        pendingRegistrationRepository.delete(pendingRegistration);
        codeRepository.delete(vCode);
        return jwtService.generateToken(user.getEmail(), new HashMap<>());
    }

    private University resolveUniversityByEmail(String email){
        if (email == null || !email.contains("@")) {
            throw new IllegalArgumentException("Please provide a valid university email address.");
        }

        String fullDomain = email.substring(email.indexOf("@") + 1).trim().toLowerCase();
        if (fullDomain.isBlank()) {
            throw new IllegalArgumentException("Please provide a valid university email address.");
        }

        // Longest suffix matching algorithm:
        // 1) Try exact domain (e.g., demiroglu.bilim.edu.tr)
        // 2) If not found, trim left-most label and retry (e.g., ogr.dpu.edu.tr -> dpu.edu.tr)
        // 3) Continue until no dot remains.
        String candidate = fullDomain;
        while (true) {
            var match = universityRepository.findByDomainIgnoreCase(candidate);
            if (match.isPresent()) {
                return match.get();
            }

            int dotIndex = candidate.indexOf('.');
            if (dotIndex < 0) {
                break;
            }

            candidate = candidate.substring(dotIndex + 1);
        }

        throw new RuntimeException("Your university domain is not recognized: " + fullDomain);
    }
}
