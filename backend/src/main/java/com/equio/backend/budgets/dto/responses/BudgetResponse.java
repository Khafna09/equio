package com.equio.backend.budgets.dto.responses;

import com.equio.backend.budgets.entities.enums.SavingsType;
import com.equio.backend.budgets.entities.enums.BudgetScope;
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
        BudgetScope scope,
        String status,
        SavingsType savingsType,
        BigDecimal savingsValue,
        BigDecimal savingsPoolContribution,
        BigDecimal assignableAmount,
        BigDecimal allocatedAmount,
        BigDecimal unallocatedAmount,
        boolean canLink,
        boolean canDetach,
        boolean canClose,
        boolean isOverBudget,
        LocalDateTime createdAt,
        LocalDate nextStartDate
) {}
