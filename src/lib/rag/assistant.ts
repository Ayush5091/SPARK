// AICTE RAG assistant: question → embedding → pgvector search → grounded NVIDIA answer.
// Self-contained: only shares the Postgres pool with the rest of SPARK.

import db from "@/lib/db";
import { chat, embedQuery } from "./nvidia";

const TOP_K = 6;
// Cosine similarity below this is treated as "not about this question". Unrelated questions
// score < ~0.15 with nemotron-3-embed-1b; the prompt handles borderline matches.
const MIN_SCORE = Number(process.env.RAG_MIN_SCORE) || 0.2;
export const MAX_QUESTION_CHARS = 1000;

export const NOT_FOUND_ANSWER =
  "I couldn't find this in the AICTE documents I have access to. Please check the official AICTE guidelines or ask your coordinator.";

export type RagSource = {
  ref: number; // the [n] number used in the answer
  document: string;
  section: string | null;
  score: number;
  excerpt: string;
  cited: boolean;
};

export type RagAnswer = { answer: string; found: boolean; sources: RagSource[] };

type Chunk = { document: string; section: string | null; content: string; score: number };

export class KnowledgeBaseMissingError extends Error {}

async function retrieve(question: string): Promise<Chunk[]> {
  const embedding = await embedQuery(question);

  // Use a raw client: db.query() logs params, which would dump a 2048-float vector per request.
  const client = await db.getClient();
  try {
    const { rows } = await client.query(
      `SELECT document, section, content, 1 - (embedding <=> $1::halfvec) AS score
         FROM rag_chunks
        ORDER BY embedding <=> $1::halfvec
        LIMIT $2`,
      [JSON.stringify(embedding), TOP_K]
    );
    return rows.map((r) => ({ ...r, score: Number(r.score) }));
  } catch (err: any) {
    // 42P01 = table missing, 42704 = halfvec type missing (pgvector not installed)
    if (err?.code === "42P01" || err?.code === "42704") {
      throw new KnowledgeBaseMissingError("AICTE knowledge base has not been ingested yet");
    }
    throw err;
  } finally {
    client.release();
  }
}

const SYSTEM_PROMPT = `You are the AICTE assistant inside SPARK, an app students use to track AICTE activity points.
Answer questions using ONLY the numbered context passages from official AICTE documents provided by the user message.

Rules:
- If the passages do not contain the answer, reply exactly: "${NOT_FOUND_ANSWER}" Do not guess or use outside knowledge.
- If the passages only partly answer the question, answer that part and clearly say what is not covered.
- Every factual statement must cite the passage(s) it comes from with their numbers in square brackets, e.g. [1] or [2][3].
- Quote numbers, point values, limits and eligibility rules exactly as written in the passages.
- Answer in complete sentences that restate what is being answered (e.g. "Students must earn X points for Y [1]."), not bare values.
- Be concise and clear. Use short bullet points or a small table when it helps.`;

export async function askAicte(question: string): Promise<RagAnswer> {
  const chunks = (await retrieve(question)).filter((c) => c.score >= MIN_SCORE);
  if (!chunks.length) return { answer: NOT_FOUND_ANSWER, found: false, sources: [] };

  const context = chunks
    .map((c, i) => `[${i + 1}] ${c.document}${c.section ? ` — ${c.section}` : ""}\n${c.content}`)
    .join("\n\n---\n\n");

  const answer = await chat([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content:
        `Context passages:\n\n${context}\n\n---\n\nQuestion: ${question}\n\n` +
        // Repeated next to the question: the model follows these far more reliably here than in the system prompt alone.
        `Answer from the passages only, in full sentences, citing passage numbers like [1].`,
    },
  ]);

  const found = !answer.includes(NOT_FOUND_ANSWER.slice(0, 40));
  const cited = new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));

  return {
    answer,
    found,
    sources: found
      ? chunks.map((c, i) => ({
          ref: i + 1,
          document: c.document,
          section: c.section,
          score: Math.round(c.score * 1000) / 1000,
          excerpt: c.content.length > 300 ? `${c.content.slice(0, 300)}…` : c.content,
          cited: cited.has(i + 1),
        }))
      : [],
  };
}
