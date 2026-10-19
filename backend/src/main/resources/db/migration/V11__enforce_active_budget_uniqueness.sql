CREATE UNIQUE INDEX IF NOT EXISTS uq_budgets_active_global_per_user
    ON budgets (user_id)
    WHERE status = 'ACTIVE' AND category_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_budgets_active_category_per_user
    ON budgets (user_id, category_id)
    WHERE status = 'ACTIVE' AND category_id IS NOT NULL;
