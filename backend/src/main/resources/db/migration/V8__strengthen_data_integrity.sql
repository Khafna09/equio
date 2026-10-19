ALTER TABLE profiles
    ADD CONSTRAINT chk_profiles_language
        CHECK (language IN ('es', 'en')),
    ADD CONSTRAINT chk_profiles_currency
        CHECK (currency ~ '^[A-Z]{3}$'),
    ADD CONSTRAINT chk_profiles_theme
        CHECK (theme IN ('light', 'dark', 'system')),
    ADD CONSTRAINT chk_profiles_names
        CHECK (
            btrim(first_name) <> ''
            AND btrim(last_name) <> ''
            AND first_name !~ '[[:cntrl:]]'
            AND last_name !~ '[[:cntrl:]]'
        );

ALTER TABLE categories
    ADD CONSTRAINT uq_categories_id_user UNIQUE (id, user_id),
    ADD CONSTRAINT chk_categories_name
        CHECK (btrim(name) <> '' AND name !~ '[[:cntrl:]]'),
    ADD CONSTRAINT chk_categories_color
        CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    ADD CONSTRAINT chk_categories_icon
        CHECK (btrim(icon) <> '' AND icon !~ '[[:cntrl:]]');

ALTER TABLE movements
    ADD CONSTRAINT chk_movements_type
        CHECK (type IN ('INCOME', 'EXPENSE')),
    ADD CONSTRAINT chk_movements_description
        CHECK (description IS NULL OR description !~ '[[:cntrl:]]'),
    ADD CONSTRAINT fk_movements_category_owner
        FOREIGN KEY (category_id, user_id)
        REFERENCES categories (id, user_id);

ALTER TABLE budgets
    ADD CONSTRAINT uq_budgets_id_user UNIQUE (id, user_id),
    ADD CONSTRAINT chk_budgets_name
        CHECK (btrim(name) <> '' AND name !~ '[[:cntrl:]]'),
    ADD CONSTRAINT chk_budgets_status
        CHECK (status IN ('ACTIVE', 'CLOSED')),
    ADD CONSTRAINT chk_budgets_savings
        CHECK (
            (savings_type IS NULL AND savings_value IS NULL)
            OR (savings_type = 'PERCENTAGE' AND savings_value > 0 AND savings_value <= 100)
            OR (savings_type = 'FIXED' AND savings_value > 0 AND savings_value <= total_amount)
        ),
    ADD CONSTRAINT fk_budgets_category_owner
        FOREIGN KEY (category_id, user_id)
        REFERENCES categories (id, user_id),
    ADD CONSTRAINT fk_budgets_parent_owner
        FOREIGN KEY (parent_budget_id, user_id)
        REFERENCES budgets (id, user_id);

ALTER TABLE saving_goals
    ADD CONSTRAINT chk_saving_goals_name
        CHECK (btrim(name) <> '' AND name !~ '[[:cntrl:]]'),
    ADD CONSTRAINT chk_saving_goals_current_amount
        CHECK (current_amount <= target_amount),
    ADD CONSTRAINT chk_saving_goals_tag
        CHECK (tag IS NULL OR tag !~ '[[:cntrl:]]'),
    ADD CONSTRAINT chk_saving_goals_image_url
        CHECK (
            image_url IS NULL
            OR image_url ~ '^https://images\.unsplash\.com/[^[:space:]]+$'
        ),
    ADD CONSTRAINT fk_saving_goals_budget_owner
        FOREIGN KEY (budget_id, user_id)
        REFERENCES budgets (id, user_id);

ALTER TABLE users
    ADD CONSTRAINT chk_users_email
        CHECK (
            email = lower(btrim(email))
            AND email !~ '[[:cntrl:][:space:]]'
            AND email ~ '^[^@]+@[^@]+\.[^@]+$'
        ),
    ADD CONSTRAINT chk_users_failed_login_attempts
        CHECK (failed_login_attempts >= 0),
    ADD CONSTRAINT chk_users_password_hash
        CHECK (char_length(password) BETWEEN 59 AND 255);

ALTER TABLE refresh_token_sessions
    ADD CONSTRAINT chk_refresh_token_hash
        CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT chk_refresh_replacement_hash
        CHECK (replaced_by_hash IS NULL OR replaced_by_hash ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT chk_refresh_ip_hash
        CHECK (ip_hash IS NULL OR ip_hash ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT chk_refresh_user_agent_hash
        CHECK (user_agent_hash IS NULL OR user_agent_hash ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT chk_refresh_expiry
        CHECK (expires_at > created_at);
