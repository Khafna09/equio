package com.equio.backend.budgets.services;

import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.entities.enums.BudgetStatus;
import com.equio.backend.budgets.entities.enums.SavingsType;
import com.equio.backend.budgets.repositories.BudgetRepository;
import com.equio.backend.shared.exceptions.ReportTooLargeException;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.transactions.entities.Category;
import com.equio.backend.transactions.entities.Movement;
import com.equio.backend.transactions.entities.enums.MovementType;
import com.equio.backend.transactions.repositories.CategoryRepository;
import com.equio.backend.transactions.repositories.MovementRepository;
import com.equio.backend.users.entities.User;
import com.equio.backend.users.repositories.ProfileRepository;
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

class BudgetHistoryReportServiceTest {

    private BudgetRepository budgetRepository;
    private MovementRepository movementRepository;
    private CategoryRepository categoryRepository;
    private RlsContext rlsContext;
    private BudgetHistoryReportService service;

    @BeforeEach
    void setUp() {
        budgetRepository = mock(BudgetRepository.class);
        movementRepository = mock(MovementRepository.class);
        categoryRepository = mock(CategoryRepository.class);
        rlsContext = mock(RlsContext.class);
        service = new BudgetHistoryReportService(
                budgetRepository, movementRepository, categoryRepository, rlsContext, 2000);
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

        List<Movement> movements = List.of(
                movement(1L, user, MovementType.INCOME, "2000.00", "Salary", null, LocalDateTime.of(2026, 8, 1, 9, 0)),
                movement(2L, user, MovementType.EXPENSE, "500.00", "Groceries", food, LocalDateTime.of(2026, 8, 14, 12, 0)),
                movement(3L, user, MovementType.EXPENSE, "100.00", "Transport", null, LocalDateTime.of(2026, 8, 15, 10, 0)),
                movement(4L, user, MovementType.EXPENSE, "200.00", "Aporte a meta: Japan", null, LocalDateTime.of(2026, 8, 16, 10, 0))
        );

        when(budgetRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(global));
        when(budgetRepository.findByParentBudgetId(10L)).thenReturn(List.of(child));
        when(budgetRepository.findByUserIdAndStatus(1L, BudgetStatus.CLOSED)).thenReturn(List.of(global));
        when(categoryRepository.findByUserId(1L)).thenReturn(List.of(food, utilities));
        when(movementRepository.countByUserIdAndDateBetween(
                1L,
                LocalDate.of(2026, 8, 1).atStartOfDay(),
                LocalDate.of(2026, 8, 31).atTime(23, 59, 59)))
                .thenReturn(4L);
        when(movementRepository.findByUserIdAndDateBetweenOrderByDateDesc(
                1L,
                LocalDate.of(2026, 8, 1).atStartOfDay(),
                LocalDate.of(2026, 8, 31).atTime(23, 59, 59)))
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

        ProfileRepository profileRepository = mock(ProfileRepository.class);
        RlsContext pdfRlsContext = mock(RlsContext.class);
        when(profileRepository.findByUserId(1L)).thenReturn(Optional.empty());
        byte[] pdf = new BudgetHistoryPdfService(profileRepository, pdfRlsContext).generate(1L, report);

        assertTrue(pdf.length > 5);
        assertEquals("%PDF-", new String(pdf, 0, 5, StandardCharsets.US_ASCII));
        verify(pdfRlsContext).setUserId(1L);
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
    void rejectsReportsThatExceedTheConfiguredMovementLimit() {
        Budget closed = new Budget();
        closed.setId(30L);
        closed.setStatus(BudgetStatus.CLOSED);
        closed.setStartDate(LocalDate.of(2026, 1, 1));
        closed.setEndDate(LocalDate.of(2026, 1, 31));

        when(budgetRepository.findByIdAndUserId(30L, 1L)).thenReturn(Optional.of(closed));
        when(movementRepository.countByUserIdAndDateBetween(
                1L,
                LocalDate.of(2026, 1, 1).atStartOfDay(),
                LocalDate.of(2026, 1, 31).atTime(23, 59, 59)))
                .thenReturn(2001L);

        assertThrows(ReportTooLargeException.class, () -> service.getReport(1L, 30L));
    }

    private Movement movement(Long id,
                              User user,
                              MovementType type,
                              String amount,
                              String description,
                              Category category,
                              LocalDateTime date) {
        Movement movement = new Movement();
        movement.setId(id);
        movement.setUser(user);
        movement.setType(type);
        movement.setAmount(new BigDecimal(amount));
        movement.setDescription(description);
        movement.setCategory(category);
        movement.setDate(date);
        return movement;
    }
}
