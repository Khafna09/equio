package com.equio.backend.budgets.dto.responses;

import com.equio.backend.budgets.entities.enums.SavingsType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Datos que el backend devuelve al frontend para representar un presupuesto.
 * remainingAmount y progressPercentage son campos calculados en el ServiceImpl.
 * isOverBudget=true cuando spentAmount supera totalAmount.
 */
public record BudgetResponse(
        Long id,
        String name,
        BigDecimal totalAmount,
        BigDecimal spentAmount,
        BigDecimal remainingAmount,
        double progressPercentage,
        boolean isFixed,
        LocalDate startDate,
        LocalDate endDate,
        Long categoryId,
        String categoryName,
        String categoryColor,
        String categoryIcon,
        Long parentBudgetId,
        String status,
        SavingsType savingsType,
        BigDecimal savingsValue,
        boolean isOverBudget,
        LocalDateTime createdAt,
        LocalDate nextStartDate
) {}
