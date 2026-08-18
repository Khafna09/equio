package com.equio.backend.users.services;

import com.equio.backend.users.repositories.ProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfilePreferencesService {

    private final ProfileRepository profileRepository;

    public ProfilePreferencesService(ProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    @Transactional(readOnly = true)
    public Preferences findPreferences(Long userId) {
        return profileRepository.findByUserId(userId)
                .map(profile -> new Preferences(profile.getLanguage(), profile.getCurrency()))
                .orElseGet(() -> new Preferences("es", "PEN"));
    }

    public record Preferences(String language, String currency) {
    }
}
