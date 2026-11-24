package com.equio.backend.emailintake.services;

import com.equio.backend.emailintake.domain.ExpenseDraft;
import com.equio.backend.emailintake.domain.ExpenseDraft.Status;
import com.equio.backend.emailintake.repositories.ExpenseDraftRepository;
import com.equio.backend.shared.exceptions.BusinessConflictException;
import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import com.equio.backend.shared.security.FinancialConcurrencyGuard;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.transactions.dto.requests.CreateMovementRequest;
import com.equio.backend.transactions.dto.responses.MovementResponse;
import com.equio.backend.transactions.entities.enums.MovementType;
import com.equio.backend.transactions.services.CreateMovementService;
import com.equio.backend.users.services.ProfilePreferencesService;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ExpenseDraftServiceTest {
    private final ExpenseDraftRepository drafts = mock(ExpenseDraftRepository.class);
    private final FinancialConcurrencyGuard guard = mock(FinancialConcurrencyGuard.class);
    private final RlsContext rls = mock(RlsContext.class);
    private final CreateMovementService movements = mock(CreateMovementService.class);
    private final ProfilePreferencesService preferences = mock(ProfilePreferencesService.class);
    private final Validator validator = mock(Validator.class);
    private final ExpenseDraftService service = new ExpenseDraftService(drafts, rls, guard, movements, preferences, validator);
    private final UUID id = UUID.randomUUID();
    private final LocalDateTime date = LocalDateTime.of(2026, 1, 1, 12, 0);
    private final BigDecimal amount = new BigDecimal("42.50");

    @Test
    void repeatedApprovalReturnsOriginalMovementWithoutAnotherWrite() {
        when(drafts.find(1, id)).thenReturn(Optional.of(draft(Status.PENDING, null)), Optional.of(draft(Status.APPROVED, 11L)));
        when(preferences.findPreferences(1L)).thenReturn(new ProfilePreferencesService.Preferences("es", "PEN"));
        var request = new CreateMovementRequest(amount, MovementType.EXPENSE, "Libreria", date, null);
        when(movements.createMovement(1L, request)).thenReturn(
                new MovementResponse(11L, amount, "EXPENSE", "Libreria", date, null, null, null, null, date, "MANUAL"));
        when(drafts.finishPending(1, id, Status.APPROVED, 11L)).thenReturn(true);

        assertEquals(11L, service.approve(1, id, amount, "Libreria", date, null));
        assertEquals(11L, service.approve(1, id, amount, "Libreria", date, null));
        var order = inOrder(guard, rls, drafts, movements);
        order.verify(guard).lock(1L);
        order.verify(rls).setUserId(1L);
        order.verify(drafts).find(1, id);
        order.verify(movements).createMovement(1L, request);
        order.verify(drafts).finishPending(1, id, Status.APPROVED, 11L);
        verifyNoMoreInteractions(movements);
    }

    @Test
    void mismatchedCurrencyForeignDraftAndDiscardNeverCreateMovement() {
        when(drafts.find(1, id)).thenReturn(Optional.of(draft(Status.PENDING, null)));
        when(preferences.findPreferences(1L)).thenReturn(new ProfilePreferencesService.Preferences("es", "USD"));
        when(drafts.finishPending(1, id, Status.DISCARDED, null)).thenReturn(true);

        var conflict = assertThrows(BusinessConflictException.class,
                () -> service.approve(1, id, amount, null, date, null));
        assertEquals("DRAFT_CURRENCY_MISMATCH", conflict.getCode());
        assertThrows(ResourceNotFoundException.class, () -> service.discard(2, id));
        service.discard(1, id);
        verify(drafts).finishPending(1, id, Status.DISCARDED, null);
        verifyNoInteractions(movements);
    }

    private ExpenseDraft draft(Status status, Long movementId) {
        return new ExpenseDraft(id, amount, "PEN", "Libreria", date, status, movementId);
    }
}
