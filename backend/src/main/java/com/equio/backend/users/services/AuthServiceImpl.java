package com.equio.backend.users.services;

import com.equio.backend.shared.exceptions.*;
import com.equio.backend.shared.security.*;
import com.equio.backend.users.dto.requests.SignInRequest;
import com.equio.backend.users.dto.responses.JwtResponse;
import com.equio.backend.users.entities.User;
import com.equio.backend.users.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.Locale;

@Service
public class AuthServiceImpl implements AuthService {
    private final UserRepository userRepository;
    private final UserDetailsServiceImpl userDetailsService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;
    private final InMemoryRateLimiter rateLimiter;
    private final int loginRateLimit;
    private final int lockAttempts;
    private final Duration lockDuration;
    private final String dummyPasswordHash;

    public AuthServiceImpl(
            UserRepository userRepository,
            UserDetailsServiceImpl userDetailsService,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            RefreshTokenService refreshTokenService,
            InMemoryRateLimiter rateLimiter,
            @Value("${app.security.login-rate-limit-per-minute}") int loginRateLimit,
            @Value("${app.security.account-lock-attempts}") int lockAttempts,
            @Value("${app.security.account-lock-minutes}") long lockMinutes
    ) {
        if (loginRateLimit < 1 || loginRateLimit > 10_000
                || lockAttempts < 1 || lockAttempts > 100
                || lockMinutes < 1 || lockMinutes > 1_440) {
            throw new IllegalStateException("Invalid authentication protection limits");
        }
        this.userRepository = userRepository;
        this.userDetailsService = userDetailsService;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.refreshTokenService = refreshTokenService;
        this.rateLimiter = rateLimiter;
        this.loginRateLimit = loginRateLimit;
        this.lockAttempts = lockAttempts;
        this.lockDuration = Duration.ofMinutes(lockMinutes);
        this.dummyPasswordHash = passwordEncoder.encode(
                "equio-dummy-password-for-timing-equalization");
    }

    @Override
    @Transactional(noRollbackFor = UnauthorizedException.class)
    public AuthenticatedSession authenticate(SignInRequest request, RequestMetadata metadata) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        enforceLoginRateLimit(metadata.ipAddress(), email);
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            passwordEncoder.matches(request.password(), dummyPasswordHash);
            throw invalidCredentials();
        }

        Instant now = Instant.now();
        if (!user.isEnabled()
                || user.getLockedUntil() != null && user.getLockedUntil().isAfter(now)) {
            throw invalidCredentials();
        }

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            int failures = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(failures);
            if (failures >= lockAttempts) {
                user.setLockedUntil(now.plus(lockDuration));
                user.setFailedLoginAttempts(0);
            }
            userRepository.save(user);
            throw invalidCredentials();
        }

        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(now);
        if (user.getPassword().startsWith("$2")
                || user.getPassword().startsWith("{bcrypt}")) {
            user.setPassword(passwordEncoder.encode(request.password()));
        }
        userRepository.save(user);

        var refreshToken = refreshTokenService.issue(user, metadata);
        return buildSession(user, refreshToken.rawToken(), refreshToken.expiresAt());
    }

    @Override
    @Transactional(noRollbackFor = UnauthorizedException.class)
    public AuthenticatedSession refresh(String refreshToken, RequestMetadata metadata) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new UnauthorizedException("The refresh token is invalid or expired.");
        }
        var rotated = refreshTokenService.rotate(refreshToken, metadata);
        if (!rotated.user().isEnabled()) {
            refreshTokenService.revoke(rotated.rawToken());
            throw new UnauthorizedException("The refresh token is invalid or expired.");
        }
        return buildSession(rotated.user(), rotated.rawToken(), rotated.expiresAt());
    }

    @Override
    public void logout(String refreshToken) {
        refreshTokenService.revoke(refreshToken);
    }

    private AuthenticatedSession buildSession(
            User user,
            String refreshToken,
            Instant refreshExpiresAt
    ) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String accessToken = jwtUtil.generateAccessToken(userDetails);
        var profile = user.getProfile();
        var response = new JwtResponse(
                accessToken,
                jwtUtil.getExpirationSeconds(),
                user.getId(),
                user.getEmail(),
                profile == null ? null : profile.getFirstName(),
                profile == null ? null : profile.getLastName(),
                profile == null ? null : profile.getLanguage(),
                profile == null ? null : profile.getCurrency(),
                user.getRoles().stream().map(role -> role.getName().name()).toList()
        );
        return new AuthenticatedSession(response, refreshToken, refreshExpiresAt);
    }

    private void enforceLoginRateLimit(String ipAddress, String email) {
        var ipDecision = rateLimiter.consume(
                "login-ip:" + ipAddress, loginRateLimit, Duration.ofMinutes(1));
        var accountDecision = rateLimiter.consume(
                "login-account:" + email, loginRateLimit, Duration.ofMinutes(1));
        if (!ipDecision.allowed() || !accountDecision.allowed()) {
            throw new TooManyRequestsException(Math.max(
                    ipDecision.retryAfterSeconds(),
                    accountDecision.retryAfterSeconds()
            ));
        }
    }

    private UnauthorizedException invalidCredentials() {
        return new UnauthorizedException("Invalid email or password.");
    }
}
