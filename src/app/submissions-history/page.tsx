"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Every check-in and logged activity with its outcome, newest first. Points come from
// event submissions; the older request/proof flow never credited points.
interface HistoryItem {
    id: number;
    event_name: string;
    category: string;
    status: 'pending_review' | 'verified' | 'rejected';
    points_awarded: number | null;
    submitted_at: string | null;
    reviewed_at: string | null;
    review_notes: string | null;
    auto_verified: boolean;
    is_personal?: boolean;
    evidence_url?: string | null;
    evidence_filename?: string | null;
}

const STATUS = {
    pending_review: { text: 'In review', dot: 'bg-gray-400', color: 'text-gray-600' },
    verified: { text: 'Verified', dot: 'bg-green-600', color: 'text-green-700' },
    rejected: { text: 'Rejected', dot: 'bg-red-600', color: 'text-red-700' },
} as const;

export default function SubmissionsHistoryScreen() {
    const { token, user } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user?.role === 'admin') {
            router.replace('/');
            return;
        }
        if (!token) return;

        const load = async () => {
            try {
                const res = await fetch('/api/event-submissions', { headers: { Authorization: `Bearer ${token}` } });
                if (!res.ok) throw new Error();
                const data = await res.json();
                setItems(Array.isArray(data) ? data : []);
            } catch {
                setError('Could not load your history. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [token, user, router]);

    const sorted = useMemo(
        () =>
            [...items].sort(
                (a, b) =>
                    new Date(b.reviewed_at || b.submitted_at || 0).getTime() -
                    new Date(a.reviewed_at || a.submitted_at || 0).getTime()
            ),
        [items]
    );
    const earned = items.filter((i) => i.status === 'verified').reduce((sum, i) => sum + Number(i.points_awarded || 0), 0);

    if (user?.role === 'admin') {
        return null;
    }

    return (
        <div className="max-w-md md:max-w-5xl mx-auto min-h-screen bg-[#F8F9FA] font-sans relative pb-24 md:pb-12 overflow-hidden text-black selection:bg-black selection:text-white flex flex-col">
            <header className="flex flex-col px-6 pt-10 pb-4 gap-6">
                <Link
                    href="/"
                    aria-label="Back to home"
                    className="flex items-center justify-center w-12 h-12 rounded-full text-black ui-card active:bg-[#E9ECEF] transition-all"
                >
                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                </Link>

                <div className="flex items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-black">History</h1>
                        <p className="text-gray-500 font-medium text-sm mt-1">Every check-in and logged activity, and what it earned.</p>
                    </div>
                    <div className="shrink-0 rounded-2xl px-4 py-3 text-right ui-well">
                        <p className="text-xs font-bold text-gray-500">Earned</p>
                        <p className="text-2xl font-black tracking-tight">{earned} pts</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 px-6 py-4 pb-28">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Loading history...
                    </div>
                ) : error ? (
                    <p role="alert"className="rounded-2xl p-6 text-center text-sm font-bold text-red-700 ui-well">{error}</p>
                ) : sorted.length === 0 ? (
                    <div className="rounded-2xl p-10 text-center ui-well">
                        <p className="text-lg font-black">Nothing here yet</p>
                        <p className="mt-1 text-sm font-medium text-gray-500">Check in at a live event or log an activity to get started.</p>
                        <Link href="/events?new=1"className="mt-4 inline-block rounded-2xl px-5 py-3 text-sm font-bold ui-card">
                            Log an activity
                        </Link>
                    </div>
                ) : (
                    <ol className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {sorted.map((item) => {
                            const status = STATUS[item.status] ?? STATUS.pending_review;
                            const when = item.reviewed_at || item.submitted_at;
                            return (
                                <li
                                    key={item.id}
                                    className="rounded-2xl p-6 ui-card flex flex-col gap-4"
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0">
                                            <h3 className="text-lg font-black tracking-tight leading-tight">{item.event_name}</h3>
                                            <p className="mt-1 text-xs font-semibold capitalize text-gray-500">
                                                {item.category}
                                                {item.is_personal ? ' · Logged by you' : item.auto_verified ? ' · Auto-verified' : ''}
                                                {when ? ` · ${new Date(when).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-black px-3 py-1.5 text-xs font-bold text-white shrink-0">
                                            {item.status === 'verified' ? `+${item.points_awarded ?? 0} pts` : '—'}
                                        </span>
                                    </div>

                                    {item.status === 'rejected' && item.review_notes && (
                                        <p className="rounded-2xl p-3 text-xs font-semibold text-gray-700 ui-well">
                                            Reason: {item.review_notes}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between gap-3 pt-1">
                                        <span className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider ${status.color}`}>
                                            <span className={`h-2.5 w-2.5 rounded-full ${status.dot}`} />
                                            {status.text}
                                        </span>
                                        {item.evidence_url && (
                                            <a href={item.evidence_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-black">
                                                <span className="material-icons-outlined text-sm">attach_file</span>
                                                Proof
                                            </a>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </main>
        </div>
    );
}
