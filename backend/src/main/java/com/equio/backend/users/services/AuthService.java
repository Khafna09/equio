package com.equio.backend.users.services;

import com.equio.backend.users.dto.responses.JwtResponse;
import com.equio.backend.users.dto.requests.SignInRequest;

public interface AuthService {
    JwtResponse authenticate(SignInRequest request);
}
