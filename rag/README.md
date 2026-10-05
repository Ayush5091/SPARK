# AICTE RAG assistant

Answers AICTE questions from your own Markdown documents.

```
rag/documents/*.md → heading-aware chunks → NVIDIA embeddings (nemotron-3-embed-1b)
  → pgvector (rag_chunks table) → POST /api/rag/ask → nemotron-3.5-lightning answer + sources
```

## Add / update documents

1. Put `.md` (or `.txt`) files in `rag/documents/`. Use headings (`#`, `##`, …): each
   answer cites the heading path the passage came from, so meaningful headings = better sources.
2. Run `npm run rag:ingest`. Only new or changed files are re-embedded.
   - `npm run rag:ingest -- --force` re-embeds everything.
   - `npm run rag:ingest -- --prune` removes files you've deleted from the folder from the database.

Ingestion runs from your machine against the same `DATABASE_URL` that Vercel uses, so no deploy is needed after ingesting.

## API

`POST /api/rag/ask` with body `{ "question": "..." }`. Public, no login needed. Sending a SPARK `Authorization: Bearer <token>` is optional and gives that user their own rate-limit quota.

```json
{
  "answer": "Regular students must earn 100 activity points [1].",
  "found": true,
  "sources": [
    { "ref": 1, "document": "aicte-rules.md", "section": "Activity Points › Requirement",
      "score": 0.62, "excerpt": "…", "cited": true }
  ]
}
```

`found: false` means nothing relevant was retrieved, or the model declined to answer from the context.
Errors: 400 bad input, 429 rate limited (with `Retry-After`), 502/503 NVIDIA unavailable, 503 knowledge base not ingested.

## Abuse protection

Rate limits are fixed-window counters in Postgres (`rag_rate_limits`), because Vercel instances don't share memory:

| Limit | Default | Env override |
|---|---|---|
| Per caller per minute | 6 | `RAG_LIMIT_PER_MINUTE` |
| Per caller per day | 60 | `RAG_LIMIT_PER_DAY` |
| Whole service per day | 3000 | `RAG_LIMIT_GLOBAL_PER_DAY` |

A caller is the logged-in user if a valid token is sent, otherwise the (hashed) client IP, so students on shared
campus Wi-Fi don't share one quota once they log in. Requests rejected by a caller limit never count toward the
global budget. Questions are capped at 1000 characters and answers at 1024 tokens.

## UI

`src/components/AicteAssistant.tsx`: the floating button + chat panel, mounted once in `ClientLayout`.
Hidden on login/register and the event camera screen.

## Code

- `rag/ingest.mjs`: chunking + embedding + storage (local CLI)
- `rag/schema.sql`: `rag_chunks` table + HNSW index (applied by the ingest script)
- `src/lib/rag/nvidia.ts`: NVIDIA embeddings + chat client
- `src/lib/rag/assistant.ts`: retrieval, prompt, answer
- `src/lib/rag/rate-limit.ts`: Postgres-backed rate limiting
- `src/app/api/rag/ask/route.ts`: HTTP endpoint
