package org.api.backend.repos;

import java.util.Optional;
import org.api.backend.entity.University;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UniversityRepository extends JpaRepository<University, UUID>{
    Optional<University> findByDomain(String domain);
}
