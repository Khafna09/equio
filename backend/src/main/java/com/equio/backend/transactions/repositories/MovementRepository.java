package com.equio.backend.transactions.repositories;

import com.equio.backend.transactions.entities.Category;
import com.equio.backend.transactions.entities.Movement;
import com.equio.backend.transactions.entities.enums.MovementType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MovementRepository extends JpaRepository<Movement, Long> {

    Optional<Movement> findByIdAndUserId(Long id, Long userId);

    List<Movement> findByUserIdAndDateBetweenOrderByDateDesc(Long userId, LocalDateTime startDate, LocalDateTime endDate);

    long countByUserIdAndDateBetween(Long userId, LocalDateTime startDate, LocalDateTime endDate);

    @Query("""
            SELECT m FROM Movement m
            WHERE m.user.id = :userId
              AND (:type IS NULL OR m.type = :type)
              AND (:categoryId IS NULL OR m.category.id = :categoryId)
              AND (:startDate IS NULL OR m.date >= :startDate)
              AND (:endDate IS NULL OR m.date <= :endDate)
            ORDER BY m.date DESC, m.id DESC
            """)
    List<Movement> findFiltered(
            @Param("userId") Long userId,
            @Param("type") MovementType type,
            @Param("categoryId") Long categoryId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable
    );

    @Query("SELECT COALESCE(SUM(m.amount), 0) FROM Movement m WHERE m.user.id = :userId AND m.type = :type")
    BigDecimal sumAmountByUserIdAndType(@Param("userId") Long userId, @Param("type") MovementType type);


    @Query("SELECT COALESCE(SUM(m.amount), 0) FROM Movement m " +
           "WHERE m.user.id = :userId AND m.type = :type AND m.date BETWEEN :startDate AND :endDate")
    BigDecimal sumAmountByUserIdAndTypeAndDateBetween(
            @Param("userId") Long userId,
            @Param("type") MovementType type,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("SELECT COALESCE(SUM(m.amount), 0) FROM Movement m " +
           "WHERE m.user.id = :userId AND m.category.id = :categoryId AND m.type = com.equio.backend.transactions.entities.enums.MovementType.EXPENSE " +
           "AND m.date BETWEEN :startDate AND :endDate")
    BigDecimal sumExpenseByUserIdAndCategoryIdAndDateBetween(
            @Param("userId") Long userId,
            @Param("categoryId") Long categoryId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("SELECT m.category, SUM(m.amount) AS totalSpent FROM Movement m " +
           "WHERE m.user.id = :userId AND m.type = com.equio.backend.transactions.entities.enums.MovementType.EXPENSE AND m.date BETWEEN :startDate AND :endDate " +
           "GROUP BY m.category ORDER BY totalSpent DESC")
    List<Object[]> findExpenseCategoriesByUserIdAndDateBetween(
            @Param("userId") Long userId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable
    );
}
