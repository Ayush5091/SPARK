// Minimal client for NVIDIA's hosted, OpenAI-compatible API (server-side only).

const BASE_URL = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
export const CHAT_MODEL = process.env.NVIDIA_CHAT_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b";
// Must match rag/ingest.mjs — query and passage vectors have to come from the same model.
export const EMBED_MODEL = process.env.NVIDIA_EMBED_MODEL || "nvidia/nemotron-3-embed-1b";

export class NvidiaError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "NvidiaError";
  }
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function request(path: string, body: unknown, timeoutMs: number): Promise<Response> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new NvidiaError("NVIDIA_API_KEY is not configured");

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (err: any) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    throw new NvidiaError(timedOut ? "NVIDIA API request timed out" : `NVIDIA API unreachable: ${err?.message}`);
  }

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    throw new NvidiaError(`NVIDIA API error ${res.status}: ${detail}`, res.status);
  }
  return res;
}

const post = async (path: string, body: unknown, timeoutMs: number) => (await request(path, body, timeoutMs)).json();

export async function embedQuery(text: string): Promise<number[]> {
  const json = await post(
    "/embeddings",
    { model: EMBED_MODEL, input: [text], input_type: "query", encoding_format: "float", truncate: "END" },
    15_000
  );
  const embedding = json?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) throw new NvidiaError("NVIDIA API returned no embedding");
  return embedding;
}

const chatBody = (messages: ChatMessage[], stream: boolean) => ({
  model: CHAT_MODEL,
  messages,
  temperature: 0.2,
  top_p: 0.9,
  max_tokens: 1024,
  stream,
  // Reasoning off: faster and cheaper, and the answer is bounded by the retrieved context anyway.
  chat_template_kwargs: { enable_thinking: false },
});

export async function chat(messages: ChatMessage[]): Promise<string> {
  const json = await post("/chat/completions", chatBody(messages, false), 45_000);
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new NvidiaError("NVIDIA API returned an empty answer");
  return content.trim();
}

/** Streams answer text deltas as they are generated (OpenAI-compatible SSE). */
export async function* chatStream(messages: ChatMessage[]): AsyncGenerator<string> {
  const res = await request("/chat/completions", chatBody(messages, true), 55_000);
  if (!res.body) throw new NvidiaError("NVIDIA API returned no stream");

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const data = line.trim();
        if (!data.startsWith("data:")) continue;
        const payload = data.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) yield delta;
        } catch {
          // Ignore keep-alives / malformed lines.
        }
      }
    }
  } catch (err: any) {
    if (err instanceof NvidiaError) throw err;
    throw new NvidiaError(err?.name === "TimeoutError" ? "NVIDIA API stream timed out" : `NVIDIA stream failed: ${err?.message}`);
  } finally {
    // Also runs when the consumer stops early (user hit stop / closed the tab): cancels the upstream generation.
    await reader.cancel().catch(() => {});
  }
}
