package com.equio.backend.users.dto.requests;

import com.equio.backend.users.entities.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SignUpRequest(
    @NotBlank @Email
    String email,
    @NotBlank @Size(min = 8, max = 100)
    String password,
    @NotBlank @Size(max = 50)
    String firstName,
    @NotBlank @Size(max = 50)
    String lastName,
    @Size(max = 10)
    String language,
    @Size(max = 10)
    String currency,
    @Size(max = 20)
    String theme,
    List<Role> roles
) {}