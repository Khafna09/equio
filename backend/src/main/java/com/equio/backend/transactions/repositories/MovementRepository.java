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

    List<Movement> findByUserId(Long userId);

    Optional<Movement> findByIdAndUserId(Long id, Long userId);

    List<Movement> findByUserIdOrderByDateDescIdDesc(Long userId);

    List<Movement> findByUserIdAndType(Long userId, MovementType type);

    List<Movement> findByUserIdAndTypeOrderByDateDesc(Long userId, MovementType type);

    List<Movement> findByUserIdAndCategoryId(Long userId, Long categoryId);

    List<Movement> findByUserIdAndDateBetweenOrderByDateDesc(Long userId, LocalDateTime startDate, LocalDateTime endDate);

    List<Movement> findByUserIdAndTypeAndDateBetweenOrderByDateDesc(
            Long userId, MovementType type, LocalDateTime startDate, LocalDateTime endDate
    );

    List<Movement> findByUserIdAndCategoryIdAndDateBetweenOrderByDateDesc(
            Long userId, Long categoryId, LocalDateTime startDate, LocalDateTime endDate
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
