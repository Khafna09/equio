package com.equio.backend.emailintake.services;

import com.equio.backend.emailintake.domain.ExpenseDraft;
import com.equio.backend.emailintake.domain.ExpenseDraft.Status;
import com.equio.backend.emailintake.repositories.ExpenseDraftRepository;
import com.equio.backend.shared.exceptions.BusinessConflictException;
import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import com.equio.backend.shared.security.FinancialConcurrencyGuard;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.transactions.dto.requests.CreateMovementRequest;
import com.equio.backend.transactions.entities.enums.MovementType;
import com.equio.backend.transactions.services.CreateMovementService;
import com.equio.backend.users.services.ProfilePreferencesService;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ExpenseDraftService {
    private final ExpenseDraftRepository drafts;
    private final RlsContext rls;
    private final FinancialConcurrencyGuard guard;
    private final CreateMovementService movements;
    private final ProfilePreferencesService preferences;
    private final Validator validator;

    public ExpenseDraftService(ExpenseDraftRepository drafts, RlsContext rls, FinancialConcurrencyGuard guard,
                               CreateMovementService movements, ProfilePreferencesService preferences, Validator validator) {
        this.drafts = drafts;
        this.rls = rls;
        this.guard = guard;
        this.movements = movements;
        this.preferences = preferences;
        this.validator = validator;
    }

    @Transactional
    public boolean recordCandidate(long userId, String deliveryFingerprint, BigDecimal amount, String currency,
                                   String description, LocalDateTime occurredAt) {
        if (deliveryFingerprint == null || !deliveryFingerprint.matches("[0-9a-f]{64}")
                || currency == null || !currency.matches("[A-Z]{3}")) {
            throw new IllegalArgumentException("Invalid draft metadata");
        }
        toValidatedMovement(amount, description, occurredAt, null);
        rls.setUserId(userId);
        return drafts.insertIfNew(userId, deliveryFingerprint,
                new ExpenseDraft(UUID.randomUUID(), amount, currency, description, occurredAt, Status.PENDING, null));
    }

    @Transactional(readOnly = true)
    public List<ExpenseDraft> listPending(long userId) {
        rls.setUserId(userId);
        return drafts.findPending(userId, 100);
    }

    @Transactional
    public long approve(long userId, UUID id, BigDecimal amount, String description, LocalDateTime occurredAt, Long categoryId) {
        guard.lock(userId);
        rls.setUserId(userId);
        var draft = requireDraft(userId, id);
        if (draft.status() == Status.APPROVED) {
            return draft.movementId();
        }
        requirePending(draft);
        if (!draft.currency().equals(preferences.findPreferences(userId).currency())) {
            throw new BusinessConflictException("DRAFT_CURRENCY_MISMATCH", "Draft currency must match the profile currency.");
        }
        var request = toValidatedMovement(amount, description, occurredAt, categoryId);
        long movementId = movements.createMovement(userId, request).id();
        finish(userId, id, Status.APPROVED, movementId);
        return movementId;
    }

    @Transactional
    public void discard(long userId, UUID id) {
        guard.lock(userId);
        rls.setUserId(userId);
        var draft = requireDraft(userId, id);
        if (draft.status() == Status.DISCARDED) {
            return;
        }
        requirePending(draft);
        finish(userId, id, Status.DISCARDED, null);
    }

    private ExpenseDraft requireDraft(long userId, UUID id) {
        return drafts.find(userId, id).orElseThrow(() -> new ResourceNotFoundException("Expense draft"));
    }

    private static void requirePending(ExpenseDraft draft) {
        if (draft.status() != Status.PENDING) {
            throw new BusinessConflictException("DRAFT_ALREADY_RESOLVED", "Expense draft has already been resolved.");
        }
    }

    private void finish(long userId, UUID id, Status status, Long movementId) {
        if (!drafts.finishPending(userId, id, status, movementId)) {
            throw new BusinessConflictException("DRAFT_ALREADY_RESOLVED", "Expense draft has already been resolved.");
        }
    }

    private CreateMovementRequest toValidatedMovement(BigDecimal amount, String description, LocalDateTime date, Long categoryId) {
        var request = new CreateMovementRequest(amount, MovementType.EXPENSE, description, date, categoryId);
        var violations = validator.validate(request);
        if (!violations.isEmpty()) {
            throw new ConstraintViolationException(violations);
        }
        return request;
    }
}
