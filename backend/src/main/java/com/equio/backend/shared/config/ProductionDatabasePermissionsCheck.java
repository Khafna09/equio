package com.equio.backend.shared.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.boot.sql.init.dependency.DependsOnDatabaseInitialization;

@Component
@Profile("prod")
@DependsOnDatabaseInitialization
public class ProductionDatabasePermissionsCheck {
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
        if (!rlsEnabled || !Boolean.TRUE.equals(safeRole) || protectedTables == null
                || protectedTables != 6 || !Boolean.TRUE.equals(encrypted)) {
            throw new IllegalStateException("Production requires TLS, a limited runtime role and forced tenant RLS");
        }
    }
}
