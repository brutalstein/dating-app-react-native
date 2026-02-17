package org.api.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Embeddable
@Getter
@Setter
public class PreferenceCriterion {
    @Column(name = "criterion_key", nullable = false, length = 64)
    private String key;

    @Column(name = "criterion_value", nullable = false, length = 128)
    private String value;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 32)
    private PreferenceCategory category;

    @Column(name = "weight", nullable = false)
    private Integer weight;
}
