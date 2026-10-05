'use client';

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Check, ChevronDown, Copy, FileText, Minus, RotateCcw, Sparkles, Square } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';

type Source = {
    ref: number;
    document: string;
    section: string | null;
    score: number;
    excerpt: string;
    cited: boolean;
};

type AssistantStatus = 'searching' | 'streaming' | 'done' | 'stopped' | 'error';

type Message =
    | { id: number; role: 'user'; text: string }
    | {
        id: number;
        role: 'assistant';
        question: string;
        text: string;
        status: AssistantStatus;
        found: boolean;
        sources: Source[];
        error?: string;
    };

const SUGGESTIONS = [
    'How many activity points do I need?',
    'Which activities earn points?',
    'Is there a deadline to complete points?',
];

const MAX_QUESTION_CHARS = 1000;

// Auth screens and full-screen flows where a floating button would get in the way.
const HIDDEN_ROUTES = [/^\/login/, /^\/register/, /^\/auth\//, /^\/events\/[^/]+\/camera/];

function errorMessage(status: number, detail?: string) {
    if (status === 429) return detail || 'Too many questions right now. Please try again in a moment.';
    if (status === 503) return detail?.includes('knowledge base')
        ? "The AICTE knowledge base isn't set up yet. Please try again later."
        : detail || 'The AI service is unavailable right now. Please try again shortly.';
    if (status === 400 && detail) return detail;
    return detail || 'Something went wrong while answering. Please try again.';
}

/* ---------- Smooth "typing": reveals streamed text at a steady, adaptive pace ---------- */

function useSmoothText(target: string) {
    const [shown, setShown] = useState(0);
    const shownRef = useRef(0);

    useEffect(() => {
        let frame = 0;
        const tick = () => {
            const remaining = target.length - shownRef.current;
            if (remaining <= 0) return;
            // At least ~2 chars/frame; speeds up when the network gets ahead so it never lags far behind.
            shownRef.current += Math.max(2, Math.ceil(remaining / 14));
            setShown(Math.min(shownRef.current, target.length));
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [target]);

    const visible = target.slice(0, shown);
    return { visible, caughtUp: shown >= target.length };
}

/** Hide half-written markdown at the cursor (an unclosed "**" or a partial "[1") while text is streaming. */
function trimPartial(text: string) {
    let t = text.replace(/\[\d*$/, '');
    if ((t.match(/\*\*/g) || []).length % 2 === 1) t = t.replace(/\*\*(?!.*\*\*)/, '');
    return t;
}

/** Source excerpts are raw markdown with hard-wrapped lines: drop markers, keep paragraph and list breaks. */
function cleanExcerpt(text: string) {
    return text
        .replace(/\*\*|__|`/g, '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/([^\n])\n(?!\n|\s*([-*•|]|\d+[.)])\s)/g, '$1 ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/* ---------- Lightweight markdown rendering (paragraphs, lists, tables, **bold**, [n] citations) ---------- */

function renderInline(text: string, onCite: (ref: number) => void): ReactNode[] {
    return text.split(/(\*\*[^*]+\*\*|\[\d+\])/g).map((part, i) => {
        const cite = part.match(/^\[(\d+)\]$/);
        if (cite) {
            const ref = Number(cite[1]);
            return (
                <button
                    key={i}
                    type="button"
                    onClick={() => onCite(ref)}
                    className="mx-[2px] inline-flex h-[17px] min-w-[17px] -translate-y-[1px] items-center justify-center rounded-md bg-white/[0.08] px-1 align-middle text-[10px] font-semibold leading-none text-zinc-300 transition-colors hover:bg-white/20 hover:text-white"
                    aria-label={`Show source ${ref}`}
                >
                    {ref}
                </button>
            );
        }
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
        }
        return <Fragment key={i}>{part}</Fragment>;
    });
}

function Markdown({ text, onCite, cursor }: { text: string; onCite: (ref: number) => void; cursor: boolean }) {
    const blocks = text.replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    const caret = cursor ? <Caret /> : null;

    if (!blocks.length) return cursor ? <p><Caret /></p> : null;

    return (
        <div className="space-y-3">
            {blocks.map((block, i) => {
                const isLast = i === blocks.length - 1;
                const lines = block.split('\n');

                if (lines.every((l) => l.trim().startsWith('|'))) {
                    const rows = lines
                        .filter((l) => !/^\s*\|?[\s:|-]+\|?\s*$/.test(l))
                        .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
                    return (
                        <div key={i} className="overflow-x-auto rounded-xl border border-white/10">
                            <table className="w-full text-left text-[12.5px]">
                                <tbody>
                                    {rows.map((cells, r) => (
                                        <tr key={r} className={r === 0 ? 'bg-white/[0.04] font-semibold text-zinc-100' : 'border-t border-white/[0.06] text-zinc-300'}>
                                            {cells.map((c, ci) => (
                                                <td key={ci} className="px-3 py-2 align-top">{renderInline(c, onCite)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {isLast && caret}
                        </div>
                    );
                }

                if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
                    const ordered = /^\s*\d/.test(lines[0]);
                    const List = ordered ? 'ol' : 'ul';
                    return (
                        <List key={i} className={`space-y-1.5 pl-5 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-zinc-500`}>
                            {lines.map((l, li) => (
                                <li key={li} className="pl-0.5">
                                    {renderInline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ''), onCite)}
                                    {isLast && li === lines.length - 1 && caret}
                                </li>
                            ))}
                        </List>
                    );
                }

                const heading = block.match(/^#{1,6}\s+(.*)$/);
                if (heading && lines.length === 1) {
                    return <p key={i} className="font-semibold text-white">{renderInline(heading[1], onCite)}{isLast && caret}</p>;
                }

                return (
                    <p key={i} className="whitespace-pre-line">
                        {renderInline(block.replace(/^#{1,6}\s+/gm, ''), onCite)}
                        {isLast && caret}
                    </p>
                );
            })}
        </div>
    );
}

function Caret() {
    return (
        <motion.span
            aria-hidden
            className="ml-1 inline-block h-[0.7em] w-[0.7em] translate-y-[1px] rounded-full bg-zinc-100 align-baseline"
            animate={{ opacity: [1, 0.35, 1], scale: [1, 0.8, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        />
    );
}

function Shimmer({ children }: { children: ReactNode }) {
    return (
        <motion.span
            className="bg-[linear-gradient(110deg,#71717a_35%,#f4f4f5_50%,#71717a_65%)] bg-[length:250%_100%] bg-clip-text text-[13.5px] font-medium text-transparent"
            animate={{ backgroundPositionX: ['100%', '-150%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
        >
            {children}
        </motion.span>
    );
}

function AssistantAvatar({ busy }: { busy: boolean }) {
    return (
        <div className="relative mt-[3px] flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-zinc-700 to-zinc-900 ring-1 ring-white/10">
            <motion.span
                animate={busy ? { rotate: 360 } : { rotate: 0 }}
                transition={busy ? { duration: 3, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}
                className="flex"
            >
                <Sparkles size={14} strokeWidth={2.25} className="text-zinc-100" />
            </motion.span>
        </div>
    );
}

/* ---------- One assistant turn ---------- */

function AssistantTurn({ message, onRetry, retryDisabled }: {
    message: Extract<Message, { role: 'assistant' }>;
    onRetry: () => void;
    retryDisabled: boolean;
}) {
    const live = message.status === 'searching' || message.status === 'streaming';
    const { visible, caughtUp } = useSmoothText(message.text);
    const typing = live || !caughtUp;
    const settled = !typing;

    const [openRef, setOpenRef] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);

    const cited = message.sources.filter((s) => s.cited);
    const shownSources = cited.length ? cited : message.sources;
    const openSource = shownSources.find((s) => s.ref === openRef) ?? message.sources.find((s) => s.ref === openRef);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(message.text.replace(/\s?\[\d+\]/g, '').trim());
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch {
            // Clipboard unavailable (e.g. insecure context); nothing useful to show.
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex gap-3"
        >
            <AssistantAvatar busy={live} />
            <div className="min-w-0 flex-1 pt-[5px]">
                {message.status === 'searching' && !message.text ? (
                    <Shimmer>Searching AICTE documents…</Shimmer>
                ) : (
                    <div className="text-[14px] leading-[1.7] text-zinc-200">
                        <Markdown
                            text={typing ? trimPartial(visible) : message.text}
                            onCite={(ref) => setOpenRef((cur) => (cur === ref ? null : ref))}
                            cursor={typing}
                        />
                    </div>
                )}

                {message.status === 'stopped' && settled && (
                    <p className="mt-2 text-[12px] italic text-zinc-500">Stopped</p>
                )}

                {message.status === 'error' && settled && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-3 py-2 text-[13px] text-red-300">
                        <span>{message.error}</span>
                        <button
                            type="button"
                            onClick={onRetry}
                            disabled={retryDisabled}
                            className="inline-flex items-center gap-1 font-semibold text-red-200 hover:text-white disabled:opacity-40"
                        >
                            <RotateCcw size={12} strokeWidth={2.5} /> Retry
                        </button>
                    </div>
                )}

                <AnimatePresence>
                    {settled && message.status === 'done' && (
                        <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className="mt-3"
                        >
                            {message.found && shownSources.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {shownSources.map((s) => (
                                        <button
                                            key={s.ref}
                                            type="button"
                                            onClick={() => setOpenRef((cur) => (cur === s.ref ? null : s.ref))}
                                            aria-expanded={openRef === s.ref}
                                            title={s.section || s.document}
                                            className={`group inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] transition-colors ${
                                                openRef === s.ref
                                                    ? 'border-white/25 bg-white/10 text-white'
                                                    : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                                            }`}
                                        >
                                            <span className="flex h-4 min-w-4 items-center justify-center rounded bg-white/10 px-1 text-[9.5px] font-semibold text-zinc-200">
                                                {s.ref}
                                            </span>
                                            <span className="max-w-[220px] truncate">
                                                {(s.section?.split(' › ').pop() || s.document).replace(/^\d+(\.\d+)*\.?\s*/, '')}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <AnimatePresence initial={false}>
                                {openSource && (
                                    <motion.div
                                        key={openSource.ref}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                            <div className="flex items-start gap-2">
                                                <FileText size={13} className="mt-[2px] shrink-0 text-zinc-500" />
                                                <div className="min-w-0">
                                                    <p className="truncate text-[12px] font-semibold text-zinc-200">
                                                        {openSource.document.replace(/\.(md|markdown|txt)$/i, '').replace(/_/g, ' ')}
                                                    </p>
                                                    {openSource.section && (
                                                        <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{openSource.section}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="mt-2 whitespace-pre-line border-l-2 border-white/10 pl-2.5 text-[12px] leading-relaxed text-zinc-400">
                                                {cleanExcerpt(openSource.excerpt)}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="mt-2 flex items-center gap-1 text-zinc-500">
                                <button
                                    type="button"
                                    onClick={copy}
                                    aria-label="Copy answer"
                                    title={copied ? 'Copied' : 'Copy'}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.07] hover:text-zinc-200"
                                >
                                    {copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} strokeWidth={2} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={onRetry}
                                    disabled={retryDisabled}
                                    aria-label="Regenerate answer"
                                    title="Regenerate"
                                    className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.07] hover:text-zinc-200 disabled:opacity-40"
                                >
                                    <RotateCcw size={13.5} strokeWidth={2} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

/* ---------- Streaming client ---------- */

type StreamHandlers = { onDelta: (text: string) => void; onDone: (data: any) => void };

async function streamAnswer(question: string, token: string | null, signal: AbortSignal, h: StreamHandlers) {
    const res = await fetch('/api/rag/ask', {
        method: 'POST',
        // Public endpoint; the token is optional and only gives a logged-in user their own rate-limit quota.
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ question, stream: true }),
        signal,
    });

    if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw Object.assign(new Error(errorMessage(res.status, data?.detail)), { handled: true });
    }

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    let finished = false;
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line);
            if (event.type === 'delta') h.onDelta(event.text);
            else if (event.type === 'done') { finished = true; h.onDone(event); }
            else if (event.type === 'error') throw Object.assign(new Error(event.detail), { handled: true });
        }
    }
    if (!finished) throw Object.assign(new Error('The answer was cut off. Please try again.'), { handled: true });
}

/* ---------- Main widget ---------- */

// hasBottomNav: the mobile bottom navigation is visible, so the trigger sits above it.
export default function AicteAssistant({ hasBottomNav }: { hasBottomNav: boolean }) {
    const pathname = usePathname();
    const { token } = useAuth();

    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);

    const nextId = useRef(0);
    const abortRef = useRef<AbortController | null>(null);
    const stoppedRef = useRef(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const stickToBottom = useRef(true);

    const hidden = HIDDEN_ROUTES.some((r) => r.test(pathname || ''));

    useEffect(() => () => abortRef.current?.abort(), []);

    // Follow the conversation while it grows, unless the user has scrolled up to read.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const follow = () => {
            if (stickToBottom.current) el.scrollTop = el.scrollHeight;
        };
        follow();
        const observer = new ResizeObserver(follow);
        if (el.firstElementChild) observer.observe(el.firstElementChild);
        return () => observer.disconnect();
    }, [open]);

    const onScroll = () => {
        const el = scrollRef.current;
        if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    };

    // Focus input on open; Escape minimizes; lock page scroll behind the mobile sheet.
    useEffect(() => {
        if (!open) return;
        const isMobile = window.matchMedia('(max-width: 767px)').matches;
        if (!isMobile) inputRef.current?.focus();
        const prevOverflow = document.body.style.overflow;
        if (isMobile) document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [open]);

    // Auto-grow the textarea up to ~5 lines.
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
    }, [input, open]);

    const updateAssistant = (id: number, patch: (m: Extract<Message, { role: 'assistant' }>) => Partial<Extract<Message, { role: 'assistant' }>>) =>
        setMessages((prev) => prev.map((m) => (m.id === id && m.role === 'assistant' ? { ...m, ...patch(m) } : m)));

    const ask = useCallback(async (raw: string, retryOf?: number) => {
        const question = raw.trim().slice(0, MAX_QUESTION_CHARS);
        if (!question || busy) return;

        const id = nextId.current++;
        const turn: Message = { id, role: 'assistant', question, text: '', status: 'searching', found: false, sources: [] };
        setMessages((prev) => {
            // Retry/regenerate replaces that answer in place; a new question appends a user turn + answer.
            if (retryOf !== undefined) return prev.map((m) => (m.id === retryOf ? turn : m));
            return [...prev, { id: nextId.current++, role: 'user', text: question }, turn];
        });
        setInput('');
        setBusy(true);
        stickToBottom.current = true;
        stoppedRef.current = false;

        const controller = new AbortController();
        abortRef.current = controller;
        const timeout = setTimeout(() => controller.abort(), 75_000);

        try {
            await streamAnswer(question, token, controller.signal, {
                onDelta: (text) => updateAssistant(id, (m) => ({ text: m.text + text, status: 'streaming' })),
                onDone: (data) => updateAssistant(id, () => ({
                    text: typeof data.answer === 'string' ? data.answer : '',
                    status: 'done',
                    found: !!data.found,
                    sources: data.sources || [],
                })),
            });
        } catch (err: any) {
            if (stoppedRef.current) {
                updateAssistant(id, () => ({ status: 'stopped' }));
            } else {
                const error = err?.handled
                    ? err.message
                    : err?.name === 'AbortError'
                        ? 'That took too long to answer. Please try again.'
                        : "Couldn't reach SPARK. Check your connection and try again.";
                updateAssistant(id, () => ({ status: 'error', error }));
            }
        } finally {
            clearTimeout(timeout);
            if (abortRef.current === controller) abortRef.current = null;
            setBusy(false);
        }
    }, [busy, token]);

    const stop = () => {
        stoppedRef.current = true;
        abortRef.current?.abort();
    };

    const reset = () => {
        stop();
        setMessages([]);
        setInput('');
        inputRef.current?.focus();
    };

    if (hidden) return null;

    const empty = messages.length === 0;

    return (
        <>
            {/* Floating trigger */}
            <AnimatePresence>
                {!open && (
                    <motion.button
                        type="button"
                        onClick={() => setOpen(true)}
                        aria-label="Open AICTE Assistant"
                        title="AICTE Assistant"
                        className={`fixed right-4 ${hasBottomNav ? 'bottom-[calc(6.75rem+env(safe-area-inset-bottom))]' : 'bottom-[calc(1rem+env(safe-area-inset-bottom))]'} md:right-6 md:bottom-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#0d0d0f] text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] ring-1 ring-white/15`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.94 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    >
                        <Sparkles size={20} strokeWidth={2} />
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {open && (
                    <>
                        {/* Mobile backdrop */}
                        <motion.div
                            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px] md:hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setOpen(false)}
                        />

                        <motion.section
                            role="dialog"
                            aria-label="AICTE Assistant"
                            className="fixed inset-x-0 bottom-0 z-[61] flex h-[88dvh] flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#0d0d0f] text-zinc-100 shadow-[0_-12px_48px_rgba(0,0,0,0.5)] md:inset-x-auto md:right-6 md:bottom-6 md:h-[min(640px,calc(100dvh-3rem))] md:w-[400px] md:rounded-[24px] md:shadow-[0_24px_64px_rgba(0,0,0,0.45)]"
                            initial={{ opacity: 0, y: 24, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 24, scale: 0.98 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                            style={{ transformOrigin: 'bottom right' }}
                        >
                            {/* Mobile grab handle */}
                            <div className="flex justify-center pt-2.5 md:hidden" aria-hidden>
                                <span className="h-1 w-9 rounded-full bg-white/15" />
                            </div>

                            {/* Header */}
                            <header className="flex items-center gap-3 px-4 pb-3 pt-2.5 md:pt-4">
                                <AssistantAvatar busy={busy} />
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-[14.5px] font-semibold tracking-tight text-white">AICTE Assistant</h2>
                                    <p className="flex items-center gap-1.5 truncate text-[11.5px] text-zinc-500">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
                                        Grounded in official AICTE documents
                                    </p>
                                </div>
                                {!empty && (
                                    <button
                                        type="button"
                                        onClick={reset}
                                        aria-label="New conversation"
                                        title="New conversation"
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-white"
                                    >
                                        <RotateCcw size={15} strokeWidth={2} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    aria-label="Minimize AICTE Assistant"
                                    title="Minimize"
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-white"
                                >
                                    <Minus size={17} strokeWidth={2} />
                                </button>
                            </header>
                            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                            {/* Conversation */}
                            <div
                                ref={scrollRef}
                                onScroll={onScroll}
                                className="flex-1 overflow-y-auto overscroll-contain [scrollbar-color:#3f3f46_transparent] [scrollbar-width:thin]"
                            >
                                <div className="space-y-6 px-4 py-5" aria-live="polite">
                                    {empty && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.35 }}
                                            className="flex min-h-[calc(88dvh-15rem)] flex-col justify-end md:min-h-[400px]"
                                        >
                                            <div className="mb-auto pt-6 md:pt-10">
                                                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-b from-zinc-700 to-zinc-900 ring-1 ring-white/10">
                                                    <Sparkles size={20} className="text-white" />
                                                </div>
                                                <h3 className="text-[22px] font-semibold leading-tight tracking-tight text-white">
                                                    How can I help with<br />AICTE activity points?
                                                </h3>
                                                <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
                                                    Ask about requirements, eligible activities or deadlines. Every answer cites its source.
                                                </p>
                                            </div>
                                            <div className="mt-6 space-y-2">
                                                {SUGGESTIONS.map((s, i) => (
                                                    <motion.button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => ask(s)}
                                                        initial={{ opacity: 0, y: 6 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.08 + i * 0.05 }}
                                                        className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-left text-[13px] text-zinc-300 transition-colors hover:border-white/15 hover:bg-white/[0.06] hover:text-white"
                                                    >
                                                        {s}
                                                        <ArrowUp size={14} className="shrink-0 rotate-45 text-zinc-600 transition-colors group-hover:text-zinc-300" />
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}

                                    {messages.map((m) =>
                                        m.role === 'user' ? (
                                            <motion.div
                                                key={m.id}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="flex justify-end"
                                            >
                                                <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-[20px] rounded-br-md bg-[#26262b] px-4 py-2.5 text-[14px] leading-relaxed text-zinc-100">
                                                    {m.text}
                                                </p>
                                            </motion.div>
                                        ) : (
                                            <AssistantTurn
                                                key={m.id}
                                                message={m}
                                                onRetry={() => ask(m.question, m.id)}
                                                retryDisabled={busy}
                                            />
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Composer */}
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (busy) stop();
                                    else ask(input);
                                }}
                                className="px-3 pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:pb-2"
                            >
                                <div className="flex items-end gap-2 rounded-[22px] border border-white/10 bg-[#18181b] p-1.5 pl-4 transition-colors focus-within:border-white/20">
                                    <textarea
                                        ref={inputRef}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                                e.preventDefault();
                                                if (!busy) ask(input);
                                            }
                                        }}
                                        rows={1}
                                        maxLength={MAX_QUESTION_CHARS}
                                        placeholder="Ask about AICTE activity points…"
                                        aria-label="Your question"
                                        className="max-h-[132px] flex-1 resize-none bg-transparent py-2 text-base leading-snug text-zinc-100 caret-white placeholder:text-zinc-500 md:text-[14px]"
                                    />
                                    <motion.button
                                        type="submit"
                                        disabled={!busy && !input.trim()}
                                        aria-label={busy ? 'Stop answering' : 'Send question'}
                                        title={busy ? 'Stop' : 'Send'}
                                        whileTap={{ scale: 0.92 }}
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black transition-colors disabled:bg-white/10 disabled:text-zinc-500"
                                    >
                                        {busy ? <Square size={12} fill="currentColor" strokeWidth={0} /> : <ArrowUp size={18} strokeWidth={2.5} />}
                                    </motion.button>
                                </div>
                                <p className="mt-1.5 text-center text-[10.5px] text-zinc-600">
                                    AI can make mistakes. Verify with your coordinator.
                                </p>
                            </form>
                        </motion.section>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
