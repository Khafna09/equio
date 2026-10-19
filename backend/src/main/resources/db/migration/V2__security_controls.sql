ALTER TABLE users ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

ALTER TABLE budgets ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE movements ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE saving_goals ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS refresh_token_sessions (
    id UUID PRIMARY KEY,
    token_hash CHAR(64) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    replaced_by_hash CHAR(64),
    user_agent_hash CHAR(64),
    ip_hash CHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_refresh_token_user ON refresh_token_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_token_expiry ON refresh_token_sessions(expires_at);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS categories_tenant_isolation ON categories;
CREATE POLICY categories_tenant_isolation ON categories
    USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::BIGINT)
    WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::BIGINT);

ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS movements_tenant_isolation ON movements;
CREATE POLICY movements_tenant_isolation ON movements
    USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::BIGINT)
    WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::BIGINT);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS budgets_tenant_isolation ON budgets;
CREATE POLICY budgets_tenant_isolation ON budgets
    USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::BIGINT)
    WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::BIGINT);

ALTER TABLE saving_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE saving_goals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS saving_goals_tenant_isolation ON saving_goals;
CREATE POLICY saving_goals_tenant_isolation ON saving_goals
    USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::BIGINT)
    WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::BIGINT);
