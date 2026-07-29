package com.equio.backend.budgets.services;

import com.equio.backend.budgets.dto.requests.BudgetRequest;
import com.equio.backend.budgets.dto.responses.BudgetResponse;

import java.math.BigDecimal;
import java.util.List;

public interface BudgetService {

    BudgetResponse create(Long userId, BudgetRequest request);

    List<BudgetResponse> getAllByUser(Long userId);

    List<BudgetResponse> getHistoryByUser(Long userId);

    BudgetResponse getById(Long userId, Long budgetId);

    BudgetResponse update(Long userId, Long budgetId, BudgetRequest request);

    void delete(Long userId, Long budgetId, boolean cascade);

    BudgetResponse closeBudget(Long userId, Long budgetId);

    /**
     * Incrementa spentAmount del presupuesto asociado a la categoría del gasto.
     * Es llamado desde CreateMovementServiceImpl al registrar un movimiento de tipo EXPENSE.
     * Si no existe presupuesto para esa categoría, busca uno global. Si no hay ninguno, no hace nada.
     */
    void addExpense(Long userId, Long categoryId, BigDecimal amount);
}
