CREATE TABLE savings_pools (
    id BIGSERIAL PRIMARY KEY,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_savings_pool_balance CHECK (balance >= 0)
);

CREATE TABLE savings_pool_transactions (
    id BIGSERIAL PRIMARY KEY,
    pool_id BIGINT NOT NULL REFERENCES savings_pools(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    budget_id BIGINT REFERENCES budgets(id) ON DELETE SET NULL,
    saving_goal_id BIGINT REFERENCES saving_goals(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_savings_pool_transaction_type CHECK (
        type IN ('BUDGET_CLOSURE_DEPOSIT', 'TRANSFER_TO_GOAL', 'TRANSFER_TO_BUDGET')
    ),
    CONSTRAINT chk_savings_pool_transaction_amount CHECK (amount > 0),
    CONSTRAINT chk_savings_pool_transaction_balance CHECK (balance_after >= 0)
);

CREATE UNIQUE INDEX uq_savings_pool_budget_closure
    ON savings_pool_transactions(user_id, budget_id)
    WHERE type = 'BUDGET_CLOSURE_DEPOSIT';
CREATE INDEX idx_savings_pool_transactions_user_created
    ON savings_pool_transactions(user_id, created_at DESC);

ALTER TABLE savings_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_pools FORCE ROW LEVEL SECURITY;
CREATE POLICY savings_pools_tenant_isolation ON savings_pools
    USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::BIGINT)
    WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::BIGINT);

ALTER TABLE savings_pool_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_pool_transactions FORCE ROW LEVEL SECURITY;
CREATE POLICY savings_pool_transactions_tenant_isolation ON savings_pool_transactions
    USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::BIGINT)
    WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::BIGINT);

DO $$
DECLARE
    app_role_name TEXT := '${app-role}';
BEGIN
    IF app_role_name !~ '^[A-Za-z_][A-Za-z0-9_]*$' THEN
        RAISE EXCEPTION 'Unsafe DB_APP_USERNAME value for grants';
    END IF;
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE savings_pools TO %I', app_role_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE savings_pool_transactions TO %I', app_role_name);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE savings_pools_id_seq TO %I', app_role_name);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE savings_pool_transactions_id_seq TO %I', app_role_name);
END $$;
