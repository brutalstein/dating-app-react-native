package org.api.backend.service;

import lombok.RequiredArgsConstructor;
import org.api.backend.dto.CreateReportRequest;
import org.api.backend.dto.ModerationActionRequest;
import org.api.backend.entity.*;
import org.api.backend.repos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminModerationService {
    private final ModerationReportRepository moderationReportRepository;
    private final ModerationActionRepository moderationActionRepository;
    private final AdminAuditLogRepository adminAuditLogRepository;
    private final UserRepository userRepository;

    @Transactional
    public ModerationReport createReport(User reporter, CreateReportRequest request) {
        if (request == null || request.targetUserId() == null || request.reason() == null || request.reason().isBlank()) {
            throw new RuntimeException("targetUserId and reason are required");
        }
        User target = userRepository.findById(request.targetUserId()).orElseThrow(() -> new RuntimeException("Target user not found"));

        ModerationReport report = new ModerationReport();
        report.setReporterUser(reporter);
        report.setTargetUser(target);
        report.setContentRef(request.contentRef());
        report.setReason(request.reason().trim());
        report.setStatus(ModerationStatus.OPEN);
        report.setCreatedAt(LocalDateTime.now());
        moderationReportRepository.save(report);

        logAudit(reporter, "REPORT_CREATED", "REPORT", report.getId(), Map.of("targetUserId", target.getId().toString()));
        return report;
    }

    @Transactional(readOnly = true)
    public List<ModerationReport> listReports(ModerationStatus status) {
        if (status == null) return moderationReportRepository.findTop100ByOrderByCreatedAtDesc();
        return moderationReportRepository.findByStatusOrderByCreatedAtDesc(status);
    }

    @Transactional
    public ModerationReport updateReportStatus(User actor, UUID reportId, ModerationStatus status) {
        requireModerator(actor);
        ModerationReport report = moderationReportRepository.findById(reportId).orElseThrow(() -> new RuntimeException("Report not found"));
        report.setStatus(status);
        report.setReviewedAt(LocalDateTime.now());
        report.setReviewedBy(actor);
        moderationReportRepository.save(report);
        logAudit(actor, "REPORT_STATUS_UPDATED", "REPORT", reportId, Map.of("status", status.name()));
        return report;
    }

    @Transactional
    public ModerationAction applyUserAction(User actor, ModerationActionRequest request) {
        requireModerator(actor);
        if (request == null || request.targetUserId() == null || request.actionType() == null) {
            throw new RuntimeException("targetUserId and actionType are required");
        }

        User target = userRepository.findById(request.targetUserId()).orElseThrow(() -> new RuntimeException("Target user not found"));

        if (request.actionType() == ModerationActionType.BAN) {
            target.setBanned(true);
            target.setBannedReason(request.reason());
        } else if (request.actionType() == ModerationActionType.UNBAN) {
            target.setBanned(false);
            target.setBannedReason(null);
        }
        userRepository.save(target);

        ModerationAction action = new ModerationAction();
        action.setActionType(request.actionType());
        action.setReason(request.reason());
        action.setTargetUser(target);
        action.setActorUser(actor);
        action.setCreatedAt(LocalDateTime.now());
        moderationActionRepository.save(action);

        logAudit(actor, "USER_ACTION", "USER", target.getId(), Map.of("action", request.actionType().name(), "reason", request.reason() == null ? "" : request.reason()));
        return action;
    }

    private void requireModerator(User user) {
        Role role = user.getRole();
        if (!(role == Role.ADMIN || role == Role.MODERATOR || role == Role.OWNER)) {
            throw new RuntimeException("Forbidden");
        }
    }

    private void logAudit(User actor, String key, String targetType, UUID targetId, Map<String, String> details) {
        AdminAuditLog log = new AdminAuditLog();
        log.setActorUser(actor);
        log.setActionKey(key);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        log.setDetails(details.toString());
        log.setCreatedAt(LocalDateTime.now());
        adminAuditLogRepository.save(log);
    }
}
