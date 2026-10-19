package com.equio.backend.users.services;

import com.equio.backend.shared.security.RequestMetadata;
import com.equio.backend.users.dto.requests.SignInRequest;

public interface AuthService {
    AuthenticatedSession authenticate(SignInRequest request, RequestMetadata metadata);
    AuthenticatedSession refresh(String refreshToken, RequestMetadata metadata);
    void logout(String refreshToken);
}
