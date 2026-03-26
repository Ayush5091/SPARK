-- Add personal event support

ALTER TABLE events
ADD COLUMN IF NOT EXISTS is_personal BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS personal_owner_id INTEGER REFERENCES students(id);
