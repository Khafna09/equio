package com.equio.backend.emailintake.infrastructure;

import com.equio.backend.emailintake.services.EmailCandidateService;
import com.equio.backend.emailintake.services.PostalDeliveryQueue;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "app.email.postal.enabled", havingValue = "true")
public class PostalDeliveryWorker {
    private static final Logger log = LoggerFactory.getLogger(PostalDeliveryWorker.class);
    private static final int MAX_RESPONSE_BYTES = 256 * 1024;
    private final PostalDeliveryQueue queue;
    private final EmailCandidateService candidates;
    private final ObjectMapper json;
    private final RestClient postal;
    private final UUID inbox;
    private final long owner;

    public PostalDeliveryWorker(PostalDeliveryQueue queue, EmailCandidateService candidates, ObjectMapper json,
                                @Value("${EQUIO_POSTAL_API_KEY}") String key,
                                @Value("${EQUIO_POSTAL_INBOX_ID}") UUID inbox,
                                @Value("${EQUIO_POSTAL_OWNER_ID}") long owner) {
        if (key.isBlank()) throw new IllegalArgumentException("Postal API key is required");
        this.queue = queue;
        this.candidates = candidates;
        this.json = json;
        this.inbox = inbox;
        this.owner = owner;
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3)).followRedirects(HttpClient.Redirect.NEVER).build());
        factory.setReadTimeout(Duration.ofSeconds(8));
        this.postal = RestClient.builder().baseUrl("https://api.postal.so").requestFactory(factory)
                .defaultHeaders(headers -> headers.setBearerAuth(key)).build();
    }

    @Scheduled(fixedDelayString = "${app.email.postal.poll-delay-ms:5000}")
    public void processNext() {
        queue.claim(owner, inbox).ifPresent(claim -> {
            try {
                var result = postal.get().uri("/emails/receiving/{id}", claim.emailId())
                        .exchange((request, response) -> {
                            if (!response.getStatusCode().is2xxSuccessful()) {
                                throw new IllegalStateException("Postal fetch failed");
                            }
                            byte[] body = response.getBody().readNBytes(MAX_RESPONSE_BYTES + 1);
                            if (body.length > MAX_RESPONSE_BYTES) return EmailCandidateService.Result.NEEDS_REVIEW;
                            var message = json.readTree(body);
                            if (message == null || !message.isObject()) throw new IllegalStateException("Invalid Postal response");
                            if (!claim.emailId().toString().equals(message.path("id").asString())
                                    || !inbox.toString().equals(message.path("inbox_id").asString())) {
                                return EmailCandidateService.Result.NEEDS_REVIEW;
                            }
                            if (!message.path("otp_token").isNull() && !message.path("otp_token").isMissingNode()) {
                                return EmailCandidateService.Result.IGNORED;
                            }
                            return candidates.process(owner, fingerprint(inbox, claim.emailId()),
                                    message.path("subject").asString(null), message.path("text").asString(null));
                        });
                queue.finish(owner, inbox, claim, result);
            } catch (RuntimeException ex) {
                log.warn("Postal delivery processing failed; attempt {}", claim.attempt());
            }
        });
    }

    private static String fingerprint(UUID inbox, UUID message) {
        try {
            byte[] id = ("postal:" + inbox + ":" + message).getBytes(StandardCharsets.UTF_8);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(id));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }
}
