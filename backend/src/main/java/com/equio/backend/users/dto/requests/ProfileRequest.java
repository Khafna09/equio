package com.equio.backend.users.dto.requests;

import jakarta.validation.constraints.*;

public record ProfileRequest(
        @Size(max = 50)
        @Pattern(regexp = "^[\\p{L}\\p{M} .'-]+$", message = "contains unsupported characters")
        String firstName,
        @Size(max = 50)
        @Pattern(regexp = "^[\\p{L}\\p{M} .'-]+$", message = "contains unsupported characters")
        String lastName,
        @Pattern(regexp = "^(es|en)$") String language,
        @Pattern(regexp = "^[A-Z]{3}$") String currency,
        @Pattern(regexp = "^(light|dark|system)$") String theme,
        @Pattern(regexp = "^(12|24)$") String timeFormat
) {
}
