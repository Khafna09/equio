package com.equio.backend.budgets.services;

import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.repositories.BudgetRepository;
import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
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
    public Optional<GlobalBudgetSnapshot> findLatestGlobal(Long userId) {
        return budgetRepository.findByUserId(userId).stream()
                .filter(budget -> budget.getCategory() == null)
                .max(Comparator.comparing(Budget::getCreatedAt))
                .map(budget -> new GlobalBudgetSnapshot(
                        budget.getTotalAmount(),
                        budget.getTotalAmount().subtract(BudgetPolicy.assignableLimit(
                                budget.getTotalAmount(), budget.getSavingsType(), budget.getSavingsValue()))));
    }

    public record GlobalBudgetSnapshot(
            BigDecimal totalAmount,
            BigDecimal savingsDeduction
    ) {
    }
}
