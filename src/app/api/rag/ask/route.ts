import { NextResponse } from 'next/server';
import { decodeAccessToken } from '@/lib/auth';
import { askAicte, KnowledgeBaseMissingError, MAX_QUESTION_CHARS } from '@/lib/rag/assistant';
import { NvidiaError } from '@/lib/rag/nvidia';
import { enforceRateLimit, RateLimitError } from '@/lib/rag/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/rag/ask  { "question": "..." }  →  { answer, found, sources[] }
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

        return NextResponse.json(await askAicte(question));
    } catch (err: any) {
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
}
