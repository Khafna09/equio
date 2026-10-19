package com.equio.backend.budgets.services;

import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.entities.enums.BudgetStatus;
import com.equio.backend.budgets.repositories.BudgetRepository;
import com.equio.backend.shared.exceptions.BusinessConflictException;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.transactions.entities.Category;
import com.equio.backend.users.entities.enums.BudgetMode;
import com.equio.backend.users.services.ProfileBudgetModeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class BudgetModeServiceTest {
    private final BudgetRepository budgets = mock(BudgetRepository.class);
    private final ProfileBudgetModeService profileModes = mock(ProfileBudgetModeService.class);
    private final AdvancedBudgetAccessService access = mock(AdvancedBudgetAccessService.class);
    private final RlsContext rls = mock(RlsContext.class);
    private final BudgetModeService service = new BudgetModeService(budgets, profileModes, access, rls,
            mock(com.equio.backend.shared.security.FinancialConcurrencyGuard.class));

    @BeforeEach
    void setUp() {
        when(profileModes.setMode(anyLong(), any())).thenAnswer(invocation -> invocation.getArgument(1));
    }

    @Test
    void enablesAdvancedModeWhenTheFeatureIsAvailable() {
        var response = service.changeMode(1L, BudgetMode.ADVANCED);

        assertEquals(BudgetMode.ADVANCED, response.mode());
        verify(profileModes).setMode(1L, BudgetMode.ADVANCED);
        verify(access).requireEnabled();
        verify(rls).setUserId(1L);
    }

    @Test
    void refusesNormalModeWhileAnIndependentBudgetIsActive() {
        Budget independent = new Budget();
        independent.setCategory(new Category());
        independent.setStatus(BudgetStatus.ACTIVE);
        when(budgets.findByUserIdAndStatus(1L, BudgetStatus.ACTIVE)).thenReturn(List.of(independent));

        assertThrows(BusinessConflictException.class,
                () -> service.changeMode(1L, BudgetMode.NORMAL));
        verify(profileModes, never()).setMode(anyLong(), any());
    }

    @Test
    void enablesNormalModeAfterIndependentBudgetsAreResolved() {
        when(budgets.findByUserIdAndStatus(1L, BudgetStatus.ACTIVE)).thenReturn(List.of());
        var response = service.changeMode(1L, BudgetMode.NORMAL);

        assertEquals(BudgetMode.NORMAL, response.mode());
        verify(profileModes).setMode(1L, BudgetMode.NORMAL);
    }
}
