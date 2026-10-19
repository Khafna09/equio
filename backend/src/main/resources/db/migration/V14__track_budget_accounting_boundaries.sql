ALTER TABLE budgets ADD COLUMN accounting_start_at TIMESTAMP, ADD COLUMN closed_at TIMESTAMP;
UPDATE budgets SET accounting_start_at = start_date::TIMESTAMP WHERE start_date IS NOT NULL;
UPDATE budgets SET closed_at = end_date::TIMESTAMP + INTERVAL '1 day' - INTERVAL '1 microsecond'
WHERE status = 'CLOSED' AND end_date IS NOT NULL;
ALTER TABLE budgets ADD CONSTRAINT chk_budget_accounting_boundaries CHECK (
    accounting_start_at IS NULL OR closed_at IS NULL OR accounting_start_at <= closed_at
);
