-- Remove legacy activity request records
-- Run this to clear old request/submission data tied to activity_requests.

BEGIN;

-- Remove submissions tied to activity requests first (FK dependency)
DELETE FROM submissions;

-- Remove all activity requests
DELETE FROM activity_requests;

COMMIT;
