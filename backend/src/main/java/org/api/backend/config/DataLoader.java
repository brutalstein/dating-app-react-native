package org.api.backend.config;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.api.backend.entity.Membership;
import org.api.backend.entity.University;
import org.api.backend.entity.User;
import org.api.backend.repos.UniversityRepository;
import org.api.backend.repos.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class DataLoader implements CommandLineRunner {

    private final UniversityRepository universityRepository;
    private final UserRepository userRepository;
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

            Map<String, University> existingByDomain = new HashMap<>();
            for (University existing : universityRepository.findAll()) {
                if (existing.getDomain() == null) {
                    continue;
                }
                existingByDomain.put(existing.getDomain().trim().toLowerCase(Locale.ROOT), existing);
            }

            List<University> universitiesToUpsert = new ArrayList<>();

            for (UniversitySeed uni : universities) {
                if (uni == null || uni.domain() == null || uni.name() == null) {
                    continue;
                }

                String domain = uni.domain().trim().toLowerCase(Locale.ROOT);
                String name = uni.name().trim();

                if (domain.isBlank() || name.isBlank()) {
                    continue;
                }

                University existing = existingByDomain.get(domain);
                if (existing != null) {
                    if (!name.equals(existing.getName())) {
                        existing.setName(name);
                        universitiesToUpsert.add(existing);
                    }
                    continue;
                }

                University created = University.builder()
                        .name(name)
                        .domain(domain)
                        .build();
                universitiesToUpsert.add(created);
                existingByDomain.put(domain, created);
            }

            if (!universitiesToUpsert.isEmpty()) {
                universityRepository.saveAll(universitiesToUpsert);
            }
        }

        seedNpcUser();
    }

    private void seedNpcUser() {
        userRepository.findByEmail("npc.teaser@bloom.app").ifPresentOrElse(existing -> {
            existing.setNpc(true);
            existing.setOnboardingCompleted(true);
            existing.setVerified(true);
            if (existing.getPhotoUrls() == null || existing.getPhotoUrls().isEmpty()) {
                existing.setPhotoUrls(List.of("https://images.unsplash.com/photo-1544005313-94ddf0286df2"));
            }
            userRepository.save(existing);
        }, () -> {
            User npc = new User();
            npc.setFirstName("Luna");
            npc.setLastName("NPC");
            npc.setEmail("npc.teaser@bloom.app");
            npc.setPassword("npc-seeded");
            npc.setVerified(true);
            npc.setOnboardingCompleted(true);
            npc.setNpc(true);
            npc.setMembershipType(Membership.PREMIUM);
            npc.setBio("Premium teaser profile");
            npc.setInterests(List.of("music", "travel"));
            npc.setPhotoUrls(List.of("https://images.unsplash.com/photo-1544005313-94ddf0286df2"));
            userRepository.save(npc);
        });
    }
}
