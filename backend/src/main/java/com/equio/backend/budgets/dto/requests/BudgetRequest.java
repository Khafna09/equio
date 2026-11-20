package com.equio.backend.budgets.dto.requests;

import com.equio.backend.budgets.entities.enums.SavingsType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record BudgetRequest(
        @Pattern(regexp = "^[^\\p{Cc}\\p{Cf}\\p{Cs}]*$", message = "must not contain control characters")
        @Size(max = 100) String name,
        @NotNull @Positive @Digits(integer = 10, fraction = 2) BigDecimal totalAmount,
        boolean isFixed,
        @NotNull LocalDate startDate,
        LocalDate endDate,
        @Positive Long categoryId,
        @Positive Long parentBudgetId,
        SavingsType savingsType,
        @PositiveOrZero @Digits(integer = 10, fraction = 2) BigDecimal savingsValue,
        Boolean retroactiveCatchUp,
        @Size(max = 100) List<@Positive Long> subBudgetsToAdopt,
        Boolean isIndependent,
        @Min(1) @Max(31) Integer renewalDay
) {
    public BudgetRequest(
            String name,
            BigDecimal totalAmount,
            boolean isFixed,
            LocalDate startDate,
            LocalDate endDate,
            Long categoryId,
            Long parentBudgetId,
            SavingsType savingsType,
            BigDecimal savingsValue,
            Boolean retroactiveCatchUp,
            List<Long> subBudgetsToAdopt,
            Boolean isIndependent
    ) {
        this(name, totalAmount, isFixed, startDate, endDate, categoryId, parentBudgetId,
                savingsType, savingsValue, retroactiveCatchUp, subBudgetsToAdopt,
                isIndependent, null);
    }
}
