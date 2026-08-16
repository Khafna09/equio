package com.equio.backend.users.services;

import com.equio.backend.users.entities.User;
import com.equio.backend.users.dto.requests.SignUpRequest;

import java.util.Optional;

public interface UserService {
    
    Optional<User> findById(Long id);
    
    Optional<User> findByEmail(String email);

    User requireAuthenticated(String email);
    
    User registerUser(SignUpRequest request);
}
