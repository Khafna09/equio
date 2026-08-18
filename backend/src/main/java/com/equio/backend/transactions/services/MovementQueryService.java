package com.equio.backend.transactions.services;

import com.equio.backend.transactions.entities.Category;
import com.equio.backend.transactions.entities.Movement;
import com.equio.backend.transactions.entities.enums.MovementType;
import com.equio.backend.transactions.repositories.MovementRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class MovementQueryService {

    private final MovementRepository movementRepository;

    public MovementQueryService(MovementRepository movementRepository) {
        this.movementRepository = movementRepository;
    }

    @Transactional(readOnly = true)
    public BigDecimal sumByType(
            Long userId,
            MovementType type,
            LocalDateTime start,
            LocalDateTime end
    ) {
        return defaultZero(movementRepository.sumAmountByUserIdAndTypeAndDateBetween(
                userId, type, start, end));
    }

    @Transactional(readOnly = true)
    public BigDecimal sumExpensesByCategory(
            Long userId,
            Long categoryId,
            LocalDateTime start,
            LocalDateTime end
    ) {
        return defaultZero(movementRepository.sumExpenseByUserIdAndCategoryIdAndDateBetween(
                userId, categoryId, start, end));
    }

    @Transactional(readOnly = true)
    public long countByPeriod(Long userId, LocalDateTime start, LocalDateTime end) {
        return movementRepository.countByUserIdAndDateBetween(userId, start, end);
    }

    @Transactional(readOnly = true)
    public List<MovementSnapshot> findByPeriod(Long userId, LocalDateTime start, LocalDateTime end) {
        return movementRepository.findByUserIdAndDateBetweenOrderByDateDesc(userId, start, end).stream()
                .map(this::toSnapshot)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CategoryExpenseSnapshot> findExpenseCategoriesByPeriod(
            Long userId,
            LocalDateTime start,
            LocalDateTime end
    ) {
        return movementRepository.findExpenseCategoriesByUserIdAndDateBetween(
                userId, start, end, Pageable.unpaged()).stream()
                .map(row -> {
                    Category category = (Category) row[0];
                    return new CategoryExpenseSnapshot(
                            category != null ? category.getName() : null,
                            category != null ? category.getColor() : null,
                            category != null ? category.getIcon() : null,
                            (BigDecimal) row[1]);
                })
                .toList();
    }

    private MovementSnapshot toSnapshot(Movement movement) {
        Category category = movement.getCategory();
        return new MovementSnapshot(
                movement.getId(),
                movement.getAmount(),
                movement.getType(),
                movement.getDescription(),
                movement.getDate(),
                category != null ? category.getId() : null,
                category != null ? category.getName() : "Uncategorized",
                category != null ? category.getColor() : "#a1a1aa",
                category != null ? category.getIcon() : null
        );
    }

    private BigDecimal defaultZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    public record MovementSnapshot(
            Long id,
            BigDecimal amount,
            MovementType type,
            String description,
            LocalDateTime date,
            Long categoryId,
            String categoryName,
            String categoryColor,
            String categoryIcon
    ) {
    }

    public record CategoryExpenseSnapshot(
            String categoryName,
            String categoryColor,
            String categoryIcon,
            BigDecimal totalSpent
    ) {
    }
}
