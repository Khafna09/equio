ALTER TABLE refresh_token_sessions
    ALTER COLUMN token_hash TYPE VARCHAR(64),
    ALTER COLUMN replaced_by_hash TYPE VARCHAR(64),
    ALTER COLUMN user_agent_hash TYPE VARCHAR(64),
    ALTER COLUMN ip_hash TYPE VARCHAR(64);
