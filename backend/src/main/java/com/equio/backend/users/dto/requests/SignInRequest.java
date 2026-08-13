package com.equio.backend.users.dto.requests;

import jakarta.validation.constraints.*;

public record SignInRequest(
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(max = 128) String password
) {
}
