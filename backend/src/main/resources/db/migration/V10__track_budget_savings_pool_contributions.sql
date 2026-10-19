ALTER TABLE budgets
    ADD COLUMN savings_pool_contribution NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE budgets
    ADD CONSTRAINT chk_budgets_savings_pool_contribution
        CHECK (savings_pool_contribution >= 0 AND savings_pool_contribution <= total_amount);
