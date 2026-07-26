package com.equio.backend.users.services;

import com.equio.backend.users.dto.requests.ProfileRequest;
import com.equio.backend.users.entities.Profile;
import com.equio.backend.users.entities.User;

public interface ProfileService {

    Profile updateProfile(Long userId, ProfileRequest request);
    
    Profile getProfileByUserId(Long userId);
}
