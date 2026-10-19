package com.equio.backend.dashboard.services;

import com.equio.backend.budgets.services.BudgetLookupService;
import com.equio.backend.budgets.services.BudgetLookupService.GlobalBudgetSnapshot;
import com.equio.backend.dashboard.dto.DashboardPeriod;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.transactions.entities.enums.MovementType;
import com.equio.backend.transactions.services.MovementQueryService;
import com.equio.backend.transactions.services.MovementQueryService.CategoryExpenseSnapshot;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DashboardServiceTest {
    private static final LocalDate TODAY = LocalDate.of(2026, 9, 17);
    private final MovementQueryService movements = mock(MovementQueryService.class);
    private final BudgetLookupService budgets = mock(BudgetLookupService.class);
    private final RlsContext rls = mock(RlsContext.class);
    private final DashboardServiceImpl service = new DashboardServiceImpl(movements, budgets, rls);
    private final List<Entry> entries = List.of(
            new Entry("2026-09-01T12:00:00", MovementType.EXPENSE, "100"),
            new Entry("2026-09-05T00:00:00", MovementType.EXPENSE, "20"),
            new Entry("2026-09-17T12:00:00", MovementType.INCOME, "200"),
            new Entry("2026-09-17T12:00:00", MovementType.EXPENSE, "30"),
            new Entry("2026-10-04T23:59:59.999999999", MovementType.EXPENSE, "40"),
            new Entry("2026-10-05T00:00:00", MovementType.EXPENSE, "70"));

    @BeforeEach
    void setUp() {
        when(budgets.findActiveGlobal(1L)).thenReturn(Optional.of(snapshot("2026-09-05", "2026-10-04")));
        when(movements.sumByType(eq(1L), any(), any(), any())).thenAnswer(invocation ->
                sum(invocation.getArgument(1), invocation.getArgument(2), invocation.getArgument(3)));
        when(movements.findExpenseCategoriesByPeriod(eq(1L), any(), any())).thenAnswer(invocation ->
                List.of(new CategoryExpenseSnapshot("Food", "#008800", null,
                        sum(MovementType.EXPENSE, invocation.getArgument(1), invocation.getArgument(2)))));
    }

    @Test
    void automaticViewUsesTheFullBudgetCycleAndExcludesExpensesBeforeTheFifth() {
        var result = service.getSummary(1L, DashboardPeriod.AUTO, TODAY);
        assertEquals(DashboardPeriod.BUDGET, result.period());
        assertEquals(LocalDate.of(2026, 9, 5), result.startDate());
        assertEquals(LocalDate.of(2026, 10, 4), result.endDate());
        assertEquals(new BigDecimal("90"), result.totalExpense());
        assertEquals(new BigDecimal("200"), result.totalIncome());
        assertEquals(new BigDecimal("810"), result.balance());
        assertEquals(new BigDecimal("90"), result.expenseCategories().getFirst().totalSpent());
        assertTrue(result.hasActiveBudget());
        verify(rls).setUserId(1L);
        verify(budgets).findActiveGlobal(1L);
    }

    @Test
    void budgetStartingTodayDoesNotIncludeEarlierExpenses() {
        when(budgets.findActiveGlobal(1L)).thenReturn(Optional.of(snapshot("2026-09-17", "2026-09-30")));
        var result = service.getSummary(1L, DashboardPeriod.BUDGET, TODAY);
        assertEquals(TODAY, result.startDate());
        assertEquals(new BigDecimal("30"), result.totalExpense());
        assertEquals(new BigDecimal("870"), result.balance());
    }

    @Test
    void monthShowsIncomeMinusExpensesWithoutAddingTheBudget() {
        var result = service.getSummary(1L, DashboardPeriod.MONTH, TODAY);
        assertEquals(new BigDecimal("150"), result.totalExpense());
        assertEquals(new BigDecimal("50"), result.balance());
        assertNull(result.globalBudgetAmount());
        assertNull(result.savingsDeduction());
        assertTrue(result.hasActiveBudget());
    }

    @ParameterizedTest
    @CsvSource({
            "MONTH,2024-02-17,2024-02-01,2024-02-29",
            "FORTNIGHT,2026-09-15,2026-09-01,2026-09-15",
            "FORTNIGHT,2026-09-16,2026-09-16,2026-09-30",
            "FORTNIGHT,2026-01-31,2026-01-16,2026-01-31",
            "FORTNIGHT,2024-02-29,2024-02-16,2024-02-29",
            "FORTNIGHT,2026-02-28,2026-02-16,2026-02-28",
            "WEEK,2026-09-14,2026-09-14,2026-09-20",
            "WEEK,2026-09-20,2026-09-14,2026-09-20",
            "WEEK,2027-01-01,2026-12-28,2027-01-03"
    })
    void allTotalsAndCategoriesUseTheSameCalendarRange(DashboardPeriod period, LocalDate date,
                                                      LocalDate start, LocalDate end) {
        var result = service.getSummary(1L, period, date);
        assertEquals(period, result.period());
        assertEquals(start, result.startDate());
        assertEquals(end, result.endDate());
        verify(movements).sumByType(1L, MovementType.INCOME, start.atStartOfDay(), end.atTime(LocalTime.MAX));
        verify(movements).sumByType(1L, MovementType.EXPENSE, start.atStartOfDay(), end.atTime(LocalTime.MAX));
        verify(movements).findExpenseCategoriesByPeriod(1L, start.atStartOfDay(), end.atTime(LocalTime.MAX));
    }

    @Test
    void closingOrDeletingTheBudgetFallsBackToTheMonth() {
        when(budgets.findActiveGlobal(1L)).thenReturn(Optional.empty());
        for (DashboardPeriod period : List.of(DashboardPeriod.AUTO, DashboardPeriod.BUDGET)) {
            var result = service.getSummary(1L, period, TODAY);
            assertEquals(DashboardPeriod.MONTH, result.period());
            assertFalse(result.hasActiveBudget());
            assertNull(result.globalBudgetAmount());
            assertEquals(new BigDecimal("50"), result.balance());
        }
    }

    private GlobalBudgetSnapshot snapshot(String start, String end) {
        return new GlobalBudgetSnapshot(new BigDecimal("1000"), new BigDecimal("100"),
                LocalDate.parse(start), LocalDate.parse(end));
    }

    private BigDecimal sum(MovementType type, LocalDateTime start, LocalDateTime end) {
        return entries.stream().filter(entry -> entry.type() == type
                        && !entry.date().isBefore(start) && !entry.date().isAfter(end))
                .map(Entry::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private record Entry(LocalDateTime date, MovementType type, BigDecimal amount) {
        Entry(String date, MovementType type, String amount) {
            this(LocalDateTime.parse(date), type, new BigDecimal(amount));
        }
    }
}
