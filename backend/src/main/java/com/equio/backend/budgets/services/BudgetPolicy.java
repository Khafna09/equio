package com.equio.backend.budgets.services;

import com.equio.backend.budgets.entities.enums.SavingsType;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;

final class BudgetPolicy {

    private BudgetPolicy() {
    }

    static Period resolvePeriod(boolean fixed, boolean retroactive, LocalDate startDate, LocalDate endDate) {
        return resolvePeriod(fixed, retroactive, startDate, endDate, null);
    }

    static Period resolvePeriod(boolean fixed, boolean retroactive, LocalDate startDate, LocalDate endDate,
                                Integer renewalDay) {
        if (startDate == null) {
            throw new IllegalArgumentException("Every budget requires a start date");
        }
        if (fixed) {
            if (renewalDay != null) {
                validateRenewalDay(renewalDay);
                LocalDate resolvedEnd = nextAnchoredDateAfter(startDate, renewalDay).minusDays(1);
                if (endDate != null && !endDate.equals(resolvedEnd)) {
                    throw new IllegalArgumentException("The end date does not match the monthly renewal day");
                }
                return new Period(startDate, resolvedEnd);
            }
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

    static int inferRenewalDay(LocalDate startDate, LocalDate endDate) {
        if (endDate != null) {
            return endDate.plusDays(1).getDayOfMonth();
        }
        return startDate.getDayOfMonth();
    }

    static LocalDate nextAnchoredDateAfter(LocalDate date, int renewalDay) {
        validateRenewalDay(renewalDay);
        YearMonth month = YearMonth.from(date);
        LocalDate candidate = anchoredDate(month, renewalDay);
        if (!candidate.isAfter(date)) {
            candidate = anchoredDate(month.plusMonths(1), renewalDay);
        }
        return candidate;
    }

    private static LocalDate anchoredDate(YearMonth month, int renewalDay) {
        return month.atDay(Math.min(renewalDay, month.lengthOfMonth()));
    }

    private static void validateRenewalDay(int renewalDay) {
        if (renewalDay < 1 || renewalDay > 31) {
            throw new IllegalArgumentException("Renewal day must be between 1 and 31");
        }
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
