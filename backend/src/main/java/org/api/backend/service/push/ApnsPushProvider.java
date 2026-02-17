package org.api.backend.service.push;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class ApnsPushProvider implements PushProvider {
    private final PushProperties pushProperties;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Override
    public boolean supports(PushChannel channel) {
        return channel == PushChannel.APNS;
    }

    @Override
    public void send(PushMessage message) {
        if (pushProperties.apnsPrivateKey() == null || pushProperties.apnsPrivateKey().isBlank()) {
            return;
        }

        try {
            String host = pushProperties.apnsSandbox() ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";
            String jwt = createProviderJwt();
            String payload = "{\"aps\":{\"alert\":{\"title\":\"" + escape(message.title()) + "\",\"body\":\"" + escape(message.body()) + "\"},\"sound\":\"default\"},\"data\":" + toJsonMap(message.data()) + "}";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(host + "/3/device/" + message.deviceToken()))
                    .header("authorization", "bearer " + jwt)
                    .header("apns-topic", pushProperties.apnsBundleId())
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                log.warn("APNs push failed: {} {}", response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.warn("APNs push failed: {}", e.getMessage());
        }
    }

    private String createProviderJwt() throws Exception {
        PrivateKey privateKey = parsePrivateKey(pushProperties.apnsPrivateKey());
        return Jwts.builder()
                .setHeaderParam("alg", "ES256")
                .setHeaderParam("kid", pushProperties.apnsKeyId())
                .setIssuer(pushProperties.apnsTeamId())
                .setIssuedAt(Date.from(Instant.now()))
                .signWith(privateKey, SignatureAlgorithm.ES256)
                .compact();
    }

    private PrivateKey parsePrivateKey(String rawKey) throws Exception {
        String key = rawKey
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replace("\\n", "")
                .replace("\n", "")
                .trim();
        byte[] decoded = Base64.getDecoder().decode(key);
        return KeyFactory.getInstance("EC").generatePrivate(new PKCS8EncodedKeySpec(decoded));
    }

    private String toJsonMap(Map<String, String> data) {
        if (data == null || data.isEmpty()) return "{}";
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, String> e : data.entrySet()) {
            if (!first) sb.append(',');
            sb.append('"').append(escape(e.getKey())).append('"').append(':').append('"').append(escape(e.getValue())).append('"');
            first = false;
        }
        sb.append('}');
        return sb.toString();
    }

    private String escape(String text) {
        if (text == null) return "";
        return text.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
