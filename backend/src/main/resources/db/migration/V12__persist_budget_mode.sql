ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS budget_mode VARCHAR(20) NOT NULL DEFAULT 'NORMAL';

UPDATE profiles p
SET budget_mode = 'ADVANCED'
WHERE EXISTS (
    SELECT 1
    FROM budgets b
    WHERE b.user_id = p.user_id
      AND b.status = 'ACTIVE'
      AND b.category_id IS NOT NULL
      AND b.parent_budget_id IS NULL
);

ALTER TABLE profiles
    ADD CONSTRAINT ck_profiles_budget_mode
    CHECK (budget_mode IN ('NORMAL', 'ADVANCED'));
