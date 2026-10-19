package com.equio.backend.shared.config;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ProductionDatabasePermissionsCheckTest {
    @Test
    void acceptsVerifiedTlsAndLimitedRole() {
        var jdbc = configured(true, true, 6);
        assertDoesNotThrow(() -> new ProductionDatabasePermissionsCheck(jdbc, true).validate());
    }

    @Test
    void rejectsUnsafeRolesMissingRlsAndUnencryptedConnections() {
        assertThrows(IllegalStateException.class,
                () -> new ProductionDatabasePermissionsCheck(configured(false, true, 6), true).validate());
        assertThrows(IllegalStateException.class,
                () -> new ProductionDatabasePermissionsCheck(configured(true, false, 6), true).validate());
        assertThrows(IllegalStateException.class,
                () -> new ProductionDatabasePermissionsCheck(configured(true, true, 5), true).validate());
        assertThrows(IllegalStateException.class,
                () -> new ProductionDatabasePermissionsCheck(configured(true, true, 6), false).validate());
    }

    private JdbcTemplate configured(boolean role, boolean tls, int tables) {
        var jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject(anyString(), eq(Boolean.class))).thenAnswer(call ->
                ((String) call.getArgument(0)).contains("pg_stat_ssl") ? tls : role);
        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(tables);
        return jdbc;
    }
}
