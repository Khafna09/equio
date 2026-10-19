DO $$
DECLARE
    app_role_name TEXT := '${app-role}';
BEGIN
    IF app_role_name !~ '^[A-Za-z_][A-Za-z0-9_]*$' THEN
        RAISE EXCEPTION 'Unsafe DB_APP_USERNAME value for grants';
    END IF;
    EXECUTE format('REVOKE ALL ON TABLE public.flyway_schema_history FROM %I', app_role_name);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', app_role_name);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', app_role_name);
END $$;
