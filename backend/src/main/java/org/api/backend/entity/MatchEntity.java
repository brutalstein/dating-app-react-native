package org.api.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
@Table(name = "matches", uniqueConstraints = {
        @UniqueConstraint(name = "uk_match_users", columnNames = {"user_one_id", "user_two_id"})
})
public class MatchEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_one_id")
    private User userOne;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_two_id")
    private User userTwo;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
