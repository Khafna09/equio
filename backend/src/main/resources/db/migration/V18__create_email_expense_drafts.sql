CREATE TABLE email_expense_drafts (
    id UUID PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delivery_fingerprint VARCHAR(64) NOT NULL CHECK (delivery_fingerprint ~ '^[0-9a-f]{64}$'),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    description VARCHAR(150),
    occurred_at TIMESTAMP NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(10) NOT NULL DEFAULT 'PENDING',
    movement_id BIGINT UNIQUE,
    UNIQUE (user_id, delivery_fingerprint),
    CHECK ((status = 'APPROVED' AND movement_id IS NOT NULL)
        OR (status IN ('PENDING', 'DISCARDED') AND movement_id IS NULL))
);

CREATE INDEX email_expense_drafts_user_pending_idx ON email_expense_drafts (user_id, created_at DESC, id)
    WHERE status = 'PENDING';

ALTER TABLE email_expense_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_expense_drafts FORCE ROW LEVEL SECURITY;
CREATE POLICY email_expense_drafts_tenant_isolation ON email_expense_drafts
    USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::BIGINT)
    WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::BIGINT);

DO $$
DECLARE
    app_role_name TEXT := '${app-role}';
BEGIN
    IF app_role_name !~ '^[A-Za-z_][A-Za-z0-9_]*$' THEN
        RAISE EXCEPTION 'Unsafe DB_APP_USERNAME value for grants';
    END IF;
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.email_expense_drafts TO %I', app_role_name);
END $$;
