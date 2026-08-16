package com.equio.backend.shared.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

@Component
public class RateLimitFilter extends OncePerRequestFilter {
    private final InMemoryRateLimiter rateLimiter;
    private final SecurityErrorWriter errorWriter;
    private final int requestsPerMinute;
    private final int signUpRequestsPerMinute;
    private final int imageSearchRequestsPerMinute;

    public RateLimitFilter(
            InMemoryRateLimiter rateLimiter,
            SecurityErrorWriter errorWriter,
            @Value("${app.security.global-rate-limit-per-minute}") int requestsPerMinute,
            @Value("${app.security.sign-up-rate-limit-per-minute:5}") int signUpRequestsPerMinute,
            @Value("${app.security.image-search-rate-limit-per-minute:30}") int imageSearchRequestsPerMinute
    ) {
        if (requestsPerMinute < 1 || requestsPerMinute > 100_000) {
            throw new IllegalStateException(
                    "Global rate limit must be between 1 and 100000");
        }
        if (signUpRequestsPerMinute < 1 || signUpRequestsPerMinute > 100) {
            throw new IllegalStateException(
                    "Sign-up rate limit must be between 1 and 100");
        }
        if (imageSearchRequestsPerMinute < 1 || imageSearchRequestsPerMinute > 1_000) {
            throw new IllegalStateException(
                    "Image search rate limit must be between 1 and 1000");
        }
        this.rateLimiter = rateLimiter;
        this.errorWriter = errorWriter;
        this.requestsPerMinute = requestsPerMinute;
        this.signUpRequestsPerMinute = signUpRequestsPerMinute;
        this.imageSearchRequestsPerMinute = imageSearchRequestsPerMinute;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        var decision = rateLimiter.consume(
                "global:" + request.getRemoteAddr(),
                requestsPerMinute,
                Duration.ofMinutes(1)
        );
        if (!decision.allowed()) {
            reject(response, decision);
            return;
        }

        String path = request.getRequestURI().substring(request.getContextPath().length());
        if ("POST".equalsIgnoreCase(request.getMethod())
                && "/api/v1/auth/sign-up".equals(path)) {
            decision = rateLimiter.consume(
                    "sign-up:" + request.getRemoteAddr(),
                    signUpRequestsPerMinute,
                    Duration.ofMinutes(1)
            );
        } else if ("GET".equalsIgnoreCase(request.getMethod())
                && "/api/v1/images/search".equals(path)) {
            decision = rateLimiter.consume(
                    "image-search:" + request.getRemoteAddr(),
                    imageSearchRequestsPerMinute,
                    Duration.ofMinutes(1)
            );
        }
        if (!decision.allowed()) {
            reject(response, decision);
            return;
        }
        filterChain.doFilter(request, response);
    }

    private void reject(
            HttpServletResponse response,
            InMemoryRateLimiter.Decision decision
    ) throws IOException {
        response.setHeader("Retry-After", Long.toString(decision.retryAfterSeconds()));
        errorWriter.write(
                response,
                429,
                "Too Many Requests",
                "Too many requests. Try again later."
        );
    }
}
