package com.equio.backend.users.controllers;

import com.equio.backend.shared.security.RequestMetadata;
import com.equio.backend.users.dto.requests.*;
import com.equio.backend.users.dto.responses.*;
import com.equio.backend.users.services.*;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final RegistrationService registrationService;
    private final AuthService authService;
    private final String refreshCookieName;
    private final boolean cookieSecure;
    private final String sameSite;
    private final String cookieDomain;

    public AuthController(
            RegistrationService registrationService,
            AuthService authService,
            @Value("${app.refresh-token.cookie-name}") String refreshCookieName,
            @Value("${app.refresh-token.cookie-secure}") boolean cookieSecure,
            @Value("${app.refresh-token.same-site}") String sameSite,
            @Value("${app.refresh-token.domain:}") String cookieDomain
    ) {
        this.registrationService = registrationService;
        this.authService = authService;
        this.refreshCookieName = refreshCookieName;
        this.cookieSecure = cookieSecure;
        this.sameSite = sameSite;
        this.cookieDomain = cookieDomain;
    }

    @PostMapping("/sign-up")
    public ResponseEntity<Map<String, String>> signUp(@Valid @RequestBody SignUpRequest request) {
        registrationService.submit(request);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .cacheControl(CacheControl.noStore())
                .body(Map.of("message", "Registration request processed. Continue to sign in."));
    }

    @PostMapping("/sign-in")
    public ResponseEntity<JwtResponse> signIn(
            @Valid @RequestBody SignInRequest request,
            HttpServletRequest httpRequest
    ) {
        var session = authService.authenticate(request, RequestMetadata.from(httpRequest));
        return withRefreshCookie(session);
    }

    @PostMapping("/refresh")
    public ResponseEntity<JwtResponse> refresh(
            @CookieValue(name = "${app.refresh-token.cookie-name}", required = false) String refreshToken,
            HttpServletRequest httpRequest
    ) {
        var session = authService.refresh(refreshToken, RequestMetadata.from(httpRequest));
        return withRefreshCookie(session);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = "${app.refresh-token.cookie-name}", required = false) String refreshToken
    ) {
        authService.logout(refreshToken);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
                .build();
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken csrfToken) {
        return Map.of("token", csrfToken.getToken());
    }

    private ResponseEntity<JwtResponse> withRefreshCookie(AuthenticatedSession session) {
        Duration maxAge = Duration.between(
                java.time.Instant.now(), session.refreshExpiresAt());
        var builder = ResponseCookie.from(refreshCookieName, session.refreshToken())
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(sameSite)
                .path("/api/v1/auth")
                .maxAge(maxAge);
        if (!cookieDomain.isBlank()) {
            builder.domain(cookieDomain);
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, builder.build().toString())
                .cacheControl(CacheControl.noStore())
                .body(session.response());
    }

    private ResponseCookie clearRefreshCookie() {
        var builder = ResponseCookie.from(refreshCookieName, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(sameSite)
                .path("/api/v1/auth")
                .maxAge(Duration.ZERO);
        if (!cookieDomain.isBlank()) {
            builder.domain(cookieDomain);
        }
        return builder.build();
    }
}
