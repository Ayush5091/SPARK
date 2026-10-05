'use client';

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, ChevronDown, FileText, MessageCircleQuestion, Minus, RotateCcw } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';

type Source = {
    ref: number;
    document: string;
    section: string | null;
    score: number;
    excerpt: string;
    cited: boolean;
};

type Message =
    | { id: number; role: 'user'; text: string }
    | { id: number; role: 'assistant'; text: string; found: boolean; sources: Source[] }
    | { id: number; role: 'error'; text: string; question: string };

const SUGGESTIONS = [
    'How many activity points do I need?',
    'Which activities earn points?',
    'How are activity points verified?',
];

const MAX_QUESTION_CHARS = 1000;

// Auth screens and full-screen flows where a floating button would get in the way.
const HIDDEN_ROUTES = [/^\/login/, /^\/register/, /^\/auth\//, /^\/events\/[^/]+\/camera/];

function errorMessage(status: number, detail?: string) {
    if (status === 429) return detail || 'Too many questions right now. Please try again in a moment.';
    if (status === 503) return "The AICTE knowledge base isn't set up yet. Please try again later.";
    if (status === 400 && detail) return detail;
    return detail || 'Something went wrong while answering. Please try again.';
}

/* ---------- Lightweight answer rendering (paragraphs, lists, tables, **bold**, [n] citations) ---------- */

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
                    className="mx-0.5 inline-flex h-4 min-w-4 -translate-y-px items-center justify-center rounded-full bg-black px-1 align-middle text-[9px] font-bold leading-none text-white hover:bg-gray-700"
                    aria-label={`Show source ${ref}`}
                >
                    {ref}
                </button>
            );
        }
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-bold text-black">{part.slice(2, -2)}</strong>;
        }
        return <Fragment key={i}>{part}</Fragment>;
    });
}

function AnswerText({ text, onCite }: { text: string; onCite: (ref: number) => void }) {
    const blocks = text.replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

    return (
        <div className="space-y-2">
            {blocks.map((block, i) => {
                const lines = block.split('\n');

                if (lines.every((l) => l.trim().startsWith('|'))) {
                    const rows = lines
                        .filter((l) => !/^\s*\|?[\s:|-]+\|?\s*$/.test(l))
                        .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
                    return (
                        <div key={i} className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                            <table className="w-full text-left text-xs">
                                <tbody>
                                    {rows.map((cells, r) => (
                                        <tr key={r} className={r === 0 ? 'bg-gray-50 font-bold text-black' : 'border-t border-gray-100'}>
                                            {cells.map((c, ci) => (
                                                <td key={ci} className="px-2.5 py-1.5 align-top">{renderInline(c, onCite)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                }

                if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
                    const ordered = /^\s*\d/.test(lines[0]);
                    const List = ordered ? 'ol' : 'ul';
                    return (
                        <List key={i} className={`space-y-1 pl-4 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-gray-400`}>
                            {lines.map((l, li) => (
                                <li key={li}>{renderInline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ''), onCite)}</li>
                            ))}
                        </List>
                    );
                }

                return (
                    <p key={i} className="whitespace-pre-line">
                        {renderInline(block.replace(/^#{1,6}\s+/gm, ''), onCite)}
                    </p>
                );
            })}
        </div>
    );
}

function SourceList({ sources, openRef, onToggle }: { sources: Source[]; openRef: number | null; onToggle: (ref: number) => void }) {
    const cited = sources.filter((s) => s.cited);
    const shown = cited.length ? cited : sources;
    if (!shown.length) return null;

    return (
        <div className="mt-3 border-t border-gray-100 pt-2.5">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Sources</p>
            <ul className="space-y-1.5">
                {shown.map((s) => {
                    const open = openRef === s.ref;
                    return (
                        <li key={s.ref}>
                            <button
                                type="button"
                                onClick={() => onToggle(s.ref)}
                                aria-expanded={open}
                                className="flex w-full items-start gap-2 rounded-xl bg-gray-50 px-2.5 py-2 text-left transition-colors hover:bg-gray-100"
                            >
                                <span className="mt-px inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[9px] font-bold text-white">
                                    {s.ref}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1 text-xs font-bold text-black">
                                        <FileText size={12} strokeWidth={2.5} className="shrink-0 text-gray-500" />
                                        <span className="truncate">{s.document.replace(/\.(md|markdown|txt)$/i, '')}</span>
                                    </span>
                                    {s.section && <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">{s.section}</span>}
                                </span>
                                <ChevronDown size={14} className={`mt-0.5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                            </button>
                            {open && (
                                <p className="mx-2.5 mt-1 whitespace-pre-line border-l-2 border-gray-200 pl-2.5 text-[11px] leading-relaxed text-gray-600">
                                    {s.excerpt}
                                </p>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function AssistantMessage({ message }: { message: Extract<Message, { role: 'assistant' }> }) {
    const [openRef, setOpenRef] = useState<number | null>(null);
    const toggle = useCallback((ref: number) => setOpenRef((cur) => (cur === ref ? null : ref)), []);

    return (
        <div className="max-w-[92%] rounded-2xl rounded-tl-md bg-white px-3.5 py-3 text-[13px] leading-relaxed text-gray-800 shadow-[2px_2px_6px_#d1d1d3]">
            <AnswerText text={message.text} onCite={(ref) => setOpenRef(ref)} />
            {message.found && <SourceList sources={message.sources} openRef={openRef} onToggle={toggle} />}
        </div>
    );
}

/* ---------- Main widget ---------- */

// hasBottomNav: the mobile bottom navigation is visible, so the trigger sits above it.
export default function AicteAssistant({ hasBottomNav }: { hasBottomNav: boolean }) {
    const pathname = usePathname();
    const { token, user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const nextId = useRef(0);
    const abortRef = useRef<AbortController | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const hidden = HIDDEN_ROUTES.some((r) => r.test(pathname || ''));

    useEffect(() => () => abortRef.current?.abort(), []);

    // Questions and the loading bubble scroll to the bottom; a new answer scrolls to its first line,
    // so long answers are read from the top rather than landing on the sources list.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const last = messages[messages.length - 1];
        const lastEl = el.lastElementChild as HTMLElement | null;
        if (!loading && last && last.role !== 'user' && lastEl && lastEl.offsetHeight > el.clientHeight - 24) {
            el.scrollTo({ top: lastEl.offsetTop - el.offsetTop - 12, behavior: 'smooth' });
        } else {
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, loading, open]);

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

    // Auto-grow the textarea up to ~4 lines.
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
    }, [input, open]);

    const ask = useCallback(async (raw: string, replaceErrorId?: number) => {
        const question = raw.trim().slice(0, MAX_QUESTION_CHARS);
        if (!question || loading) return;

        setMessages((prev) => {
            const base = replaceErrorId === undefined ? prev : prev.filter((m) => m.id !== replaceErrorId);
            return replaceErrorId === undefined ? [...base, { id: nextId.current++, role: 'user', text: question }] : base;
        });
        setInput('');
        setLoading(true);

        const controller = new AbortController();
        abortRef.current = controller;
        const timeout = setTimeout(() => controller.abort(), 60_000);

        try {
            const res = await fetch('/api/rag/ask', {
                method: 'POST',
                // Public endpoint; the token is optional and only gives a logged-in user their own rate-limit quota.
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ question }),
                signal: controller.signal,
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || typeof data?.answer !== 'string') {
                throw Object.assign(new Error(errorMessage(res.status, data?.detail)), { handled: true });
            }
            setMessages((prev) => [
                ...prev,
                { id: nextId.current++, role: 'assistant', text: data.answer, found: !!data.found, sources: data.sources || [] },
            ]);
        } catch (err: any) {
            const text = err?.handled
                ? err.message
                : err?.name === 'AbortError'
                    ? 'That took too long to answer. Please try again.'
                    : "Couldn't reach SPARK. Check your connection and try again.";
            setMessages((prev) => [...prev, { id: nextId.current++, role: 'error', text, question }]);
        } finally {
            clearTimeout(timeout);
            if (abortRef.current === controller) abortRef.current = null;
            setLoading(false);
        }
    }, [loading, token]);

    const reset = () => {
        abortRef.current?.abort();
        setMessages([]);
        setInput('');
        setLoading(false);
        inputRef.current?.focus();
    };

    if (hidden) return null;

    const shell = isAdmin
        ? 'bg-white border border-gray-200 rounded-t-xl md:rounded-xl'
        : 'bg-[#F0F0F3] rounded-t-3xl md:rounded-3xl';

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
                        className={`fixed right-4 ${hasBottomNav ? 'bottom-[calc(6.75rem+env(safe-area-inset-bottom))]' : 'bottom-[calc(1rem+env(safe-area-inset-bottom))]'} md:right-6 md:bottom-6 z-40 flex h-12 w-12 items-center justify-center bg-black text-white ${
                            isAdmin ? 'rounded-xl shadow-lg' : 'rounded-full shadow-[4px_6px_14px_rgba(0,0,0,0.25)]'
                        }`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.94 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    >
                        <MessageCircleQuestion size={22} strokeWidth={2.25} />
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {open && (
                    <>
                        {/* Mobile backdrop */}
                        <motion.div
                            className="fixed inset-0 z-[60] bg-black/30 md:hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setOpen(false)}
                        />

                        <motion.section
                            role="dialog"
                            aria-label="AICTE Assistant"
                            className={`fixed inset-x-0 bottom-0 z-[61] flex h-[85dvh] flex-col overflow-hidden shadow-[0_-8px_30px_rgba(0,0,0,0.15)] md:inset-x-auto md:right-6 md:bottom-6 md:h-[min(600px,calc(100dvh-3rem))] md:w-[380px] md:shadow-[8px_8px_30px_rgba(0,0,0,0.12)] ${shell}`}
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 24 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                        >
                            {/* Header */}
                            <header className={`flex items-center gap-3 px-4 py-3 ${isAdmin ? 'border-b border-gray-200' : 'border-b border-gray-200/60'}`}>
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center bg-black text-white ${isAdmin ? 'rounded-md' : 'rounded-xl shadow-[2px_2px_6px_#d1d1d3]'}`}>
                                    <MessageCircleQuestion size={18} strokeWidth={2.5} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-sm font-black tracking-wide text-black">AICTE Assistant</h2>
                                    <p className="truncate text-[11px] font-medium text-gray-500">Answers from official AICTE documents</p>
                                </div>
                                {messages.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={reset}
                                        aria-label="New conversation"
                                        title="New conversation"
                                        className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/5 hover:text-black"
                                    >
                                        <RotateCcw size={16} strokeWidth={2.5} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    aria-label="Minimize AICTE Assistant"
                                    title="Minimize"
                                    className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/5 hover:text-black"
                                >
                                    <Minus size={18} strokeWidth={2.5} />
                                </button>
                            </header>

                            {/* Conversation */}
                            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
                                {messages.length === 0 && (
                                    <div className="pt-2">
                                        <p className="text-[13px] leading-relaxed text-gray-600">
                                            Ask about AICTE activity point rules, categories and requirements. Answers cite the document they come from.
                                        </p>
                                        <div className="mt-4 flex flex-col items-start gap-2">
                                            {SUGGESTIONS.map((s) => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => ask(s)}
                                                    className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-left text-xs font-semibold text-gray-700 transition-colors hover:border-black hover:text-black"
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {messages.map((m) =>
                                    m.role === 'user' ? (
                                        <div key={m.id} className="flex justify-end">
                                            <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-black px-3.5 py-2.5 text-[13px] leading-relaxed text-white">
                                                {m.text}
                                            </p>
                                        </div>
                                    ) : m.role === 'assistant' ? (
                                        <AssistantMessage key={m.id} message={m} />
                                    ) : (
                                        <div key={m.id} className="max-w-[92%] rounded-2xl rounded-tl-md border border-red-100 bg-red-50 px-3.5 py-3 text-[13px] leading-relaxed text-red-700">
                                            <p>{m.text}</p>
                                            <button
                                                type="button"
                                                onClick={() => ask(m.question, m.id)}
                                                disabled={loading}
                                                className="mt-2 text-xs font-bold uppercase tracking-wider text-red-700 underline-offset-2 hover:underline disabled:opacity-50"
                                            >
                                                Try again
                                            </button>
                                        </div>
                                    )
                                )}

                                {loading && (
                                    <div className="flex w-fit items-center gap-2 rounded-2xl rounded-tl-md bg-white px-3.5 py-3 shadow-[2px_2px_6px_#d1d1d3]" aria-label="Searching AICTE documents">
                                        <span className="flex gap-1">
                                            {[0, 1, 2].map((d) => (
                                                <motion.span
                                                    key={d}
                                                    className="h-1.5 w-1.5 rounded-full bg-gray-400"
                                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                                    transition={{ duration: 1, repeat: Infinity, delay: d * 0.18 }}
                                                />
                                            ))}
                                        </span>
                                        <span className="text-xs font-medium text-gray-500">Searching AICTE documents…</span>
                                    </div>
                                )}
                            </div>

                            {/* Composer */}
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    ask(input);
                                }}
                                className={`px-3 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3 ${isAdmin ? 'border-t border-gray-200' : ''}`}
                            >
                                <div className={`flex items-end gap-2 bg-white p-1.5 pl-3.5 ${isAdmin ? 'rounded-lg border border-gray-200' : 'rounded-3xl shadow-[inset_2px_2px_5px_#d1d1d3,inset_-2px_-2px_5px_#ffffff]'}`}>
                                    <textarea
                                        ref={inputRef}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                                e.preventDefault();
                                                ask(input);
                                            }
                                        }}
                                        rows={1}
                                        maxLength={MAX_QUESTION_CHARS}
                                        placeholder="Ask an AICTE question…"
                                        aria-label="Your question"
                                        className="max-h-28 flex-1 resize-none bg-transparent py-2 text-base leading-snug text-black placeholder:text-gray-400 md:text-sm"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || loading}
                                        aria-label="Send question"
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white transition-opacity disabled:opacity-25"
                                    >
                                        <ArrowUp size={18} strokeWidth={2.75} />
                                    </button>
                                </div>
                            </form>
                        </motion.section>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
