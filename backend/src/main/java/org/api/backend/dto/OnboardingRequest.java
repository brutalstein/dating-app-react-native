package org.api.backend.dto;

import java.util.List;

public record OnboardingRequest(
        String birthDate,
        String department,
        Integer heightCm,
        Double weightKg,
        String bio,
        String gender,
        String preference,
        String relationshipIntent,
        List<String> interests,
        List<String> photoUrls
) {
}
