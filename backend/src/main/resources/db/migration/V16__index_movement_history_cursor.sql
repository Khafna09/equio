CREATE INDEX idx_movements_user_date_id ON movements(user_id, date DESC, id DESC);
DROP INDEX idx_movements_user_date;
