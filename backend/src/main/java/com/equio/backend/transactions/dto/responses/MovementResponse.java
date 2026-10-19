package com.equio.backend.transactions.dto.responses;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record MovementResponse(
        Long id,
        BigDecimal amount,
        String type,
        String description,
        LocalDateTime date,
        Long categoryId,
        String categoryName,
        String categoryColor,
        String categoryIcon,
        LocalDateTime createdAt,
        String source
) {}
