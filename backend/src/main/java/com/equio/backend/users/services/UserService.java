package com.equio.backend.users.services;

import com.equio.backend.users.dto.requests.ProfileRequest;
import com.equio.backend.users.entities.User;
import com.equio.backend.users.dto.requests.SignUpRequest;

import java.util.Optional;

/**
 * Interfaz unificada para la lógica de negocio relacionada con los Usuarios.
 */
public interface UserService {
    
    Optional<User> findById(Long id);
    
    Optional<User> findByEmail(String email);
    
    User registerUser(SignUpRequest request);


    User updateProfile(Long userId, ProfileRequest request);
}
