package com.equio.backend.budgets.services;

import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.entities.enums.BudgetStatus;
import com.equio.backend.budgets.repositories.BudgetRepository;
import com.equio.backend.shared.exceptions.BusinessConflictException;
import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.equio.backend.shared.security.FinancialConcurrencyGuard;

import java.math.BigDecimal;

@Service
public class BudgetFundingService {
    private final BudgetRepository budgetRepository;
    private final FinancialConcurrencyGuard concurrencyGuard;

    public BudgetFundingService(BudgetRepository budgetRepository, FinancialConcurrencyGuard concurrencyGuard) {
        this.budgetRepository = budgetRepository;
        this.concurrencyGuard = concurrencyGuard;
    }

    @Transactional
    public void increaseFromSavingsPool(Long userId, Long budgetId, BigDecimal amount) {
        concurrencyGuard.lock(userId);
        Budget budget = budgetRepository.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget"));
        if (budget.getStatus() != BudgetStatus.ACTIVE || budget.getParentBudget() != null
                || budget.getCategory() != null) {
            throw new BusinessConflictException("Savings can only be transferred to an active global budget");
        }
        budget.setTotalAmount(budget.getTotalAmount().add(amount));
        budget.setSavingsPoolContribution(budget.getSavingsPoolContribution().add(amount));
        budgetRepository.save(budget);
    }
}
