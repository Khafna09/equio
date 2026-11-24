package com.equio.backend.emailintake.domain;

import java.util.Objects;

public final class EmailIntakeDecision {
    private static final int EXPENSE_THRESHOLD = 6;

    public enum Outcome {
        EXPENSE_CANDIDATE, IGNORE, CARD_PAYMENT_REVIEW, REFUND_REVIEW, NEEDS_REVIEW
    }

    public enum Reason {
        NON_EXPENSE, CARD_PAYMENT, REFUND, STRONG_EXPENSE, AMBIGUOUS,
        CONFLICTING_EVIDENCE, MODEL_DECISION, MODEL_UNAVAILABLE
    }

    public record Decision(Outcome outcome, Reason reason) {}

    public record Signals(boolean confirmedExpense, boolean purchaseEvidence, boolean amountEvidence,
                          boolean explicitNonExpense, boolean cardPayment, boolean refund,
                          boolean conflictingEvidence) {}

    public enum ModelLabel { CONFIRMED_EXPENSE, NON_EXPENSE, CARD_PAYMENT, REFUND, UNCERTAIN }

    public sealed interface ModelResult permits ModelAnswer, ModelUnavailable {}

    public record ModelAnswer(ModelLabel label, boolean meetsConfidenceThreshold) implements ModelResult {
        public ModelAnswer {
            Objects.requireNonNull(label, "label");
        }
    }

    public record ModelUnavailable() implements ModelResult {}

    @FunctionalInterface
    public interface AmbiguityResolver {
        ModelResult resolve();
    }

    public Decision decide(Signals signals, AmbiguityResolver resolver) {
        Objects.requireNonNull(signals, "signals");
        Objects.requireNonNull(resolver, "resolver");
        if (signals.conflictingEvidence()
                || (signals.confirmedExpense() && signals.explicitNonExpense())
                || (signals.cardPayment() && signals.refund())) {
            return new Decision(Outcome.NEEDS_REVIEW, Reason.CONFLICTING_EVIDENCE);
        }
        if (signals.explicitNonExpense()) {
            return new Decision(Outcome.IGNORE, Reason.NON_EXPENSE);
        }
        if (signals.cardPayment()) {
            return new Decision(Outcome.CARD_PAYMENT_REVIEW, Reason.CARD_PAYMENT);
        }
        if (signals.refund()) {
            return new Decision(Outcome.REFUND_REVIEW, Reason.REFUND);
        }

        // This score decides routing only. Both positive paths still need validated extracted fields.
        int score = (signals.confirmedExpense() ? 3 : 0)
                + (signals.purchaseEvidence() ? 2 : 0)
                + (signals.amountEvidence() ? 1 : 0);
        if (score >= EXPENSE_THRESHOLD) {
            return new Decision(Outcome.EXPENSE_CANDIDATE, Reason.STRONG_EXPENSE);
        }

        if (!(resolver.resolve() instanceof ModelAnswer answer)) {
            return new Decision(Outcome.NEEDS_REVIEW, Reason.MODEL_UNAVAILABLE);
        }
        if (!answer.meetsConfidenceThreshold() || answer.label() == ModelLabel.UNCERTAIN) {
            return new Decision(Outcome.NEEDS_REVIEW, Reason.AMBIGUOUS);
        }
        Outcome outcome = switch (answer.label()) {
            case CONFIRMED_EXPENSE -> Outcome.EXPENSE_CANDIDATE;
            case NON_EXPENSE -> Outcome.NEEDS_REVIEW;
            case CARD_PAYMENT -> Outcome.CARD_PAYMENT_REVIEW;
            case REFUND -> Outcome.REFUND_REVIEW;
            case UNCERTAIN -> Outcome.NEEDS_REVIEW;
        };
        return new Decision(outcome, Reason.MODEL_DECISION);
    }
}
