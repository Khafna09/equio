package com.equio.backend.users.dto.responses;

import com.equio.backend.users.entities.enums.BudgetMode;

public record ProfileResponse (
        Long id,
        String firstName,
        String lastName,
        String language,
        String currency,
        String theme,
        String timeFormat,
        BudgetMode budgetMode
) {
}
