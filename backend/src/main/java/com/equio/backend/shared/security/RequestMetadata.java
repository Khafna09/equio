package com.equio.backend.shared.security;

import jakarta.servlet.http.HttpServletRequest;

public record RequestMetadata(String ipAddress, String userAgent) {
    public static RequestMetadata from(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        return new RequestMetadata(
                limit(request.getRemoteAddr(), 64),
                limit(userAgent == null ? "unknown" : userAgent, 512)
        );
    }

    private static String limit(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
