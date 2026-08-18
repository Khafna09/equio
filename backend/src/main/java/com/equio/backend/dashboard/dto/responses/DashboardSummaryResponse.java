package com.equio.backend.dashboard.dto.responses;

import java.math.BigDecimal;
import java.util.List;

public record DashboardSummaryResponse(
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal balance,
        BigDecimal globalBudgetAmount,
        BigDecimal savingsDeduction,
        List<CategorySummary> expenseCategories,
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
