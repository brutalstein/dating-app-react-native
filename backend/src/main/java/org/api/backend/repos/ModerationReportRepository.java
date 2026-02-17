package org.api.backend.repos;

import org.api.backend.entity.ModerationReport;
import org.api.backend.entity.ModerationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ModerationReportRepository extends JpaRepository<ModerationReport, UUID> {
    List<ModerationReport> findByStatusOrderByCreatedAtDesc(ModerationStatus status);
    List<ModerationReport> findTop100ByOrderByCreatedAtDesc();
}
