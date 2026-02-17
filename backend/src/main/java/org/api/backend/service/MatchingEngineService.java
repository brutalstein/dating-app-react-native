package org.api.backend.service;

import org.api.backend.entity.PreferenceCategory;
import org.api.backend.entity.PreferenceCriterion;
import org.api.backend.entity.User;
import org.api.backend.entity.UserPreferenceProfile;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class MatchingEngineService {

    public record MatchResult(boolean matched, int score, String reason) {}

    public MatchResult score(User user, User candidate, UserPreferenceProfile profile) {
        List<PreferenceCriterion> criteria = profile.getCriteria() == null ? List.of() : profile.getCriteria();
        if (criteria.isEmpty()) {
            return new MatchResult(false, 0, "Tercih kriteri tanımlanmadı.");
        }

        List<String> mustFailReasons = new ArrayList<>();
        int weightedHits = 0;
        int weightTotal = 0;
        List<String> hitReasons = new ArrayList<>();

        for (PreferenceCriterion criterion : criteria) {
            int weight = Math.max(1, Optional.ofNullable(criterion.getWeight()).orElse(1));
            boolean match = matches(criterion, user, candidate);
            weightTotal += weight;

            if (criterion.getCategory() == PreferenceCategory.MUST_HAVE && !match) {
                mustFailReasons.add(describeCriterion(criterion));
            }

            if (match) {
                weightedHits += weight;
                hitReasons.add(describeCriterion(criterion));
            }
        }

        if (!mustFailReasons.isEmpty()) {
            return new MatchResult(false, 0, "Zorunlu kriterler karşılanmadı: " + String.join(", ", mustFailReasons));
        }

        Set<String> userInterests = normalizeSet(user.getInterests());
        Set<String> candidateInterests = normalizeSet(candidate.getInterests());
        userInterests.retainAll(candidateInterests);
        int sharedInterestBonus = Math.min(15, userInterests.size() * 5);

        int raw = (int) Math.round((weightedHits * 100.0) / Math.max(1, weightTotal));
        int score = Math.min(100, raw + sharedInterestBonus);

        String reason = (hitReasons.isEmpty() ? "Temel uyum" : String.join(", ", hitReasons.stream().limit(3).toList()))
                + (userInterests.isEmpty() ? "" : ". Ortak ilgi alanı: " + userInterests.stream().limit(2).collect(Collectors.joining(", ")));

        return new MatchResult(score >= 60, score, reason);
    }

    private boolean matches(PreferenceCriterion criterion, User user, User candidate) {
        String key = normalize(criterion.getKey());
        String value = normalize(criterion.getValue());

        return switch (key) {
            case "gender" -> candidate.getGender() != null && normalize(candidate.getGender().name()).equals(value);
            case "department" -> normalize(candidate.getDepartment()).equals(value);
            case "university" -> candidate.getUniversity() != null && normalize(candidate.getUniversity().getName()).equals(value);
            case "interest" -> normalizeSet(candidate.getInterests()).contains(value);
            case "height_min_cm" -> candidate.getHeightCm() != null && candidate.getHeightCm() >= parseInt(value, Integer.MIN_VALUE);
            case "height_max_cm" -> candidate.getHeightCm() != null && candidate.getHeightCm() <= parseInt(value, Integer.MAX_VALUE);
            case "weight_min_kg" -> candidate.getWeightKg() != null && candidate.getWeightKg() >= parseDouble(value, Double.MIN_VALUE);
            case "weight_max_kg" -> candidate.getWeightKg() != null && candidate.getWeightKg() <= parseDouble(value, Double.MAX_VALUE);
            case "preference_alignment" -> user.getPreference() != null && candidate.getGender() != null
                    && normalize(candidate.getGender().name()).equals(normalize(user.getPreference().name()));
            case "relationship_intent" -> candidate.getRelationshipIntent() != null
                    && normalize(candidate.getRelationshipIntent().name()).equals(value);
            default -> false;
        };
    }

    private String describeCriterion(PreferenceCriterion criterion) {
        return criterion.getKey() + "=" + criterion.getValue();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private Set<String> normalizeSet(List<String> values) {
        if (values == null) return new HashSet<>();
        return values.stream().map(this::normalize).filter(v -> !v.isBlank()).collect(Collectors.toSet());
    }

    private int parseInt(String value, int fallback) {
        try {
            return Integer.parseInt(value);
        } catch (Exception e) {
            return fallback;
        }
    }

    private double parseDouble(String value, double fallback) {
        try {
            return Double.parseDouble(value);
        } catch (Exception e) {
            return fallback;
        }
    }
}
