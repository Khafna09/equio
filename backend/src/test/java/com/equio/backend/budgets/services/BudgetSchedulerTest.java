package com.equio.backend.budgets.services;

import com.equio.backend.users.services.UserLookupService;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.List;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BudgetSchedulerTest {
    @Test
    void isolatesFailuresAndContinuesWithTheNextUserAndPage() {
        var users = mock(UserLookupService.class);
        var processor = mock(BudgetCycleProcessor.class);
        when(users.findIdsAfter(0L, 100)).thenReturn(List.of(1L, 2L));
        when(users.findIdsAfter(2L, 100)).thenReturn(List.of(3L));
        when(users.findIdsAfter(3L, 100)).thenReturn(List.of());
        doThrow(new IllegalStateException("fixture failure")).when(processor).processUser(eq(1L), any());

        new BudgetScheduler(users, processor).processExpiredBudgets();

        verify(processor).processUser(2L, LocalDate.now());
        verify(processor).processUser(3L, LocalDate.now());
        verify(users).findIdsAfter(3L, 100);
    }
}
