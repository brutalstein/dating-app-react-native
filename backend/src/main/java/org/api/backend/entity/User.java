package org.api.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(unique = true)
    private String firebaseUid;

    @Enumerated(EnumType.STRING)
    private Membership membershipType = Membership.BASIC;

    @Enumerated(EnumType.STRING)
    private Role role = Role.USER;

    @Column(nullable = false)
    private String firstName;

    private String lastName;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    @ManyToOne
    @JoinColumn(name = "university_id")
    private University university;

    private String department;

    private LocalDate birthDate;

    private Integer heightCm;

    private Double weightKg;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_interests", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "interest")
    private List<String> interests = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_photos", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "photo_url", columnDefinition = "TEXT")
    private List<String> photoUrls = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    private Gender gender;

    @Enumerated(EnumType.STRING)
    private Gender preference;

    @Enumerated(EnumType.STRING)
    private RelationshipIntent relationshipIntent;

    @Column(name = "is_verified", nullable = false)
    private Boolean verified = false;

    @Column(name = "onboarding_completed", nullable = false)
    private Boolean onboardingCompleted = false;

    @Column(name = "is_npc", nullable = false)
    private Boolean npc = false;

    private Double latitude;
    private Double longitude;

    private LocalDateTime lastSeen;

    @Column(nullable = false)
    private Boolean pushEnabled = true;

    @Column(nullable = false)
    private Boolean banned = false;

    private String bannedReason;
}
