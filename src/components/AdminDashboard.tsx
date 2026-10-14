"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarClock, ClipboardCheck, Clock, MapPin, Plus, Radio, RefreshCw, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";
const EASE = [0.16, 1, 0.3, 1] as const;

const formatEventTime = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const day = s.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    const time = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
    return `${day} · ${time(s)} – ${time(e)}`;
};

const rise = (i: number, reduce: boolean | null) =>
    reduce
        ? {}
        : {
              initial: { opacity: 0, y: 12 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.5, ease: EASE, delay: 0.04 + i * 0.05 },
          };

function Bar({ label, value, total }: { label: string; value: number; total: number }) {
    const reduce = useReducedMotion();
    const percent = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div>
            <div className="mb-2 flex justify-between gap-3 text-sm">
                <span className="truncate font-semibold text-[#495057]">{label}</span>
                <span className="font-bold tabular-nums">{value}</span>
            </div>
            <div className="ui-well h-2 w-full overflow-hidden rounded-full">
                <motion.div
                    className="h-full rounded-full bg-[#1A1A1A]"
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
                />
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    const { token, profile } = useAuth();
    const reduce = useReducedMotion();
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const [pendingRes, allSubRes, evtRes] = await Promise.all([
                fetch("/api/admin/event-submissions?status=pending_review", { headers: { Authorization: `Bearer ${token}` } }),
                fetch("/api/admin/event-submissions?status=all", { headers: { Authorization: `Bearer ${token}` } }),
                fetch("/api/events?active_only=false", { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            if (!pendingRes.ok || !allSubRes.ok || !evtRes.ok) throw new Error("Request failed");
            const [p, a, e] = await Promise.all([pendingRes.json(), allSubRes.json(), evtRes.json()]);
            setSubmissions(Array.isArray(p) ? p : []);
            setAllSubmissions(Array.isArray(a) ? a : []);
            setEvents(Array.isArray(e) ? e : []);
        } catch (e) {
            console.error("Dashboard fetch error:", e);
            setError("Couldn't load the latest numbers.");
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
    const pending = submissions.length;
    const firstLoad = loading && events.length === 0 && allSubmissions.length === 0;

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

    const stats = [
        { label: "Live now", value: liveCount, icon: Radio },
        { label: "Upcoming", value: upcomingCount, icon: CalendarClock },
        { label: "Points this week", value: pointsThisWeek, icon: Sparkles },
    ];

    return (
        <div className="mx-auto min-h-screen max-w-md bg-[#F8F9FA] pb-28 font-sans text-[#1A1A1A] selection:bg-black selection:text-white md:max-w-5xl md:pb-16">
            {/* Header */}
            <header className="flex items-center justify-between px-6 pb-2 pt-10 md:px-8">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1A1A1A] text-base font-bold text-white">
                        {initial}
                    </div>
                    <p className="text-base font-semibold text-[#6C757D]">
                        Welcome back, <span className="font-black text-[#1A1A1A]">{firstName}</span>
                    </p>
                </div>

                <button
                    type="button"
                    onClick={fetchData}
                    aria-label="Refresh dashboard"
                    className={`ui-card flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:border-[#1A1A1A] ${FOCUS}`}
                >
                    <RefreshCw size={18} strokeWidth={2.25} className={loading ? "animate-spin" : ""} />
                </button>
            </header>

            {/* Intro */}
            <motion.section className="px-6 pb-8 pt-6 md:px-8" {...rise(0, reduce)}>
                <h1 className="text-4xl font-black leading-[1.05] tracking-tighter md:text-5xl" style={{ textWrap: "balance" }}>
                    Here&apos;s what needs your attention.
                </h1>
                <p className="mt-3 max-w-[60ch] text-[15px] font-medium leading-relaxed text-[#6C757D]">
                    Review photo proofs, run events, and track student participation.
                </p>
            </motion.section>

            {error && (
                <p role="alert" className="ui-card mx-6 mb-6 flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold md:mx-8">
                    {error}
                    <button type="button" onClick={fetchData} className={`rounded-lg font-bold underline ${FOCUS}`}>Retry</button>
                </p>
            )}

            {/* Queue + stats */}
            <section className="grid grid-cols-2 gap-4 px-6 md:grid-cols-4 md:px-8" aria-label="Overview">
                <motion.div className="col-span-2 md:col-span-1" {...rise(1, reduce)}>
                    <Link
                        href="/admin/queue"
                        className={`group flex h-full flex-col justify-between gap-6 rounded-2xl p-5 transition-colors ${FOCUS} ${
                            pending > 0 ? "bg-[#1A1A1A] text-white hover:bg-[#333333]" : "ui-card ui-card-hover"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <h2 className={`text-sm font-bold ${pending > 0 ? "text-white/70" : "text-[#6C757D]"}`}>Pending reviews</h2>
                            <ClipboardCheck size={18} strokeWidth={2.25} className={pending > 0 ? "text-white/70" : "text-[#6C757D]"} />
                        </div>
                        <div className="flex items-end justify-between">
                            <span className="text-4xl font-black tracking-tighter tabular-nums">{firstLoad ? "–" : pending}</span>
                            <span className="flex items-center gap-1 text-sm font-bold">
                                Review <ArrowRight size={15} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
                            </span>
                        </div>
                    </Link>
                </motion.div>

                {stats.map(({ label, value, icon: Icon }, i) => (
                    <motion.div
                        key={label}
                        className={`ui-card flex flex-col justify-between gap-6 rounded-2xl p-5 ${i === 2 ? "col-span-2 md:col-span-1" : ""}`}
                        {...rise(2 + i, reduce)}
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-[#6C757D]">{label}</h2>
                            <Icon size={18} strokeWidth={2.25} className="text-[#ADB5BD]" />
                        </div>
                        <span className="text-4xl font-black tracking-tighter tabular-nums">{firstLoad ? "–" : value}</span>
                    </motion.div>
                ))}
            </section>

            {/* Breakdown panels */}
            <section className="mt-4 grid grid-cols-1 gap-4 px-6 md:grid-cols-2 md:px-8">
                <motion.div className="ui-card rounded-2xl p-6" {...rise(5, reduce)}>
                    <h2 className="mb-5 text-base font-black tracking-tight">Submissions by department</h2>
                    {departments.length === 0 ? (
                        <p className="text-sm font-semibold text-[#6C757D]">No submissions yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {departments.map(([dept, count]) => (
                                <Bar key={dept} label={dept} value={count} total={maxDept} />
                            ))}
                        </div>
                    )}
                </motion.div>

                <motion.div className="ui-card rounded-2xl p-6" {...rise(6, reduce)}>
                    <h2 className="mb-5 text-base font-black tracking-tight">Submission status</h2>
                    {allSubmissions.length === 0 ? (
                        <p className="text-sm font-semibold text-[#6C757D]">No submissions yet.</p>
                    ) : (
                        <div className="space-y-4">
                            <Bar label="Verified" value={statusCounts.verified} total={allSubmissions.length} />
                            <Bar label="Pending review" value={statusCounts.pending} total={allSubmissions.length} />
                            <Bar label="Rejected" value={statusCounts.rejected} total={allSubmissions.length} />
                        </div>
                    )}
                </motion.div>
            </section>

            {/* Live & upcoming events */}
            <section className="mt-12 px-6 md:px-8">
                <div className="mb-5 flex items-end justify-between gap-4">
                    <h2 className="text-xl font-black tracking-tight">
                        Live &amp; upcoming
                        {liveCount > 0 && (
                            <span className="ml-2 inline-flex translate-y-[-2px] items-center gap-1.5 rounded-full bg-[#1A1A1A] px-2.5 py-1 align-middle text-xs font-bold text-white">
                                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                {liveCount} live
                            </span>
                        )}
                    </h2>
                    <div className="flex shrink-0 items-center gap-2">
                        <Link
                            href="/admin/events?new=1"
                            className={`flex items-center gap-1.5 rounded-xl bg-[#1A1A1A] px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-[#333333] ${FOCUS}`}
                        >
                            <Plus size={15} strokeWidth={2.5} /> New event
                        </Link>
                        <Link href="/admin/events" className={`hidden rounded-lg px-2 py-2 text-sm font-bold text-[#6C757D] transition-colors hover:text-[#1A1A1A] sm:block ${FOCUS}`}>
                            Manage
                        </Link>
                    </div>
                </div>

                {activeEvents.length === 0 ? (
                    <div className="ui-well flex flex-col items-center gap-2 rounded-2xl px-6 py-10 text-center">
                        <p className="text-lg font-black">No live or upcoming events</p>
                        <p className="text-sm font-medium text-[#6C757D]">Publish one so students can check in.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {activeEvents.map((event, i) => {
                            const total = Number(event.total_submissions || 0);
                            const verified = Number(event.verified_submissions || 0);
                            return (
                                <motion.article key={event.id} className="ui-card ui-card-hover flex flex-col gap-4 rounded-2xl p-6" {...rise(7 + i, reduce)}>
                                    <div className="flex items-center justify-between gap-3">
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                                event.is_ongoing ? "bg-[#1A1A1A] text-white" : "ui-well text-[#495057]"
                                            }`}
                                        >
                                            {event.is_ongoing ? "Happening now" : "Upcoming"}
                                        </span>
                                        <span className="text-sm font-black">+{event.points} pts</span>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-black leading-snug tracking-tight" style={{ textWrap: "balance" }}>{event.name}</h3>
                                        <p className="mt-1 text-sm font-semibold capitalize text-[#6C757D]">{event.category}</p>
                                    </div>

                                    <div className="flex flex-col gap-2 text-sm font-semibold text-[#495057]">
                                        <span className="flex items-start gap-2">
                                            <MapPin size={15} strokeWidth={2.25} className="mt-0.5 shrink-0" />
                                            {event.location_name}
                                        </span>
                                        <span className="flex items-start gap-2">
                                            <Clock size={15} strokeWidth={2.25} className="mt-0.5 shrink-0" />
                                            {formatEventTime(event.start_time, event.end_time)}
                                        </span>
                                    </div>

                                    <dl className="mt-auto grid grid-cols-2 divide-x divide-[#E9ECEF] rounded-xl border border-[#E9ECEF] py-3 text-center">
                                        <div>
                                            <dt className="text-xs font-semibold text-[#6C757D]">Check-ins</dt>
                                            <dd className="text-xl font-black tabular-nums">
                                                {total}
                                                {event.capacity ? <span className="text-xs font-bold text-[#ADB5BD]"> / {event.capacity}</span> : null}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs font-semibold text-[#6C757D]">Verified</dt>
                                            <dd className="text-xl font-black tabular-nums">{verified}</dd>
                                        </div>
                                    </dl>
                                </motion.article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
