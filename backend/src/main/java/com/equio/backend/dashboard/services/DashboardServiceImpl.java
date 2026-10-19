package com.equio.backend.dashboard.services;

import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.dashboard.dto.DashboardPeriod;
import com.equio.backend.dashboard.dto.responses.DashboardSummaryResponse;
import com.equio.backend.transactions.entities.enums.MovementType;
import com.equio.backend.transactions.services.MovementQueryService;
import com.equio.backend.budgets.services.BudgetLookupService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.DayOfWeek;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;

@Service
public class DashboardServiceImpl implements DashboardService {

    private final MovementQueryService movementQueryService;
    private final BudgetLookupService budgetLookupService;
    private final RlsContext rlsContext;

    public DashboardServiceImpl(
            MovementQueryService movementQueryService,
            BudgetLookupService budgetLookupService,
            RlsContext rlsContext
    ) {
        this.movementQueryService = movementQueryService;
        this.budgetLookupService = budgetLookupService;
        this.rlsContext = rlsContext;
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary(Long userId, DashboardPeriod requestedPeriod, LocalDate referenceDate) {
        rlsContext.setUserId(userId);

        var activeBudget = budgetLookupService.findActiveGlobal(userId).orElse(null);
        DashboardPeriod period = requestedPeriod;
        if (period == DashboardPeriod.AUTO || (period == DashboardPeriod.BUDGET && activeBudget == null)) {
            period = activeBudget != null ? DashboardPeriod.BUDGET : DashboardPeriod.MONTH;
        }
        LocalDate startDate = referenceDate.withDayOfMonth(1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());
        switch (period) {
            case BUDGET -> {
                startDate = activeBudget.startDate();
                endDate = activeBudget.endDate();
            }
            case FORTNIGHT -> {
                startDate = referenceDate.withDayOfMonth(referenceDate.getDayOfMonth() <= 15 ? 1 : 16);
                endDate = referenceDate.withDayOfMonth(referenceDate.getDayOfMonth() <= 15
                        ? 15 : referenceDate.lengthOfMonth());
            }
            case WEEK -> {
                startDate = referenceDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                endDate = startDate.plusDays(6);
            }
            default -> { }
        }

        LocalDateTime startDateTime = period == DashboardPeriod.BUDGET
                ? activeBudget.accountingStartAt() : startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(LocalTime.MAX);


        BigDecimal totalIncome = movementQueryService.sumByType(
                userId, MovementType.INCOME, startDateTime, endDateTime);
        BigDecimal totalExpense = movementQueryService.sumByType(
                userId, MovementType.EXPENSE, startDateTime, endDateTime);


        if (totalIncome == null) totalIncome = BigDecimal.ZERO;
        if (totalExpense == null) totalExpense = BigDecimal.ZERO;

        BigDecimal balance;
        BigDecimal globalBudgetAmount = null;
        BigDecimal savingsDeduction = null;

        var currentGlobalBudget = period == DashboardPeriod.BUDGET ? activeBudget : null;
        if (currentGlobalBudget != null) {
            globalBudgetAmount = currentGlobalBudget.totalAmount();
            savingsDeduction = currentGlobalBudget.savingsDeduction();

            balance = globalBudgetAmount.subtract(savingsDeduction).subtract(totalExpense);
        } else {
            balance = totalIncome.subtract(totalExpense);
        }

        var categoryRows = movementQueryService.findExpenseCategoriesByPeriod(
                userId, startDateTime, endDateTime);

        List<DashboardSummaryResponse.CategorySummary> expenseCategories = new ArrayList<>();
        for (var row : categoryRows) {
            BigDecimal catTotal = row.totalSpent();

            double percentage = 0.0;
            if (totalExpense.compareTo(BigDecimal.ZERO) > 0) {
                percentage = catTotal.divide(totalExpense, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100))
                        .doubleValue();
            }

            expenseCategories.add(new DashboardSummaryResponse.CategorySummary(
                    row.categoryName(),
                    row.categoryColor(),
                    row.categoryIcon(),
                    catTotal,
                    percentage
            ));
        }

        List<DashboardSummaryResponse.CategorySummary> topCategories = expenseCategories.stream().limit(3).toList();

        return new DashboardSummaryResponse(
                totalIncome,
                totalExpense,
                balance,
                globalBudgetAmount,
                savingsDeduction,
                expenseCategories,
                topCategories,
                period,
                startDate,
                endDate,
                activeBudget != null,
                startDateTime
        );
    }
}
