package com.equio.backend.savings.services;

import com.equio.backend.shared.events.BudgetLinkRemovalRequestedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class SavingGoalBudgetLinkListener {

    private final SavingGoalBudgetLinkService savingGoalBudgetLinkService;

    public SavingGoalBudgetLinkListener(SavingGoalBudgetLinkService savingGoalBudgetLinkService) {
        this.savingGoalBudgetLinkService = savingGoalBudgetLinkService;
    }

    @EventListener
    public void onBudgetLinkRemovalRequested(BudgetLinkRemovalRequestedEvent event) {
        savingGoalBudgetLinkService.removeBudgetLink(event.budgetId(), event.preserveGoals());
    }
}
