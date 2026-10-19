package com.equio.backend.users.services;

import com.equio.backend.shared.security.FinancialConcurrencyGuard;
import com.equio.backend.users.dto.requests.ProfileRequest;
import com.equio.backend.users.entities.Profile;
import com.equio.backend.users.entities.enums.BudgetMode;
import com.equio.backend.users.repositories.ProfileRepository;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProfileServiceTest {
    @Test
    void locksBeforeReadingAndDoesNotChangeTheBudgetMode() {
        var repository = mock(ProfileRepository.class);
        var guard = mock(FinancialConcurrencyGuard.class);
        var profile = new Profile();
        profile.setBudgetMode(BudgetMode.ADVANCED);
        when(repository.findByUserId(1L)).thenReturn(Optional.of(profile));
        when(repository.save(profile)).thenReturn(profile);
        var request = new ProfileRequest(null, null, null, null, "dark", null);

        new ProfileServiceImpl(repository, guard).updateProfile(1L, request);

        var order = inOrder(guard, repository);
        order.verify(guard).lock(1L);
        order.verify(repository).findByUserId(1L);
        assertEquals(BudgetMode.ADVANCED, profile.getBudgetMode());
        assertEquals("dark", profile.getTheme());
    }
}
