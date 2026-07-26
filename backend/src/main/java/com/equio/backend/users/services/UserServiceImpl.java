package com.equio.backend.users.services;


import com.equio.backend.users.dto.requests.ProfileRequest;
import com.equio.backend.users.dto.requests.SignUpRequest;
import com.equio.backend.users.entities.User;
import com.equio.backend.users.repositories.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final com.equio.backend.users.repositories.RoleRepository roleRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public UserServiceImpl(UserRepository userRepository, com.equio.backend.users.repositories.RoleRepository roleRepository, org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }


    @Override
    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public User registerUser(SignUpRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email is already in use");
        }

        User user = new User();
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        
        // Asignar rol por defecto (USER)
        var userRole = roleRepository.findByName(com.equio.backend.users.entities.enums.Roles.ROLE_USER)
                .orElseGet(() -> {
                    com.equio.backend.users.entities.Role role = new com.equio.backend.users.entities.Role();
                    role.setName(com.equio.backend.users.entities.enums.Roles.ROLE_USER);
                    return roleRepository.save(role);
                });
        user.addRole(userRole);

        // Crear perfil asociado
        com.equio.backend.users.entities.Profile profile = new com.equio.backend.users.entities.Profile();
        profile.setFirstName(request.firstName());
        profile.setLastName(request.lastName());
        if (request.language() != null) profile.setLanguage(request.language());
        if (request.currency() != null) profile.setCurrency(request.currency());
        if (request.theme() != null) profile.setTheme(request.theme());
        profile.setUser(user);
        user.setProfile(profile);

        return userRepository.save(user);
    }

    @Override
    public User updateProfile(Long userId, ProfileRequest request) {
        return null;
    }
}
