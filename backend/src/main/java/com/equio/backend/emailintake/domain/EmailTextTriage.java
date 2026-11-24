package com.equio.backend.emailintake.domain;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Objects;
import java.util.function.Function;
import java.util.regex.Pattern;

import static com.equio.backend.emailintake.domain.EmailIntakeDecision.*;

/** First-pass routing for bounded plain text, not verification of a bank or of a payment. */
public final class EmailTextTriage {
    static final int MAX_TEXT_LENGTH = 8192;
    private static final Pattern PURCHASE = Pattern.compile("\\b(compra|comercio|recibo|factura|purchase|merchant|receipt)\\b");
    private static final Pattern CONFIRMED = Pattern.compile("\\b(compra (aprobada|completada|exitosa)|total pagado|cargo confirmado|payment completed|purchase approved|total paid)\\b");
    private static final Pattern MONEY = Pattern.compile("(?:s/|\\b(?:pen|usd|eur|mxn|cop)\\b)\\s*\\d|\\d\\s*(?:s/|\\b(?:pen|usd|eur|mxn|cop)\\b)");
    private static final Pattern NOT_COMPLETED = Pattern.compile("\\b(compra rechazada|pago rechazado|preautorizacion|pre-autorizacion|pago declinado|payment declined|preauthorization|aviso de vencimiento|transferencia entre (mis |tus )?cuentas propias)\\b");
    private static final Pattern UNCERTAIN = Pattern.compile("\\b(no (indica|confirma|sabemos)|por confirmar|pendiente|aun no|not confirmed|pending)\\b");
    private static final Pattern CARD_PAYMENT = Pattern.compile("\\b(pago (de|del) saldo de (la |tu )?tarjeta|credit card balance payment)\\b");
    private static final Pattern REFUND = Pattern.compile("\\b(reembolso (completado|abonado|procesado)|refund completed)\\b");
    private static final Pattern VERIFICATION = Pattern.compile("\\b(codigo de (verificacion|seguridad)|verification code|one-time password|otp)\\b");

    private final EmailIntakeDecision policy = new EmailIntakeDecision();

    public Decision decide(String subject, String plainText, Function<String, ModelResult> classifier) {
        Objects.requireNonNull(classifier, "classifier");
        if (plainText == null || plainText.isBlank() || plainText.length() > MAX_TEXT_LENGTH
                || (subject != null && subject.length() > 512)) {
            return new Decision(Outcome.NEEDS_REVIEW, Reason.AMBIGUOUS);
        }
        String text = normalize(Objects.toString(subject, "") + "\n" + plainText);
        if (matches(VERIFICATION, text)) {
            return new Decision(Outcome.IGNORE, Reason.NON_EXPENSE);
        }

        boolean confirmed = matches(CONFIRMED, text);
        boolean purchase = matches(PURCHASE, text);
        boolean amount = matches(MONEY, text);
        boolean statusUnclear = matches(UNCERTAIN, text);
        boolean negative = matches(NOT_COMPLETED, text);
        boolean cardPayment = matches(CARD_PAYMENT, text);
        boolean refund = matches(REFUND, text);
        if (!confirmed && !purchase && !amount && !negative && !cardPayment && !refund) {
            return new Decision(Outcome.NEEDS_REVIEW, Reason.AMBIGUOUS);
        }
        var signals = new Signals(confirmed, purchase, amount, negative, cardPayment, refund,
                statusUnclear && (confirmed || negative || cardPayment || refund));
        // Send only fixed descriptions of matched evidence, never the subject or body.
        return policy.decide(signals, () -> classifier.apply(
                "Merchant or purchase evidence: " + purchase + ". Currency and amount mentioned: " + amount
                        + ". Explicit completion wording: " + confirmed + ". Unclear status wording: " + statusUnclear + "."));
    }

    private static boolean matches(Pattern pattern, String text) {
        return pattern.matcher(text).find();
    }

    private static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT);
    }
}
