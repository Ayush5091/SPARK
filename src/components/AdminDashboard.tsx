"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { motion } from "framer-motion";
import AdminOverviewTab from "./AdminOverviewTab";

export default function AdminDashboard() {
    const { token } = useAuth();
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
        } catch (e) { console.error("Dashboard fetch error:", e); }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    return (
        <div className="min-h-screen px-6 lg:px-10 py-8" style={{ backgroundColor: "oklch(0.96 0.005 250)" }}>
            <div className="max-w-7xl mx-auto">
                <motion.div
                    className="mb-8"
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                    <h1 className="text-2xl font-bold" style={{ color: "oklch(0.15 0.015 250)" }}>Overview</h1>
                    <p className="text-sm mt-1" style={{ color: "oklch(0.5 0.01 250)" }}>Analytics, trends, and quick status at a glance.</p>
                </motion.div>

                {loading ? (
                    <motion.div
                        className="flex items-center justify-center py-20"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <motion.span
                            className="material-symbols-outlined text-4xl"
                            style={{ color: "oklch(0.5 0.12 250)" }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                        >
                            progress_activity
                        </motion.span>
                    </motion.div>
                ) : (
                    <AdminOverviewTab submissions={submissions} events={events} allSubmissions={allSubmissions} />
                )}
            </div>
        </div>
    );
}
