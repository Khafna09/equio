package com.equio.backend.emailintake.domain;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record ExpenseDraft(UUID id, BigDecimal amount, String currency, String description,
                           LocalDateTime occurredAt, Status status, Long movementId) {
    public enum Status { PENDING, APPROVED, DISCARDED }
}
