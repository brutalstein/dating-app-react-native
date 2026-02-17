package org.api.backend.config;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.api.backend.entity.University;
import org.api.backend.repos.UniversityRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataLoader implements CommandLineRunner {

    private final UniversityRepository universityRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private record UniversitySeed(String name, String domain) {}

    @Override
    public void run(String... args) throws Exception {
        ClassPathResource resource = new ClassPathResource("names.json");

        if (!resource.exists()) {
            throw new IllegalStateException("University seed file not found: classpath:names.json");
        }

        try (InputStream inputStream = resource.getInputStream()) {
            List<UniversitySeed> universities = objectMapper.readValue(
                    inputStream,
                    new TypeReference<List<UniversitySeed>>() {}
            );

            for (UniversitySeed uni : universities) {
                if (uni == null || uni.domain() == null || uni.name() == null) {
                    continue;
                }

                String domain = uni.domain().trim().toLowerCase();
                String name = uni.name().trim();

                if (domain.isBlank() || name.isBlank()) {
                    continue;
                }

                universityRepository.findByDomainIgnoreCase(domain)
                        .ifPresentOrElse(
                                existing -> {
                                    if (!name.equals(existing.getName())) {
                                        existing.setName(name);
                                        universityRepository.save(existing);
                                    }
                                },
                                () -> universityRepository.save(
                                        University.builder()
                                                .name(name)
                                                .domain(domain)
                                                .build()
                                )
                        );
            }
        }
    }
}
