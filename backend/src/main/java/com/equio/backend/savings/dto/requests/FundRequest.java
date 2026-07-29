package com.equio.backend.savings.dto.requests;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

/**
 * DTO para aportar o retirar fondos de una meta de ahorro.
 * operation: "ADD" para aportar, "WITHDRAW" para retirar.
 *
 * Ejemplo de body para aportar:
 * { "amount": 100.00, "operation": "ADD" }
 *
 * Ejemplo de body para retirar:
 * { "amount": 50.00, "operation": "WITHDRAW" }
 */
public record FundRequest(
        @NotNull @Positive BigDecimal amount,
        @NotNull String operation
) {}
