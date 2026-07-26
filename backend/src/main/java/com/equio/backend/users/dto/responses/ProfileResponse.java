package com.equio.backend.users.dto.responses;

public record ProfileResponse (
        Long id,
        String firstName,
        String lastName,
        String language,
        String currency,
        String theme
) {
}
