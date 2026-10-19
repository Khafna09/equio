package com.equio.backend.budgets.services;

import com.equio.backend.budgets.dto.responses.BudgetModeResponse;
import com.equio.backend.budgets.entities.enums.BudgetStatus;
import com.equio.backend.budgets.repositories.BudgetRepository;
import com.equio.backend.shared.exceptions.BusinessConflictException;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.shared.security.FinancialConcurrencyGuard;
import com.equio.backend.users.entities.enums.BudgetMode;
import com.equio.backend.users.services.ProfileBudgetModeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class BudgetModeService {
    private static final Logger LOGGER = LoggerFactory.getLogger(BudgetModeService.class);
    private final BudgetRepository budgetRepository;
    private final ProfileBudgetModeService profileBudgetModeService;
    private final AdvancedBudgetAccessService advancedBudgetAccessService;
    private final RlsContext rlsContext;
    private final FinancialConcurrencyGuard concurrencyGuard;

    public BudgetModeService(BudgetRepository budgetRepository,
                             ProfileBudgetModeService profileBudgetModeService,
                             AdvancedBudgetAccessService advancedBudgetAccessService,
                             RlsContext rlsContext,
                             FinancialConcurrencyGuard concurrencyGuard) {
        this.budgetRepository = budgetRepository;
        this.profileBudgetModeService = profileBudgetModeService;
        this.advancedBudgetAccessService = advancedBudgetAccessService;
        this.rlsContext = rlsContext;
        this.concurrencyGuard = concurrencyGuard;
    }

    @Transactional
    public BudgetModeResponse changeMode(Long userId, BudgetMode mode) {
        concurrencyGuard.lock(userId);
        rlsContext.setUserId(userId);
        if (mode == BudgetMode.ADVANCED) {
            advancedBudgetAccessService.requireEnabled();
        } else {
            long independentCount = budgetRepository.findByUserIdAndStatus(userId, BudgetStatus.ACTIVE)
                    .stream()
                    .filter(budget -> budget.getCategory() != null && budget.getParentBudget() == null)
                    .count();
            if (independentCount > 0) {
                throw new BusinessConflictException(
                        "BUDGET_MODE_INDEPENDENTS_ACTIVE",
                        "Active independent budgets must be resolved before enabling normal mode.",
                        Map.of("count", independentCount));
            }
        }

        BudgetMode savedMode = profileBudgetModeService.setMode(userId, mode);
        LOGGER.info("budget_mode_changed userId={} mode={}", userId, savedMode);
        return new BudgetModeResponse(savedMode);
    }
}
