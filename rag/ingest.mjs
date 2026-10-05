// AICTE RAG ingestion: rag/documents/*.md → chunks → NVIDIA embeddings → pgvector.
//
//   npm run rag:ingest              ingest new/changed files (unchanged files are skipped)
//   npm run rag:ingest -- --force   re-embed every file
//   npm run rag:ingest -- --prune   also delete DB chunks for files no longer in the folder
//
// Runs locally (not on Vercel). Needs DATABASE_URL and NVIDIA_API_KEY in .env / .env.local.

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(ROOT, ".env.local"), quiet: true });
dotenv.config({ path: path.join(ROOT, ".env"), quiet: true });

const DOCS_DIR = path.join(ROOT, "rag", "documents");
const EXTENSIONS = new Set([".md", ".markdown", ".txt"]);

// Must match src/lib/rag/nvidia.ts
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
const EMBED_MODEL = process.env.NVIDIA_EMBED_MODEL || "nvidia/nemotron-3-embed-1b";
const EMBED_BATCH = 16;

const MAX_CHUNK_CHARS = 1500;
const OVERLAP_MAX_CHARS = 400; // carry a short trailing block into the next chunk for continuity

const args = new Set(process.argv.slice(2));
const FORCE = args.has("--force");
const PRUNE = args.has("--prune");

// ---------------------------------------------------------------------------
// Markdown chunking
// ---------------------------------------------------------------------------

/** Split markdown into sections keyed by their heading path. */
function splitSections(markdown) {
  const sections = [];
  const headings = []; // headings[level-1] = text
  let lines = [];
  let inFence = false;

  const flush = () => {
    const text = lines.join("\n").trim();
    if (text) sections.push({ section: headings.filter(Boolean).join(" › ") || null, text });
    lines = [];
  };

  for (const line of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const m = !inFence && line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (m) {
      flush();
      const level = m[1].length;
      headings.length = level - 1;
      headings[level - 1] = m[2].replace(/[*_`]/g, "").replace(/\s+-{2,3}\s+/g, " — ").trim();
    } else if (!inFence && /^\s*([-*_=]\s*){3,}$/.test(line)) {
      // Horizontal rules are visual separators only; they add noise to excerpts and embeddings.
      continue;
    } else {
      lines.push(line);
    }
  }
  flush();
  return sections;
}

const isTable = (block) => block.split("\n").every((l) => l.trim().startsWith("|"));

/** Break a block that is larger than MAX_CHUNK_CHARS into pieces. */
function splitOversized(block) {
  if (block.length <= MAX_CHUNK_CHARS) return [block];

  // Tables: split by rows and repeat the header so every piece stays readable.
  if (isTable(block)) {
    const rows = block.split("\n");
    const header = rows.slice(0, 2).join("\n");
    const pieces = [];
    let cur = [];
    for (const row of rows.slice(2)) {
      if (cur.length && header.length + cur.join("\n").length + row.length + 2 > MAX_CHUNK_CHARS) {
        pieces.push(`${header}\n${cur.join("\n")}`);
        cur = [];
      }
      cur.push(row);
    }
    if (cur.length) pieces.push(`${header}\n${cur.join("\n")}`);
    return pieces;
  }

  // Prose/lists: split on lines, then sentences, then hard-cut as a last resort.
  const units = block.split("\n").flatMap((l) =>
    l.length <= MAX_CHUNK_CHARS ? [l] : l.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [l]
  );
  const pieces = [];
  let cur = "";
  for (let unit of units) {
    while (unit.length > MAX_CHUNK_CHARS) {
      pieces.push(unit.slice(0, MAX_CHUNK_CHARS));
      unit = unit.slice(MAX_CHUNK_CHARS);
    }
    if (cur && cur.length + unit.length + 1 > MAX_CHUNK_CHARS) {
      pieces.push(cur.trim());
      cur = "";
    }
    cur += (cur ? "\n" : "") + unit;
  }
  if (cur.trim()) pieces.push(cur.trim());
  return pieces;
}

function chunkMarkdown(markdown) {
  const chunks = [];
  for (const { section, text } of splitSections(markdown)) {
    const blocks = text
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean)
      .flatMap(splitOversized);

    let cur = [];
    let len = 0;
    for (const block of blocks) {
      if (cur.length && len + block.length + 2 > MAX_CHUNK_CHARS) {
        chunks.push({ section, content: cur.join("\n\n") });
        const last = cur[cur.length - 1];
        cur = last.length <= OVERLAP_MAX_CHARS && last.length + block.length + 2 <= MAX_CHUNK_CHARS ? [last] : [];
        len = cur.reduce((n, b) => n + b.length + 2, 0);
      }
      cur.push(block);
      len += block.length + 2;
    }
    if (cur.length) chunks.push({ section, content: cur.join("\n\n") });
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// NVIDIA embeddings
// ---------------------------------------------------------------------------

async function embedPassages(texts) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${NVIDIA_BASE_URL}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: texts,
        input_type: "passage",
        encoding_format: "float",
        truncate: "END",
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (res.ok) {
      const json = await res.json();
      return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    }
    const retryable = res.status === 429 || res.status >= 500;
    const body = (await res.text()).slice(0, 300);
    if (!retryable || attempt >= 4) throw new Error(`Embedding request failed (${res.status}): ${body}`);
    const wait = 2000 * attempt;
    console.warn(`  embeddings ${res.status}, retrying in ${wait / 1000}s...`);
    await new Promise((r) => setTimeout(r, wait));
  }
}

/** Text that gets embedded: document + heading path give retrieval useful context. */
const embeddingText = (document, c) =>
  `Document: ${document}\n${c.section ? `Section: ${c.section}\n` : ""}\n${c.content}`;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  if (!process.env.NVIDIA_API_KEY) throw new Error("NVIDIA_API_KEY is not set");

  const files = (await readdir(DOCS_DIR))
    .filter((f) => EXTENSIONS.has(path.extname(f).toLowerCase()))
    .sort();
  if (!files.length) {
    console.log(`No .md/.txt files found in ${path.relative(ROOT, DOCS_DIR)}/`);
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();
  try {
    await client.query(await readFile(path.join(ROOT, "rag", "schema.sql"), "utf8"));

    for (const file of files) {
      const raw = await readFile(path.join(DOCS_DIR, file), "utf8");
      const hash = createHash("sha256").update(raw).digest("hex");

      const { rows } = await client.query(
        "SELECT DISTINCT file_hash FROM rag_chunks WHERE document = $1",
        [file]
      );
      if (!FORCE && rows.length === 1 && rows[0].file_hash === hash) {
        console.log(`= ${file} (unchanged, skipped)`);
        continue;
      }

      const chunks = chunkMarkdown(raw);
      console.log(`+ ${file}: ${chunks.length} chunks`);

      const embeddings = [];
      for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
        const batch = chunks.slice(i, i + EMBED_BATCH);
        embeddings.push(...(await embedPassages(batch.map((c) => embeddingText(file, c)))));
        process.stdout.write(`  embedded ${Math.min(i + EMBED_BATCH, chunks.length)}/${chunks.length}\r`);
      }
      process.stdout.write("\n");

      // Replace the document's chunks atomically so a failed run never leaves it half-ingested.
      await client.query("BEGIN");
      try {
        await client.query("DELETE FROM rag_chunks WHERE document = $1", [file]);
        for (let i = 0; i < chunks.length; i++) {
          await client.query(
            `INSERT INTO rag_chunks (document, file_hash, section, chunk_index, content, embedding)
             VALUES ($1, $2, $3, $4, $5, $6::halfvec)`,
            [file, hash, chunks[i].section, i, chunks[i].content, JSON.stringify(embeddings[i])]
          );
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    if (PRUNE) {
      const { rowCount } = await client.query(
        "DELETE FROM rag_chunks WHERE NOT (document = ANY($1::text[]))",
        [files]
      );
      console.log(`Pruned ${rowCount} chunks from removed files`);
    }

    const { rows } = await client.query(
      "SELECT document, COUNT(*)::int AS chunks FROM rag_chunks GROUP BY document ORDER BY document"
    );
    console.log("\nKnowledge base:");
    console.table(rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`\nIngestion failed: ${err.message}`);
  process.exit(1);
});
