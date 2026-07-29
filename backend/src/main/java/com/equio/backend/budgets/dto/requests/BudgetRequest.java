package com.equio.backend.budgets.dto.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import com.equio.backend.budgets.entities.enums.SavingsType;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Datos que el frontend envía para crear o actualizar un presupuesto.
 * Todo presupuesto requiere startDate.
 * Si isFixed=true, endDate puede ser null (se auto-calcula en backend a 1 mes).
 * Si isFixed=false, se espera endDate con el límite del presupuesto.
 * categoryId=null significa presupuesto global (cubre todo).
 */
public record BudgetRequest(
        @NotBlank String name,
        @NotNull @Positive BigDecimal totalAmount,
        boolean isFixed,
        LocalDate startDate,
        LocalDate endDate,
        Long categoryId,
        Long parentBudgetId,
        SavingsType savingsType,
        BigDecimal savingsValue,
        Boolean retroactiveCatchUp,
        java.util.List<Long> subBudgetsToAdopt,
        Boolean isIndependent
) {}
