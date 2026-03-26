-- Add optional capacity to events

ALTER TABLE events
ADD COLUMN IF NOT EXISTS capacity INTEGER;
