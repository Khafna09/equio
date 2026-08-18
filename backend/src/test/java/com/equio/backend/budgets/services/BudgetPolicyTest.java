package com.equio.backend.budgets.services;

import com.equio.backend.budgets.entities.enums.SavingsType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class BudgetPolicyTest {

    @Test
    void resolvesRetroactiveFixedPeriodToFullCalendarMonth() {
        var period = BudgetPolicy.resolvePeriod(
                true, true, LocalDate.of(2026, 8, 16), null);

        assertEquals(LocalDate.of(2026, 8, 1), period.startDate());
        assertEquals(LocalDate.of(2026, 8, 31), period.endDate());
    }

    @Test
    void preservesExplicitStartForNonRetroactiveFixedPeriod() {
        var period = BudgetPolicy.resolvePeriod(
                true, false, LocalDate.of(2026, 8, 16), null);

        assertEquals(LocalDate.of(2026, 8, 16), period.startDate());
        assertEquals(LocalDate.of(2026, 9, 15), period.endDate());
    }

    @Test
    void rejectsInvalidDateRange() {
        assertThrows(IllegalArgumentException.class, () -> BudgetPolicy.resolvePeriod(
                false, false, LocalDate.of(2026, 8, 16), LocalDate.of(2026, 8, 15)));
    }

    @Test
    void calculatesAssignableLimitsForBothSavingsTypes() {
        assertEquals(new BigDecimal("800.00"), BudgetPolicy.assignableLimit(
                new BigDecimal("1000.00"), SavingsType.PERCENTAGE, new BigDecimal("20.00")));
        assertEquals(new BigDecimal("750.00"), BudgetPolicy.assignableLimit(
                new BigDecimal("1000.00"), SavingsType.FIXED, new BigDecimal("250.00")));
    }

    @Test
    void rejectsSavingsThatExceedTheirAllowedRange() {
        assertThrows(IllegalArgumentException.class, () -> BudgetPolicy.validateSavings(
                new BigDecimal("1000"), SavingsType.PERCENTAGE, new BigDecimal("101")));
        assertThrows(IllegalArgumentException.class, () -> BudgetPolicy.validateSavings(
                new BigDecimal("1000"), SavingsType.FIXED, new BigDecimal("1000.01")));
    }
}
