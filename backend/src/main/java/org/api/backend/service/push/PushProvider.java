package org.api.backend.service.push;

public interface PushProvider {
    boolean supports(PushChannel channel);
    void send(PushMessage message);
}
