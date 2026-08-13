package com.equio.backend.savings.repositories;

import com.equio.backend.savings.entities.SavingGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SavingGoalRepository extends JpaRepository<SavingGoal, Long> {


    List<SavingGoal> findByUserId(Long userId);

    java.util.Optional<SavingGoal> findByIdAndUserId(Long id, Long userId);


    List<SavingGoal> findByBudgetId(Long budgetId);
}
