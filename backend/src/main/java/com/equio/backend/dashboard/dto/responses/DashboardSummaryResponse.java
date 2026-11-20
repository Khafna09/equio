package com.equio.backend.dashboard.dto.responses;

import java.math.BigDecimal;
import java.time.LocalDate;
import com.equio.backend.dashboard.dto.DashboardPeriod;
import com.equio.backend.budgets.entities.enums.BudgetScope;
import java.util.List;

public record DashboardSummaryResponse(
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal balance,
        BigDecimal globalBudgetAmount,
        BigDecimal savingsDeduction,
        Long selectedBudgetId,
        String selectedBudgetName,
        BudgetScope selectedBudgetScope,
        List<BudgetOption> activeBudgets,
        List<CategorySummary> expenseCategories,
        List<CategorySummary> topCategories,
        DashboardPeriod period,
        LocalDate startDate,
        LocalDate endDate,
        boolean hasActiveBudget,
        java.time.LocalDateTime accountingStartAt
) {
    public record BudgetOption(
            Long id,
            String name,
            BudgetScope scope,
            LocalDate startDate,
            LocalDate endDate
    ) {}

    public record CategorySummary(
            String categoryName,
            String categoryColor,
            String categoryIcon,
            BigDecimal totalSpent,
            double percentage
    ) {}
}
