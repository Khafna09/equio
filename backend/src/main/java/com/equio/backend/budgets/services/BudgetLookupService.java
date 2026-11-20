package com.equio.backend.budgets.services;

import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.entities.enums.BudgetScope;
import com.equio.backend.budgets.entities.enums.BudgetStatus;
import com.equio.backend.budgets.repositories.BudgetRepository;
import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.Comparator;
import java.util.List;

@Service
public class BudgetLookupService {

    private final BudgetRepository budgetRepository;

    public BudgetLookupService(BudgetRepository budgetRepository) {
        this.budgetRepository = budgetRepository;
    }

    @Transactional(readOnly = true)
    public Budget requireOwnedBudget(Long userId, Long budgetId) {
        return budgetRepository.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget"));
    }

    @Transactional(readOnly = true)
    public Optional<GlobalBudgetSnapshot> findActiveGlobal(Long userId) {
        return budgetRepository.findByUserIdAndStatusAndCategoryIsNull(userId, BudgetStatus.ACTIVE)
                .filter(budget -> budget.getStartDate() != null && budget.getEndDate() != null)
                .map(budget -> new GlobalBudgetSnapshot(
                        budget.getTotalAmount(),
                        budget.getTotalAmount().subtract(BudgetPolicy.assignableLimit(
                                budget.getTotalAmount(), budget.getSavingsType(), budget.getSavingsValue(),
                                budget.getSavingsPoolContribution())),
                        budget.getStartDate(), budget.getEndDate(), budget.movementStart()));
    }

    @Transactional(readOnly = true)
    public List<DashboardBudgetSnapshot> findActiveDashboardBudgets(Long userId) {
        return budgetRepository.findByUserIdAndStatusAndParentBudgetIsNull(userId, BudgetStatus.ACTIVE).stream()
                .filter(budget -> budget.getStartDate() != null && budget.getEndDate() != null)
                .sorted(Comparator
                        .comparing((Budget budget) -> budget.getCategory() != null)
                        .thenComparing(Budget::getId))
                .map(this::toDashboardSnapshot)
                .toList();
    }

    private DashboardBudgetSnapshot toDashboardSnapshot(Budget budget) {
        var category = budget.getCategory();
        BudgetScope scope = category == null ? BudgetScope.GLOBAL : BudgetScope.INDEPENDENT_CATEGORY;
        BigDecimal savingsDeduction = category == null
                ? budget.getTotalAmount().subtract(BudgetPolicy.assignableLimit(
                        budget.getTotalAmount(), budget.getSavingsType(), budget.getSavingsValue(),
                        budget.getSavingsPoolContribution()))
                : BigDecimal.ZERO;
        return new DashboardBudgetSnapshot(
                budget.getId(),
                category != null ? category.getName() : budget.getName(),
                scope,
                category != null ? category.getId() : null,
                category != null ? category.getName() : null,
                category != null ? category.getColor() : null,
                category != null ? category.getIcon() : null,
                budget.getTotalAmount(),
                savingsDeduction,
                budget.getStartDate(),
                budget.getEndDate(),
                budget.movementStart());
    }

    public record GlobalBudgetSnapshot(
            BigDecimal totalAmount,
            BigDecimal savingsDeduction,
            LocalDate startDate,
            LocalDate endDate,
            java.time.LocalDateTime accountingStartAt
    ) {
        public GlobalBudgetSnapshot(BigDecimal totalAmount, BigDecimal savingsDeduction,
                                    LocalDate startDate, LocalDate endDate) {
            this(totalAmount, savingsDeduction, startDate, endDate, startDate.atStartOfDay());
        }
    }

    public record DashboardBudgetSnapshot(
            Long id,
            String name,
            BudgetScope scope,
            Long categoryId,
            String categoryName,
            String categoryColor,
            String categoryIcon,
            BigDecimal totalAmount,
            BigDecimal savingsDeduction,
            LocalDate startDate,
            LocalDate endDate,
            java.time.LocalDateTime accountingStartAt
    ) {
    }
}
