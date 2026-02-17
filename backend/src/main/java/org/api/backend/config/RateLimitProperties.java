package org.api.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.rate-limit")
public class RateLimitProperties {
    private int defaultLimit = 120;
    private int defaultWindowSeconds = 60;

    private int authLimit = 12;
    private int authWindowSeconds = 60;

    private int criticalLimit = 40;
    private int criticalWindowSeconds = 60;

    private int exploreHubLimit = 180;
    private int exploreHubWindowSeconds = 60;

    private int authFailureBaseBlockSeconds = 30;
    private int authFailureMaxBlockSeconds = 900;
    private int authFailureThreshold = 5;

    private int messageFloodLimit = 15;
    private int messageFloodWindowSeconds = 20;
}
