package com.equio.backend.shared.security;

import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
public class FinancialConcurrencyGuard {
    private final JdbcTemplate jdbcTemplate;

    public FinancialConcurrencyGuard(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void lock(Long userId) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("Financial operations require an active transaction");
        }
        // One lock order for movements, budget limits, mode changes and savings transfers.
        if (jdbcTemplate.queryForList("select id from users where id = ? for update", Long.class, userId).isEmpty()) {
            throw new ResourceNotFoundException("User");
        }
    }
}
