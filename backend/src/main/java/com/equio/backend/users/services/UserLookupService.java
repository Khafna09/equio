package com.equio.backend.users.services;

import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import com.equio.backend.users.entities.User;
import com.equio.backend.users.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UserLookupService {

    private final UserRepository userRepository;

    public UserLookupService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User"));
    }

    @Transactional(readOnly = true)
    public List<Long> findAllUserIds() {
        return userRepository.findAllIds();
    }

    @Transactional(readOnly = true)
    public List<Long> findIdsAfter(long cursor, int pageSize) {
        return userRepository.findIdsAfter(cursor, org.springframework.data.domain.PageRequest.of(0, pageSize));
    }
}
