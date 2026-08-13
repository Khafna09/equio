DO $$
DECLARE
    app_role_name TEXT := '${app-role}';
BEGIN
    IF app_role_name !~ '^[A-Za-z_][A-Za-z0-9_]*$' THEN
        RAISE EXCEPTION 'Unsafe DB_APP_USERNAME value for grants';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role_name) THEN
        RAISE EXCEPTION 'Application database role % does not exist', app_role_name;
    END IF;

    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), app_role_name);
    EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', app_role_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users TO %I', app_role_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE role TO %I', app_role_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_roles TO %I', app_role_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE profiles TO %I', app_role_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE refresh_token_sessions TO %I', app_role_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE categories TO %I', app_role_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE movements TO %I', app_role_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE budgets TO %I', app_role_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE saving_goals TO %I', app_role_name);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO %I', app_role_name);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE role_id_seq TO %I', app_role_name);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE profiles_id_seq TO %I', app_role_name);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE categories_id_seq TO %I', app_role_name);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE movements_id_seq TO %I', app_role_name);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE budgets_id_seq TO %I', app_role_name);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE saving_goals_id_seq TO %I', app_role_name);
END $$;
