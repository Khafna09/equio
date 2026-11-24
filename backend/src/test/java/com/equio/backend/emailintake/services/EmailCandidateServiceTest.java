package com.equio.backend.emailintake.services;

import com.equio.backend.emailintake.domain.EmailIntakeDecision.ModelAnswer;
import com.equio.backend.emailintake.domain.EmailIntakeDecision.ModelLabel;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static com.equio.backend.emailintake.services.EmailCandidateService.Result.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.fail;
import static org.mockito.Mockito.*;

class EmailCandidateServiceTest {
    private static final String FINGERPRINT = "a".repeat(64);
    private static final String RECEIPT = "Compra completada. Total pagado: S/ 42.50. El 24/11/2026, 11:42.";
    private final ExpenseDraftService drafts = mock(ExpenseDraftService.class);

    @Test
    void confirmedReceiptKeepsOnlyValidatedFieldsAndReturnsDuplicateOnRepeatedDelivery() {
        var service = new EmailCandidateService(drafts, evidence -> fail("Unexpected model call"));
        var amount = new BigDecimal("42.50");
        var date = LocalDateTime.of(2026, 11, 24, 11, 42);
        when(drafts.recordCandidate(1, FINGERPRINT, amount, "PEN", null, date)).thenReturn(true, false);

        assertEquals(DRAFT_CREATED, service.process(1, FINGERPRINT, "Compra aprobada", RECEIPT));
        assertEquals(DUPLICATE, service.process(1, FINGERPRINT, "Compra aprobada", RECEIPT));
    }

    @Test
    void ambiguousReceiptAcceptedByModelUsesTheSameExtractor() {
        var service = new EmailCandidateService(drafts, evidence -> new ModelAnswer(ModelLabel.CONFIRMED_EXPENSE, true));
        var amount = new BigDecimal("18.90");
        var date = LocalDateTime.of(2026, 11, 24, 12, 15);
        when(drafts.recordCandidate(1, FINGERPRINT, amount, "PEN", null, date)).thenReturn(true);

        assertEquals(DRAFT_CREATED, service.process(1, FINGERPRINT, "Operacion",
                "S/ 18,90 en el comercio. 2026-11-24 12:15."));
        verify(drafts).recordCandidate(1, FINGERPRINT, amount, "PEN", null, date);
    }

    @Test
    void conflictingAmountsDatesOrMissingTimeCannotCreateDraft() {
        var service = new EmailCandidateService(drafts, evidence -> new ModelAnswer(ModelLabel.CONFIRMED_EXPENSE, true));
        assertEquals(NEEDS_REVIEW, service.process(1, FINGERPRINT, "Compra aprobada", RECEIPT + " Tambien USD 42.50."));
        assertEquals(NEEDS_REVIEW, service.process(1, FINGERPRINT, "Compra aprobada", RECEIPT + " El 25/11/2026, 09:00."));
        assertEquals(NEEDS_REVIEW, service.process(1, FINGERPRINT, "Compra aprobada", "Total pagado: S/ 42.50 el 24/11/2026."));
        assertEquals(NEEDS_REVIEW, service.process(1, FINGERPRINT, "Compra aprobada", "Total pagado: S/ 42.50 el 31/11/2026, 09:00."));
        assertEquals(NEEDS_REVIEW, service.process(1, FINGERPRINT, "Compra aprobada", "Total pagado: S/ 1.234,56 el 24/11/2026, 09:00."));
        verifyNoInteractions(drafts);
    }
}
