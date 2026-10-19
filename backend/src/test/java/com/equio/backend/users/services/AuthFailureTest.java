package com.equio.backend.users.services;

import com.equio.backend.shared.exceptions.UnauthorizedException;
import com.equio.backend.shared.security.*;
import com.equio.backend.users.dto.requests.SignInRequest;
import com.equio.backend.users.entities.User;
import com.equio.backend.users.repositories.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.Instant;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthFailureTest {
    @Test void missingDisabledAndLockedAccountsHaveTheSameFailureAndHashWork() {
        var repository = mock(UserRepository.class);
        var encoder = mock(PasswordEncoder.class);
        when(encoder.encode(anyString())).thenReturn("dummy");
        var service = new AuthServiceImpl(repository, mock(UserDetailsServiceImpl.class), encoder,
                mock(JwtUtil.class), mock(RefreshTokenService.class), new InMemoryRateLimiter(), 10, 5, 15);
        var disabled = new User();
        disabled.setEnabled(false);
        var locked = new User();
        locked.setLockedUntil(Instant.now().plusSeconds(60));
        for (Optional<User> user : java.util.List.of(Optional.<User>empty(), Optional.of(disabled), Optional.of(locked))) {
            when(repository.findLockedByEmail("audit@test.example")).thenReturn(user);
            var exception = assertThrows(UnauthorizedException.class, () -> service.authenticate(
                    new SignInRequest("audit@test.example", "Password-2026!"), new RequestMetadata("127.0.0.1", "test")));
            assertEquals("Invalid email or password.", exception.getMessage());
        }
        verify(encoder, times(3)).matches("Password-2026!", "dummy");
        verify(repository, never()).save(any());
    }
}
