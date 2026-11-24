package com.equio.backend.emailintake.controllers;

import com.equio.backend.emailintake.infrastructure.PostalWebhookVerifier;
import com.equio.backend.emailintake.services.PostalDeliveryQueue;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.time.Clock;
import java.util.UUID;

@RestController
@ConditionalOnProperty(name = "app.email.postal.enabled", havingValue = "true")
public class PostalWebhookController {
    public static final String PATH = "/api/v1/webhooks/postal";
    private final PostalWebhookVerifier verifier;
    private final PostalDeliveryQueue queue;
    private final ObjectMapper json;
    private final UUID inbox;
    private final long owner;

    public PostalWebhookController(PostalDeliveryQueue queue, ObjectMapper json,
                                   @Value("${EQUIO_POSTAL_WEBHOOK_SECRET}") String secret,
                                   @Value("${EQUIO_POSTAL_INBOX_ID}") UUID inbox,
                                   @Value("${EQUIO_POSTAL_OWNER_ID}") long owner) {
        if (owner <= 0) throw new IllegalArgumentException("Invalid Postal owner configuration");
        this.verifier = new PostalWebhookVerifier(secret, Clock.systemUTC());
        this.queue = queue;
        this.json = json;
        this.inbox = inbox;
        this.owner = owner;
    }

    @PostMapping(path = PATH, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> receive(@RequestHeader("webhook-id") String id,
                                        @RequestHeader("webhook-timestamp") String timestamp,
                                        @RequestHeader("webhook-signature") String signature,
                                        @RequestBody byte[] body) {
        if (!verifier.isValid(id, timestamp, signature, body)) {
            return ResponseEntity.status(401).build();
        }
        UUID emailId;
        try {
            var event = json.readTree(body);
            if (event == null || !event.isObject()) return ResponseEntity.badRequest().build();
            if (!"email.received".equals(event.path("type").asString())) {
                return ResponseEntity.noContent().build();
            }
            var data = event.path("data");
            if (!inbox.toString().equals(data.path("inbox_id").asString())) {
                return ResponseEntity.noContent().build();
            }
            emailId = UUID.fromString(data.path("email_id").asString());
        } catch (JacksonException | IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }
        queue.enqueue(owner, inbox, emailId);
        return ResponseEntity.accepted().build();
    }
}
