ALTER TABLE saving_goals ADD CONSTRAINT uq_saving_goals_id_user UNIQUE (id, user_id);

ALTER TABLE movements
    ADD COLUMN source VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN source_goal_id BIGINT,
    ADD COLUMN source_goal_name VARCHAR(100),
    ADD CONSTRAINT chk_movements_source CHECK (
        source IN ('MANUAL', 'GOAL_CONTRIBUTION', 'GOAL_WITHDRAWAL', 'LEGACY_GOAL_TRANSFER')
    ),
    ADD CONSTRAINT chk_movements_source_type CHECK (
        (source <> 'GOAL_CONTRIBUTION' OR type = 'EXPENSE')
        AND (source <> 'GOAL_WITHDRAWAL' OR type = 'INCOME')
        AND (source NOT IN ('GOAL_CONTRIBUTION', 'GOAL_WITHDRAWAL') OR source_goal_name IS NOT NULL)
    ),
    ADD CONSTRAINT fk_movements_goal_owner FOREIGN KEY (source_goal_id, user_id)
        REFERENCES saving_goals(id, user_id) ON DELETE SET NULL (source_goal_id);

-- Legacy descriptions cannot prove goal identity; preserve them without guessing IDs.
UPDATE movements SET source = 'LEGACY_GOAL_TRANSFER'
WHERE (type = 'EXPENSE' AND description LIKE 'Aporte a meta: %')
   OR (type = 'INCOME' AND description LIKE 'Retiro de meta: %');

CREATE INDEX idx_movements_source_goal ON movements(source_goal_id) WHERE source_goal_id IS NOT NULL;
