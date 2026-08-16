package com.equio.backend.budgets.dto.responses;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record BudgetHistoryReportResponse(
        Long budgetId,
        String budgetName,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal totalAmount,
        BigDecimal spendingLimit,
        BigDecimal totalSpent,
        BigDecimal remainingAmount,
        BigDecimal exceededAmount,
        double spentPercentage,
        boolean successful,
        int categoriesWithinLimit,
        int categoriesWithLimit,
        BigDecimal configuredSavings,
        BigDecimal goalContributions,
        List<GoalContribution> goalContributionDetails,
        BigDecimal totalIncome,
        BigDecimal totalExpenses,
        BigDecimal balance,
        BigDecimal retainedSavings,
        double savingsRate,
        BigDecimal averageDailySpend,
        SpendingPeak highestSpendingDay,
        WeekdayInsight mostExpensiveWeekday,
        double weekendExpensePercentage,
        List<CategoryConsumption> categories,
        List<CategoryConsumption> topCategories,
        List<ExpenseItem> highestExpenses,
        List<MovementItem> movements,
        List<TimelinePoint> timeline,
        PeriodComparison comparison,
        LocalDateTime generatedAt
) {
    public record CategoryConsumption(
            Long categoryId,
            String categoryName,
            String categoryColor,
            String categoryIcon,
            BigDecimal limitAmount,
            BigDecimal spentAmount,
            Double percentage,
            Boolean withinLimit
    ) {}

    public record ExpenseItem(
            Long movementId,
            LocalDateTime date,
            String description,
            String categoryName,
            BigDecimal amount
    ) {}

    public record MovementItem(
            Long movementId,
            LocalDateTime date,
            String type,
            String description,
            Long categoryId,
            String categoryName,
            String categoryColor,
            String categoryIcon,
            BigDecimal amount
    ) {}

    public record GoalContribution(String goalName, BigDecimal amount) {}

    public record SpendingPeak(LocalDate date, BigDecimal amount) {}

    public record WeekdayInsight(String dayOfWeek, BigDecimal amount, double percentage) {}

    public record TimelinePoint(LocalDate date, BigDecimal actual, BigDecimal ideal) {}

    public record CategoryChange(String categoryName, BigDecimal amount) {}

    public record PeriodComparison(
            Long previousBudgetId,
            LocalDate previousStartDate,
            LocalDate previousEndDate,
            BigDecimal previousExpenses,
            Double expenseChangePercentage,
            CategoryChange greatestReduction,
            CategoryChange greatestIncrease
    ) {}
}