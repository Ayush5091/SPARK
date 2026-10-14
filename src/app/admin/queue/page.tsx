"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import AdminQueueTab from "@/components/AdminQueueTab";
import AdminReviewModal from "@/components/AdminReviewModal";

export default function AdminQueuePage() {
    const { token } = useAuth();
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("pending_review");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [reviewItem, setReviewItem] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bulkAction, setBulkAction] = useState<"approve" | "reject" | null>(null);
    const [bulkRejectNotes, setBulkRejectNotes] = useState("");
    const [reviewError, setReviewError] = useState<string | null>(null);
    const [bulkMessage, setBulkMessage] = useState<string | null>(null);

    const errorFrom = async (res: Response) => {
        try {
            const d = await res.json();
            return d.detail || "Something went wrong. Please try again.";
        } catch {
            return "Something went wrong. Please try again.";
        }
    };

    const fetchSubmissions = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/event-submissions?status=${statusFilter}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const d = await res.json();
                setSubmissions(Array.isArray(d) ? d : []);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [token, statusFilter]);

    useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

    const handleApprove = async (id: number, points?: number) => {
        if (!token) return;
        setIsSubmitting(true);
        setReviewError(null);
        try {
            const res = await fetch("/api/admin/event-submissions", {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ submission_id: id, action: "approve", points_awarded: points }),
            });
            if (res.ok) { setReviewItem(null); await fetchSubmissions(); }
            else setReviewError(await errorFrom(res));
        } catch (e) { console.error(e); setReviewError("Network error. Please try again."); }
        finally { setIsSubmitting(false); }
    };

    const handleReject = async (id: number, notes?: string) => {
        if (!token) return;
        setIsSubmitting(true);
        setReviewError(null);
        try {
            const res = await fetch("/api/admin/event-submissions", {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ submission_id: id, action: "reject", review_notes: notes }),
            });
            if (res.ok) { setReviewItem(null); await fetchSubmissions(); }
            else setReviewError(await errorFrom(res));
        } catch (e) { console.error(e); setReviewError("Network error. Please try again."); }
        finally { setIsSubmitting(false); }
    };

    const handleBulkAction = async (action: "approve" | "reject", notes?: string) => {
        if (!token || selectedIds.size === 0) return;
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/admin/event-submissions/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ submission_ids: Array.from(selectedIds), action, review_notes: notes }),
            });
            if (res.ok) {
                // Some items can be skipped (already reviewed, or personal activities that need points set)
                const d = await res.json();
                setBulkMessage(d.failed > 0
                    ? `${d.processed} processed, ${d.failed} skipped: ${Array.from(new Set((d.errors || []).map((e: any) => e.error))).join("; ")}`
                    : null);
                setSelectedIds(new Set()); setBulkAction(null); setBulkRejectNotes(""); await fetchSubmissions();
            } else setBulkMessage(await errorFrom(res));
        } catch (e) { console.error(e); setBulkMessage("Network error. Please try again."); }
        finally { setIsSubmitting(false); }
    };

    const toggleSelect = (id: number) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const selectAll = () => setSelectedIds(new Set(submissions.map(s => s.id)));
    const deselectAll = () => setSelectedIds(new Set());

    return (
        <div className="min-h-screen px-6 lg:px-10 py-8" style={{ backgroundColor: "#F8F9FA" }}>
            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="mb-6"
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                    <h1 className="text-2xl font-bold" style={{ color: "oklch(0.15 0 0)" }}>Review Queue</h1>
                    <p className="text-sm mt-1" style={{ color: "oklch(0.5 0 0)" }}>Review, approve, or reject student submissions.</p>
                </motion.div>

                {bulkMessage && (
                    <div role="status" className="mb-4 flex items-start justify-between gap-3 px-4 py-3 text-sm font-medium"
                        style={{ borderRadius: "14px", backgroundColor: "oklch(0.95 0.03 75)", color: "oklch(0.35 0.08 75)" }}>
                        <span>{bulkMessage}</span>
                        <button onClick={() => setBulkMessage(null)} aria-label="Dismiss" className="material-symbols-outlined text-base">close</button>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <span className="material-symbols-outlined animate-spin text-3xl" style={{ color: "oklch(0.6 0 0)" }}>progress_activity</span>
                    </div>
                ) : (
                    <AdminQueueTab
                        submissions={submissions} events={[]} selectedIds={selectedIds}
                        onToggleSelect={toggleSelect} onSelectAll={selectAll} onDeselectAll={deselectAll}
                        onReviewItem={setReviewItem} statusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
                    />
                )}
            </div>

            <AnimatePresence>
                {selectedIds.size > 0 && !bulkAction && (
                    <motion.div
                        initial={{ y: 60, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 60, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 shadow-2xl"
                        style={{ borderRadius: "18px", backgroundColor: "oklch(0.15 0 0)", color: "oklch(0.95 0 0)" }}>
                        <span className="text-sm font-semibold">{selectedIds.size} selected</span>
                        <div className="w-px h-6" style={{ backgroundColor: "oklch(0.35 0 0)" }} />
                        <motion.button onClick={() => handleBulkAction("approve")} disabled={isSubmitting}
                            whileTap={{ scale: 0.94 }}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50"
                            style={{ borderRadius: "10px", backgroundColor: "oklch(0.2 0 0)", color: "oklch(0.98 0 0)" }}>
                            <span className="material-symbols-outlined text-lg">check_circle</span> Approve All
                        </motion.button>
                        <motion.button onClick={() => setBulkAction("reject")} disabled={isSubmitting}
                            whileTap={{ scale: 0.94 }}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50"
                            style={{ borderRadius: "10px", backgroundColor: "oklch(0.5 0.18 25)", color: "oklch(0.98 0.005 25)" }}>
                            <span className="material-symbols-outlined text-lg">cancel</span> Reject All
                        </motion.button>
                        <button onClick={deselectAll} className="px-3 py-2 text-xs font-semibold transition-all" style={{ borderRadius: "8px", color: "oklch(0.7 0 0)" }}>
                            Clear
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bulk Reject Modal */}
            {bulkAction === "reject" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "oklch(0.15 0 0 / 0.5)" }}>
                    <div className="w-full max-w-md p-6 space-y-4" style={{ borderRadius: "20px", backgroundColor: "oklch(0.99 0 0)" }}>
                        <h3 className="text-lg font-bold" style={{ color: "oklch(0.2 0 0)" }}>Reject {selectedIds.size} submissions</h3>
                        <textarea value={bulkRejectNotes} onChange={e => setBulkRejectNotes(e.target.value)} rows={3}
                            placeholder="Provide a reason for rejection..."
                            className="w-full px-4 py-3 text-sm outline-none resize-none"
                            style={{ borderRadius: "14px", border: "2px solid oklch(0.88 0.05 25)", color: "oklch(0.2 0 0)" }} />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => { setBulkAction(null); setBulkRejectNotes(""); }}
                                className="px-4 py-2 text-sm font-semibold" style={{ borderRadius: "10px", border: "1px solid oklch(0.9 0 0)", color: "oklch(0.45 0 0)" }}>
                                Cancel
                            </button>
                            <button onClick={() => handleBulkAction("reject", bulkRejectNotes)} disabled={isSubmitting || !bulkRejectNotes.trim()}
                                className="px-5 py-2 text-sm font-semibold disabled:opacity-50"
                                style={{ borderRadius: "10px", backgroundColor: "oklch(0.5 0.18 25)", color: "oklch(0.98 0.005 25)" }}>
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AdminReviewModal isOpen={!!reviewItem} onClose={() => { setReviewItem(null); setReviewError(null); }} item={reviewItem}
                onApprove={handleApprove} onReject={handleReject} isSubmitting={isSubmitting} error={reviewError} />
        </div>
    );
}
