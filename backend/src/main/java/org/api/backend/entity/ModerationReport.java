package org.api.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
@Table(name = "moderation_reports")
public class ModerationReport {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "reporter_user_id")
    private User reporterUser;

    @ManyToOne
    @JoinColumn(name = "target_user_id")
    private User targetUser;

    @Column(columnDefinition = "TEXT")
    private String contentRef;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ModerationStatus status = ModerationStatus.OPEN;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime reviewedAt;

    @ManyToOne
    @JoinColumn(name = "reviewed_by_user_id")
    private User reviewedBy;
}
