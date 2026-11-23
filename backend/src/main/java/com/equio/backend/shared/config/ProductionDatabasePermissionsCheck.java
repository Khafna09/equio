package com.equio.backend.shared.config;

import jakarta.annotation.PostConstruct;
import java.net.URI;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.stereotype.Component;
import org.springframework.boot.sql.init.dependency.DependsOnDatabaseInitialization;

@Component
@Profile("prod")
@DependsOnDatabaseInitialization
public class ProductionDatabasePermissionsCheck {
    private static final Pattern NEON_DIRECT_HOST = Pattern.compile(
            "ep-[a-z0-9-]+\\.(?:c-[0-9]+\\.)?[a-z0-9-]+\\.aws\\.neon\\.tech");
    private static final Set<String> NEON_TLS_PARAMETERS = Set.of(
            "sslmode=verify-full",
            "sslfactory=org.postgresql.ssl.DefaultJavaSSLFactory",
            "channelBinding=require");
    private final JdbcTemplate jdbc;
    private final boolean rlsEnabled;

    public ProductionDatabasePermissionsCheck(JdbcTemplate jdbc,
                                              @Value("${app.security.rls-enabled}") boolean rlsEnabled) {
        this.jdbc = jdbc;
        this.rlsEnabled = rlsEnabled;
    }

    @PostConstruct
    void validate() {
        Boolean safeRole = jdbc.queryForObject("""
                select not rolsuper and not rolbypassrls and not rolcreatedb and not rolcreaterole
                  and not has_schema_privilege(current_user, 'public', 'CREATE')
                  and not has_table_privilege(current_user, 'public.flyway_schema_history', 'UPDATE')
                from pg_roles where rolname = current_user
                """, Boolean.class);
        Integer protectedTables = jdbc.queryForObject("""
                select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
                where n.nspname = 'public' and c.relname in
                    ('categories', 'movements', 'budgets', 'saving_goals', 'savings_pools', 'savings_pool_transactions')
                  and c.relrowsecurity and c.relforcerowsecurity
                  and pg_get_userbyid(c.relowner) <> current_user
                """, Integer.class);
        Boolean encrypted = jdbc.queryForObject(
                "select ssl from pg_stat_ssl where pid = pg_backend_pid()", Boolean.class);
        if (!rlsEnabled || !Boolean.TRUE.equals(safeRole) || protectedTables == null || protectedTables != 6) {
            throw new IllegalStateException("Production requires a limited runtime role and forced tenant RLS");
        }
        if (!Boolean.TRUE.equals(encrypted) && !Boolean.TRUE.equals(jdbc.execute(
                (ConnectionCallback<Boolean>) connection -> verifiesNeonProxyTls(connection.getMetaData().getURL())))) {
            throw new IllegalStateException("Production requires verified database TLS");
        }
    }

    private static boolean verifiesNeonProxyTls(String jdbcUrl) {
        if (jdbcUrl == null || !jdbcUrl.startsWith("jdbc:postgresql://")) return false;
        try {
            // pg_stat_ssl only describes the compute-side hop behind Neon's TLS proxy.
            URI uri = URI.create(jdbcUrl.substring("jdbc:".length()));
            String host = uri.getHost();
            String query = uri.getRawQuery();
            return host != null && NEON_DIRECT_HOST.matcher(host).matches() && !host.contains("-pooler.")
                    && uri.getRawUserInfo() == null && uri.getRawFragment() == null
                    && (uri.getPort() == -1 || uri.getPort() == 5432)
                    && query != null && NEON_TLS_PARAMETERS.equals(Set.of(query.split("&", -1)));
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }
}
