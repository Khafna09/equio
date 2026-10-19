package com.equio.backend.users.dto.requests;

import jakarta.validation.constraints.*;

public record SignUpRequest(
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 12, max = 128) String password,
        @NotBlank @Size(max = 50)
        @Pattern(regexp = "^[\\p{L}\\p{M} .'-]+$", message = "contains unsupported characters")
        String firstName,
        @NotBlank @Size(max = 50)
        @Pattern(regexp = "^[\\p{L}\\p{M} .'-]+$", message = "contains unsupported characters")
        String lastName,
        @Pattern(regexp = "^(es|en)$") String language,
        @Pattern(regexp = "^[A-Z]{3}$") String currency,
        @Pattern(regexp = "^(light|dark|system)$") String theme
) {
}
