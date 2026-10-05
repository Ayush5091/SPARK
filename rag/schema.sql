-- AICTE RAG assistant: vector store (pgvector on the existing Postgres/Neon DB).
-- Applied automatically by `npm run rag:ingest`; safe to run repeatedly.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_chunks (
  id          BIGSERIAL PRIMARY KEY,
  document    TEXT        NOT NULL,          -- file name, e.g. "aicte-rules.md"
  file_hash   TEXT        NOT NULL,          -- sha256 of the file, used to skip unchanged files
  section     TEXT,                          -- heading path, e.g. "Chapter 3 › Activity Points"
  chunk_index INTEGER     NOT NULL,
  content     TEXT        NOT NULL,
  -- nvidia/nemotron-3-embed-1b returns 2048 dims. halfvec (not vector) because
  -- pgvector's HNSW index supports at most 2000 dims for vector, 4000 for halfvec.
  embedding   HALFVEC(2048) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rag_chunks_document_idx ON rag_chunks (document);

CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx
  ON rag_chunks USING hnsw (embedding halfvec_cosine_ops);

-- Fixed-window rate-limit counters for the public /api/rag/ask endpoint.
-- Kept in Postgres because Vercel serverless instances don't share memory.
CREATE TABLE IF NOT EXISTS rag_rate_limits (
  bucket       TEXT        NOT NULL,          -- e.g. "ip:<hash>:minute", "user:42:day", "global:day"
  window_start TIMESTAMPTZ NOT NULL,
  count        INTEGER     NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);
