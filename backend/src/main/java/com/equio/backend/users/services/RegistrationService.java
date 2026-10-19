package com.equio.backend.users.services;

import com.equio.backend.shared.exceptions.BusinessConflictException;
import com.equio.backend.users.dto.requests.SignUpRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.sql.SQLException;

@Service
public class RegistrationService {
    private final UserService users;

    public RegistrationService(UserService users) {
        this.users = users;
    }

    public void submit(SignUpRequest request) {
        // Catch outside registerUser's transaction so a raced insert is rolled back first.
        try {
            users.registerUser(request);
        } catch (BusinessConflictException exception) {
            if (!"REGISTRATION_NOT_ACCEPTED".equals(exception.getCode())) throw exception;
        } catch (DataIntegrityViolationException exception) {
            if (!isUniqueViolation(exception) || users.findByEmail(request.email()).isEmpty()) throw exception;
        }
    }

    private boolean isUniqueViolation(Throwable exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException sql && "23505".equals(sql.getSQLState())) return true;
        }
        return false;
    }
}
