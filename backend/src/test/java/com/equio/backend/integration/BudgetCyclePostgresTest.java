package com.equio.backend.integration;

import com.equio.backend.budgets.services.BudgetService;
import com.equio.backend.budgets.services.BudgetCycleProcessor;

import com.equio.backend.budgets.dto.requests.BudgetRequest;
import com.equio.backend.savings.services.SavingsPoolService;
import com.equio.backend.users.dto.requests.SignUpRequest;
import com.equio.backend.users.services.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import java.math.BigDecimal;
import java.sql.DriverManager;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "app.jobs.budgets.enabled=false")
@ActiveProfiles("dev")
@EnabledIfEnvironmentVariable(named = "TEST_PG_JOBS", matches = "true")
class BudgetCyclePostgresTest {
    @Autowired UserService users;
    @Autowired BudgetService budgets;
    @Autowired BudgetCycleProcessor processor;
    @Autowired SavingsPoolService pool;

    @Test
    void realPostgresCatchupCommitsExactlyOneSettlementPerCycle() throws Exception {
        String url = System.getenv("DB_URL");
        assertTrue(url.matches("jdbc:postgresql://(localhost|127\\.0\\.0\\.1):\\d+/[^?]+.*"),
                "This test requires a disposable local database");
        var user = users.registerUser(new SignUpRequest("cycle-" + UUID.randomUUID() + "@test.example",
                "Cycle-Test-2026!", "Audit", "Cycle", "es", "PEN", "light"));
        try {
            LocalDate start = LocalDate.now().withDayOfMonth(1).minusMonths(3);
            budgets.create(user.getId(), new BudgetRequest("Monthly", new BigDecimal("1000"), true,
                    start, start.plusMonths(1).minusDays(1), null, null, null, null, false, null, false));
            processor.processUser(user.getId(), LocalDate.now());
            processor.processUser(user.getId(), LocalDate.now());
            assertEquals(3, budgets.getHistoryByUser(user.getId()).size());
            assertEquals(1, budgets.getAllByUser(user.getId()).size());
            assertEquals(0, new BigDecimal("3000").compareTo(pool.get(user.getId()).balance()));
        } finally {
            try (var connection = DriverManager.getConnection(url, System.getenv("DB_MIGRATION_USERNAME"),
                    System.getenv("DB_MIGRATION_PASSWORD"))) {
                connection.setAutoCommit(false);
                for (String table : List.of("savings_pool_transactions", "savings_pools", "budgets",
                        "profiles", "user_roles")) {
                    try (var statement = connection.prepareStatement("delete from " + table + " where user_id = ?")) {
                        statement.setLong(1, user.getId());
                        statement.executeUpdate();
                    }
                }
                try (var statement = connection.prepareStatement("delete from users where id = ?")) {
                    statement.setLong(1, user.getId());
                    statement.executeUpdate();
                }
                connection.commit();
            }
        }
    }
}
