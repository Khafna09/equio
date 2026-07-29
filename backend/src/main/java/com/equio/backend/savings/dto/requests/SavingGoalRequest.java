package com.equio.backend.savings.dto.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Datos para crear o actualizar una meta de ahorro.
 * budgetId es opcional: vincula la meta a un presupuesto existente.
 * deadline es opcional: si está presente, indica cuándo se quiere alcanzar la meta.
 */
public record SavingGoalRequest(
        @NotBlank String name,
        @NotNull @Positive BigDecimal targetAmount,
        LocalDate deadline,
        Long budgetId,
        String tag,
        String imageUrl
) {}
