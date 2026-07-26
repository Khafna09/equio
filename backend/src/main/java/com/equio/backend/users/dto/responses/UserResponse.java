package com.equio.backend.users.dto.responses;

import java.util.List;

/**
 * DTO para enviar los datos de usuario al cliente.
 */
public record UserResponse(
    Long id,
    String email,
    String firstName,
    String lastName,
    String language,
    String currency,
    List<String> roles
) {}

