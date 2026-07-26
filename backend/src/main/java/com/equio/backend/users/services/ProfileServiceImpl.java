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
        Profile profile = profileRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Profile not found for user ID: " + userId));

        profile.setFirstName(request.firstName());
        profile.setLastName(request.lastName());
        profile.setLanguage(request.language());
        if (request.currency() != null) {
            profile.setCurrency(request.currency());
        }
        if (request.theme() != null) {
            profile.setTheme(request.theme());
        }
        return profileRepository.save(profile);
    }
    
    public Profile getProfileByUserId(Long userId) {
        return profileRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Profile not found for user ID: " + userId));
    }
}
