package com.equio.backend.users.services;

import com.equio.backend.users.repositories.ProfileRepository;
import com.equio.backend.shared.security.RlsContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfilePreferencesService {

    private final ProfileRepository profileRepository;
    private final RlsContext rlsContext;

    public ProfilePreferencesService(ProfileRepository profileRepository, RlsContext rlsContext) {
        this.profileRepository = profileRepository;
        this.rlsContext = rlsContext;
    }

    @Transactional(readOnly = true)
    public Preferences findPreferences(Long userId) {
        rlsContext.setUserId(userId);
        return profileRepository.findByUserId(userId)
                .map(profile -> new Preferences(profile.getLanguage(), profile.getCurrency()))
                .orElseGet(() -> new Preferences("es", "PEN"));
    }

    public record Preferences(String language, String currency) {
    }
}
