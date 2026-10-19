package com.equio.backend.users.services;

import com.equio.backend.users.dto.requests.ProfileRequest;
import com.equio.backend.users.entities.Profile;
import com.equio.backend.users.repositories.ProfileRepository;
import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import com.equio.backend.shared.security.FinancialConcurrencyGuard;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileServiceImpl implements ProfileService {

    private final ProfileRepository profileRepository;
    private final FinancialConcurrencyGuard guard;

    public ProfileServiceImpl(ProfileRepository profileRepository, FinancialConcurrencyGuard guard) {
        this.profileRepository = profileRepository;
        this.guard = guard;
    }

    @Override
    @Transactional
    public Profile updateProfile(Long userId, ProfileRequest request) {
        guard.lock(userId);
        if (request.firstName() == null && request.lastName() == null
                && request.language() == null && request.currency() == null
                && request.theme() == null && request.timeFormat() == null) {
            throw new IllegalArgumentException("At least one profile field is required");
        }
        if (request.firstName() != null && request.firstName().isBlank()) {
            throw new IllegalArgumentException("First name must not be blank");
        }
        if (request.lastName() != null && request.lastName().isBlank()) {
            throw new IllegalArgumentException("Last name must not be blank");
        }

        Profile profile = profileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Profile"));

        if (request.firstName() != null) {
            profile.setFirstName(request.firstName().trim());
        }
        if (request.lastName() != null) {
            profile.setLastName(request.lastName().trim());
        }
        if (request.language() != null) {
            profile.setLanguage(request.language());
        }
        if (request.currency() != null) {
            profile.setCurrency(request.currency());
        }
        if (request.theme() != null) {
            profile.setTheme(request.theme());
        }
        if (request.timeFormat() != null) {
            profile.setTimeFormat(request.timeFormat());
        }
        return profileRepository.save(profile);
    }
    
    @Transactional(readOnly = true)
    public Profile getProfileByUserId(Long userId) {
        return profileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Profile"));
    }
}
