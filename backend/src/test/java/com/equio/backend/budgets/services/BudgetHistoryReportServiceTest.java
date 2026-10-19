package com.equio.backend.budgets.services;

import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.entities.enums.BudgetStatus;
import com.equio.backend.budgets.entities.enums.BudgetScope;
import com.equio.backend.budgets.entities.enums.SavingsType;
import com.equio.backend.budgets.repositories.BudgetRepository;
import com.equio.backend.shared.exceptions.ReportTooLargeException;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.transactions.entities.Category;
import com.equio.backend.transactions.entities.enums.MovementType;
import com.equio.backend.transactions.services.CategoryLookupService;
import com.equio.backend.transactions.services.CategoryLookupService.CategorySnapshot;
import com.equio.backend.transactions.services.MovementQueryService;
import com.equio.backend.transactions.services.MovementQueryService.MovementSnapshot;
import com.equio.backend.users.entities.User;
import com.equio.backend.users.services.ProfilePreferencesService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;

class BudgetHistoryReportServiceTest {

    private BudgetRepository budgetRepository;
    private MovementQueryService movementQueryService;
    private CategoryLookupService categoryLookupService;
    private RlsContext rlsContext;
    private BudgetHistoryReportService service;

    @BeforeEach
    void setUp() {
        budgetRepository = mock(BudgetRepository.class);
        movementQueryService = mock(MovementQueryService.class);
        categoryLookupService = mock(CategoryLookupService.class);
        rlsContext = mock(RlsContext.class);
        service = new BudgetHistoryReportService(
                budgetRepository, movementQueryService, categoryLookupService, rlsContext, 2000);
    }

    @Test
    void calculatesHistoricalReportFromClosedCycle() {
        User user = new User();
        user.setId(1L);

        Budget global = new Budget();
        global.setId(10L);
        global.setName("August");
        global.setUser(user);
        global.setStatus(BudgetStatus.CLOSED);
        global.setStartDate(LocalDate.of(2026, 8, 1));
        global.setEndDate(LocalDate.of(2026, 8, 31));
        global.setTotalAmount(new BigDecimal("1000.00"));
        global.setSavingsType(SavingsType.PERCENTAGE);
        global.setSavingsValue(new BigDecimal("10.00"));

        Category food = new Category();
        food.setId(5L);
        food.setName("Food");
        food.setColor("#16a34a");
        food.setIcon("food");

        Category utilities = new Category();
        utilities.setId(6L);
        utilities.setName("Utilities");
        utilities.setColor("#0284c7");
        utilities.setIcon("bolt");

        Budget child = new Budget();
        child.setId(11L);
        child.setUser(user);
        child.setStatus(BudgetStatus.CLOSED);
        child.setCategory(food);
        child.setTotalAmount(new BigDecimal("400.00"));
        child.setParentBudget(global);

        List<MovementSnapshot> movements = List.of(
                movement(1L, MovementType.INCOME, "2000.00", "Salary", null, LocalDateTime.of(2026, 8, 1, 9, 0)),
                movement(2L, MovementType.EXPENSE, "500.00", "Groceries", food, LocalDateTime.of(2026, 8, 14, 12, 0)),
                movement(3L, MovementType.EXPENSE, "100.00", "Transport", null, LocalDateTime.of(2026, 8, 15, 10, 0)),
                movement(4L, MovementType.EXPENSE, "200.00", "Aporte a meta: Japan", null, LocalDateTime.of(2026, 8, 16, 10, 0))
        );

        when(budgetRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(global));
        when(budgetRepository.findByParentBudgetId(10L)).thenReturn(List.of(child));
        when(budgetRepository.findByUserIdAndStatus(1L, BudgetStatus.CLOSED)).thenReturn(List.of(global));
        when(categoryLookupService.findByUser(1L)).thenReturn(List.of(
                category(food), category(utilities)));
        when(movementQueryService.countByPeriod(
                1L,
                LocalDate.of(2026, 8, 1).atStartOfDay(),
                LocalDate.of(2026, 8, 31).atTime(23, 59, 59, 999_999_000)))
                .thenReturn(4L);
        when(movementQueryService.findByPeriod(
                1L,
                LocalDate.of(2026, 8, 1).atStartOfDay(),
                LocalDate.of(2026, 8, 31).atTime(23, 59, 59, 999_999_000)))
                .thenReturn(movements);

        var report = service.getReport(1L, 10L);

        assertEquals(new BigDecimal("900.00"), report.spendingLimit());
        assertEquals(new BigDecimal("800.00"), report.totalExpenses());
        assertEquals(new BigDecimal("100.00"), report.remainingAmount());
        assertEquals(new BigDecimal("100.00"), report.configuredSavings());
        assertEquals(new BigDecimal("200.00"), report.goalContributions());
        assertEquals(new BigDecimal("1200.00"), report.balance());
        assertEquals(70.0, report.savingsRate(), 0.001);
        assertEquals(1, report.categoriesWithLimit());
        assertEquals(0, report.categoriesWithinLimit());
        assertEquals(3, report.categories().size());
        assertEquals(4, report.movements().size());
        assertEquals(BigDecimal.ZERO, report.categories().stream()
                .filter(category -> Long.valueOf(6L).equals(category.categoryId()))
                .findFirst().orElseThrow().spentAmount());
        assertEquals("Uncategorized", report.categories().stream()
                .filter(category -> category.categoryId() == null)
                .findFirst().orElseThrow().categoryName());
        assertFalse(report.categories().stream().filter(category -> category.categoryId() != null).findFirst().orElseThrow().withinLimit());
        assertEquals(LocalDate.of(2026, 8, 14), report.highestSpendingDay().date());
        assertEquals("FRIDAY", report.mostExpensiveWeekday().dayOfWeek());
        assertNull(report.comparison());
        verify(rlsContext).setUserId(1L);

        ProfilePreferencesService profilePreferencesService = mock(ProfilePreferencesService.class);
        when(profilePreferencesService.findPreferences(1L))
                .thenReturn(new ProfilePreferencesService.Preferences("es", "PEN"));
        byte[] pdf = new BudgetHistoryPdfService(profilePreferencesService).generate(1L, report);

        assertTrue(pdf.length > 5);
        assertEquals("%PDF-", new String(pdf, 0, 5, StandardCharsets.US_ASCII));
        verify(profilePreferencesService).findPreferences(1L);
        assertDoesNotThrow(() -> {
            try (var document = org.apache.pdfbox.Loader.loadPDF(pdf)) {
                assertTrue(document.getNumberOfPages() >= 2);
            }
        });

    }

    @Test
    void rejectsReportsForActiveBudgets() {
        Budget active = new Budget();
        active.setId(20L);
        active.setStatus(BudgetStatus.ACTIVE);
        when(budgetRepository.findByIdAndUserId(20L, 1L)).thenReturn(Optional.of(active));

        assertThrows(IllegalArgumentException.class, () -> service.getReport(1L, 20L));
    }

    @Test
    void scopesIndependentReportsToTheirOwnCategory() {
        User user = new User();
        user.setId(1L);
        Category food = new Category();
        food.setId(5L);
        food.setName("Food");
        Category utilities = new Category();
        utilities.setId(6L);
        utilities.setName("Utilities");

        Budget independent = new Budget();
        independent.setId(25L);
        independent.setName("Food plan");
        independent.setUser(user);
        independent.setCategory(food);
        independent.setStatus(BudgetStatus.CLOSED);
        independent.setStartDate(LocalDate.of(2026, 9, 1));
        independent.setEndDate(LocalDate.of(2026, 9, 30));
        independent.setTotalAmount(new BigDecimal("300.00"));

        List<MovementSnapshot> movements = List.of(
                movement(1L, MovementType.EXPENSE, "80.00", "Groceries", food, LocalDateTime.of(2026, 9, 5, 10, 0)),
                movement(2L, MovementType.EXPENSE, "120.00", "Electricity", utilities, LocalDateTime.of(2026, 9, 6, 10, 0)),
                movement(3L, MovementType.INCOME, "20.00", "Refund", food, LocalDateTime.of(2026, 9, 7, 10, 0)));

        when(budgetRepository.findByIdAndUserId(25L, 1L)).thenReturn(Optional.of(independent));
        when(budgetRepository.findByUserIdAndStatus(1L, BudgetStatus.CLOSED)).thenReturn(List.of(independent));
        when(categoryLookupService.findByUser(1L)).thenReturn(List.of(category(food), category(utilities)));
        when(movementQueryService.countByPeriod(anyLong(), any(), any())).thenReturn(3L);
        when(movementQueryService.findByPeriod(anyLong(), any(), any())).thenReturn(movements);

        var report = service.getReport(1L, 25L);

        assertEquals(BudgetScope.INDEPENDENT_CATEGORY, report.scope());
        assertEquals(new BigDecimal("80.00"), report.totalExpenses());
        assertEquals(new BigDecimal("20.00"), report.totalIncome());
        assertEquals(2, report.movements().size());
        assertEquals(1, report.categories().size());
        assertEquals(5L, report.categories().getFirst().categoryId());
    }

    @Test
    void rejectsReportsThatExceedTheConfiguredMovementLimit() {
        Budget closed = new Budget();
        closed.setId(30L);
        closed.setStatus(BudgetStatus.CLOSED);
        closed.setStartDate(LocalDate.of(2026, 1, 1));
        closed.setEndDate(LocalDate.of(2026, 1, 31));

        when(budgetRepository.findByIdAndUserId(30L, 1L)).thenReturn(Optional.of(closed));
        when(movementQueryService.countByPeriod(
                1L,
                LocalDate.of(2026, 1, 1).atStartOfDay(),
                LocalDate.of(2026, 1, 31).atTime(23, 59, 59, 999_999_000)))
                .thenReturn(2001L);

        assertThrows(ReportTooLargeException.class, () -> service.getReport(1L, 30L));
    }

    private MovementSnapshot movement(Long id,
                                      MovementType type,
                                      String amount,
                                      String description,
                                      Category category,
                                      LocalDateTime date) {
        return new MovementSnapshot(
                id,
                new BigDecimal(amount),
                type,
                description,
                date,
                category != null ? category.getId() : null,
                category != null ? category.getName() : "Uncategorized",
                category != null ? category.getColor() : "#a1a1aa",
                category != null ? category.getIcon() : null,
                description != null && description.startsWith("Aporte a meta:")
                        ? com.equio.backend.transactions.entities.enums.MovementSource.GOAL_CONTRIBUTION
                        : com.equio.backend.transactions.entities.enums.MovementSource.MANUAL,
                null, description != null && description.startsWith("Aporte a meta:")
                        ? description.substring("Aporte a meta:".length()).trim() : null);
    }

    private CategorySnapshot category(Category category) {
        return new CategorySnapshot(
                category.getId(), category.getName(), category.getColor(), category.getIcon());
    }
}
