package com.equio.backend.budgets.dto.responses;

public record BudgetCapabilitiesResponse(
        boolean advancedModeEnabled,
        boolean canCreateIndependent,
        boolean canLinkBudgets
) {
}
