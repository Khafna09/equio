package com.equio.backend.emailintake.domain;

import org.junit.jupiter.api.Test;

import static com.equio.backend.emailintake.domain.EmailIntakeDecision.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.fail;

class EmailIntakeDecisionTest {
    private final EmailIntakeDecision policy = new EmailIntakeDecision();
    private final Signals ambiguous = new Signals(false, true, true, false, false, false, false);

    @Test
    void clearExpenseDoesNotUseModel() {
        assertEquals(new Decision(Outcome.EXPENSE_CANDIDATE, Reason.STRONG_EXPENSE),
                policy.decide(new Signals(true, true, true, false, false, false, false), this::unexpectedCall));
    }

    @Test
    void clearNegativeCardPaymentAndRefundDoNotUseModel() {
        assertEquals(Outcome.IGNORE,
                policy.decide(new Signals(false, true, true, true, false, false, false), this::unexpectedCall).outcome());
        assertEquals(Outcome.CARD_PAYMENT_REVIEW,
                policy.decide(new Signals(false, true, true, false, true, false, false), this::unexpectedCall).outcome());
        assertEquals(Outcome.REFUND_REVIEW,
                policy.decide(new Signals(false, true, true, false, false, true, false), this::unexpectedCall).outcome());
    }

    @Test
    void conflictsAreNotOverriddenByModel() {
        assertEquals(new Decision(Outcome.NEEDS_REVIEW, Reason.CONFLICTING_EVIDENCE),
                policy.decide(new Signals(true, true, true, true, false, false, false), this::unexpectedCall));
        assertEquals(new Decision(Outcome.NEEDS_REVIEW, Reason.CONFLICTING_EVIDENCE),
                policy.decide(new Signals(true, true, true, false, false, false, true), this::unexpectedCall));
    }

    @Test
    void acceptedAmbiguousEmailUsesSameCandidateOutcomeAsRules() {
        assertEquals(new Decision(Outcome.EXPENSE_CANDIDATE, Reason.MODEL_DECISION),
                policy.decide(ambiguous, () -> new ModelAnswer(ModelLabel.CONFIRMED_EXPENSE, true)));
    }

    @Test
    void uncertainOrUnavailableModelDoesNotDiscardMessage() {
        assertEquals(Outcome.NEEDS_REVIEW,
                policy.decide(ambiguous, () -> new ModelAnswer(ModelLabel.NON_EXPENSE, false)).outcome());
        assertEquals(Outcome.NEEDS_REVIEW,
                policy.decide(ambiguous, () -> new ModelAnswer(ModelLabel.UNCERTAIN, true)).outcome());
        assertEquals(new Decision(Outcome.NEEDS_REVIEW, Reason.MODEL_UNAVAILABLE),
                policy.decide(ambiguous, ModelUnavailable::new));
    }

    @Test
    void modelAloneCannotDiscardAnAmbiguousMessage() {
        assertEquals(Outcome.NEEDS_REVIEW,
                policy.decide(ambiguous, () -> new ModelAnswer(ModelLabel.NON_EXPENSE, true)).outcome());
    }

    private ModelResult unexpectedCall() {
        return fail("The model must not be called for this decision");
    }
}
