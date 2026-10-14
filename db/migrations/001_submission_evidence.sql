-- Evidence files (camera photos, reports, certificates) are stored in S3; the
-- submission keeps the object key so reviewers can open it with a signed URL.
ALTER TABLE event_submissions ADD COLUMN IF NOT EXISTS evidence_key TEXT;
ALTER TABLE event_submissions ADD COLUMN IF NOT EXISTS evidence_content_type TEXT;
ALTER TABLE event_submissions ADD COLUMN IF NOT EXISTS evidence_filename TEXT;

-- A personal activity that already happened is proven by a document, not a GPS
-- check, so its venue pin is optional.
ALTER TABLE events ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE events ALTER COLUMN longitude DROP NOT NULL;
