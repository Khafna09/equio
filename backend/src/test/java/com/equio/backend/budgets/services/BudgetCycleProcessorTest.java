package com.equio.backend.budgets.services;

import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.entities.enums.BudgetStatus;
import com.equio.backend.budgets.repositories.BudgetRepository;
import com.equio.backend.shared.jobs.DatabaseJobLock;
import com.equio.backend.shared.security.FinancialConcurrencyGuard;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.users.entities.User;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BudgetCycleProcessorTest {
    private final BudgetRepository repository = mock(BudgetRepository.class);
    private final BudgetSettlementService settlements = mock(BudgetSettlementService.class);
    private final DatabaseJobLock jobs = mock(DatabaseJobLock.class);
    private final FinancialConcurrencyGuard guard = mock(FinancialConcurrencyGuard.class);
    private final RlsContext rls = mock(RlsContext.class);
    private final BudgetCycleProcessor processor = new BudgetCycleProcessor(repository, settlements, rls, jobs, guard);

    @Test
    void catchesUpMissedCyclesAndDoesNotSettleThemAgain() {
        var stored = new ArrayList<Budget>();
        Budget original = new Budget();
        User user = new User();
        user.setId(1L);
        original.setUser(user);
        original.setId(1L);
        original.setName("Monthly");
        original.setFixed(true);
        original.setTotalAmount(new BigDecimal("120"));
        original.setSavingsPoolContribution(new BigDecimal("20"));
        original.setStartDate(LocalDate.of(2026, 1, 1));
        original.setEndDate(LocalDate.of(2026, 1, 31));
        stored.add(original);
        when(jobs.tryAcquire(anyLong())).thenReturn(true);
        when(repository.findByUserIdAndStatus(1L, BudgetStatus.ACTIVE)).thenAnswer(call ->
                stored.stream().filter(b -> b.getStatus() == BudgetStatus.ACTIVE).toList());
        when(repository.save(any(Budget.class))).thenAnswer(call -> {
            Budget budget = call.getArgument(0);
            budget.setId((long) stored.size() + 1);
            stored.add(budget);
            return budget;
        });

        processor.processUser(1L, LocalDate.of(2026, 4, 2));
        processor.processUser(1L, LocalDate.of(2026, 4, 2));

        assertEquals(4, stored.size());
        assertEquals(3, stored.stream().filter(b -> b.getStatus() == BudgetStatus.CLOSED).count());
        assertEquals(LocalDate.of(2026, 4, 1), stored.getLast().getStartDate());
        assertEquals(new BigDecimal("100"), stored.getLast().getTotalAmount());
        assertEquals(BigDecimal.ZERO, stored.getLast().getSavingsPoolContribution());
        verify(settlements, times(3)).publishSettlement(any(), any());
        var order = inOrder(repository, settlements);
        order.verify(repository).saveAndFlush(original);
        order.verify(settlements).publishSettlement(original, original.getEndDate());
    }

    @Test
    void skipsWorkWhenAnotherInstanceOwnsTheUserJobLock() {
        when(jobs.tryAcquire(anyLong())).thenReturn(false);
        processor.processUser(1L, LocalDate.now());
        verifyNoInteractions(repository, settlements, guard, rls);
    }
}
