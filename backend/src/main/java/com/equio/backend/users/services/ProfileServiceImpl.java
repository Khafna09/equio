package com.equio.backend.users.services;

import com.equio.backend.users.dto.requests.ProfileRequest;
import com.equio.backend.users.entities.Profile;
import com.equio.backend.users.repositories.ProfileRepository;
import org.springframework.stereotype.Service;

@Service
public class ProfileServiceImpl implements ProfileService {

    private final ProfileRepository profileRepository;

    public ProfileServiceImpl(ProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    @Override
    public Profile updateProfile(Long userId, ProfileRequest request) {
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
                .orElseThrow(() -> new IllegalArgumentException("Profile not found for user ID: " + userId));

        if (request.firstName() != null) {
            profile.setFirstName(request.firstName());
        }
        if (request.lastName() != null) {
            profile.setLastName(request.lastName());
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
    
    public Profile getProfileByUserId(Long userId) {
        return profileRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Profile not found for user ID: " + userId));
    }
}
