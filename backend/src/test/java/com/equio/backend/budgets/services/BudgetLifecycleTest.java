package com.equio.backend.budgets.services;

import com.equio.backend.budgets.dto.requests.BudgetRequest;
import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.entities.enums.BudgetStatus;
import com.equio.backend.budgets.entities.enums.SavingsType;
import com.equio.backend.budgets.repositories.BudgetRepository;
import com.equio.backend.dashboard.services.DashboardServiceImpl;
import com.equio.backend.dashboard.dto.DashboardPeriod;
import com.equio.backend.shared.exceptions.BusinessConflictException;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.transactions.entities.Category;
import com.equio.backend.transactions.entities.enums.MovementType;
import com.equio.backend.transactions.services.CategoryLookupService;
import com.equio.backend.transactions.services.MovementQueryService;
import com.equio.backend.users.entities.User;
import com.equio.backend.users.services.UserLookupService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BudgetLifecycleTest {
    private final LocalDate today = LocalDate.now();
    private final List<Budget> stored = new ArrayList<>();
    private final BudgetRepository repository = mock(BudgetRepository.class);
    private final UserLookupService users = mock(UserLookupService.class);
    private final CategoryLookupService categories = mock(CategoryLookupService.class);
    private final MovementQueryService movements = mock(MovementQueryService.class);
    private final RlsContext rls = mock(RlsContext.class);
    private final BudgetSettlementService settlements = mock(BudgetSettlementService.class);
    private final AdvancedBudgetAccessService advancedAccess = mock(AdvancedBudgetAccessService.class);
    private final BudgetCalculationService calculations = new BudgetCalculationService(repository, movements);
    private final BudgetServiceImpl service = new BudgetServiceImpl(
            repository, users, categories, mock(ApplicationEventPublisher.class), movements, rls, settlements,
            advancedAccess, calculations, mock(com.equio.backend.shared.security.FinancialConcurrencyGuard.class));
    private final DashboardServiceImpl dashboard = new DashboardServiceImpl(
            movements, new BudgetLookupService(repository), rls);
    private long nextId = 1;

    @BeforeEach
    void setUp() {
        when(advancedAccess.isEnabled()).thenReturn(true);
        User user = new User();
        user.setId(1L);
        when(users.requireUser(1L)).thenReturn(user);
        when(repository.findByUserIdAndStatus(eq(1L), any())).thenAnswer(invocation ->
                stored.stream().filter(b -> b.getStatus() == invocation.getArgument(1)).toList());
        when(repository.findByUserIdAndStatusAndCategoryIsNull(eq(1L), any())).thenAnswer(invocation ->
                stored.stream().filter(b -> b.getCategory() == null
                        && b.getStatus() == invocation.getArgument(1)).findFirst());
        when(repository.findByIdAndUserId(anyLong(), eq(1L))).thenAnswer(invocation ->
                stored.stream().filter(b -> b.getId().equals(invocation.getArgument(0))).findFirst());
        when(repository.findByParentBudgetId(anyLong())).thenAnswer(invocation ->
                stored.stream().filter(b -> b.getParentBudget() != null
                        && b.getParentBudget().getId().equals(invocation.getArgument(0))).toList());
        when(repository.save(any(Budget.class))).thenAnswer(invocation -> {
            Budget budget = invocation.getArgument(0);
            if (budget.getId() == null) {
                budget.setId(nextId++);
                stored.add(budget);
                if (budget.getParentBudget() != null) budget.getParentBudget().getSubBudgets().add(budget);
            }
            return budget;
        });
        doAnswer(invocation -> { stored.remove(invocation.getArgument(0)); return null; })
                .when(repository).delete(any(Budget.class));
        when(movements.sumByType(eq(1L), eq(MovementType.INCOME), any(), any()))
                .thenReturn(new BigDecimal("100"));
        when(movements.sumByType(eq(1L), eq(MovementType.EXPENSE), any(), any()))
                .thenReturn(new BigDecimal("40"));
        when(movements.sumExpensesByCategory(eq(1L), anyLong(), any(), any())).thenReturn(BigDecimal.ZERO);
        Category food = new Category();
        food.setId(7L);
        food.setName("Food");
        when(categories.requireOwnedCategory(1L, 7L)).thenReturn(food);
    }

    @Test
    void closingThenCreatingAndDeletingNeverRestoresTheClosedBudgetInDashboard() {
        var first = service.create(1L, request("1000", null, null));
        assertBalance("860", "1000");
        var child = service.create(1L, request("200", 7L, first.id()));

        service.closeBudget(1L, first.id());
        assertBalance("60", null);
        assertTrue(service.getAllByUser(1L).isEmpty());
        assertEquals(2, service.getHistoryByUser(1L).size());
        assertEquals(BudgetStatus.CLOSED.name(), service.getById(1L, child.id()).status());

        var second = service.create(1L, request("2000", null, null));
        assertBalance("1760", "2000");
        service.delete(1L, second.id(), true);
        assertBalance("60", null);
        assertEquals(2, service.getHistoryByUser(1L).size());

        service.delete(1L, first.id(), true);
        assertBalance("60", null);
        assertTrue(service.getHistoryByUser(1L).isEmpty());
    }

    @Test
    void dashboardDoesNotApplyAnActiveBudgetToAnUnrelatedMonth() {
        service.create(1L, request("1000", null, null));
        LocalDate otherMonth = today.plusMonths(2);
        var summary = dashboard.getSummary(1L, DashboardPeriod.MONTH, otherMonth);
        assertNull(summary.globalBudgetAmount());
        assertEquals(new BigDecimal("60"), summary.balance());
    }

    @Test
    void closedBudgetsCannotBeEditedOrClosedAgain() {
        var budget = service.create(1L, request("1000", null, null));
        service.closeBudget(1L, budget.id());
        assertThrows(BusinessConflictException.class,
                () -> service.update(1L, budget.id(), request("2000", null, null)));
        assertThrows(BusinessConflictException.class, () -> service.closeBudget(1L, budget.id()));
    }

    @Test
    void rejectsCreationUsingAClosedParentAndAllowsReusingAHistoricalCategory() {
        var parent = service.create(1L, request("1000", null, null));
        service.create(1L, request("100", 7L, parent.id()));
        assertThrows(BusinessConflictException.class,
                () -> service.create(1L, request("100", 7L, parent.id())));
        service.closeBudget(1L, parent.id());
        assertThrows(BusinessConflictException.class,
                () -> service.create(1L, request("100", 7L, parent.id())));
        var next = service.create(1L, request("2000", null, null));
        assertDoesNotThrow(() -> service.create(1L, request("100", 7L, next.id())));
    }

    @Test
    void rejectsChangingScopeAndExceedingTheLimitAfterSavings() {
        var parent = service.create(1L, request("1000", null, null));
        service.create(1L, request("800", 7L, parent.id()));
        assertThrows(BusinessConflictException.class,
                () -> service.update(1L, parent.id(), request("800", null, null)));
        assertThrows(BusinessConflictException.class,
                () -> service.update(1L, parent.id(), request("1000", 7L, null)));
    }

    @Test
    void manuallyClosingExpiredBudgetDoesNotExtendItsReportingPeriod() {
        var created = service.create(1L, request("1000", null, null));
        Budget budget = stored.getFirst();
        budget.setStartDate(today.minusMonths(2));
        budget.setEndDate(today.minusMonths(1));
        assertEquals(today.minusMonths(1), service.closeBudget(1L, created.id()).endDate());
    }

    @Test
    void rejectsClosingBeforeTheStartDate() {
        var created = service.create(1L, request("1000", null, null));
        stored.getFirst().setStartDate(today.plusDays(1));
        assertThrows(BusinessConflictException.class, () -> service.closeBudget(1L, created.id()));
        assertEquals(BudgetStatus.ACTIVE, stored.getFirst().getStatus());
    }

    @Test
    void spendingExactlyTheLimitIsNotAnOverrun() {
        when(movements.sumExpensesByCategory(eq(1L), eq(7L), any(), any())).thenReturn(new BigDecimal("40"));
        var budget = service.create(1L, request("40", 7L, null));
        assertFalse(budget.isOverBudget());
    }

    @Test
    void globalRemainingAndOverrunUseTheLimitAfterSavings() {
        var budget = service.create(1L, request("40", null, null));
        assertTrue(budget.isOverBudget());
        assertEquals(0, BigDecimal.ZERO.compareTo(budget.remainingAmount()));
        assertTrue(budget.progressPercentage() > 100);
    }

    @Test
    void changingTheGlobalDatesUpdatesItsChildren() {
        var parent = service.create(1L, request("1000", null, null));
        var child = service.create(1L, request("200", 7L, parent.id()));
        LocalDate end = today.plusMonths(1);
        var updated = new BudgetRequest("General", new BigDecimal("1000"), false,
                today, end, null, null, SavingsType.PERCENTAGE, BigDecimal.TEN, false, null, false);
        service.update(1L, parent.id(), updated);
        var childResponse = service.getById(1L, child.id());
        assertEquals(today, childResponse.startDate());
        assertEquals(end, childResponse.endDate());
        assertEquals(BigDecimal.TEN, service.getById(1L, parent.id()).savingsValue());
    }

    @Test
    void rejectsChangingLinkedChildDatesIndependently() {
        var parent = service.create(1L, request("1000", null, null));
        var child = service.create(1L, request("200", 7L, parent.id()));
        var updated = new BudgetRequest("Child", new BigDecimal("200"), false,
                today.plusDays(1), today.plusMonths(1), 7L, parent.id(), null, null, false, null, false);
        assertThrows(BusinessConflictException.class, () -> service.update(1L, child.id(), updated));
    }

    @Test
    void recordingAnExpenseLooksUpOnlyTheActiveCategoryBudget() {
        var parent = service.create(1L, request("1000", null, null));
        var child = service.create(1L, request("200", 7L, parent.id()));
        Budget activeChild = stored.stream().filter(b -> b.getId().equals(child.id())).findFirst().orElseThrow();
        when(repository.findByUserIdAndCategoryIdAndStatus(1L, 7L, BudgetStatus.ACTIVE))
                .thenReturn(Optional.of(activeChild));
        service.addExpense(1L, 7L, new BigDecimal("25"));
        assertEquals(new BigDecimal("25"), activeChild.getSpentAmount());
        verify(repository).findByUserIdAndCategoryIdAndStatus(1L, 7L, BudgetStatus.ACTIVE);
    }

    @Test
    void categoryBudgetUsesTheCategoryNameInsteadOfARequestAlias() {
        var budget = service.create(1L, new BudgetRequest("Alias", new BigDecimal("100"), false,
                today, today.plusDays(10), 7L, null, null, null, false, null, true));

        assertEquals("Food", budget.name());
    }

    private BudgetRequest request(String amount, Long categoryId, Long parentId) {
        return new BudgetRequest("Budget", new BigDecimal(amount), false,
                today, today.withDayOfMonth(today.lengthOfMonth()), categoryId, parentId,
                categoryId == null ? SavingsType.PERCENTAGE : null,
                categoryId == null ? BigDecimal.TEN : null, false, null,
                categoryId != null && parentId == null);
    }

    private void assertBalance(String expected, String budgetAmount) {
        var summary = dashboard.getSummary(1L, DashboardPeriod.AUTO, today);
        assertEquals(0, new BigDecimal(expected).compareTo(summary.balance()));
        if (budgetAmount == null) {
            assertNull(summary.globalBudgetAmount());
            assertNull(summary.savingsDeduction());
        } else {
            assertEquals(0, new BigDecimal(budgetAmount).compareTo(summary.globalBudgetAmount()));
        }
    }
}
