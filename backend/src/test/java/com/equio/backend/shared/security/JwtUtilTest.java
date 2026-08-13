package com.equio.backend.shared.security;

import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {
    private static final String SECRET = Base64.getEncoder().encodeToString(
            "a-test-secret-with-more-than-thirty-two-bytes".getBytes());

    @Test
    void generatesAndValidatesAccessTokenWithRequiredClaims() {
        JwtUtil jwtUtil = new JwtUtil(
                SECRET,
                900_000,
                "equio-test",
                "equio-web-test"
        );
        var user = User.withUsername("developer@example.test")
                .password("unused")
                .authorities("ROLE_USER")
                .build();

        String token = jwtUtil.generateAccessToken(user);

        assertEquals("developer@example.test", jwtUtil.extractUsername(token));
        assertTrue(jwtUtil.validateAccessToken(token, user));
        assertEquals(900, jwtUtil.getExpirationSeconds());
    }

    @Test
    void rejectsTokenForDifferentAudience() {
        JwtUtil issuer = new JwtUtil(
                SECRET,
                900_000,
                "equio-test",
                "equio-web-test"
        );
        JwtUtil verifier = new JwtUtil(
                SECRET,
                900_000,
                "equio-test",
                "another-client"
        );
        var user = User.withUsername("developer@example.test")
                .password("unused")
                .authorities("ROLE_USER")
                .build();

        String token = issuer.generateAccessToken(user);

        assertThrows(JwtException.class, () -> verifier.extractUsername(token));
    }

    @Test
    void rejectsWeakKeyAndExcessiveLifetime() {
        String weakKey = Base64.getEncoder().encodeToString("too-short".getBytes());

        assertThrows(
                IllegalStateException.class,
                () -> new JwtUtil(weakKey, 900_000, "issuer", "audience")
        );
        assertThrows(
                IllegalStateException.class,
                () -> new JwtUtil(SECRET, 3_600_001, "issuer", "audience")
        );
    }
}
