package org.api.backend.service;

import org.api.backend.entity.*;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class MatchingEngineServiceTest {
    private final MatchingEngineService service = new MatchingEngineService();

    @Test
    void shouldRejectWhenMustHaveFails() {
        User user = new User();
        user.setPreference(Gender.FEMALE);

        User candidate = new User();
        candidate.setGender(Gender.MALE);

        PreferenceCriterion criterion = new PreferenceCriterion();
        criterion.setKey("gender");
        criterion.setValue("female");
        criterion.setCategory(PreferenceCategory.MUST_HAVE);
        criterion.setWeight(100);

        UserPreferenceProfile profile = new UserPreferenceProfile();
        profile.setCriteria(List.of(criterion));

        var result = service.score(user, candidate, profile);
        assertFalse(result.matched());
        assertEquals(0, result.score());
    }

    @Test
    void shouldProduceScoreAndReason() {
        User user = new User();
        user.setPreference(Gender.FEMALE);
        user.setInterests(List.of("music", "travel"));

        University uni = new University();
        uni.setName("dpu");

        User candidate = new User();
        candidate.setGender(Gender.FEMALE);
        candidate.setUniversity(uni);
        candidate.setInterests(List.of("music"));

        PreferenceCriterion c1 = new PreferenceCriterion();
        c1.setKey("gender");
        c1.setValue("female");
        c1.setCategory(PreferenceCategory.MUST_HAVE);
        c1.setWeight(90);

        PreferenceCriterion c2 = new PreferenceCriterion();
        c2.setKey("interest");
        c2.setValue("music");
        c2.setCategory(PreferenceCategory.NICE_TO_HAVE);
        c2.setWeight(70);

        UserPreferenceProfile profile = new UserPreferenceProfile();
        profile.setCriteria(List.of(c1, c2));

        var result = service.score(user, candidate, profile);
        assertTrue(result.matched());
        assertTrue(result.score() >= 60);
        assertNotNull(result.reason());
        assertTrue(result.reason().contains("gender=female"));
    }
}
