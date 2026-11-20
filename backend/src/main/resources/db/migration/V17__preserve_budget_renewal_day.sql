ALTER TABLE budgets ADD COLUMN renewal_day SMALLINT;

UPDATE budgets
SET renewal_day = EXTRACT(DAY FROM COALESCE(next_start_date, start_date))::SMALLINT
WHERE is_fixed = TRUE AND start_date IS NOT NULL;

ALTER TABLE budgets
    ADD CONSTRAINT ck_budget_renewal_day_range
        CHECK (renewal_day IS NULL OR renewal_day BETWEEN 1 AND 31),
    ADD CONSTRAINT ck_fixed_budget_renewal_day
        CHECK (is_fixed = FALSE OR renewal_day IS NOT NULL);
