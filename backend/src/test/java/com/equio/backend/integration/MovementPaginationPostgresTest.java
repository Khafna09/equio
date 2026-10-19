package com.equio.backend.integration;

import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.transactions.services.MovementReadService;
import com.equio.backend.transactions.services.MovementQueryService;
import com.equio.backend.users.dto.requests.SignUpRequest;
import com.equio.backend.users.services.UserService;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.DriverManager;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.jobs.budgets.enabled=false", "spring.jpa.properties.hibernate.generate_statistics=true",
        "logging.level.org.hibernate.stat=OFF", "logging.level.org.hibernate.engine.internal.StatisticalLoggingSessionEventListener=OFF"
})
@ActiveProfiles("dev")
@EnabledIfEnvironmentVariable(named = "TEST_PG_JOBS", matches = "true")
class MovementPaginationPostgresTest {
    @Autowired UserService users;
    @Autowired MovementReadService reads;
    @Autowired MovementQueryService summaries;
    @Autowired JdbcTemplate jdbc;
    @Autowired RlsContext rls;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired EntityManagerFactory entityManagerFactory;
    private static final LocalDateTime DATE = LocalDateTime.of(2026, 1, 15, 10, 0);

    @Test
    void cursorKeepsStableTiesAndDoesNotRepeatAfterAnInsertion() throws Exception {
        long user = register();
        try {
            seed(user, 55, false);
            var first = reads.findPage(user, null, null, null, null, null, null, null, 20);
            assertEquals(20, first.items().size());
            assertNotNull(first.nextCursor());
            var ids = new ArrayList<Long>(first.items().stream().map(item -> item.id()).toList());
            seed(user, 1, false);
            var cursor = first.nextCursor();
            do {
                var page = reads.findPage(user, null, null, null, null, null,
                        cursor.beforeDate(), cursor.beforeId(), 20);
                ids.addAll(page.items().stream().map(item -> item.id()).toList());
                cursor = page.nextCursor();
            } while (cursor != null);
            assertEquals(55, ids.size());
            assertEquals(55, ids.stream().distinct().count());
            for (int i = 1; i < ids.size(); i++) assertTrue(ids.get(i - 1) > ids.get(i));
        } finally { cleanup(user); }
    }

    @Test
    void categoriesAreFetchedTogetherAndCalendarDatesAreIndependentFromPages() throws Exception {
        long user = register();
        try {
            seed(user, 12, true);
            var statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
            statistics.clear();
            var page = reads.findPage(user, "EXPENSE", null, DATE.toLocalDate(), DATE.toLocalDate(), null, null, null, 5);
            assertEquals(5, page.items().size());
            assertTrue(page.items().stream().allMatch(item -> item.categoryName() != null));
            assertTrue(statistics.getPrepareStatementCount() <= 3, "RLS plus one joined query, not one query per category");
            assertEquals(List.of(DATE.toLocalDate()), reads.findDates(user, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31)));
            Long categoryId = page.items().getFirst().categoryId();
            assertEquals(1, reads.findPage(user, null, categoryId, null, null, null, null, null, 50).items().size());
            assertTrue(reads.findPage(user, "INCOME", null, null, null, null, null, null, 50).items().isEmpty());
            assertTrue(reads.findDates(user, LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 28)).isEmpty());
        } finally { cleanup(user); }
    }

    @Test
    void categorySummaryIncludesUncategorizedExpensesWithoutChangingTheTotal() throws Exception {
        long user = register();
        try {
            seed(user, 3, false);
            seed(user, 2, true);
            new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                rls.setUserId(user);
                var rows = summaries.findExpenseCategoriesByPeriod(user, DATE.minusDays(1), DATE.plusDays(1));
                assertEquals(3, rows.size());
                assertEquals(0, new BigDecimal("30").compareTo(rows.stream()
                        .filter(row -> row.categoryName() == null).findFirst().orElseThrow().totalSpent()));
                assertEquals(0, new BigDecimal("50").compareTo(rows.stream()
                        .map(MovementQueryService.CategoryExpenseSnapshot::totalSpent).reduce(BigDecimal.ZERO, BigDecimal::add)));
            });
        } finally { cleanup(user); }
    }

    @Test
    void userScopeAndRlsApplyToPageAndCalendarQueries() throws Exception {
        long a = register();
        long b = register();
        try {
            seed(a, 3, false);
            seed(b, 7, false);
            assertEquals(3, reads.findPage(a, null, null, null, null, null, null, null, 100).items().size());
            assertEquals(7, reads.findPage(b, null, null, null, null, null, null, null, 100).items().size());
            var cursorB = reads.findPage(b, null, null, null, null, null, null, null, 1).nextCursor();
            assertTrue(reads.findPage(a, null, null, null, null, null, cursorB.beforeDate(), cursorB.beforeId(), 100)
                    .items().stream().allMatch(item -> item.id() < cursorB.beforeId()));
            new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                rls.setUserId(a);
                assertEquals(0L, jdbc.queryForObject("select count(*) from movements where user_id = ?", Long.class, b));
            });
        } finally { cleanup(a); cleanup(b); }
    }

    @Test
    void invalidCursorSizeAndCalendarRangesAreRejected() {
        assertThrows(IllegalArgumentException.class, () -> reads.findPage(1L, null, null, null, null, null, null, null, 101));
        assertThrows(IllegalArgumentException.class, () -> reads.findPage(1L, null, null, null, null, null, DATE, null, 50));
        assertThrows(IllegalArgumentException.class, () -> reads.findDates(1L, DATE.toLocalDate(), DATE.toLocalDate().plusDays(62)));
        assertThrows(IllegalArgumentException.class, () -> reads.findDates(1L, DATE.toLocalDate(), DATE.toLocalDate().minusDays(1)));
    }

    private long register() {
        String url = System.getenv("DB_URL");
        assertNotNull(url);
        assertTrue(url.matches("jdbc:postgresql://(localhost|127\\.0\\.0\\.1):\\d+/[^?]+.*"), "Disposable local database required");
        return users.registerUser(new SignUpRequest("page-" + UUID.randomUUID() + "@test.example",
                "Page-Test-2026!", "Audit", "History", "es", "PEN", "light")).getId();
    }

    private void seed(long user, int count, boolean categories) {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            rls.setUserId(user);
            for (int i = 0; i < count; i++) {
                Long category = categories ? jdbc.queryForObject("insert into categories " +
                        "(name, color, icon, user_id, created_at, updated_at) values (?, '#10b981', 'test', ?, now(), now()) returning id",
                        Long.class, "Test-" + i, user) : null;
                jdbc.update("insert into movements (amount, type, date, category_id, user_id, created_at, updated_at) " +
                        "values (10, 'EXPENSE', ?, ?, ?, now(), now())", DATE, category, user);
            }
        });
    }

    private void cleanup(long user) throws Exception {
        try (var connection = DriverManager.getConnection(System.getenv("DB_URL"), System.getenv("DB_MIGRATION_USERNAME"),
                System.getenv("DB_MIGRATION_PASSWORD"))) {
            connection.setAutoCommit(false);
            for (String table : List.of("movements", "categories", "profiles", "user_roles")) {
                try (var statement = connection.prepareStatement("delete from " + table + " where user_id = ?")) {
                    statement.setLong(1, user);
                    statement.executeUpdate();
                }
            }
            try (var statement = connection.prepareStatement("delete from users where id = ?")) {
                statement.setLong(1, user);
                statement.executeUpdate();
            }
            connection.commit();
        }
    }
}
