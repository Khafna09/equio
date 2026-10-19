package com.equio.backend.shared.security;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;

class SensitiveDataHasherTest {
    @Test
    void createsDeterministicKeyedHashes() {
        var first = new SensitiveDataHasher(key("first-key"));
        var second = new SensitiveDataHasher(key("second-key"));

        String firstHash = first.hash("192.0.2.10");
        assertEquals(firstHash, first.hash("192.0.2.10"));
        assertEquals(64, firstHash.length());
        assertNotEquals(firstHash, second.hash("192.0.2.10"));
        assertNotEquals(firstHash, first.hash("192.0.2.11"));
    }

    @Test
    void rejectsWeakOrMalformedKeys() {
        assertThrows(IllegalStateException.class,
                () -> new SensitiveDataHasher("not-base64"));
        assertThrows(IllegalStateException.class,
                () -> new SensitiveDataHasher(Base64.getEncoder()
                        .encodeToString(new byte[16])));
    }

    private String key(String prefix) {
        byte[] bytes = (prefix + "-0123456789-0123456789-0123456789")
                .getBytes(StandardCharsets.UTF_8);
        return Base64.getEncoder().encodeToString(bytes);
    }
}
