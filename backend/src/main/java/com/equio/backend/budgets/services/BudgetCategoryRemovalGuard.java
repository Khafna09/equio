package com.equio.backend.budgets.services;

import com.equio.backend.budgets.repositories.BudgetRepository;
import com.equio.backend.shared.events.CategoryRemovalRequestedEvent;
import com.equio.backend.shared.exceptions.BusinessConflictException;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class BudgetCategoryRemovalGuard {
    private final BudgetRepository budgets;

    public BudgetCategoryRemovalGuard(BudgetRepository budgets) {
        this.budgets = budgets;
    }

    @EventListener
    public void validate(CategoryRemovalRequestedEvent event) {
        if (budgets.existsByUserIdAndCategoryId(event.userId(), event.categoryId())) {
            throw new BusinessConflictException("CATEGORY_IN_USE", "A referenced category cannot be deleted.");
        }
    }
}
