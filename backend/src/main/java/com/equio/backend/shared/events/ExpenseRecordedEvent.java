package com.equio.backend.shared.events;

import java.math.BigDecimal;

public record ExpenseRecordedEvent(Long userId, Long categoryId, BigDecimal amount) {
}
