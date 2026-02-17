package org.api.backend.dto;

import java.util.List;

public record UserProfileResponse(
        String firstName,
        String lastName,
        String email,
        String universityName,
        String department,
        String birthDate,
        Integer age,
        Integer heightCm,
        Double weightKg,
        String bio,
        String gender,
        String preference,
        String relationshipIntent,
        List<String> interests,
        List<String> photoUrls,
        Boolean onboardingCompleted
) {
}
