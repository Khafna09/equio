package com.equio.backend.emailintake.infrastructure;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PostalWebhookVerifierTest {
    private static final String TEST_SECRET = "whsec_BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=";
    private static final String SIGNATURE = "v1,tWJSg88UfEX90xj2iJAoUqUqeVOrW7Qpsoazbe3wIpc=";
    private static final byte[] BODY = "{\"text\":\"caf\u00e9\"}".getBytes(StandardCharsets.UTF_8);

    @Test
    void verifiesOriginalUtf8BytesAndSupportsMultipleSignatures() {
        assertTrue(verifierAt(0).isValid("evt_demo", "1795518000", "v1,! " + SIGNATURE, BODY));
        assertFalse(verifierAt(0).isValid("evt_other", "1795518000", SIGNATURE, BODY));
        assertFalse(verifierAt(0).isValid("evt_demo", "1795518000", SIGNATURE, new byte[]{42}));
    }

    @Test
    void rejectsExpiredFutureAndOversizedMessages() {
        assertFalse(verifierAt(301).isValid("evt_demo", "1795518000", SIGNATURE, BODY));
        assertFalse(verifierAt(-301).isValid("evt_demo", "1795518000", SIGNATURE, BODY));
        assertFalse(verifierAt(0).isValid("evt_demo", "1795518000", SIGNATURE,
                new byte[PostalWebhookVerifier.MAX_BODY_BYTES + 1]));
        assertFalse(verifierAt(0).isValid("evt_demo", null, SIGNATURE, BODY));
    }

    @Test
    void failsClosedWithInvalidConfiguration() {
        assertThrows(IllegalArgumentException.class,
                () -> new PostalWebhookVerifier("whsec_!", Clock.systemUTC()));
    }

    private PostalWebhookVerifier verifierAt(long offset) {
        return new PostalWebhookVerifier(TEST_SECRET,
                Clock.fixed(Instant.ofEpochSecond(1795518000L + offset), ZoneOffset.UTC));
    }
}
