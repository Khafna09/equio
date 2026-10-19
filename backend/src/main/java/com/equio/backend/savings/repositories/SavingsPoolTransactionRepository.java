package com.equio.backend.savings.repositories;

import com.equio.backend.savings.entities.SavingsPoolTransaction;
import com.equio.backend.savings.entities.enums.SavingsPoolTransactionType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SavingsPoolTransactionRepository extends JpaRepository<SavingsPoolTransaction, Long> {
    boolean existsByUserIdAndTypeAndBudgetId(Long userId, SavingsPoolTransactionType type, Long budgetId);
    boolean existsByUserIdAndBudgetId(Long userId, Long budgetId);
}
