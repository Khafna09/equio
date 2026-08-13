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

    public RateLimitFilter(
            InMemoryRateLimiter rateLimiter,
            SecurityErrorWriter errorWriter,
            @Value("${app.security.global-rate-limit-per-minute}") int requestsPerMinute
    ) {
        if (requestsPerMinute < 1 || requestsPerMinute > 100_000) {
            throw new IllegalStateException(
                    "Global rate limit must be between 1 and 100000");
        }
        this.rateLimiter = rateLimiter;
        this.errorWriter = errorWriter;
        this.requestsPerMinute = requestsPerMinute;
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
            response.setHeader("Retry-After", Long.toString(decision.retryAfterSeconds()));
            errorWriter.write(
                    response,
                    429,
                    "Too Many Requests",
                    "Too many requests. Try again later."
            );
            return;
        }
        filterChain.doFilter(request, response);
    }
}
