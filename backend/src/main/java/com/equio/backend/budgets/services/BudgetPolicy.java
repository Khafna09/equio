package com.equio.backend.budgets.services;

import com.equio.backend.budgets.entities.enums.SavingsType;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

final class BudgetPolicy {

    private BudgetPolicy() {
    }

    static Period resolvePeriod(boolean fixed, boolean retroactive, LocalDate startDate, LocalDate endDate) {
        if (startDate == null) {
            throw new IllegalArgumentException("Every budget requires a start date");
        }
        if (fixed) {
            // An explicit range also describes monthly cycles starting on a custom day.
            LocalDate resolvedStart = retroactive && endDate == null ? startDate.withDayOfMonth(1) : startDate;
            LocalDate resolvedEnd = endDate != null
                    ? endDate
                    : resolvedStart.plusMonths(1).minusDays(1);
            if (resolvedEnd.isBefore(resolvedStart)) {
                throw new IllegalArgumentException("The end date cannot be before the start date");
            }
            return new Period(resolvedStart, resolvedEnd);
        }
        if (endDate == null) {
            throw new IllegalArgumentException("A date-range budget requires an end date");
        }
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("The end date cannot be before the start date");
        }
        return new Period(startDate, endDate);
    }

    static void validateSavings(BigDecimal total, SavingsType type, BigDecimal value) {
        if ((type == null) != (value == null)) {
            throw new IllegalArgumentException("Savings type and value must be provided together");
        }
        if (type == SavingsType.PERCENTAGE && value.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new IllegalArgumentException("Savings percentage cannot exceed 100");
        }
        if (type == SavingsType.FIXED && value.compareTo(total) > 0) {
            throw new IllegalArgumentException("Fixed savings cannot exceed the budget amount");
        }
    }

    static BigDecimal assignableLimit(BigDecimal total, SavingsType type, BigDecimal value) {
        return assignableLimit(total, type, value, BigDecimal.ZERO);
    }

    static BigDecimal assignableLimit(BigDecimal total, SavingsType type, BigDecimal value,
                                      BigDecimal savingsPoolContribution) {
        if (total == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal poolContribution = savingsPoolContribution == null
                ? BigDecimal.ZERO : savingsPoolContribution;
        BigDecimal savingsBase = total.subtract(poolContribution).max(BigDecimal.ZERO);
        BigDecimal deduction = BigDecimal.ZERO;
        if (type == SavingsType.FIXED && value != null) {
            deduction = value;
        } else if (type == SavingsType.PERCENTAGE && value != null) {
            deduction = savingsBase.multiply(value)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        }
        return total.subtract(deduction).max(BigDecimal.ZERO);
    }

    record Period(LocalDate startDate, LocalDate endDate) {
    }
}
