"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock, MapPin, Plus, ClipboardCheck, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";

// Same neumorphic surface tokens as StudentHomeDashboard
const RAISED = "bg-[#F0F0F3] shadow-[8px_8px_16px_#d1d1d3,-8px_-8px_16px_#ffffff]";
const INSET = "bg-[#F0F0F3] shadow-[inset_6px_6px_12px_#d1d1d3,inset_-6px_-6px_12px_#ffffff]";
const TRACK = "bg-[#e0e0e3] shadow-[inset_3px_3px_6px_#d1d1d3,inset_-3px_-3px_6px_#ffffff]";
const LABEL = "text-xs font-bold tracking-widest text-gray-500 uppercase leading-relaxed";

const formatEventTime = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const day = s.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const time = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
    return `${day} · ${time(s)} – ${time(e)}`;
};

function Bar({ label, value, total }: { label: string; value: number; total: number }) {
    const percent = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div>
            <div className="flex justify-between text-xs font-bold text-black mb-2 uppercase tracking-wider">
                <span className="truncate pr-3">{label}</span>
                <span>{value}</span>
            </div>
            <div className={`w-full h-4 rounded-full overflow-hidden p-1 ${TRACK}`}>
                <div
                    className="h-full rounded-full bg-black transition-all duration-1000 ease-out"
                    style={{ width: `${percent}%` }}
                ></div>
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    const { token, profile } = useAuth();
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [pendingRes, allSubRes, evtRes] = await Promise.all([
                fetch("/api/admin/event-submissions?status=pending_review", { headers: { Authorization: `Bearer ${token}` } }),
                fetch("/api/admin/event-submissions?status=all", { headers: { Authorization: `Bearer ${token}` } }),
                fetch("/api/events?active_only=false", { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            if (pendingRes.ok) { const d = await pendingRes.json(); setSubmissions(Array.isArray(d) ? d : []); }
            if (allSubRes.ok) { const d = await allSubRes.json(); setAllSubmissions(Array.isArray(d) ? d : []); }
            if (evtRes.ok) { const d = await evtRes.json(); setEvents(Array.isArray(d) ? d : []); }
        } catch (e) {
            console.error("Dashboard fetch error:", e);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const firstName = (profile?.name || "Admin").split(" ")[0];
    const initial = firstName.charAt(0).toUpperCase();

    // Live first, then upcoming by start time (API already orders by start_time)
    const activeEvents = useMemo(
        () => [...events.filter(e => e.is_ongoing), ...events.filter(e => e.is_upcoming)],
        [events]
    );
    const liveCount = events.filter(e => e.is_ongoing).length;
    const upcomingCount = events.filter(e => e.is_upcoming).length;

    const pointsThisWeek = useMemo(() => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return allSubmissions
            .filter(s => s.status === "verified" && new Date(s.submitted_at) >= weekAgo)
            .reduce((sum, s) => sum + Number(s.points_awarded || 0), 0);
    }, [allSubmissions]);

    const departments = useMemo(() => {
        const counts = new Map<string, number>();
        allSubmissions.forEach(s => {
            const dept = (s.student_department || "Unassigned").trim() || "Unassigned";
            counts.set(dept, (counts.get(dept) || 0) + 1);
        });
        return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    }, [allSubmissions]);
    const maxDept = departments[0]?.[1] || 0;

    const statusCounts = useMemo(() => ({
        verified: allSubmissions.filter(s => s.status === "verified").length,
        pending: allSubmissions.filter(s => s.status === "pending_review").length,
        rejected: allSubmissions.filter(s => s.status === "rejected").length,
    }), [allSubmissions]);

    return (
        <div className="max-w-md md:max-w-5xl mx-auto min-h-screen bg-[#F0F0F3] font-sans relative pb-24 md:pb-12 overflow-hidden text-black selection:bg-black selection:text-white">
            {/* 1. Header */}
            <header className="flex items-center justify-between px-6 pt-10 pb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center text-lg font-bold shadow-[4px_4px_10px_#d1d1d3,-4px_-4px_10px_#ffffff]">
                        {initial}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                            Admin Dashboard
                        </span>
                        <span className="text-lg font-black tracking-tight text-black">
                            Welcome back, {firstName}.
                        </span>
                    </div>
                </div>

                <button
                    onClick={fetchData}
                    aria-label="Refresh dashboard"
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-[#F0F0F3] text-black shadow-[6px_6px_12px_#d1d1d3,-6px_-6px_12px_#ffffff] transition-all active:shadow-[inset_4px_4px_8px_#d1d1d3,inset_-4px_-4px_8px_#ffffff]"
                >
                    <RefreshCw size={20} strokeWidth={2.5} className={loading ? "animate-spin" : ""} />
                </button>
            </header>

            {/* 2. Hero */}
            <section className="px-6 pt-4 pb-8">
                <h1 className="text-4xl font-black leading-tight tracking-tighter text-black mb-3">
                    Here&apos;s what needs your attention.
                </h1>
                <p className="text-gray-500 font-medium text-sm pr-4">
                    Review photo proofs, run events, and track student participation.
                </p>
            </section>

            {loading && events.length === 0 ? (
                <section className="px-6">
                    <div className={`w-full rounded-3xl p-6 text-center ${INSET}`}>
                        <p className="text-gray-500 font-bold text-sm uppercase tracking-wider">Loading dashboard…</p>
                    </div>
                </section>
            ) : (
                <>
                    {/* 3. Stat cards */}
                    <section className="px-6 grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
                        <Link
                            href="/admin/queue"
                            className={`col-span-2 md:col-span-1 rounded-3xl p-6 flex flex-col justify-between aspect-[2/1] md:aspect-square transition-transform active:scale-[0.98] ${submissions.length > 0 ? "bg-black text-white shadow-[8px_8px_16px_#d1d1d3,-8px_-8px_16px_#ffffff]" : RAISED}`}
                        >
                            <h2 className={`text-xs font-bold tracking-widest uppercase leading-relaxed ${submissions.length > 0 ? "text-gray-300" : "text-gray-500"}`}>
                                Pending <br /> Reviews
                            </h2>
                            <div className="flex items-end justify-between">
                                <span className="text-5xl font-black tracking-tighter">{submissions.length}</span>
                                <span className="text-sm font-bold">Review →</span>
                            </div>
                        </Link>

                        <div className={`col-span-1 rounded-3xl p-6 flex flex-col justify-between aspect-square ${RAISED}`}>
                            <h2 className={LABEL}>Live <br /> Now</h2>
                            <span className="text-5xl font-black text-black tracking-tighter mt-2">{liveCount}</span>
                        </div>

                        <div className={`col-span-1 rounded-3xl p-6 flex flex-col justify-between aspect-square ${RAISED}`}>
                            <h2 className={LABEL}>Upcoming <br /> Events</h2>
                            <span className="text-5xl font-black text-black tracking-tighter mt-2">{upcomingCount}</span>
                        </div>

                        <div className={`col-span-2 md:col-span-1 rounded-3xl p-6 flex flex-col justify-between aspect-[2/1] md:aspect-square ${RAISED}`}>
                            <h2 className={LABEL}>Points <br /> This Week</h2>
                            <span className="text-5xl font-black text-black tracking-tighter mt-2">{pointsThisWeek}</span>
                        </div>
                    </section>

                    {/* 4. Quick actions */}
                    <section className="px-6 grid grid-cols-2 gap-5 mb-10">
                        <Link
                            href="/admin/events?new=1"
                            className="flex items-center justify-center gap-2 rounded-2xl bg-black text-white text-sm font-bold py-4 transition-transform active:scale-[0.98]"
                        >
                            <Plus size={18} strokeWidth={2.5} /> Create Event
                        </Link>
                        <Link
                            href="/admin/queue"
                            className={`flex items-center justify-center gap-2 rounded-2xl text-black text-sm font-bold py-4 transition-all active:shadow-[inset_4px_4px_8px_#d1d1d3,inset_-4px_-4px_8px_#ffffff] ${RAISED}`}
                        >
                            <ClipboardCheck size={18} strokeWidth={2.5} /> Review Queue
                        </Link>
                    </section>

                    {/* 5. Breakdown panels */}
                    <section className="px-6 grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                        <div className={`rounded-3xl p-6 ${RAISED}`}>
                            <h2 className={`${LABEL} mb-6`}>Submissions by Department</h2>
                            {departments.length === 0 ? (
                                <p className="text-sm font-semibold text-gray-500">No submissions yet.</p>
                            ) : (
                                <div className="space-y-5">
                                    {departments.map(([dept, count]) => (
                                        <Bar key={dept} label={dept} value={count} total={maxDept} />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className={`rounded-3xl p-6 ${RAISED}`}>
                            <h2 className={`${LABEL} mb-6`}>Submission Status</h2>
                            {allSubmissions.length === 0 ? (
                                <p className="text-sm font-semibold text-gray-500">No submissions yet.</p>
                            ) : (
                                <div className="space-y-5">
                                    <Bar label="Verified" value={statusCounts.verified} total={allSubmissions.length} />
                                    <Bar label="Pending Review" value={statusCounts.pending} total={allSubmissions.length} />
                                    <Bar label="Rejected" value={statusCounts.rejected} total={allSubmissions.length} />
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 6. Live & upcoming events */}
                    <section className="px-6 mb-10">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className={LABEL}>Live &amp; Upcoming Events</h2>
                            <Link href="/admin/events" className="text-sm font-bold text-gray-500 hover:text-black transition-colors">
                                Manage →
                            </Link>
                        </div>

                        {activeEvents.length === 0 ? (
                            <div className={`w-full rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-4 border border-gray-100/50 ${INSET}`}>
                                <p className="text-black font-bold text-lg">No active events right now.</p>
                                <Link href="/admin/events?new=1" className="text-sm font-bold text-gray-500 hover:text-black transition-colors flex items-center gap-2">
                                    Create an Event <span className="text-lg">→</span>
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {activeEvents.map(event => {
                                    const total = Number(event.total_submissions || 0);
                                    const verified = Number(event.verified_submissions || 0);
                                    return (
                                        <div key={event.id} className={`rounded-3xl p-6 flex flex-col gap-4 ${RAISED}`}>
                                            <div className="flex items-center justify-between gap-3">
                                                <span
                                                    className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                                                        event.is_ongoing ? "bg-black text-white" : "bg-[#e0e0e3] text-gray-600"
                                                    }`}
                                                >
                                                    {event.is_ongoing ? "Happening Now" : "Upcoming"}
                                                </span>
                                                <span className="text-sm font-black text-black">+{event.points} pts</span>
                                            </div>

                                            <div>
                                                <h3 className="text-lg font-black leading-snug tracking-tight text-black">{event.name}</h3>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">{event.category}</p>
                                            </div>

                                            <div className="flex flex-col gap-1.5 text-xs font-semibold text-gray-600">
                                                <span className="flex items-start gap-2">
                                                    <MapPin size={14} strokeWidth={2.5} className="shrink-0 mt-px" />
                                                    {event.location_name}
                                                </span>
                                                <span className="flex items-center gap-2">
                                                    <Clock size={14} strokeWidth={2.5} className="shrink-0" />
                                                    {formatEventTime(event.start_time, event.end_time)}
                                                </span>
                                            </div>

                                            <div className={`grid grid-cols-2 rounded-2xl py-3 text-center ${INSET}`}>
                                                <div>
                                                    <p className="text-xl font-black text-black">
                                                        {total}{event.capacity ? <span className="text-xs font-bold text-gray-400"> / {event.capacity}</span> : null}
                                                    </p>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Check-ins</p>
                                                </div>
                                                <div>
                                                    <p className="text-xl font-black text-black">{verified}</p>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Verified</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
