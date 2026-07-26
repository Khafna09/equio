package com.equio.backend.users.dto.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProfileRequest(
        @NotBlank @Size(max = 50)
        String firstName,
        @NotBlank @Size(max = 50)
        String lastName,
        @Size(max = 10)
        String language,
        @Size(max = 10)
        String currency,
        @Size(max = 20)
        String theme
) {
}