package com.equio.backend.emailintake.infrastructure;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.Base64;
import java.util.Objects;

public final class PostalWebhookVerifier {
    public static final int MAX_BODY_BYTES = 64 * 1024;
    private static final long TOLERANCE_SECONDS = 300;
    private static final String ALGORITHM = "HmacSHA256";

    private final Clock clock;
    private final SecretKeySpec key;

    public PostalWebhookVerifier(String secret, Clock clock) {
        this.clock = Objects.requireNonNull(clock, "clock");
        try {
            if (secret == null || !secret.startsWith("whsec_")) {
                throw new IllegalArgumentException();
            }
            this.key = new SecretKeySpec(Base64.getDecoder().decode(secret.substring(6)), ALGORITHM);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid Postal signing secret configuration");
        }
    }

    public boolean isValid(String id, String timestamp, String signatures, byte[] body) {
        if (id == null || !id.matches("[A-Za-z0-9_-]{1,128}")
                || timestamp == null || !timestamp.matches("[0-9]{1,18}")
                || signatures == null || signatures.length() > 1024
                || body == null || body.length == 0 || body.length > MAX_BODY_BYTES) {
            return false;
        }
        long sentAt = Long.parseLong(timestamp);
        long now = clock.instant().getEpochSecond();
        if (sentAt < now - TOLERANCE_SECONDS || sentAt > now + TOLERANCE_SECONDS) {
            return false;
        }

        byte[] expected = computeSignature(id, timestamp, body);
        for (String signature : signatures.split(" +")) {
            if (signature.startsWith("v1,")) {
                try {
                    if (MessageDigest.isEqual(expected, Base64.getDecoder().decode(signature.substring(3)))) {
                        return true;
                    }
                } catch (IllegalArgumentException ignored) {
                    // An invalid entry must not prevent verification of another v1 signature.
                }
            }
        }
        return false;
    }

    private byte[] computeSignature(String id, String timestamp, byte[] body) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(key);
            mac.update((id + "." + timestamp + ".").getBytes(StandardCharsets.UTF_8));
            return mac.doFinal(body);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Postal signature algorithm unavailable", ex);
        }
    }
}
