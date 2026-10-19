package com.equio.backend.shared.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtUtil {
    private final SecretKey signingKey;
    private final long expirationMs;
    private final String issuer;
    private final String audience;

    public JwtUtil(
            @Value("${app.jwt.secret-base64}") String secretBase64,
            @Value("${app.jwt.access-expiration-ms}") long expirationMs,
            @Value("${app.jwt.issuer}") String issuer,
            @Value("${app.jwt.audience}") String audience
    ) {
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secretBase64);
        } catch (RuntimeException exception) {
            throw new IllegalStateException("JWT_SECRET_BASE64 must contain valid Base64", exception);
        }
        if (keyBytes.length < 32) {
            throw new IllegalStateException("JWT signing key must contain at least 256 bits");
        }
        if (expirationMs < 60_000 || expirationMs > 3_600_000) {
            throw new IllegalStateException("Access token expiration must be between 1 and 60 minutes");
        }
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        this.expirationMs = expirationMs;
        this.issuer = issuer;
        this.audience = audience;
    }

    public String generateAccessToken(UserDetails userDetails) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userDetails.getUsername())
                .issuer(issuer)
                .audience().add(audience).and()
                .id(UUID.randomUUID().toString())
                .claim("type", "access")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expirationMs)))
                .signWith(signingKey)
                .compact();
    }

    public String extractUsername(String token) {
        return parse(token).getSubject();
    }

    public boolean validateAccessToken(String token, UserDetails userDetails) {
        Claims claims = parse(token);
        return userDetails.isEnabled()
                && userDetails.isAccountNonLocked()
                && userDetails.getUsername().equals(claims.getSubject())
                && "access".equals(claims.get("type", String.class));
    }

    public long getExpirationSeconds() {
        return expirationMs / 1000;
    }

    private Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(issuer)
                .requireAudience(audience)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
