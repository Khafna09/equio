package com.equio.backend.users.services;

import com.equio.backend.users.dto.responses.JwtResponse;

import java.time.Instant;

public record AuthenticatedSession(
        JwtResponse response,
        String refreshToken,
        Instant refreshExpiresAt
) {
}
