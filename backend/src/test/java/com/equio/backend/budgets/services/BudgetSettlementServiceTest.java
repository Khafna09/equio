package com.equio.backend.budgets.services;

import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.entities.enums.SavingsType;
import com.equio.backend.shared.events.BudgetSavingsSettlementEvent;
import com.equio.backend.transactions.entities.enums.MovementType;
import com.equio.backend.transactions.services.MovementQueryService;
import com.equio.backend.users.entities.User;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BudgetSettlementServiceTest {
    @Test
    void creditsReservedSavingsAndUnusedSpendableAmount() {
        MovementQueryService movements = mock(MovementQueryService.class);
        ApplicationEventPublisher publisher = mock(ApplicationEventPublisher.class);
        BudgetSettlementService service = new BudgetSettlementService(movements, publisher);
        User user = new User();
        user.setId(7L);
        Budget budget = new Budget();
        budget.setId(12L);
        budget.setUser(user);
        budget.setTotalAmount(new BigDecimal("1000.00"));
        budget.setSavingsType(SavingsType.PERCENTAGE);
        budget.setSavingsValue(new BigDecimal("10"));
        budget.setStartDate(LocalDate.of(2026, 9, 1));
        when(movements.sumByType(eq(7L), eq(MovementType.EXPENSE), any(), any()))
                .thenReturn(new BigDecimal("650.00"));

        BigDecimal result = service.publishSettlement(budget, LocalDate.of(2026, 9, 30));

        assertEquals(0, new BigDecimal("350.00").compareTo(result));
        ArgumentCaptor<BudgetSavingsSettlementEvent> event =
                ArgumentCaptor.forClass(BudgetSavingsSettlementEvent.class);
        verify(publisher).publishEvent(event.capture());
        assertEquals(0, new BigDecimal("100.00").compareTo(event.getValue().reservedAmount()));
        assertEquals(0, new BigDecimal("250.00").compareTo(event.getValue().unusedAmount()));
    }

    @Test
    void ignoresChildBudgetsToPreventDoubleCounting() {
        MovementQueryService movements = mock(MovementQueryService.class);
        ApplicationEventPublisher publisher = mock(ApplicationEventPublisher.class);
        BudgetSettlementService service = new BudgetSettlementService(movements, publisher);
        Budget child = new Budget();
        child.setParentBudget(new Budget());

        assertEquals(BigDecimal.ZERO, service.publishSettlement(child, LocalDate.now()));
        verifyNoInteractions(movements, publisher);
    }
}
