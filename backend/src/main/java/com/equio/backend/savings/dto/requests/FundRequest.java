package com.equio.backend.savings.dto.requests;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record FundRequest(
        @NotNull @Positive @Digits(integer = 10, fraction = 2) BigDecimal amount,
        @NotBlank @Pattern(regexp = "^(ADD|WITHDRAW)$") String operation
) {
}
