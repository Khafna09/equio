package com.equio.backend.savings.dto.responses;

import java.math.BigDecimal;
import java.time.Instant;

public record SavingsPoolResponse(BigDecimal balance, Instant updatedAt) {
}
