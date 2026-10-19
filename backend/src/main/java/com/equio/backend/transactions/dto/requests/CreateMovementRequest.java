package com.equio.backend.transactions.dto.requests;

import com.equio.backend.transactions.entities.enums.MovementType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CreateMovementRequest(
        @NotNull @Positive @Digits(integer = 10, fraction = 2) BigDecimal amount,
        @NotNull MovementType type,
        @Pattern(regexp = "^[^\\p{Cc}\\p{Cf}\\p{Cs}]*$", message = "must not contain control characters")
        @Size(max = 150) String description,
        @NotNull @PastOrPresent LocalDateTime date,
        @Positive Long categoryId
) {
}
