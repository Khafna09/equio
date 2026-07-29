package com.equio.backend.savings.dto.responses;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Datos que el backend devuelve al frontend para mostrar una meta de ahorro.
 * remainingAmount y progressPercentage son calculados en el ServiceImpl.
 * isCompleted=true cuando currentAmount >= targetAmount.
 */
public record SavingGoalResponse(
        Long id,
        String name,
        BigDecimal targetAmount,
        BigDecimal currentAmount,
        BigDecimal remainingAmount,     // targetAmount - currentAmount (calculado)
        double progressPercentage,      // (currentAmount / targetAmount) * 100 (calculado)
        LocalDate deadline,
        boolean isCompleted,            // currentAmount >= targetAmount
        Long budgetId,
        String budgetName,
        LocalDateTime createdAt,
        String tag,
        String imageUrl
) {}
