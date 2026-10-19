package com.equio.backend.savings.services;

import com.equio.backend.shared.events.BudgetSavingsSettlementEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class SavingsPoolSettlementListener {
    private final SavingsPoolService savingsPoolService;

    public SavingsPoolSettlementListener(SavingsPoolService savingsPoolService) {
        this.savingsPoolService = savingsPoolService;
    }

    @EventListener
    public void onBudgetSettlement(BudgetSavingsSettlementEvent event) {
        savingsPoolService.creditBudgetClosure(event);
    }
}
