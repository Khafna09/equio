package com.equio.backend.transactions.dto.responses;

import java.math.BigDecimal;
import java.util.List;

public record DashboardSummaryResponse(
        BigDecimal totalIncome,              // ingresos totales del mes
        BigDecimal totalExpense,             // gastos totales del mes
        BigDecimal balance,                  // totalIncome - totalExpense o adaptado por presupuesto global
        BigDecimal globalBudgetAmount,       // si existe un presupuesto global
        BigDecimal savingsDeduction,         // si existe un descuento por meta de ahorro
        List<CategorySummary> topCategories // top 3 categorías de gasto
) {
    public record CategorySummary(
            String categoryName,
            String categoryColor,
            String categoryIcon,
            BigDecimal totalSpent,
            double percentage                // % del total gastado
    ) {}
}
