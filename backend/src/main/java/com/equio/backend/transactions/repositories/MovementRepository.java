package com.equio.backend.transactions.repositories;

import com.equio.backend.transactions.entities.Category;
import com.equio.backend.transactions.entities.Movement;
import com.equio.backend.transactions.entities.enums.MovementType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MovementRepository extends JpaRepository<Movement, Long>, JpaSpecificationExecutor<Movement> {

    Optional<Movement> findByIdAndUserId(Long id, Long userId);
    boolean existsByUserIdAndCategoryId(Long userId, Long categoryId);

    @EntityGraph(attributePaths = "category")
    List<Movement> findByUserIdAndDateBetweenOrderByDateDesc(Long userId, LocalDateTime startDate, LocalDateTime endDate);

    @Query("select distinct cast(m.date as LocalDate) from Movement m " +
            "where m.user.id = :userId and m.date between :startDate and :endDate " +
            "order by cast(m.date as LocalDate)")
    List<LocalDate> findMovementDates(@Param("userId") Long userId,
            @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    long countByUserIdAndDateBetween(Long userId, LocalDateTime startDate, LocalDateTime endDate);

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

    @Query("SELECT category, SUM(m.amount) AS totalSpent FROM Movement m LEFT JOIN m.category category " +
           "WHERE m.user.id = :userId AND m.type = com.equio.backend.transactions.entities.enums.MovementType.EXPENSE AND m.date BETWEEN :startDate AND :endDate " +
           "GROUP BY category ORDER BY totalSpent DESC")
    List<Object[]> findExpenseCategoriesByUserIdAndDateBetween(
            @Param("userId") Long userId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable
    );
}
