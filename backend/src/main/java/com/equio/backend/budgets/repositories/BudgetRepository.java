package com.equio.backend.budgets.repositories;

import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.entities.enums.BudgetStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, Long> {

    // Todos los presupuestos de un usuario
    List<Budget> findByUserId(Long userId);

    // Presupuesto específico de una categoría para un usuario (para addExpense independientemente del estado)
    Optional<Budget> findByUserIdAndCategoryId(Long userId, Long categoryId);

    // Todos los presupuestos de un usuario (activos)
    List<Budget> findByUserIdAndStatus(Long userId, BudgetStatus status);

    // Todos los presupuestos en un estado (para el scheduler)
    List<Budget> findByStatus(BudgetStatus status);

    // Presupuesto global activo de un usuario
    Optional<Budget> findByUserIdAndStatusAndCategoryIsNull(Long userId, BudgetStatus status);

    // Sub-presupuestos vinculados a un presupuesto global
    List<Budget> findByParentBudgetId(Long parentBudgetId);

    // Presupuesto específico de una categoría para un usuario (para addExpense)
    Optional<Budget> findByUserIdAndCategoryIdAndStatus(Long userId, Long categoryId, BudgetStatus status);

    // Filtrar presupuestos fijos (isFixed=true) o con fechas (isFixed=false)
    List<Budget> findByUserIdAndIsFixedAndStatus(Long userId, boolean isFixed, BudgetStatus status);

    // Verificar si ya existe un presupuesto con ese nombre para el usuario
    boolean existsByNameAndUserId(String name, Long userId);
}
