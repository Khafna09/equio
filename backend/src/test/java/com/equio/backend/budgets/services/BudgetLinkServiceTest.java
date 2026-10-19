package com.equio.backend.budgets.services;

import com.equio.backend.budgets.dto.responses.BudgetResponse;
import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.entities.enums.BudgetStatus;
import com.equio.backend.budgets.repositories.BudgetRepository;
import com.equio.backend.shared.exceptions.BusinessConflictException;
import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.transactions.entities.Category;
import com.equio.backend.transactions.services.MovementQueryService;
import com.equio.backend.users.entities.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BudgetLinkServiceTest {
    private final BudgetRepository repository = mock(BudgetRepository.class);
    private final MovementQueryService movements = mock(MovementQueryService.class);
    private final BudgetService budgetService = mock(BudgetService.class);
    private final AdvancedBudgetAccessService access = mock(AdvancedBudgetAccessService.class);
    private final RlsContext rls = mock(RlsContext.class);
    private final BudgetCalculationService calculations = new BudgetCalculationService(repository, movements);
    private final BudgetLinkService service = new BudgetLinkService(
            repository, budgetService, access, rls, calculations,
            mock(com.equio.backend.shared.security.FinancialConcurrencyGuard.class));

    private Budget global;
    private Budget independent;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setId(1L);

        global = new Budget();
        global.setId(10L);
        global.setName("Global");
        global.setUser(user);
        global.setStatus(BudgetStatus.ACTIVE);
        global.setTotalAmount(new BigDecimal("1000"));
        global.setStartDate(LocalDate.of(2026, 10, 1));
        global.setEndDate(LocalDate.of(2026, 10, 31));

        Category category = new Category();
        category.setId(7L);
        independent = new Budget();
        independent.setId(20L);
        independent.setName("Food");
        independent.setUser(user);
        independent.setCategory(category);
        independent.setStatus(BudgetStatus.ACTIVE);
        independent.setTotalAmount(new BigDecimal("300"));
        independent.setStartDate(LocalDate.of(2026, 9, 1));
        independent.setEndDate(LocalDate.of(2026, 9, 30));

        when(repository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(global));
        when(repository.findByIdAndUserId(20L, 1L)).thenReturn(Optional.of(independent));
        when(repository.findForUpdateByIdAndUserId(10L, 1L)).thenReturn(Optional.of(global));
        when(repository.findForUpdateByIdAndUserId(20L, 1L)).thenReturn(Optional.of(independent));
        when(repository.findByParentBudgetId(10L)).thenReturn(List.of());
        when(movements.sumExpensesByCategory(eq(1L), eq(7L), any(), any()))
                .thenReturn(new BigDecimal("45"));
        when(repository.saveAndFlush(any(Budget.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void linksAnIndependentBudgetAndAssimilatesTheGlobalPeriodSpend() {
        BudgetResponse expected = mock(BudgetResponse.class);
        when(budgetService.getById(1L, 20L)).thenReturn(expected);

        assertSame(expected, service.link(1L, 10L, 20L));
        assertSame(global, independent.getParentBudget());
        assertEquals(global.getStartDate(), independent.getStartDate());
        assertEquals(global.getEndDate(), independent.getEndDate());
        assertEquals(new BigDecimal("45"), independent.getSpentAmount());
        verify(access).requireEnabledForUser(1L);
        verify(rls).setUserId(1L);
    }

    @Test
    void rejectsLinkWhenTheGlobalCapacityIsInsufficient() {
        global.setTotalAmount(new BigDecimal("200"));
        BusinessConflictException exception = assertThrows(
                BusinessConflictException.class,
                () -> service.link(1L, 10L, 20L));

        assertEquals("BUDGET_INSUFFICIENT_CAPACITY", exception.getCode());
        assertNull(independent.getParentBudget());
        verify(repository, never()).saveAndFlush(independent);
    }

    @Test
    void detachesWithoutChangingTheInheritedPeriodOrSpend() {
        independent.setParentBudget(global);
        independent.setStartDate(global.getStartDate());
        independent.setEndDate(global.getEndDate());
        independent.setSpentAmount(new BigDecimal("45"));
        BudgetResponse expected = mock(BudgetResponse.class);
        when(budgetService.getById(1L, 20L)).thenReturn(expected);

        assertSame(expected, service.detach(1L, 10L, 20L));
        assertNull(independent.getParentBudget());
        assertEquals(LocalDate.of(2026, 10, 1), independent.getStartDate());
        assertEquals(new BigDecimal("45"), independent.getSpentAmount());
    }

    @Test
    void doesNotExposeBudgetsOwnedByAnotherUser() {
        when(repository.findByIdAndUserId(20L, 2L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.preview(2L, 10L, 20L));
    }
}
