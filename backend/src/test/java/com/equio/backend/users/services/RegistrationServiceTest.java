package com.equio.backend.users.services;

import com.equio.backend.shared.exceptions.BusinessConflictException;
import com.equio.backend.users.dto.requests.SignUpRequest;
import com.equio.backend.users.entities.User;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import java.sql.SQLException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RegistrationServiceTest {
    private final UserService users = mock(UserService.class);
    private final RegistrationService service = new RegistrationService(users);
    private final SignUpRequest request = new SignUpRequest("audit@test.example", "Audit-2026-Password!",
            "Audit", "User", "es", "PEN", "light");

    @Test void acknowledgesNewAndExistingAccountsWithoutReturningUserData() {
        when(users.registerUser(request)).thenReturn(new User());
        assertDoesNotThrow(() -> service.submit(request));
        when(users.registerUser(request)).thenThrow(new BusinessConflictException("REGISTRATION_NOT_ACCEPTED", "Processed"));
        assertDoesNotThrow(() -> service.submit(request));
    }

    @Test void acknowledgesRacedDuplicateOnlyAfterTheFailedTransaction() {
        when(users.registerUser(request)).thenThrow(new DataIntegrityViolationException("duplicate", new SQLException("private", "23505")));
        when(users.findByEmail(request.email())).thenReturn(Optional.of(new User()));
        assertDoesNotThrow(() -> service.submit(request));
        when(users.findByEmail(request.email())).thenReturn(Optional.empty());
        assertThrows(DataIntegrityViolationException.class, () -> service.submit(request));
    }

    @Test void doesNotHideOtherBusinessOrDatabaseFailures() {
        when(users.registerUser(request)).thenThrow(new BusinessConflictException("Unexpected"));
        assertThrows(BusinessConflictException.class, () -> service.submit(request));
        doThrow(new DataIntegrityViolationException("failure", new SQLException("private", "23503"))).when(users).registerUser(request);
        assertThrows(DataIntegrityViolationException.class, () -> service.submit(request));
    }
}
