package com.equio.backend.dashboard.services;

import com.equio.backend.shared.security.RlsContext;
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
    public DashboardSummaryResponse getSummary(Long userId, int month, int year) {
        rlsContext.setUserId(userId);

        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());

        LocalDateTime startDateTime = startDate.atStartOfDay();
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

        var currentGlobalBudget = budgetLookupService.findLatestGlobal(userId).orElse(null);
        if (currentGlobalBudget != null) {
            globalBudgetAmount = currentGlobalBudget.totalAmount();
            savingsDeduction = currentGlobalBudget.savingsDeduction();

            // Balance = Presupuesto Global + Ingresos Extra - Ahorro - Gastos
            balance = globalBudgetAmount.add(totalIncome).subtract(savingsDeduction).subtract(totalExpense);
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
                topCategories
        );
    }
}
