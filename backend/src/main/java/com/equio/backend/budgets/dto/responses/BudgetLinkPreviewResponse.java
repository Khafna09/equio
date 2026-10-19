package com.equio.backend.budgets.dto.responses;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BudgetLinkPreviewResponse(
        Long globalBudgetId,
        Long budgetId,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal budgetLimit,
        BigDecimal assimilatedSpentAmount,
        BigDecimal globalAssignableAmount,
        BigDecimal globalAllocatedAmount,
        BigDecimal globalUnallocatedAfterLink
) {
}
