CREATE TABLE postal_email_deliveries (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    inbox_id UUID NOT NULL,
    email_id UUID NOT NULL,
    state VARCHAR(16) NOT NULL DEFAULT 'QUEUED'
        CHECK (state IN ('QUEUED', 'DRAFT_CREATED', 'DUPLICATE', 'IGNORED', 'NEEDS_REVIEW', 'FAILED')),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
    available_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, inbox_id, email_id)
);
CREATE INDEX postal_email_deliveries_ready_idx
    ON postal_email_deliveries (user_id, inbox_id, available_at) WHERE state = 'QUEUED';
ALTER TABLE postal_email_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE postal_email_deliveries FORCE ROW LEVEL SECURITY;
CREATE POLICY postal_email_deliveries_tenant_isolation ON postal_email_deliveries
    USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::BIGINT)
    WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::BIGINT);
DO $$
DECLARE
    app_role_name TEXT := '${app-role}';
BEGIN
    IF app_role_name !~ '^[A-Za-z_][A-Za-z0-9_]*$' THEN
        RAISE EXCEPTION 'Unsafe DB_APP_USERNAME value for grants';
    END IF;
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.postal_email_deliveries TO %I', app_role_name);
END $$;
