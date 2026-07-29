package com.equio.backend.savings.repositories;

import com.equio.backend.savings.entities.SavingGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SavingGoalRepository extends JpaRepository<SavingGoal, Long> {

    // Todas las metas de un usuario
    List<SavingGoal> findByUserId(Long userId);

    // Metas vinculadas a un presupuesto (para eliminarlas cuando el Budget se borre)
    List<SavingGoal> findByBudgetId(Long budgetId);
}
