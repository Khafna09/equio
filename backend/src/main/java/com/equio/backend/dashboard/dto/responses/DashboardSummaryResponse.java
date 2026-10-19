package com.equio.backend.dashboard.dto.responses;

import java.math.BigDecimal;
import java.time.LocalDate;
import com.equio.backend.dashboard.dto.DashboardPeriod;
import java.util.List;

public record DashboardSummaryResponse(
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal balance,
        BigDecimal globalBudgetAmount,
        BigDecimal savingsDeduction,
        List<CategorySummary> expenseCategories,
        List<CategorySummary> topCategories,
        DashboardPeriod period,
        LocalDate startDate,
        LocalDate endDate,
        boolean hasActiveBudget,
        java.time.LocalDateTime accountingStartAt
) {
    public record CategorySummary(
            String categoryName,
            String categoryColor,
            String categoryIcon,
            BigDecimal totalSpent,
            double percentage
    ) {}
}
