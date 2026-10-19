package com.equio.backend.users.services;

import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import com.equio.backend.users.entities.Profile;
import com.equio.backend.users.entities.enums.BudgetMode;
import com.equio.backend.users.repositories.ProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileBudgetModeService {
    private final ProfileRepository profileRepository;

    public ProfileBudgetModeService(ProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    @Transactional(readOnly = true)
    public BudgetMode getMode(Long userId) {
        return requireProfile(userId).getBudgetMode();
    }

    @Transactional
    public BudgetMode setMode(Long userId, BudgetMode mode) {
        var profile = requireProfile(userId);
        profile.setBudgetMode(mode);
        profileRepository.save(profile);
        return mode;
    }

    private Profile requireProfile(Long userId) {
        return profileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Profile"));
    }
}
