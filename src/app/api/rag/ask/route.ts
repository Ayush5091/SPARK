import { NextResponse } from 'next/server';
import { decodeAccessToken } from '@/lib/auth';
import {
    askAicte,
    finalizeAnswer,
    KnowledgeBaseMissingError,
    MAX_QUESTION_CHARS,
    NOT_FOUND_ANSWER,
    prepareAnswer,
} from '@/lib/rag/assistant';
import { chatStream, NvidiaError } from '@/lib/rag/nvidia';
import { enforceRateLimit, RateLimitError } from '@/lib/rag/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/rag/ask  { "question": "...", "stream"?: boolean }
//   stream false/absent → JSON { answer, found, sources[] }
//   stream true         → NDJSON events, one per line:
//                           { "type": "delta", "text": "..." }              (answer text, repeated)
//                           { "type": "done", "answer", "found", "sources" } (final, same shape as JSON mode)
//                           { "type": "error", "detail": "..." }             (failure after streaming began)
// Public (the knowledge base is public AICTE documentation) but rate limited; see lib/rag/rate-limit.ts.
// A valid SPARK token is optional and only gives the caller their own quota instead of their IP's.
export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => null);
        const question = typeof body?.question === 'string' ? body.question.trim() : '';
        if (!question) {
            return NextResponse.json({ detail: 'question is required' }, { status: 400 });
        }
        if (question.length > MAX_QUESTION_CHARS) {
            return NextResponse.json({ detail: `question must be at most ${MAX_QUESTION_CHARS} characters` }, { status: 400 });
        }

        const authHeader = request.headers.get('Authorization');
        const payload = authHeader?.startsWith('Bearer ') ? decodeAccessToken(authHeader.slice(7)) : null;
        await enforceRateLimit(request, payload?.user_id);

        if (body?.stream !== true) {
            return NextResponse.json(await askAicte(question));
        }

        // Retrieval happens before the stream opens, so its failures still map to proper HTTP statuses below.
        const prepared = await prepareAnswer(question);
        return streamAnswer(prepared);
    } catch (err: any) {
        return errorResponse(err);
    }
}

function streamAnswer(prepared: Awaited<ReturnType<typeof prepareAnswer>>) {
    const encoder = new TextEncoder();
    const tokens = prepared ? chatStream(prepared.messages) : null;
    let answer = '';

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            const send = (event: object) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
            try {
                if (!prepared || !tokens) {
                    send({ type: 'delta', text: NOT_FOUND_ANSWER });
                    send({ type: 'done', answer: NOT_FOUND_ANSWER, found: false, sources: [] });
                } else {
                    for await (const text of tokens) {
                        answer += text;
                        send({ type: 'delta', text });
                    }
                    if (!answer.trim()) throw new NvidiaError('NVIDIA API returned an empty answer');
                    send({ type: 'done', ...finalizeAnswer(answer.trim(), prepared.chunks) });
                }
            } catch (err: any) {
                console.error('[rag] stream error:', err?.message || err);
                try {
                    send({ type: 'error', detail: 'The AI service stopped responding. Please try again.' });
                } catch {
                    // Client already disconnected.
                }
            } finally {
                try {
                    controller.close();
                } catch {
                    // Already closed by cancel().
                }
            }
        },
        // Client disconnected or pressed stop: end the upstream NVIDIA generation too.
        async cancel() {
            await tokens?.return(undefined);
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'application/x-ndjson; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'X-Accel-Buffering': 'no',
        },
    });
}

function errorResponse(err: any) {
    if (err instanceof RateLimitError) {
        return NextResponse.json(
            { detail: err.message },
            { status: 429, headers: { 'Retry-After': String(err.retryAfterSeconds) } }
        );
    }
    if (err instanceof KnowledgeBaseMissingError) {
        return NextResponse.json({ detail: err.message }, { status: 503 });
    }
    if (err instanceof NvidiaError) {
        console.error('[rag] NVIDIA error:', err.message);
        return NextResponse.json(
            { detail: 'The AI service is unavailable right now. Please try again shortly.' },
            { status: err.status === 429 ? 503 : 502 }
        );
    }
    console.error('[rag] error:', err);
    return NextResponse.json({ detail: 'Could not answer the question right now.' }, { status: 500 });
}
