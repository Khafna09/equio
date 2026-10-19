package com.equio.backend.users.services;

import com.equio.backend.users.dto.requests.*;
import com.equio.backend.users.entities.*;
import com.equio.backend.users.entities.enums.Roles;
import com.equio.backend.users.repositories.*;
import com.equio.backend.shared.exceptions.BusinessConflictException;
import com.equio.backend.shared.exceptions.UnauthorizedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public UserServiceImpl(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder
    ) {
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
        return userRepository.findByEmail(normalizeEmail(email));
    }

    @Override
    public User requireAuthenticated(String email) {
        return findByEmail(email).orElseThrow(
                () -> new UnauthorizedException("Authentication is no longer valid."));
    }

    @Override
    @Transactional
    public User registerUser(SignUpRequest request) {
        String email = normalizeEmail(request.email());
        String passwordHash = passwordEncoder.encode(request.password());
        if (userRepository.existsByEmail(email)) {
            throw new BusinessConflictException("REGISTRATION_NOT_ACCEPTED", "Registration request processed.");
        }

        var user = new User();
        user.setEmail(email);
        user.setPassword(passwordHash);

        var userRole = roleRepository.findByName(Roles.ROLE_USER)
                .orElseGet(() -> roleRepository.save(new Role(Roles.ROLE_USER)));
        user.addRole(userRole);

        var profile = new Profile();
        profile.setFirstName(request.firstName().trim());
        profile.setLastName(request.lastName().trim());
        profile.setLanguage(request.language() == null ? "es" : request.language());
        profile.setCurrency(request.currency() == null ? "PEN" : request.currency());
        profile.setTheme(request.theme() == null ? "light" : request.theme());
        profile.setUser(user);
        user.setProfile(profile);
        return userRepository.save(user);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
