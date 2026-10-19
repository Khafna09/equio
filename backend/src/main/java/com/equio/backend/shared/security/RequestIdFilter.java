package com.equio.backend.shared.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.slf4j.MDC;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerMapping;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

@Component
public class RequestIdFilter extends OncePerRequestFilter {
    private static final Pattern SAFE_REQUEST_ID = Pattern.compile("^[A-Za-z0-9._-]{1,64}$");
    private static final Logger LOGGER = LoggerFactory.getLogger(RequestIdFilter.class);
    private final boolean loggingEnabled;
    private final long slowRequestMs;

    public RequestIdFilter(@Value("${app.observability.request-logging-enabled:true}") boolean loggingEnabled,
            @Value("${app.observability.slow-request-ms:2000}") long slowRequestMs) {
        if (slowRequestMs < 1) throw new IllegalStateException("Invalid slow request threshold");
        this.loggingEnabled = loggingEnabled;
        this.slowRequestMs = slowRequestMs;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String supplied = request.getHeader("X-Request-Id");
        String requestId = supplied != null && SAFE_REQUEST_ID.matcher(supplied).matches()
                ? supplied
                : UUID.randomUUID().toString();
        response.setHeader("X-Request-Id", requestId);
        MDC.put("requestId", requestId);
        long started = System.nanoTime();
        try {
            filterChain.doFilter(request, response);
        } finally {
            if (loggingEnabled) {
                long durationMs = (System.nanoTime() - started) / 1_000_000;
                Object template = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
                String route = template == null ? "unmapped" : template.toString();
                var level = response.getStatus() >= 500 ? org.slf4j.event.Level.ERROR
                        : durationMs >= slowRequestMs ? org.slf4j.event.Level.WARN : org.slf4j.event.Level.INFO;
                LOGGER.atLevel(level).log("http_request method={} route={} status={} durationMs={} requestId={}",
                        request.getMethod(), route, response.getStatus(), durationMs, requestId);
            }
            MDC.remove("requestId");
        }
    }
}
