package com.equio.backend.integration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.jobs.budgets.enabled=false",
        "spring.datasource.hikari.data-source-properties.options=-c statement_timeout=15000 -c lock_timeout=5000 -c idle_in_transaction_session_timeout=30000"
})
@ActiveProfiles("dev")
@EnabledIfEnvironmentVariable(named = "TEST_PG_JOBS", matches = "true")
class DatabaseLimitsPostgresTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactionManager;

    @Test
    void eachRuntimeConnectionHasProductionQueryLimits() {
        requireDisposableDatabase();
        assertEquals("15s", jdbc.queryForObject("show statement_timeout", String.class));
        assertEquals("5s", jdbc.queryForObject("show lock_timeout", String.class));
        assertEquals("30s", jdbc.queryForObject("show idle_in_transaction_session_timeout", String.class));
    }

    @Test
    void timeoutRollsBackAndTheConnectionRemainsUsable() {
        requireDisposableDatabase();
        var transaction = new TransactionTemplate(transactionManager);
        assertThrows(QueryTimeoutException.class, () -> transaction.executeWithoutResult(status -> {
            jdbc.execute("set local statement_timeout = '50ms'");
            jdbc.execute("select pg_sleep(0.2)");
        }));
        assertEquals(1, jdbc.queryForObject("select 1", Integer.class));
        assertEquals("15s", jdbc.queryForObject("show statement_timeout", String.class));
    }

    private void requireDisposableDatabase() {
        String url = System.getenv("DB_URL");
        assertNotNull(url);
        assertTrue(url.matches("jdbc:postgresql://(localhost|127\\.0\\.0\\.1):\\d+/[^?]+.*"),
                "This test requires a disposable local database");
    }
}
