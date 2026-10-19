package com.equio.backend.budgets.services;

import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.entities.enums.BudgetScope;
import com.equio.backend.budgets.entities.enums.BudgetStatus;
import com.equio.backend.budgets.repositories.BudgetRepository;
import com.equio.backend.transactions.entities.enums.MovementType;
import com.equio.backend.transactions.services.MovementQueryService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
public class BudgetCalculationService {
    private final BudgetRepository budgetRepository;
    private final MovementQueryService movementQueryService;

    public BudgetCalculationService(BudgetRepository budgetRepository,
                                    MovementQueryService movementQueryService) {
        this.budgetRepository = budgetRepository;
        this.movementQueryService = movementQueryService;
    }

    public BudgetScope scopeOf(Budget budget) {
        if (budget.getCategory() == null) return BudgetScope.GLOBAL;
        return budget.getParentBudget() == null
                ? BudgetScope.INDEPENDENT_CATEGORY
                : BudgetScope.LINKED_CATEGORY;
    }

    public BigDecimal assignableAmount(Budget budget) {
        return BudgetPolicy.assignableLimit(
                budget.getTotalAmount(),
                budget.getSavingsType(),
                budget.getSavingsValue(),
                budget.getSavingsPoolContribution());
    }

    public BigDecimal allocatedAmount(Budget globalBudget) {
        return budgetRepository.findByParentBudgetId(globalBudget.getId()).stream()
                .filter(child -> child.getStatus() == BudgetStatus.ACTIVE)
                .map(Budget::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal spentAmount(Budget budget) {
        if (budget == null) return BigDecimal.ZERO;
        LocalDate start = budget.getStartDate();
        LocalDate end = budget.getEndDate();
        if (start == null && budget.getParentBudget() != null) {
            start = budget.getParentBudget().getStartDate();
            end = budget.getParentBudget().getEndDate();
        }
        if (start == null || budget.getUser() == null) {
            return budget.getSpentAmount() != null ? budget.getSpentAmount() : BigDecimal.ZERO;
        }
        LocalDateTime startDateTime = budget.movementStart();
        LocalDateTime endDateTime = end != null ? budget.movementEnd() : LocalDateTime.now();
        if (budget.getCategory() == null) {
            return movementQueryService.sumByType(
                    budget.getUser().getId(), MovementType.EXPENSE, startDateTime, endDateTime);
        }
        return movementQueryService.sumExpensesByCategory(
                budget.getUser().getId(), budget.getCategory().getId(), startDateTime, endDateTime);
    }

    public BigDecimal categorySpentAmount(Long userId, Long categoryId, LocalDateTime start, LocalDateTime end) {
        if (start == null) return BigDecimal.ZERO;
        BigDecimal value = movementQueryService.sumExpensesByCategory(
                userId,
                categoryId,
                start,
                end != null ? end : LocalDateTime.now());
        return value == null ? BigDecimal.ZERO : value;
    }
}
