// Postgres-backed fixed-window rate limiting for the public AICTE assistant endpoint.
// Postgres rather than in-memory: Vercel serverless instances don't share memory.

import { createHash } from "node:crypto";
import db from "@/lib/db";

const env = (name: string, fallback: number) => Number(process.env[name]) || fallback;

// Per caller (logged-in user, else IP). Campus Wi-Fi puts many students behind one IP,
// which is why logged-in users get their own bucket instead of sharing the IP's.
const PER_MINUTE = env("RAG_LIMIT_PER_MINUTE", 6);
const PER_DAY = env("RAG_LIMIT_PER_DAY", 60);
// Hard ceiling on NVIDIA inference across everyone, so cost is bounded no matter what.
const GLOBAL_PER_DAY = env("RAG_LIMIT_GLOBAL_PER_DAY", 3000);

export class RateLimitError extends Error {
  constructor(message: string, public retryAfterSeconds: number) {
    super(message);
  }
}

type Window = "minute" | "day";
type Limit = { bucket: string; window: Window; max: number };

const secondsUntilNext = (window: Window) => {
  const now = new Date();
  if (window === "minute") return 60 - now.getUTCSeconds();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.ceil((next - now.getTime()) / 1000);
};

/** Increments every bucket and returns the first one that is over its limit, if any. */
async function consume(limits: Limit[]): Promise<Limit | undefined> {
  const client = await db.getClient();
  try {
    const { rows } = await client.query(
      `INSERT INTO rag_rate_limits (bucket, window_start, count)
       SELECT b, date_trunc(w, NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC', 1
         FROM unnest($1::text[], $2::text[]) AS t(b, w)
       ON CONFLICT (bucket, window_start) DO UPDATE SET count = rag_rate_limits.count + 1
       RETURNING bucket, count`,
      [limits.map((l) => l.bucket), limits.map((l) => l.window)]
    );
    // Opportunistic cleanup of old windows (~1% of requests) keeps the table tiny without a cron job.
    if (Math.random() < 0.01) {
      await client.query("DELETE FROM rag_rate_limits WHERE window_start < NOW() - INTERVAL '2 days'");
    }
    const counts = new Map(rows.map((r) => [r.bucket as string, Number(r.count)]));
    return limits.find((l) => (counts.get(l.bucket) ?? 0) > l.max);
  } finally {
    client.release();
  }
}

export function clientIp(request: Request) {
  // On Vercel, x-real-ip / x-forwarded-for are set by the platform and can't be spoofed by the client.
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * Throws RateLimitError if the caller (or the whole service) is over its quota.
 * The caller's own buckets are checked first, so a client hammering the endpoint
 * is rejected without using up the shared global budget.
 */
export async function enforceRateLimit(request: Request, userId?: string | number) {
  const caller = userId
    ? `user:${userId}`
    : `ip:${createHash("sha256").update(clientIp(request)).digest("hex").slice(0, 32)}`;

  const callerHit = await consume([
    { bucket: `${caller}:minute`, window: "minute", max: PER_MINUTE },
    { bucket: `${caller}:day`, window: "day", max: PER_DAY },
  ]);
  if (callerHit) {
    throw callerHit.window === "minute"
      ? new RateLimitError("You're asking questions a little too quickly. Please wait a moment and try again.", secondsUntilNext("minute"))
      : new RateLimitError("You've reached today's question limit for the AICTE assistant. Please come back tomorrow.", secondsUntilNext("day"));
  }

  const globalHit = await consume([{ bucket: "global:day", window: "day", max: GLOBAL_PER_DAY }]);
  if (globalHit) {
    throw new RateLimitError("The AICTE assistant has reached its daily capacity. Please try again tomorrow.", secondsUntilNext("day"));
  }
}
