package org.api.backend.controller;

import lombok.RequiredArgsConstructor;
import org.api.backend.dto.CreateReportRequest;
import org.api.backend.dto.ModerationActionRequest;
import org.api.backend.dto.ReportStatusUpdateRequest;
import org.api.backend.entity.ModerationReport;
import org.api.backend.entity.ModerationStatus;
import org.api.backend.service.AdminModerationService;
import org.api.backend.service.CurrentUserService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/moderation")
@RequiredArgsConstructor
public class ModerationController {
    private final AdminModerationService adminModerationService;
    private final CurrentUserService currentUserService;

    @PostMapping("/reports")
    public ModerationReport createReport(@RequestBody CreateReportRequest request) {
        return adminModerationService.createReport(currentUserService.getCurrentUser(), request);
    }

    @GetMapping("/reports")
    public List<ModerationReport> listReports(@RequestParam(required = false) ModerationStatus status) {
        return adminModerationService.listReports(status);
    }

    @PutMapping("/reports/{reportId}")
    public ModerationReport updateReport(@PathVariable UUID reportId, @RequestBody ReportStatusUpdateRequest request) {
        return adminModerationService.updateReportStatus(currentUserService.getCurrentUser(), reportId, request.status());
    }

    @PostMapping("/actions")
    public Object action(@RequestBody ModerationActionRequest request) {
        return adminModerationService.applyUserAction(currentUserService.getCurrentUser(), request);
    }
}
