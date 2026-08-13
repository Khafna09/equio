package com.equio.backend.users.dto.requests;

import jakarta.validation.constraints.*;

public record ProfileRequest(
        @NotBlank @Size(max = 50)
        @Pattern(regexp = "^[\\p{L}\\p{M} .'-]+$", message = "contains unsupported characters")
        String firstName,
        @NotBlank @Size(max = 50)
        @Pattern(regexp = "^[\\p{L}\\p{M} .'-]+$", message = "contains unsupported characters")
        String lastName,
        @NotNull @Pattern(regexp = "^(es|en)$") String language,
        @Pattern(regexp = "^[A-Z]{3}$") String currency,
        @Pattern(regexp = "^(light|dark|system)$") String theme
) {
}
