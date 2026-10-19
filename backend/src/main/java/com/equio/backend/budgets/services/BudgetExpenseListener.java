package com.equio.backend.budgets.services;

import com.equio.backend.shared.events.ExpenseRecordedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class BudgetExpenseListener {

    private final BudgetService budgetService;

    public BudgetExpenseListener(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    @EventListener
    public void onExpenseRecorded(ExpenseRecordedEvent event) {
        budgetService.addExpense(event.userId(), event.categoryId(), event.amount());
    }
}
