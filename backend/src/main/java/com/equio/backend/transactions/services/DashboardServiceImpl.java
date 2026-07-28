package com.equio.backend.transactions.services;

import com.equio.backend.transactions.dto.responses.DashboardSummaryResponse;
import com.equio.backend.transactions.entities.Category;
import com.equio.backend.transactions.entities.enums.MovementType;
import com.equio.backend.transactions.repositories.MovementRepository;
import com.equio.backend.budgets.repositories.BudgetRepository;
import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.entities.enums.SavingsType;
import org.springframework.data.domain.PageRequest;
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

    private final MovementRepository movementRepository;
    private final BudgetRepository budgetRepository;

    public DashboardServiceImpl(MovementRepository movementRepository, BudgetRepository budgetRepository) {
        this.movementRepository = movementRepository;
        this.budgetRepository = budgetRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary(Long userId, int month, int year) {
        // Calcular el rango de fechas del mes solicitado
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());
        
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(LocalTime.MAX);

        // Totales del mes
        BigDecimal totalIncome = movementRepository.sumAmountByUserIdAndTypeAndDateBetween(
                userId, MovementType.INCOME, startDateTime, endDateTime);
        BigDecimal totalExpense = movementRepository.sumAmountByUserIdAndTypeAndDateBetween(
                userId, MovementType.EXPENSE, startDateTime, endDateTime);

        // COALESCE ya retorna 0 desde el repo, pero protegemos por si acaso
        if (totalIncome == null) totalIncome = BigDecimal.ZERO;
        if (totalExpense == null) totalExpense = BigDecimal.ZERO;

        // Buscar presupuesto global del usuario (sin categoría asociada)
        List<Budget> globalBudgets = budgetRepository.findByUserId(userId).stream()
                .filter(b -> b.getCategory() == null)
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .toList();

        BigDecimal balance;
        BigDecimal globalBudgetAmount = null;
        BigDecimal savingsDeduction = null;

        if (!globalBudgets.isEmpty()) {
            Budget currentGlobalBudget = globalBudgets.get(0);
            globalBudgetAmount = currentGlobalBudget.getTotalAmount();
            savingsDeduction = BigDecimal.ZERO;

            if (currentGlobalBudget.getSavingsType() != null && currentGlobalBudget.getSavingsValue() != null) {
                if (currentGlobalBudget.getSavingsType() == SavingsType.PERCENTAGE) {
                    savingsDeduction = globalBudgetAmount.multiply(currentGlobalBudget.getSavingsValue())
                            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                } else if (currentGlobalBudget.getSavingsType() == SavingsType.FIXED) {
                    savingsDeduction = currentGlobalBudget.getSavingsValue();
                }
            }

            // Balance = Presupuesto Global + Ingresos Extra - Ahorro - Gastos
            balance = globalBudgetAmount.add(totalIncome).subtract(savingsDeduction).subtract(totalExpense);
        } else {
            balance = totalIncome.subtract(totalExpense);
        }

        // Top 3 categorías de gasto del mes (para el gráfico de anillo)
        List<Object[]> topRaw = movementRepository.findTopExpenseCategoriesByUserIdAndDateBetween(
                userId, startDateTime, endDateTime, PageRequest.of(0, 3));

        List<DashboardSummaryResponse.CategorySummary> topCategories = new ArrayList<>();
        for (Object[] row : topRaw) {
            Category cat = (Category) row[0];
            BigDecimal catTotal = (BigDecimal) row[1];

            // Porcentaje del total gastado que representa esta categoría
            double percentage = 0.0;
            if (totalExpense.compareTo(BigDecimal.ZERO) > 0) {
                percentage = catTotal.divide(totalExpense, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100))
                        .doubleValue();
            }

            topCategories.add(new DashboardSummaryResponse.CategorySummary(
                    cat != null ? cat.getName() : "Sin categoría",
                    cat != null ? cat.getColor() : null,
                    cat != null ? cat.getIcon() : null,
                    catTotal,
                    percentage
            ));
        }

        return new DashboardSummaryResponse(totalIncome, totalExpense, balance, globalBudgetAmount, savingsDeduction, topCategories);
    }
}
