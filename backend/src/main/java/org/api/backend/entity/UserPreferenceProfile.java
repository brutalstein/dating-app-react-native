package org.api.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Getter
@Setter
@Table(name = "user_preference_profiles")
public class UserPreferenceProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(optional = false)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(nullable = false)
    private Boolean proactiveEnabled = false;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_preference_criteria", joinColumns = @JoinColumn(name = "profile_id"))
    private List<PreferenceCriterion> criteria = new ArrayList<>();

    @Column(nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
}
