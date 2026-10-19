package com.equio.backend.users.services;

import com.equio.backend.shared.exceptions.UnauthorizedException;
import com.equio.backend.shared.jobs.DatabaseJobLock;
import com.equio.backend.shared.security.RequestMetadata;
import com.equio.backend.shared.security.SensitiveDataHasher;
import com.equio.backend.users.entities.*;
import com.equio.backend.users.repositories.RefreshTokenSessionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;

@Service
public class RefreshTokenService {
    private static final long CLEANUP_JOB_LOCK_ID = 1_002L;
    private final RefreshTokenSessionRepository repository;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Duration lifetime;
    private final SensitiveDataHasher metadataHasher;
    private final DatabaseJobLock jobLock;

    public RefreshTokenService(
            RefreshTokenSessionRepository repository,
            SensitiveDataHasher metadataHasher,
            DatabaseJobLock jobLock,
            @Value("${app.refresh-token.expiration-days}") long expirationDays
    ) {
        if (expirationDays < 1 || expirationDays > 90) {
            throw new IllegalStateException("Refresh token expiration must be between 1 and 90 days");
        }
        this.repository = repository;
        this.metadataHasher = metadataHasher;
        this.jobLock = jobLock;
        this.lifetime = Duration.ofDays(expirationDays);
    }

    @Transactional
    public IssuedRefreshToken issue(User user, RequestMetadata metadata) {
        return create(user, metadata);
    }

    @Transactional(noRollbackFor = UnauthorizedException.class)
    public RotatedRefreshToken rotate(String rawToken, RequestMetadata metadata) {
        Instant now = Instant.now();
        var current = repository.findByTokenHashForUpdate(hash(rawToken))
                .orElseThrow(this::invalidToken);

        if (current.getRevokedAt() != null) {
            repository.revokeAllActiveForUser(current.getUser().getId(), now);
            throw invalidToken();
        }
        if (!current.getExpiresAt().isAfter(now)) {
            current.setRevokedAt(now);
            throw invalidToken();
        }

        var replacement = create(current.getUser(), metadata);
        current.setLastUsedAt(now);
        current.setRevokedAt(now);
        current.setReplacedByHash(hash(replacement.rawToken()));
        repository.save(current);
        return new RotatedRefreshToken(
                current.getUser(),
                replacement.rawToken(),
                replacement.expiresAt()
        );
    }

    @Transactional
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        repository.findByTokenHashForUpdate(hash(rawToken)).ifPresent(session -> {
            if (session.getRevokedAt() == null) {
                session.setRevokedAt(Instant.now());
                repository.save(session);
            }
        });
    }

    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    void deleteExpiredSessions() {
        if (jobLock.tryAcquire(CLEANUP_JOB_LOCK_ID)) {
            repository.deleteExpiredBefore(Instant.now().minus(Duration.ofDays(7)));
        }
    }

    private IssuedRefreshToken create(User user, RequestMetadata metadata) {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        Instant now = Instant.now();
        Instant expiresAt = now.plus(lifetime);

        var session = new RefreshTokenSession();
        session.setId(UUID.randomUUID());
        session.setTokenHash(hash(rawToken));
        session.setUser(user);
        session.setCreatedAt(now);
        session.setExpiresAt(expiresAt);
        session.setIpHash(metadataHasher.hash(metadata.ipAddress()));
        session.setUserAgentHash(metadataHasher.hash(metadata.userAgent()));
        repository.save(session);
        return new IssuedRefreshToken(rawToken, expiresAt);
    }

    private String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private UnauthorizedException invalidToken() {
        return new UnauthorizedException("The refresh token is invalid or expired.");
    }

    public record IssuedRefreshToken(String rawToken, Instant expiresAt) {
    }

    public record RotatedRefreshToken(User user, String rawToken, Instant expiresAt) {
    }
}
