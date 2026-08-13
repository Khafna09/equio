CREATE TABLE role (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    password VARCHAR(120) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL
);

CREATE TABLE user_roles (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES role(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE profiles (
    id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    language VARCHAR(10) NOT NULL DEFAULT 'es',
    currency VARCHAR(10) NOT NULL DEFAULT 'PEN',
    theme VARCHAR(20) NOT NULL DEFAULT 'light',
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL
);

CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(30) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT uq_categories_user_name UNIQUE (user_id, name)
);

CREATE TABLE movements (
    id BIGSERIAL PRIMARY KEY,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    type VARCHAR(10) NOT NULL,
    description VARCHAR(150),
    date TIMESTAMP(6) NOT NULL,
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL
);

CREATE TABLE budgets (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
    spent_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (spent_amount >= 0),
    is_fixed BOOLEAN NOT NULL DEFAULT FALSE,
    start_date DATE,
    end_date DATE,
    next_start_date DATE,
    savings_type VARCHAR(20),
    savings_value NUMERIC(12,2),
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    parent_budget_id BIGINT REFERENCES budgets(id) ON DELETE CASCADE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT ck_budget_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE TABLE saving_goals (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    target_amount NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
    deadline DATE,
    budget_id BIGINT REFERENCES budgets(id) ON DELETE SET NULL,
    tag VARCHAR(50),
    image_url VARCHAR(500),
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL
);

CREATE INDEX idx_movements_user_date ON movements(user_id, date DESC);
CREATE INDEX idx_budgets_user_status ON budgets(user_id, status);
CREATE INDEX idx_budgets_parent ON budgets(parent_budget_id);
CREATE INDEX idx_saving_goals_user ON saving_goals(user_id);
CREATE INDEX idx_categories_user ON categories(user_id);

INSERT INTO role(name) VALUES ('ROLE_USER'), ('ROLE_ADMIN');
