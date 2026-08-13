package com.equio.backend.shared.security;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class InMemoryRateLimiter {
    private static final int MAX_KEYS = 50_000;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public Decision consume(String key, int limit, Duration duration) {
        Instant now = Instant.now();
        if (windows.size() >= MAX_KEYS && !windows.containsKey(key)) {
            return new Decision(false, duration.toSeconds());
        }
        Window window = windows.compute(key, (ignored, current) -> {
            if (current == null || now.isAfter(current.resetAt())) {
                return new Window(new AtomicInteger(1), now.plus(duration));
            }
            current.count().incrementAndGet();
            return current;
        });
        long retryAfter = Math.max(1, Duration.between(now, window.resetAt()).toSeconds());
        return new Decision(window.count().get() <= limit, retryAfter);
    }

    @Scheduled(fixedDelay = 300_000)
    void removeExpiredWindows() {
        Instant now = Instant.now();
        windows.entrySet().removeIf(entry -> now.isAfter(entry.getValue().resetAt()));
    }

    private record Window(AtomicInteger count, Instant resetAt) {
    }

    public record Decision(boolean allowed, long retryAfterSeconds) {
    }
}
