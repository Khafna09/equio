package com.equio.backend.users.dto.responses;

import java.util.List;

public record JwtResponse(
        String token,
        Long id,
        String email,
        String firstName,
        String lastName,
        List<String> roles
) {}
