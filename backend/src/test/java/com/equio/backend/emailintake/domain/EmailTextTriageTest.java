package com.equio.backend.emailintake.domain;

import org.junit.jupiter.api.Test;

import static com.equio.backend.emailintake.domain.EmailIntakeDecision.*;
import static org.junit.jupiter.api.Assertions.*;

class EmailTextTriageTest {
    private final EmailTextTriage triage = new EmailTextTriage();

    @Test
    void confirmedPilotReceiptDoesNotNeedJev() {
        var result = triage.decide("Compra aprobada en Librer\u00eda Nube Azul", """
                Se registr\u00f3 una compra aprobada en Librer\u00eda Nube Azul.
                Fecha de la operaci\u00f3n: 24/11/2026, 11:42.
                Monto total pagado: S/ 42.50.
                Estado: compra completada.
                """, this::unexpectedCall);
        assertEquals(new Decision(Outcome.EXPENSE_CANDIDATE, Reason.STRONG_EXPENSE), result);
    }

    @Test
    void ambiguousPilotReceiptSendsOnlyFixedSignals() {
        var result = triage.decide("Actualizaci\u00f3n de operaci\u00f3n en Cafeter\u00eda R\u00edo Claro", """
                La operaci\u00f3n de Cafeter\u00eda R\u00edo Claro, por S/ 18.90, del 24/11/2026 a las 12:15,
                figura en el detalle de tu cuenta. La actualizaci\u00f3n del comercio a\u00fan no aparece.
                Este aviso no indica si el importe se debit\u00f3 de forma definitiva.
                """, evidence -> {
            assertEquals("Merchant or purchase evidence: true. Currency and amount mentioned: true. "
                    + "Explicit completion wording: false. Unclear status wording: true.", evidence);
            return new ModelAnswer(ModelLabel.UNCERTAIN, true);
        });
        assertEquals(new Decision(Outcome.NEEDS_REVIEW, Reason.AMBIGUOUS), result);
    }

    @Test
    void verificationCodesAndExplicitOwnAccountTransfersDoNotReachJev() {
        assertEquals(Outcome.IGNORE, triage.decide("C\u00f3digo de verificaci\u00f3n", "123456", this::unexpectedCall).outcome());
        assertEquals(Outcome.IGNORE, triage.decide("Transferencia entre tus cuentas propias", "S/ 10.00", this::unexpectedCall).outcome());
    }

    @Test
    void mixedStatusAndMissingSignalsStayInReviewWithoutModelCall() {
        assertEquals(Outcome.NEEDS_REVIEW,
                triage.decide("Compra aprobada", "Pago pendiente. S/ 10.00", this::unexpectedCall).outcome());
        assertEquals(Outcome.NEEDS_REVIEW,
                triage.decide("Actualizaci\u00f3n", "Consultar el detalle adjunto.", this::unexpectedCall).outcome());
    }

    private ModelResult unexpectedCall(String evidence) {
        return fail("Unexpected model call");
    }
}
