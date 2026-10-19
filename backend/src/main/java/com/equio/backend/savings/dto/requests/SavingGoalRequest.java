package com.equio.backend.savings.dto.requests;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SavingGoalRequest(
        @Pattern(regexp = "^[^\\p{Cc}\\p{Cf}\\p{Cs}]*$", message = "must not contain control characters")
        @NotBlank @Size(max = 100) String name,
        @NotNull @Positive @Digits(integer = 10, fraction = 2) BigDecimal targetAmount,
        @FutureOrPresent LocalDate deadline,
        @Positive Long budgetId,
        @Pattern(regexp = "^[^\\p{Cc}\\p{Cf}\\p{Cs}]*$", message = "must not contain control characters")
        @Size(max = 50) String tag,
        @Size(max = 500)
        @Pattern(
                regexp = "^https://images\\.unsplash\\.com/[^\\s]{1,450}$",
                message = "must be a valid Unsplash image URL"
        )
        String imageUrl
) {
}
