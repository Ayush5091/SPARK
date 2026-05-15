"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

interface Props {
    submissions: any[];
    events: any[];
    selectedIds: Set<number>;
    onToggleSelect: (id: number) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onReviewItem: (item: any) => void;
    statusFilter: string;
    onStatusFilterChange: (s: string) => void;
}

const CATEGORIES = ["All", "Technical", "Cultural", "Sports", "Community Service", "Professional", "National Initiative"];

const listItem = {
    hidden: { opacity: 0, y: 12 },
    show: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] },
    }),
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

export default function AdminQueueTab({
    submissions, events, selectedIds, onToggleSelect, onSelectAll, onDeselectAll, onReviewItem,
    statusFilter, onStatusFilterChange,
}: Props) {
    const [search, setSearch] = useState("");
    const [deptFilter, setDeptFilter] = useState("All");
    const [catFilter, setCatFilter] = useState("All");
    const [eventFilter, setEventFilter] = useState("All");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    const departments = useMemo(() => {
        const set = new Set(submissions.map(s => s.student_department).filter(Boolean));
        return ["All", ...Array.from(set).sort()];
    }, [submissions]);

    const eventNames = useMemo(() => {
        const set = new Set(submissions.map(s => s.event_name || s.activity || s.activity_name).filter(Boolean));
        return ["All", ...Array.from(set).sort()];
    }, [submissions]);

    const filtered = useMemo(() => {
        return submissions.filter(s => {
            if (deptFilter !== "All" && s.student_department !== deptFilter) return false;
            if (catFilter !== "All" && (s.event_category || s.category || "").toLowerCase() !== catFilter.toLowerCase()) return false;
            if (eventFilter !== "All" && (s.event_name || s.activity || s.activity_name) !== eventFilter) return false;
            if (dateFrom && new Date(s.submitted_at) < new Date(dateFrom)) return false;
            if (dateTo && new Date(s.submitted_at) > new Date(dateTo + "T23:59:59")) return false;
            if (search) {
                const q = search.toLowerCase();
                const haystack = [s.student_name, s.usn, s.student_email, s.event_name, s.activity, s.activity_name].filter(Boolean).join(" ").toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [submissions, deptFilter, catFilter, eventFilter, dateFrom, dateTo, search]);

    const allSelected = filtered.length > 0 && filtered.every(s => selectedIds.has(s.id));

    const statusBadge = (status: string) => {
        const map: Record<string, { bg: string; fg: string; label: string }> = {
            pending_review: { bg: "oklch(0.93 0.06 75)", fg: "oklch(0.35 0.12 75)", label: "Pending" },
            verified: { bg: "oklch(0.92 0.06 150)", fg: "oklch(0.3 0.12 150)", label: "Approved" },
            rejected: { bg: "oklch(0.92 0.06 25)", fg: "oklch(0.38 0.14 25)", label: "Rejected" },
        };
        const s = map[status] || { bg: "oklch(0.94 0.005 250)", fg: "oklch(0.4 0.01 250)", label: status };
        return (
            <span className="inline-flex px-2 py-0.5 text-xs font-semibold" style={{ borderRadius: "6px", backgroundColor: s.bg, color: s.fg }}>
                {s.label}
            </span>
        );
    };

    return (
        <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
            {/* Search + Filter Toggle */}
            <motion.div
                className="flex items-center gap-3 flex-wrap"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.35 }}
            >
                <div className="flex-1 min-w-[220px] relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg" style={{ color: "oklch(0.6 0.01 250)" }}>search</span>
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name, USN, or event..."
                        className="w-full pl-10 pr-4 py-2.5 text-sm outline-none transition-all"
                        style={{ borderRadius: "14px", border: "1px solid oklch(0.9 0.008 250)", backgroundColor: "oklch(0.99 0.003 250)", color: "oklch(0.2 0.015 250)" }}
                    />
                </div>
                <motion.button
                    onClick={() => setShowFilters(!showFilters)}
                    whileTap={{ scale: 0.96 }}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all"
                    style={{ borderRadius: "14px", border: "1px solid oklch(0.9 0.008 250)", backgroundColor: showFilters ? "oklch(0.95 0.02 250)" : "oklch(0.99 0.003 250)", color: "oklch(0.35 0.015 250)" }}>
                    <motion.span
                        className="material-symbols-outlined text-lg"
                        animate={{ rotate: showFilters ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                    >tune</motion.span>
                    Filters
                </motion.button>
            </motion.div>

            {/* Status Tabs */}
            <LayoutGroup>
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {[
                        { key: "pending_review", label: "Pending" },
                        { key: "verified", label: "Approved" },
                        { key: "rejected", label: "Rejected" },
                        { key: "all", label: "All" },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => onStatusFilterChange(tab.key)}
                            className="px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap relative"
                            style={{
                                borderRadius: "12px",
                                color: statusFilter === tab.key ? "oklch(0.97 0.005 250)" : "oklch(0.45 0.01 250)",
                                border: statusFilter === tab.key ? "none" : "1px solid oklch(0.92 0.008 250)",
                                backgroundColor: statusFilter === tab.key ? "oklch(0.2 0.015 250)" : "oklch(0.97 0.005 250)",
                            }}>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </LayoutGroup>

            {/* Expanded Filters */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4" style={{ borderRadius: "16px", backgroundColor: "oklch(0.98 0.005 250)", border: "1px solid oklch(0.93 0.008 250)" }}>
                            <SelectFilter label="Department" value={deptFilter} options={departments} onChange={setDeptFilter} />
                            <SelectFilter label="Category" value={catFilter} options={CATEGORIES} onChange={setCatFilter} />
                            <SelectFilter label="Event" value={eventFilter} options={eventNames} onChange={setEventFilter} />
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: "oklch(0.5 0.01 250)" }}>Date Range</label>
                                <div className="flex gap-2">
                                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1 px-2 py-1.5 text-xs outline-none" style={{ borderRadius: "8px", border: "1px solid oklch(0.9 0.008 250)", color: "oklch(0.3 0.01 250)" }} />
                                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1 px-2 py-1.5 text-xs outline-none" style={{ borderRadius: "8px", border: "1px solid oklch(0.9 0.008 250)", color: "oklch(0.3 0.01 250)" }} />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Select All */}
            {filtered.length > 0 && statusFilter === "pending_review" && (
                <div className="flex items-center gap-3 px-1">
                    <button onClick={allSelected ? onDeselectAll : onSelectAll} className="flex items-center gap-2 text-xs font-semibold" style={{ color: "oklch(0.45 0.1 250)" }}>
                        <span className="material-symbols-outlined text-lg">{allSelected ? "check_box" : "check_box_outline_blank"}</span>
                        {allSelected ? "Deselect all" : `Select all ${filtered.length}`}
                    </button>
                    <AnimatePresence>
                        {selectedIds.size > 0 && (
                            <motion.span
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="text-xs font-semibold"
                                style={{ color: "oklch(0.45 0.15 160)" }}
                            >
                                {selectedIds.size} selected
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Submission List */}
            {filtered.length === 0 ? (
                <motion.div
                    className="py-16 text-center"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                >
                    <motion.span
                        className="material-symbols-outlined text-5xl mb-3 block"
                        style={{ color: "oklch(0.8 0.01 250)" }}
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    >inbox</motion.span>
                    <p className="text-sm font-semibold" style={{ color: "oklch(0.45 0.01 250)" }}>No submissions match your filters.</p>
                </motion.div>
            ) : (
                <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                        {filtered.map((item, i) => (
                            <motion.div
                                key={item.id}
                                layout
                                custom={i}
                                variants={listItem}
                                initial="hidden"
                                animate="show"
                                exit="exit"
                                whileHover={{ scale: 1.008, boxShadow: "0 4px 20px oklch(0.7 0.02 250 / 0.1)" }}
                                whileTap={{ scale: 0.995 }}
                                className="flex items-center gap-3 p-4 cursor-pointer group"
                                style={{
                                    borderRadius: "16px",
                                    backgroundColor: selectedIds.has(item.id) ? "oklch(0.96 0.02 250)" : "oklch(0.99 0.005 250)",
                                    border: selectedIds.has(item.id) ? "1px solid oklch(0.8 0.06 250)" : "1px solid oklch(0.93 0.008 250)",
                                }}
                                onClick={() => onReviewItem(item)}
                            >
                                {statusFilter === "pending_review" && (
                                    <motion.button
                                        onClick={(e) => { e.stopPropagation(); onToggleSelect(item.id); }}
                                        className="shrink-0"
                                        whileTap={{ scale: 0.85 }}
                                    >
                                        <motion.span
                                            className="material-symbols-outlined text-xl"
                                            style={{ color: selectedIds.has(item.id) ? "oklch(0.45 0.18 250)" : "oklch(0.75 0.01 250)" }}
                                            animate={{ scale: selectedIds.has(item.id) ? [1, 1.2, 1] : 1 }}
                                            transition={{ duration: 0.25 }}
                                        >
                                            {selectedIds.has(item.id) ? "check_box" : "check_box_outline_blank"}
                                        </motion.span>
                                    </motion.button>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-semibold truncate" style={{ color: "oklch(0.2 0.015 250)" }}>{item.student_name}</p>
                                        {statusBadge(item.status)}
                                    </div>
                                    <p className="text-xs mt-0.5 truncate" style={{ color: "oklch(0.5 0.01 250)" }}>
                                        {item.event_name || item.activity || item.activity_name} · {item.student_department} · Sem {item.student_semester || 'N/A'} · {new Date(item.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-bold" style={{ color: "oklch(0.45 0.18 160)" }}>{item.event_points || item.points} pts</p>
                                </div>
                                <motion.span
                                    className="material-symbols-outlined text-lg"
                                    style={{ color: "oklch(0.55 0.01 250)" }}
                                    initial={{ opacity: 0, x: -4 }}
                                    whileHover={{ opacity: 1 }}
                                    animate={{ opacity: 0 }}
                                >chevron_right</motion.span>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </motion.div>
    );
}

function SelectFilter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
    return (
        <div>
            <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: "oklch(0.5 0.01 250)" }}>{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)}
                className="w-full px-3 py-2 text-sm outline-none appearance-none cursor-pointer"
                style={{ borderRadius: "10px", border: "1px solid oklch(0.9 0.008 250)", backgroundColor: "oklch(0.99 0.003 250)", color: "oklch(0.3 0.015 250)" }}>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );
}
