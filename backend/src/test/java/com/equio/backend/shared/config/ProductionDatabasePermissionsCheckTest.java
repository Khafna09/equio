package com.equio.backend.shared.config;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ProductionDatabasePermissionsCheckTest {
    private static final String NEON_URL = "jdbc:postgresql://ep-demo.c-8.us-east-2.aws.neon.tech/neondb"
            + "?sslmode=verify-full&sslfactory=org.postgresql.ssl.DefaultJavaSSLFactory&channelBinding=require";
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

    @Test
    void acceptsOnlyStrictChannelBoundTlsForNeonWhenBackendSslIsFalse() throws Exception {
        assertDoesNotThrow(() -> new ProductionDatabasePermissionsCheck(behindProxy(NEON_URL), true).validate());
        for (String unsafe : new String[] {
                NEON_URL.replace("require", "prefer"),
                NEON_URL.replace("verify-full", "require"),
                NEON_URL.replace("ep-demo.", "ep-demo-pooler."),
                NEON_URL.replace("aws.neon.tech", "aws.neon.tech.example.com"),
                NEON_URL + "&channelBinding=prefer",
                NEON_URL + "&channelBinding=require"
        }) {
            var jdbc = behindProxy(unsafe);
            assertThrows(IllegalStateException.class, () -> new ProductionDatabasePermissionsCheck(jdbc, true).validate());
        }
    }

    @SuppressWarnings("unchecked")
    private JdbcTemplate behindProxy(String url) throws Exception {
        var jdbc = configured(true, false, 6);
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getURL()).thenReturn(url);
        when(jdbc.execute(any(ConnectionCallback.class))).thenAnswer(call ->
                ((ConnectionCallback<Boolean>) call.getArgument(0)).doInConnection(connection));
        return jdbc;
    }

    private JdbcTemplate configured(boolean role, boolean tls, int tables) {
        var jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject(anyString(), eq(Boolean.class))).thenAnswer(call ->
                ((String) call.getArgument(0)).contains("pg_stat_ssl") ? tls : role);
        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(tables);
        return jdbc;
    }
}
