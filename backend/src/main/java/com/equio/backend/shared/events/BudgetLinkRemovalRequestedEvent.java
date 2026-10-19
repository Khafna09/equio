package com.equio.backend.shared.events;

public record BudgetLinkRemovalRequestedEvent(Long budgetId, boolean preserveGoals, Long userId) {
}
