package com.equio.backend.budgets.services;

import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.entities.enums.BudgetStatus;
import com.equio.backend.budgets.repositories.BudgetRepository;
import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

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
}
