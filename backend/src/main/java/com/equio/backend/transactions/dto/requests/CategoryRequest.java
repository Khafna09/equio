package com.equio.backend.transactions.dto.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CategoryRequest(
        @NotBlank @Size(max = 50) String name,
        @NotBlank @Size(max = 30) String color,
        @NotBlank @Size(max = 50) String icon
) {}
