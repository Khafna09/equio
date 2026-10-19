package com.equio.backend.budgets.repositories;

import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.entities.enums.BudgetStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, Long> {

    List<Budget> findByUserId(Long userId);

    Optional<Budget> findByIdAndUserId(Long id, Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Budget b where b.id = :id and b.user.id = :userId")
    Optional<Budget> findForUpdateByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    List<Budget> findByUserIdAndStatus(Long userId, BudgetStatus status);

    List<Budget> findByStatus(BudgetStatus status);

    Optional<Budget> findByUserIdAndStatusAndCategoryIsNull(Long userId, BudgetStatus status);

    List<Budget> findByParentBudgetId(Long parentBudgetId);

    Optional<Budget> findByUserIdAndCategoryIdAndStatus(Long userId, Long categoryId, BudgetStatus status);

    List<Budget> findByUserIdAndIsFixedAndStatus(Long userId, boolean isFixed, BudgetStatus status);

    boolean existsByNameAndUserId(String name, Long userId);
    boolean existsByUserIdAndCategoryId(Long userId, Long categoryId);
}
