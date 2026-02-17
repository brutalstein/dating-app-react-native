package org.api.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;

@Configuration
public class ProductionDatabaseSafetyGuard {

    private static final Set<String> FORBIDDEN_DDL_AUTO_VALUES = Set.of("create", "create-drop", "update");

    public ProductionDatabaseSafetyGuard(
            Environment environment,
            @Value("${spring.jpa.hibernate.ddl-auto:}") String ddlAuto,
            @Value("${spring.flyway.clean-disabled:true}") boolean flywayCleanDisabled
    ) {
        boolean prodProfileActive = Arrays.stream(environment.getActiveProfiles())
                .anyMatch("prod"::equalsIgnoreCase);

        if (!prodProfileActive) {
            return;
        }

        String normalizedDdlAuto = ddlAuto == null ? "" : ddlAuto.trim().toLowerCase(Locale.ROOT);
        if (FORBIDDEN_DDL_AUTO_VALUES.contains(normalizedDdlAuto)) {
            throw new IllegalStateException(
                    "Unsafe production configuration: spring.jpa.hibernate.ddl-auto='" + ddlAuto +
                            "'. Allowed values in prod are 'validate' or 'none'."
            );
        }

        if (!flywayCleanDisabled) {
            throw new IllegalStateException(
                    "Unsafe production configuration: spring.flyway.clean-disabled must be true."
            );
        }
    }
}
