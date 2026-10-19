package com.equio.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
class BackendApplicationTests {
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void contextLoads() {
    }

    @Test
    void hashesLongPasswordsWithoutBcryptTruncationAndSupportsLegacyHashes() {
        String password = "a".repeat(90) + "-original";
        String sameBcryptPrefix = "a".repeat(90) + "-different";
        String encoded = passwordEncoder.encode(password);

        assertTrue(encoded.startsWith("{pbkdf2}"));
        assertTrue(passwordEncoder.matches(password, encoded));
        assertFalse(passwordEncoder.matches(sameBcryptPrefix, encoded));

        String legacyHash = new BCryptPasswordEncoder(10).encode("legacy-password");
        assertTrue(passwordEncoder.matches("legacy-password", legacyHash));
    }
}
