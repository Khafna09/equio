package com.equio.backend.transactions.dto.requests;

import jakarta.validation.constraints.*;

public record CategoryRequest(
        @Pattern(regexp = "^[^\\p{Cc}\\p{Cf}\\p{Cs}]*$", message = "must not contain control characters")
        @NotBlank @Size(max = 50) String name,
        @NotBlank
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "must be a six-digit hexadecimal color")
        String color,
        @Pattern(regexp = "^[^\\p{Cc}\\p{Cf}\\p{Cs}]*$", message = "must not contain control characters")
        @NotBlank @Size(max = 50) String icon
) {
}
