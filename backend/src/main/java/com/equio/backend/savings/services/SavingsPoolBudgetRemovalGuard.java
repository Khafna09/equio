package com.equio.backend.savings.services;

import com.equio.backend.savings.repositories.SavingsPoolTransactionRepository;
import com.equio.backend.shared.events.BudgetLinkRemovalRequestedEvent;
import com.equio.backend.shared.exceptions.BusinessConflictException;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

@Service
public class SavingsPoolBudgetRemovalGuard {
    private final SavingsPoolTransactionRepository transactions;

    public SavingsPoolBudgetRemovalGuard(SavingsPoolTransactionRepository transactions) {
        this.transactions = transactions;
    }

    @EventListener
    public void validate(BudgetLinkRemovalRequestedEvent event) {
        if (transactions.existsByUserIdAndBudgetId(event.userId(), event.budgetId())) {
            throw new BusinessConflictException("BUDGET_HAS_POOL_TRANSACTIONS",
                    "A budget with savings pool transactions must be retained for financial traceability.");
        }
    }
}
