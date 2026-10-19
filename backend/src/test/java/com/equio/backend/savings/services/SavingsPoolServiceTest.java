package com.equio.backend.savings.services;

import com.equio.backend.budgets.services.BudgetFundingService;
import com.equio.backend.savings.entities.SavingGoal;
import com.equio.backend.savings.entities.SavingsPool;
import com.equio.backend.savings.entities.SavingsPoolTransaction;
import com.equio.backend.savings.entities.enums.SavingsPoolTransactionType;
import com.equio.backend.savings.repositories.SavingGoalRepository;
import com.equio.backend.savings.repositories.SavingsPoolRepository;
import com.equio.backend.savings.repositories.SavingsPoolTransactionRepository;
import com.equio.backend.shared.events.BudgetSavingsSettlementEvent;
import com.equio.backend.shared.exceptions.BusinessConflictException;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.users.entities.User;
import com.equio.backend.users.services.UserLookupService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SavingsPoolServiceTest {
    private final SavingsPoolRepository pools = mock(SavingsPoolRepository.class);
    private final SavingsPoolTransactionRepository transactions = mock(SavingsPoolTransactionRepository.class);
    private final SavingGoalRepository goals = mock(SavingGoalRepository.class);
    private final UserLookupService users = mock(UserLookupService.class);
    private final BudgetFundingService budgetFunding = mock(BudgetFundingService.class);
    private final RlsContext rls = mock(RlsContext.class);
    private final SavingsPoolConcurrencyGuard guard = mock(SavingsPoolConcurrencyGuard.class);
    private final SavingsPoolService service = new SavingsPoolService(
            pools, transactions, goals, users, budgetFunding, rls, guard);
    private final User user = new User();

    @BeforeEach
    void setUp() {
        user.setId(1L);
        when(users.requireUser(1L)).thenReturn(user);
        when(pools.save(any(SavingsPool.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void creditsEachBudgetClosureOnlyOnce() {
        when(transactions.existsByUserIdAndTypeAndBudgetId(
                1L, SavingsPoolTransactionType.BUDGET_CLOSURE_DEPOSIT, 9L))
                .thenReturn(false, true);
        when(pools.findByUserIdForUpdate(1L)).thenReturn(Optional.empty());
        BudgetSavingsSettlementEvent event = new BudgetSavingsSettlementEvent(
                1L, 9L, new BigDecimal("100"), new BigDecimal("250"));

        service.creditBudgetClosure(event);
        service.creditBudgetClosure(event);

        ArgumentCaptor<SavingsPoolTransaction> recorded =
                ArgumentCaptor.forClass(SavingsPoolTransaction.class);
        verify(transactions, times(1)).save(recorded.capture());
        verify(guard, times(2)).lock(1L);
        assertEquals(0, new BigDecimal("350").compareTo(recorded.getValue().getAmount()));
        assertEquals(0, new BigDecimal("350").compareTo(recorded.getValue().getBalanceAfter()));
    }

    @Test
    void transfersToGoalWithoutCreatingAnExternalMovement() {
        SavingsPool pool = new SavingsPool();
        pool.setUser(user);
        pool.setBalance(new BigDecimal("300"));
        SavingGoal goal = new SavingGoal();
        goal.setId(4L);
        goal.setUser(user);
        goal.setTargetAmount(new BigDecimal("1000"));
        goal.setCurrentAmount(new BigDecimal("200"));
        when(pools.findByUserIdForUpdate(1L)).thenReturn(Optional.of(pool));
        when(goals.findByIdAndUserId(4L, 1L)).thenReturn(Optional.of(goal));

        var response = service.transferToGoal(1L, 4L, new BigDecimal("75"));

        assertEquals(0, new BigDecimal("225").compareTo(response.balance()));
        assertEquals(0, new BigDecimal("275").compareTo(goal.getCurrentAmount()));
        verify(budgetFunding, never()).increaseFromSavingsPool(any(), any(), any());
    }

    @Test
    void rejectsTransfersThatExceedThePoolBalance() {
        SavingsPool pool = new SavingsPool();
        pool.setUser(user);
        pool.setBalance(new BigDecimal("20"));
        when(pools.findByUserIdForUpdate(1L)).thenReturn(Optional.of(pool));

        assertThrows(BusinessConflictException.class,
                () -> service.transferToBudget(1L, 3L, new BigDecimal("21")));
        verifyNoInteractions(budgetFunding);
    }
}
