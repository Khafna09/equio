package com.equio.backend.budgets.services;

import com.equio.backend.budgets.dto.responses.BudgetLinkPreviewResponse;
import com.equio.backend.budgets.dto.responses.BudgetResponse;
import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.entities.enums.BudgetStatus;
import com.equio.backend.budgets.repositories.BudgetRepository;
import com.equio.backend.shared.exceptions.BusinessConflictException;
import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.shared.security.FinancialConcurrencyGuard;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

@Service
public class BudgetLinkService {
    private static final Logger LOGGER = LoggerFactory.getLogger(BudgetLinkService.class);

    private final BudgetRepository budgetRepository;
    private final BudgetService budgetService;
    private final AdvancedBudgetAccessService accessService;
    private final RlsContext rlsContext;
    private final BudgetCalculationService budgetCalculationService;
    private final FinancialConcurrencyGuard concurrencyGuard;

    public BudgetLinkService(BudgetRepository budgetRepository,
                             BudgetService budgetService,
                             AdvancedBudgetAccessService accessService,
                             RlsContext rlsContext,
                             BudgetCalculationService budgetCalculationService,
                             FinancialConcurrencyGuard concurrencyGuard) {
        this.budgetRepository = budgetRepository;
        this.budgetService = budgetService;
        this.accessService = accessService;
        this.rlsContext = rlsContext;
        this.budgetCalculationService = budgetCalculationService;
        this.concurrencyGuard = concurrencyGuard;
    }

    @Transactional(readOnly = true)
    public BudgetLinkPreviewResponse preview(Long userId, Long globalBudgetId, Long budgetId) {
        accessService.requireEnabledForUser(userId);
        rlsContext.setUserId(userId);
        Budget global = requireOwned(userId, globalBudgetId);
        Budget child = requireOwned(userId, budgetId);
        validateLinkCandidates(global, child);
        return buildPreview(userId, global, child);
    }

    @Transactional
    public BudgetResponse link(Long userId, Long globalBudgetId, Long budgetId) {
        concurrencyGuard.lock(userId);
        accessService.requireEnabledForUser(userId);
        rlsContext.setUserId(userId);
        Budget global = requireOwnedForUpdate(userId, globalBudgetId);
        Budget child = requireOwnedForUpdate(userId, budgetId);
        validateLinkCandidates(global, child);

        BudgetLinkPreviewResponse preview = buildPreview(userId, global, child);
        if (preview.globalUnallocatedAfterLink().signum() < 0) {
            throw new BusinessConflictException(
                    "BUDGET_INSUFFICIENT_CAPACITY",
                    "The global budget does not have enough assignable capacity.",
                    Map.of(
                            "budgetId", budgetId,
                            "globalBudgetId", globalBudgetId,
                            "requiredAmount", child.getTotalAmount(),
                            "availableAmount", preview.globalAssignableAmount()
                                    .subtract(preview.globalAllocatedAmount())
                                    .max(BigDecimal.ZERO)));
        }

        child.setParentBudget(global);
        child.setFixed(global.isFixed());
        child.setStartDate(global.getStartDate());
        child.setEndDate(global.getEndDate());
        child.setNextStartDate(null);
        child.setAccountingStartAt(global.movementStart());
        child.setSpentAmount(preview.assimilatedSpentAmount());
        budgetRepository.saveAndFlush(child);

        LOGGER.info("budget_linked userId={} globalBudgetId={} budgetId={}",
                userId, globalBudgetId, budgetId);
        return budgetService.getById(userId, budgetId);
    }

    @Transactional
    public BudgetResponse detach(Long userId, Long globalBudgetId, Long budgetId) {
        concurrencyGuard.lock(userId);
        accessService.requireEnabledForUser(userId);
        rlsContext.setUserId(userId);
        Budget global = requireOwnedForUpdate(userId, globalBudgetId);
        Budget child = requireOwnedForUpdate(userId, budgetId);
        requireActiveGlobal(global);
        requireActiveCategory(child);

        if (child.getParentBudget() == null
                || !globalBudgetId.equals(child.getParentBudget().getId())) {
            throw new BusinessConflictException(
                    "BUDGET_PARENT_STALE",
                    "The budget is no longer linked to the selected global budget.",
                    Map.of("budgetId", budgetId, "globalBudgetId", globalBudgetId));
        }

        child.setParentBudget(null);
        budgetRepository.saveAndFlush(child);
        LOGGER.info("budget_detached userId={} globalBudgetId={} budgetId={}",
                userId, globalBudgetId, budgetId);
        return budgetService.getById(userId, budgetId);
    }

    private BudgetLinkPreviewResponse buildPreview(Long userId, Budget global, Budget child) {
        BigDecimal assignable = budgetCalculationService.assignableAmount(global);
        BigDecimal allocated = budgetCalculationService.allocatedAmount(global);
        BigDecimal normalizedSpent = budgetCalculationService.categorySpentAmount(
                userId, child.getCategory().getId(), global.movementStart(), global.movementEnd());
        BigDecimal afterLink = assignable.subtract(allocated).subtract(child.getTotalAmount());

        return new BudgetLinkPreviewResponse(
                global.getId(),
                child.getId(),
                global.getStartDate(),
                global.getEndDate(),
                child.getTotalAmount(),
                normalizedSpent,
                assignable,
                allocated,
                afterLink);
    }

    private void validateLinkCandidates(Budget global, Budget child) {
        requireActiveGlobal(global);
        requireActiveCategory(child);
        if (child.getParentBudget() != null) {
            throw new BusinessConflictException(
                    "BUDGET_ALREADY_LINKED",
                    "The category budget is already linked.",
                    Map.of("budgetId", child.getId()));
        }
    }

    private void requireActiveGlobal(Budget budget) {
        if (budget.getStatus() != BudgetStatus.ACTIVE
                || budget.getCategory() != null
                || budget.getParentBudget() != null) {
            throw new BusinessConflictException(
                    "BUDGET_GLOBAL_NOT_ACTIVE",
                    "The selected global budget is not active.",
                    Map.of("budgetId", budget.getId()));
        }
        if (budget.getStartDate() == null) {
            throw new BusinessConflictException(
                    "BUDGET_INVALID_PERIOD",
                    "The selected global budget does not have a valid period.");
        }
    }

    private void requireActiveCategory(Budget budget) {
        if (budget.getStatus() != BudgetStatus.ACTIVE || budget.getCategory() == null) {
            throw new BusinessConflictException(
                    "BUDGET_CATEGORY_NOT_ACTIVE",
                    "The selected category budget is not active.",
                    Map.of("budgetId", budget.getId()));
        }
    }

    private Budget requireOwned(Long userId, Long budgetId) {
        return budgetRepository.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget"));
    }

    private Budget requireOwnedForUpdate(Long userId, Long budgetId) {
        return budgetRepository.findForUpdateByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget"));
    }
}
