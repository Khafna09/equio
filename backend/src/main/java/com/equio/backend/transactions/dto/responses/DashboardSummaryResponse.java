package com.equio.backend.transactions.dto.responses;

import java.math.BigDecimal;
import java.util.List;

public record DashboardSummaryResponse(
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal balance,
        BigDecimal globalBudgetAmount,
        BigDecimal savingsDeduction,
        List<CategorySummary> topCategories
) {
    public record CategorySummary(
            String categoryName,
            String categoryColor,
            String categoryIcon,
            BigDecimal totalSpent,
            double percentage
    ) {}
}
