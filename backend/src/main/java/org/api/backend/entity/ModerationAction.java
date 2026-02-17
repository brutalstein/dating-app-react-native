package org.api.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
@Table(name = "moderation_actions")
public class ModerationAction {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "target_user_id")
    private User targetUser;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ModerationActionType actionType;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @ManyToOne(optional = false)
    @JoinColumn(name = "actor_user_id")
    private User actorUser;
}
