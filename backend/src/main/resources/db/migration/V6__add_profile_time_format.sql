ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS time_format VARCHAR(2) NOT NULL DEFAULT '24';

ALTER TABLE profiles
    DROP CONSTRAINT IF EXISTS chk_profiles_time_format;

ALTER TABLE profiles
    ADD CONSTRAINT chk_profiles_time_format CHECK (time_format IN ('12', '24'));
