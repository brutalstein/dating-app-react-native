package org.api.backend.service;

import lombok.RequiredArgsConstructor;
import org.api.backend.dto.PreferenceCatalogResponse;
import org.api.backend.dto.PreferenceProfileResponse;
import org.api.backend.dto.UpsertPreferenceProfileRequest;
import org.api.backend.entity.*;
import org.api.backend.repos.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RecommendationService {
    private final UserPreferenceProfileRepository profileRepository;
    private final RecommendationRepository recommendationRepository;
    private final UserRepository userRepository;
    private final MatchRepository matchRepository;
    private final LikeRepository likeRepository;
    private final ActivityRepository activityRepository;
    private final SocialService socialService;
    private final RealtimePushService realtimePushService;
    private final MatchingEngineService matchingEngineService;

    @Transactional
    public PreferenceProfileResponse upsertProfile(User user, UpsertPreferenceProfileRequest request) {
        UserPreferenceProfile profile = profileRepository.findByUser(user).orElseGet(UserPreferenceProfile::new);
        if (profile.getId() == null) {
            profile.setUser(user);
        }

        profile.setProactiveEnabled(Boolean.TRUE.equals(request.proactiveEnabled()));
        List<PreferenceCriterion> criteria = new ArrayList<>();
        if (request.criteria() != null) {
            request.criteria().forEach(item -> {
                PreferenceCriterion criterion = new PreferenceCriterion();
                criterion.setKey(item.key().trim().toLowerCase(Locale.ROOT));
                criterion.setValue(item.value().trim().toLowerCase(Locale.ROOT));
                criterion.setWeight(item.weight());
                criterion.setCategory(Boolean.TRUE.equals(item.mustHave()) ? PreferenceCategory.MUST_HAVE : PreferenceCategory.NICE_TO_HAVE);
                criteria.add(criterion);
            });
        }
        profile.setCriteria(criteria);
        profile.setUpdatedAt(LocalDateTime.now());
        profile = profileRepository.save(profile);

        if (Boolean.TRUE.equals(profile.getProactiveEnabled())) {
            triggerProactiveScanAsync(user.getId());
        }

        return toProfileResponse(profile);
    }

    @Transactional(readOnly = true)
    public PreferenceProfileResponse getProfile(User user) {
        return profileRepository.findByUser(user)
                .map(this::toProfileResponse)
                .orElse(new PreferenceProfileResponse(null, false, null, List.of()));
    }

    @Transactional
    public void triggerProactiveScan(User user) {
        UserPreferenceProfile profile = profileRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Önce tercih profilini oluşturmalısın."));

        if (!Boolean.TRUE.equals(profile.getProactiveEnabled())) {
            throw new RuntimeException("Proaktif Ara kapalı. Önce aktif et.");
        }

        runScan(user, profile);
    }

    @Async
    public void triggerProactiveScanAsync(UUID userId) {
        userRepository.findById(userId).ifPresent(user ->
                profileRepository.findByUser(user)
                        .filter(p -> Boolean.TRUE.equals(p.getProactiveEnabled()))
                        .ifPresent(p -> runScan(user, p))
        );
    }

    @Transactional(readOnly = true)
    public PreferenceCatalogResponse getCatalog(User user) {
        return new PreferenceCatalogResponse(List.of(
                new PreferenceCatalogResponse.PreferenceCriterionTemplate("preference_alignment", "Tercih uyumu", "boolean", 100, true, List.of("true")),
                new PreferenceCatalogResponse.PreferenceCriterionTemplate("relationship_intent", "İlişki arayışı", "select", 95, true, List.of("casual", "serious", "friendship")),
                new PreferenceCatalogResponse.PreferenceCriterionTemplate("interest", "İlgi alanı", "select", 70, false, user.getInterests() == null ? List.of() : user.getInterests()),
                new PreferenceCatalogResponse.PreferenceCriterionTemplate("department", "Bölüm", "text", 55, false, List.of()),
                new PreferenceCatalogResponse.PreferenceCriterionTemplate("height_min_cm", "Minimum boy (cm)", "number", 45, false, List.of()),
                new PreferenceCatalogResponse.PreferenceCriterionTemplate("height_max_cm", "Maksimum boy (cm)", "number", 45, false, List.of()),
                new PreferenceCatalogResponse.PreferenceCriterionTemplate("weight_min_kg", "Minimum kilo (kg)", "number", 40, false, List.of()),
                new PreferenceCatalogResponse.PreferenceCriterionTemplate("weight_max_kg", "Maksimum kilo (kg)", "number", 40, false, List.of())
        ));
    }

    @Transactional
    public void applyAction(User user, UUID recommendationId, String action) {
        RecommendationEntity recommendation = recommendationRepository.findByIdAndUser(recommendationId, user)
                .orElseThrow(() -> new RuntimeException("Öneri bulunamadı"));

        RecommendationStatus status = switch (action.trim().toUpperCase(Locale.ROOT)) {
            case "LIKE" -> RecommendationStatus.LIKED;
            case "PASS" -> RecommendationStatus.PASSED;
            default -> throw new RuntimeException("Geçersiz aksiyon. LIKE/PASS desteklenir.");
        };

        recommendation.setStatus(status);
        recommendation.setActionedAt(LocalDateTime.now());
        recommendationRepository.save(recommendation);
    }

    private void runScan(User user, UserPreferenceProfile profile) {
        List<User> candidates = userRepository.findAll().stream()
                .filter(candidate -> !candidate.getId().equals(user.getId()))
                .filter(candidate -> !Boolean.FALSE.equals(candidate.getOnboardingCompleted()))
                .filter(candidate -> !likeRepository.existsBySenderAndReceiver(user, candidate))
                .filter(candidate -> !matchRepository.existsByUserOneAndUserTwo(user, candidate)
                        && !matchRepository.existsByUserOneAndUserTwo(candidate, user))
                .toList();

        for (User candidate : candidates) {
            if (recommendationRepository.existsByUserAndCandidateAndStatusAndCreatedAtAfter(
                    user, candidate, RecommendationStatus.PENDING, LocalDateTime.now().minusDays(7))) {
                continue;
            }

            MatchingEngineService.MatchResult result = matchingEngineService.score(user, candidate, profile);
            if (!result.matched()) {
                continue;
            }

            RecommendationEntity recommendation = new RecommendationEntity();
            recommendation.setUser(user);
            recommendation.setCandidate(candidate);
            recommendation.setScore(result.score());
            recommendation.setReason(result.reason());
            recommendation.setStatus(RecommendationStatus.PENDING);
            recommendation = recommendationRepository.save(recommendation);

            ActivityEntity activity = new ActivityEntity();
            activity.setUser(user);
            activity.setActor(candidate);
            activity.setType(ActivityType.RECOMMENDATION_FOUND);
            activity.setSummary("Sana özel bulundu: " + candidate.getFirstName());
            activity.setReason(result.reason());
            activity.setScore(result.score());
            activity.setReferenceId(recommendation.getId());
            activityRepository.save(activity);

            realtimePushService.sendToUser(user.getEmail(), "EXPLORE_HUB_UPDATED", socialService.buildExploreHub(user));
        }
    }

    private PreferenceProfileResponse toProfileResponse(UserPreferenceProfile profile) {
        return new PreferenceProfileResponse(
                profile.getId(),
                profile.getProactiveEnabled(),
                profile.getUpdatedAt(),
                profile.getCriteria().stream().map(item -> new PreferenceProfileResponse.PreferenceCriterionResponse(
                        item.getKey(),
                        item.getValue(),
                        item.getCategory() == PreferenceCategory.MUST_HAVE,
                        item.getWeight()
                )).toList()
        );
    }
}
