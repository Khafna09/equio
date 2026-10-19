package com.equio.backend.shared.events;

import java.math.BigDecimal;

public record BudgetSavingsSettlementEvent(
        Long userId,
        Long budgetId,
        BigDecimal reservedAmount,
        BigDecimal unusedAmount
) {
    public BigDecimal totalAmount() {
        return reservedAmount.add(unusedAmount);
    }
}
