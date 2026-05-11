"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

interface Props {
    submissions: any[];
    events: any[];
    allSubmissions: any[];
}

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.92 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

function AnimatedCounter({ value }: { value: number }) {
    return (
        <motion.span
            key={value}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
            {value}
        </motion.span>
    );
}

export default function AdminOverviewTab({ submissions, events, allSubmissions }: Props) {
    const activeEvents = events.filter(e => e.is_ongoing || e.is_upcoming).length;
    const liveEvents = events.filter(e => e.is_ongoing).length;

    const deptBreakdown = useMemo(() => {
        const map: Record<string, number> = {};
        allSubmissions.forEach(s => {
            const dept = s.student_department || "Unknown";
            map[dept] = (map[dept] || 0) + 1;
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
    }, [allSubmissions]);

    const maxDeptCount = Math.max(1, ...deptBreakdown.map(d => d[1]));

    const approvedThisWeek = useMemo(() => {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        return allSubmissions.filter(s => s.status === "verified" && new Date(s.submitted_at) >= weekAgo);
    }, [allSubmissions]);

    const pointsThisWeek = approvedThisWeek.reduce((sum, s) => sum + Number(s.points_awarded || 0), 0);

    const topStudents = useMemo(() => {
        const map: Record<string, { name: string; dept: string; points: number }> = {};
        allSubmissions.filter(s => s.status === "verified").forEach(s => {
            if (!map[s.student_id]) map[s.student_id] = { name: s.student_name, dept: s.student_department || "", points: 0 };
            map[s.student_id].points += Number(s.points_awarded || 0);
        });
        return Object.values(map).sort((a, b) => b.points - a.points).slice(0, 5);
    }, [allSubmissions]);

    const upcomingEvents = events.filter(e => e.is_upcoming).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()).slice(0, 5);

    const statCards = [
        { label: "Pending Reviews", value: submissions.length, accent: "oklch(0.5 0.15 250)", icon: "pending_actions" },
        { label: "Active Events", value: activeEvents, accent: "oklch(0.45 0.18 160)", icon: "event_available" },
        { label: "Live Now", value: liveEvents, accent: "oklch(0.5 0.18 25)", icon: "sensors" },
        { label: "Points This Week", value: pointsThisWeek, accent: "oklch(0.5 0.15 300)", icon: "trending_up" },
    ];

    return (
        <motion.div className="space-y-8" variants={container} initial="hidden" animate="show">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card, i) => (
                    <motion.div
                        key={card.label}
                        variants={fadeUp}
                        whileHover={{ y: -4, boxShadow: "0 12px 32px oklch(0.7 0.02 250 / 0.12)" }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="p-5 cursor-default"
                        style={{ borderRadius: "20px", backgroundColor: "oklch(0.99 0.005 250)", border: "1px solid oklch(0.93 0.008 250)" }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.55 0.01 250)" }}>{card.label}</p>
                            <motion.span
                                className="material-symbols-outlined text-xl"
                                style={{ color: card.accent }}
                                animate={{ rotate: [0, -6, 6, 0] }}
                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 + i * 0.5, ease: "easeInOut" }}
                            >
                                {card.icon}
                            </motion.span>
                        </div>
                        <p className="text-3xl font-bold" style={{ color: card.accent }}>
                            <AnimatedCounter value={card.value} />
                        </p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Department Breakdown */}
                <motion.div variants={scaleIn} className="p-6" style={{ borderRadius: "20px", backgroundColor: "oklch(0.99 0.005 250)", border: "1px solid oklch(0.93 0.008 250)" }}>
                    <p className="text-sm font-semibold mb-5" style={{ color: "oklch(0.25 0.015 250)" }}>Submissions by Department</p>
                    <div className="space-y-3">
                        {deptBreakdown.length === 0 && <p className="text-sm" style={{ color: "oklch(0.55 0.01 250)" }}>No data yet.</p>}
                        {deptBreakdown.map(([dept, count], i) => (
                            <motion.div
                                key={dept}
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <div className="flex justify-between text-xs mb-1">
                                    <span style={{ color: "oklch(0.35 0.01 250)" }}>{dept}</span>
                                    <span className="font-semibold" style={{ color: "oklch(0.3 0.015 250)" }}>{count}</span>
                                </div>
                                <div className="h-2.5 overflow-hidden" style={{ borderRadius: "6px", backgroundColor: "oklch(0.94 0.008 250)" }}>
                                    <motion.div
                                        className="h-full"
                                        style={{ borderRadius: "6px", backgroundColor: "oklch(0.5 0.15 250)" }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(count / maxDeptCount) * 100}%` }}
                                        transition={{ delay: 0.5 + i * 0.08, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Top Students */}
                <motion.div variants={scaleIn} className="p-6" style={{ borderRadius: "20px", backgroundColor: "oklch(0.99 0.005 250)", border: "1px solid oklch(0.93 0.008 250)" }}>
                    <p className="text-sm font-semibold mb-5" style={{ color: "oklch(0.25 0.015 250)" }}>Top Earners</p>
                    <div className="space-y-1">
                        {topStudents.length === 0 && <p className="text-sm" style={{ color: "oklch(0.55 0.01 250)" }}>No approved submissions yet.</p>}
                        {topStudents.map((student, i) => (
                            <motion.div
                                key={student.name + i}
                                className="flex items-center justify-between py-2.5 px-3 rounded-xl"
                                initial={{ opacity: 0, x: 16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                whileHover={{ backgroundColor: "oklch(0.97 0.008 250)" }}
                                style={{ borderBottom: i < topStudents.length - 1 ? "1px solid oklch(0.95 0.005 250)" : "none" }}
                            >
                                <div className="flex items-center gap-3">
                                    <motion.div
                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold"
                                        style={{
                                            backgroundColor: i === 0 ? "oklch(0.85 0.1 85)" : i === 1 ? "oklch(0.88 0.03 250)" : i === 2 ? "oklch(0.82 0.08 55)" : "oklch(0.94 0.005 250)",
                                            color: i === 0 ? "oklch(0.35 0.1 85)" : i === 1 ? "oklch(0.4 0.03 250)" : i === 2 ? "oklch(0.35 0.08 55)" : "oklch(0.5 0.01 250)",
                                        }}
                                        whileHover={{ scale: 1.15 }}
                                    >
                                        {i + 1}
                                    </motion.div>
                                    <div>
                                        <p className="text-sm font-semibold" style={{ color: "oklch(0.2 0.015 250)" }}>{student.name}</p>
                                        <p className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>{student.dept}</p>
                                    </div>
                                </div>
                                <span className="text-sm font-bold" style={{ color: "oklch(0.45 0.18 160)" }}>{student.points} pts</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Upcoming Timeline */}
            <motion.div variants={fadeUp} className="p-6" style={{ borderRadius: "20px", backgroundColor: "oklch(0.99 0.005 250)", border: "1px solid oklch(0.93 0.008 250)" }}>
                <p className="text-sm font-semibold mb-5" style={{ color: "oklch(0.25 0.015 250)" }}>Upcoming Events</p>
                {upcomingEvents.length === 0 ? (
                    <p className="text-sm" style={{ color: "oklch(0.55 0.01 250)" }}>No upcoming events.</p>
                ) : (
                    <div className="space-y-0">
                        {upcomingEvents.map((event, i) => (
                            <motion.div
                                key={event.id}
                                className="flex items-start gap-4"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + i * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <div className="flex flex-col items-center">
                                    <motion.div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: "oklch(0.5 0.15 250)" }}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.5 + i * 0.1, type: "spring", stiffness: 500, damping: 20 }}
                                    />
                                    {i < upcomingEvents.length - 1 && (
                                        <motion.div
                                            className="w-0.5 flex-1 min-h-[32px]"
                                            style={{ backgroundColor: "oklch(0.92 0.008 250)" }}
                                            initial={{ scaleY: 0, originY: 0 }}
                                            animate={{ scaleY: 1 }}
                                            transition={{ delay: 0.6 + i * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                        />
                                    )}
                                </div>
                                <div className="flex-1 pb-4">
                                    <p className="text-sm font-semibold" style={{ color: "oklch(0.2 0.015 250)" }}>{event.name}</p>
                                    <p className="text-xs mt-0.5" style={{ color: "oklch(0.5 0.01 250)" }}>
                                        {new Date(event.start_time).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} at{" "}
                                        {new Date(event.start_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                        {" · "}{event.location_name}{" · "}{event.points} pts
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
