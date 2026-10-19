package com.equio.backend.shared.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Base64;
import java.util.HexFormat;

@Component
public class SensitiveDataHasher {
    private static final String ALGORITHM = "HmacSHA256";
    private final SecretKeySpec key;

    public SensitiveDataHasher(
            @Value("${app.security.metadata-hash-key-base64}") String encodedKey
    ) {
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(encodedKey);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException(
                    "Metadata hash key must be valid Base64", exception);
        }
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                    "Metadata hash key must contain at least 32 bytes");
        }
        this.key = new SecretKeySpec(keyBytes, ALGORITHM);
    }

    public String hash(String value) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(key);
            byte[] digest = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("HMAC-SHA-256 is unavailable", exception);
        }
    }
}
