package com.equio.backend.budgets.dto.requests;

import com.equio.backend.users.entities.enums.BudgetMode;
import jakarta.validation.constraints.NotNull;

public record BudgetModeRequest(@NotNull BudgetMode mode) {
}
