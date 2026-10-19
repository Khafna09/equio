package com.equio.backend.shared.jobs;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
public class DatabaseJobLock {
    private final JdbcTemplate jdbcTemplate;

    public DatabaseJobLock(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean tryAcquire(long lockId) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException(
                    "Database job locks require an active transaction");
        }
        Boolean acquired = jdbcTemplate.queryForObject(
                "select pg_try_advisory_xact_lock(?)",
                Boolean.class,
                lockId
        );
        return Boolean.TRUE.equals(acquired);
    }
}
