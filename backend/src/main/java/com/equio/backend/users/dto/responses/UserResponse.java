package com.equio.backend.users.dto.responses;

import java.util.List;

public record UserResponse(
    Long id,
    String email,
    String firstName,
    String lastName,
    String language,
    String currency,
    List<String> roles
) {}

