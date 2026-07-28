package com.equio.backend.transactions.dto.requests;

import com.equio.backend.transactions.entities.enums.MovementType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CreateMovementRequest(
        @NotNull @Positive BigDecimal amount,
        @NotNull MovementType type,
        @Size(max = 150) String description,
        @NotNull LocalDateTime date,
        Long categoryId
) {}
