"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: any | null;
    onApprove?: (id: number, pointsAwarded?: number) => void;
    onReject?: (id: number, notes?: string) => void;
    isSubmitting?: boolean;
}

export default function AdminReviewModal({
    isOpen,
    onClose,
    item,
    onApprove,
    onReject,
    isSubmitting = false
}: ReviewModalProps) {
    const [pointsInput, setPointsInput] = useState<string>('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectNotes, setRejectNotes] = useState('');

    useEffect(() => {
        if (!item) return;
        const defaultPoints = item.points_awarded ?? item.event_points ?? item.points ?? '';
        setPointsInput(defaultPoints?.toString?.() ?? '');
        setShowRejectForm(false);
        setRejectNotes('');
    }, [item]);

    const parseJsonValue = (value: any) => {
        if (!value || typeof value !== 'string') return value;
        try {
            return JSON.parse(value);
        } catch {
            return null;
        }
    };

    const verificationResult = parseJsonValue(item?.verification_result) ?? item?.verification_result;
    const photoMetadata = parseJsonValue(item?.photo_metadata) ?? item?.photo_metadata;
    const canReview = item?.status === 'pending' || item?.status === 'pending_review';
    const eventDefaultPoints = Number(item?.event_points ?? item?.points ?? 0);
    const currentPoints = Number(pointsInput || 0);
    const studentTotalPoints = Number(item?.student_total_points ?? 0);

    const adjustPoints = (delta: number) => {
        const newVal = Math.max(0, currentPoints + delta);
        setPointsInput(String(newVal));
    };

    const setPointsMultiplier = (multiplier: number) => {
        const newVal = Math.max(0, Math.round(eventDefaultPoints * multiplier));
        setPointsInput(String(newVal));
    };

    if (!isOpen || !item) return null;

    const dateStr = item.date || item.activity_date || item.submitted_at
        ? new Date(item.date || item.activity_date || item.submitted_at).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        })
        : "N/A";

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'oklch(0.15 0.01 250 / 0.6)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
        >
            <motion.div
                className="w-full max-w-2xl overflow-hidden shadow-2xl"
                style={{
                    borderRadius: '24px',
                    backgroundColor: 'oklch(0.99 0.005 250)',
                    border: '1px solid oklch(0.92 0.008 250)',
                }}
                initial={{ opacity: 0, scale: 0.92, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="px-6 py-4 flex justify-between items-center"
                    style={{
                        borderBottom: '1px solid oklch(0.92 0.008 250)',
                        backgroundColor: 'oklch(0.97 0.006 250)',
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="h-9 w-9 flex items-center justify-center"
                            style={{
                                borderRadius: '12px',
                                backgroundColor: 'oklch(0.45 0.18 160)',
                            }}
                        >
                            <span className="material-symbols-outlined text-lg" style={{ color: 'oklch(0.98 0.005 160)' }}>
                                task_alt
                            </span>
                        </div>
                        <h2 className="text-lg font-semibold" style={{ color: 'oklch(0.18 0.015 250)' }}>
                            Review Submission
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 transition-colors"
                        style={{ borderRadius: '10px', color: 'oklch(0.55 0.01 250)' }}
                        disabled={isSubmitting}
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

                    {/* Student + Date Row */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'oklch(0.55 0.015 250)' }}>Student</p>
                            <p className="text-base font-semibold mt-1" style={{ color: 'oklch(0.18 0.015 250)' }}>{item.student_name}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                                {item.student_department && (
                                    <p className="text-sm" style={{ color: 'oklch(0.5 0.015 250)' }}>{item.student_department}</p>
                                )}
                                <div className="w-1 h-1 rounded-full opacity-30" style={{ backgroundColor: 'oklch(0.5 0.015 250)' }} />
                                <p className="text-sm font-medium" style={{ color: 'oklch(0.45 0.1 250)' }}>Semester {item.student_semester || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'oklch(0.55 0.015 250)' }}>Submitted</p>
                            <p className="text-sm font-medium mt-1" style={{ color: 'oklch(0.25 0.015 250)' }}>{dateStr}</p>
                        </div>
                    </div>

                    {/* Activity + Student Points */}
                    <div className="flex items-start justify-between gap-4"
                        style={{
                            padding: '16px',
                            borderRadius: '16px',
                            backgroundColor: 'oklch(0.97 0.008 160)',
                            border: '1px solid oklch(0.92 0.015 160)',
                        }}
                    >
                        <div>
                            <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'oklch(0.45 0.05 160)' }}>Event</p>
                            <p className="text-base font-semibold mt-1" style={{ color: 'oklch(0.2 0.03 160)' }}>{item.activity || item.activity_name}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span
                                    className="inline-flex items-center px-2.5 py-1 text-xs font-semibold"
                                    style={{
                                        borderRadius: '8px',
                                        backgroundColor: 'oklch(0.45 0.18 160)',
                                        color: 'oklch(0.98 0.005 160)',
                                    }}
                                >
                                    {eventDefaultPoints} pts default
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'oklch(0.45 0.05 160)' }}>Student total</p>
                            <p className="text-2xl font-bold mt-1" style={{ color: 'oklch(0.3 0.06 160)' }}>{studentTotalPoints}</p>
                            <p className="text-xs" style={{ color: 'oklch(0.5 0.03 160)' }}>points earned</p>
                        </div>
                    </div>

                    {/* Description */}
                    {item.description && (
                        <div>
                            <p className="text-xs font-semibold tracking-wider uppercase mb-2" style={{ color: 'oklch(0.55 0.015 250)' }}>Notes</p>
                            <div
                                className="p-4 text-sm leading-relaxed"
                                style={{
                                    borderRadius: '14px',
                                    backgroundColor: 'oklch(0.97 0.005 250)',
                                    border: '1px solid oklch(0.92 0.008 250)',
                                    color: 'oklch(0.35 0.01 250)',
                                }}
                            >
                                {item.description}
                            </div>
                        </div>
                    )}

                    {/* Verification Evidence */}
                    {(verificationResult || photoMetadata) && (
                        <div
                            className="space-y-3 p-4"
                            style={{
                                borderRadius: '16px',
                                backgroundColor: 'oklch(0.97 0.005 250)',
                                border: '1px solid oklch(0.92 0.008 250)',
                            }}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'oklch(0.55 0.015 250)' }}>Verification Evidence</p>
                                    <p className="text-xs mt-0.5" style={{ color: 'oklch(0.6 0.01 250)' }}>Photo metadata and automated checks.</p>
                                </div>
                                <span
                                    className="inline-flex items-center px-3 py-1 text-xs font-semibold"
                                    style={{
                                        borderRadius: '8px',
                                        backgroundColor: verificationResult?.isValid ? 'oklch(0.92 0.04 150)' : 'oklch(0.93 0.04 75)',
                                        color: verificationResult?.isValid ? 'oklch(0.3 0.1 150)' : 'oklch(0.35 0.1 75)',
                                    }}
                                >
                                    {verificationResult?.isValid ? 'Auto-verified' : 'Needs review'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div
                                    className="p-3 text-sm"
                                    style={{
                                        borderRadius: '12px',
                                        backgroundColor: 'oklch(0.99 0.003 250)',
                                        border: '1px solid oklch(0.93 0.006 250)',
                                    }}
                                >
                                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'oklch(0.55 0.01 250)' }}>Capture Data</p>
                                    <div className="space-y-1" style={{ color: 'oklch(0.35 0.01 250)' }}>
                                        <p>Camera: {photoMetadata?.make || photoMetadata?.model ? [photoMetadata?.make, photoMetadata?.model].filter(Boolean).join(' ') : 'Unavailable'}</p>
                                        <p>Time: {photoMetadata?.timestamp ? new Date(photoMetadata.timestamp).toLocaleString() : 'Unavailable'}</p>
                                        <p>GPS: {photoMetadata?.latitude && photoMetadata?.longitude ? `${photoMetadata.latitude}, ${photoMetadata.longitude}` : 'Unavailable'}</p>
                                    </div>
                                </div>

                                <div
                                    className="p-3 text-sm"
                                    style={{
                                        borderRadius: '12px',
                                        backgroundColor: 'oklch(0.99 0.003 250)',
                                        border: '1px solid oklch(0.93 0.006 250)',
                                    }}
                                >
                                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'oklch(0.55 0.01 250)' }}>Checks</p>
                                    <div className="space-y-1" style={{ color: 'oklch(0.35 0.01 250)' }}>
                                        <p>Location: <span className="font-semibold" style={{ color: verificationResult?.locationMatch ? 'oklch(0.45 0.15 150)' : 'oklch(0.5 0.18 25)' }}>{verificationResult?.locationMatch ? 'Match' : 'Mismatch'}</span></p>
                                        <p>Time: <span className="font-semibold" style={{ color: verificationResult?.timeMatch ? 'oklch(0.45 0.15 150)' : 'oklch(0.5 0.18 25)' }}>{verificationResult?.timeMatch ? 'Match' : 'Mismatch'}</span></p>
                                        <p>Distance: <span className="font-semibold">{verificationResult?.distanceFromEvent != null ? `${Math.round(verificationResult.distanceFromEvent)} m` : 'N/A'}</span></p>
                                        <p>Time delta: <span className="font-semibold">{verificationResult?.timeDifferenceMinutes != null ? `${verificationResult.timeDifferenceMinutes} min` : 'N/A'}</span></p>
                                    </div>
                                </div>
                            </div>

                            {verificationResult?.reason && (
                                <div
                                    className="p-3 text-sm"
                                    style={{
                                        borderRadius: '12px',
                                        backgroundColor: 'oklch(0.95 0.03 75)',
                                        border: '1px solid oklch(0.88 0.04 75)',
                                        color: 'oklch(0.35 0.08 75)',
                                    }}
                                >
                                    <p className="text-xs font-semibold uppercase tracking-wider mb-1">Reason flagged</p>
                                    <p>{verificationResult.reason}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Points Allocation */}
                    <div>
                        <p className="text-xs font-semibold tracking-wider uppercase mb-3" style={{ color: 'oklch(0.55 0.015 250)' }}>Points Allocation</p>

                        <div className="flex items-center gap-3">
                            <div className="flex-1 relative">
                                <input
                                    type="number"
                                    min="0"
                                    value={pointsInput}
                                    onChange={(e) => setPointsInput(e.target.value)}
                                    className="w-full px-4 py-3 text-lg font-semibold outline-none transition-all"
                                    style={{
                                        borderRadius: '14px',
                                        border: '2px solid oklch(0.88 0.015 250)',
                                        backgroundColor: 'oklch(0.99 0.003 250)',
                                        color: 'oklch(0.18 0.015 250)',
                                    }}
                                />
                                {currentPoints !== eventDefaultPoints && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium"
                                        style={{ color: 'oklch(0.5 0.1 75)' }}>
                                        {currentPoints > eventDefaultPoints ? '+' : ''}{currentPoints - eventDefaultPoints} from default
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Quick Adjust Buttons */}
                        <div className="flex flex-wrap gap-2 mt-3">
                            <button type="button" onClick={() => adjustPoints(-10)}
                                className="px-3 py-1.5 text-xs font-semibold transition-all"
                                style={{ borderRadius: '8px', border: '1px solid oklch(0.88 0.02 25)', color: 'oklch(0.45 0.1 25)', backgroundColor: 'oklch(0.97 0.01 25)' }}>
                                -10
                            </button>
                            <button type="button" onClick={() => adjustPoints(-5)}
                                className="px-3 py-1.5 text-xs font-semibold transition-all"
                                style={{ borderRadius: '8px', border: '1px solid oklch(0.88 0.02 25)', color: 'oklch(0.45 0.1 25)', backgroundColor: 'oklch(0.97 0.01 25)' }}>
                                -5
                            </button>
                            <button type="button" onClick={() => setPointsInput(String(eventDefaultPoints))}
                                className="px-3 py-1.5 text-xs font-semibold transition-all"
                                style={{ borderRadius: '8px', border: '1px solid oklch(0.85 0.03 250)', color: 'oklch(0.4 0.08 250)', backgroundColor: 'oklch(0.95 0.01 250)' }}>
                                Reset to {eventDefaultPoints}
                            </button>
                            <button type="button" onClick={() => adjustPoints(5)}
                                className="px-3 py-1.5 text-xs font-semibold transition-all"
                                style={{ borderRadius: '8px', border: '1px solid oklch(0.85 0.04 150)', color: 'oklch(0.4 0.1 150)', backgroundColor: 'oklch(0.95 0.02 150)' }}>
                                +5
                            </button>
                            <button type="button" onClick={() => adjustPoints(10)}
                                className="px-3 py-1.5 text-xs font-semibold transition-all"
                                style={{ borderRadius: '8px', border: '1px solid oklch(0.85 0.04 150)', color: 'oklch(0.4 0.1 150)', backgroundColor: 'oklch(0.95 0.02 150)' }}>
                                +10
                            </button>
                            <button type="button" onClick={() => setPointsMultiplier(0.5)}
                                className="px-3 py-1.5 text-xs font-semibold transition-all"
                                style={{ borderRadius: '8px', border: '1px solid oklch(0.88 0.01 250)', color: 'oklch(0.5 0.01 250)', backgroundColor: 'oklch(0.97 0.005 250)' }}>
                                Half
                            </button>
                            <button type="button" onClick={() => setPointsMultiplier(2)}
                                className="px-3 py-1.5 text-xs font-semibold transition-all"
                                style={{ borderRadius: '8px', border: '1px solid oklch(0.88 0.01 250)', color: 'oklch(0.5 0.01 250)', backgroundColor: 'oklch(0.97 0.005 250)' }}>
                                Double
                            </button>
                        </div>
                    </div>

                    {/* Proof Link */}
                    {item.proof && (
                        <a
                            href={item.proof}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 transition-all group"
                            style={{
                                borderRadius: '14px',
                                backgroundColor: 'oklch(0.96 0.02 250)',
                                border: '1px solid oklch(0.9 0.03 250)',
                                color: 'oklch(0.4 0.12 250)',
                            }}
                        >
                            <span className="material-symbols-outlined">attachment</span>
                            <span className="font-semibold text-sm truncate">View Attachment</span>
                            <span className="material-symbols-outlined ml-auto text-sm opacity-50 group-hover:opacity-100">open_in_new</span>
                        </a>
                    )}

                    {/* Reject Notes */}
                    {showRejectForm && (
                        <div>
                            <p className="text-xs font-semibold tracking-wider uppercase mb-2" style={{ color: 'oklch(0.5 0.1 25)' }}>Rejection Reason (required)</p>
                            <textarea
                                value={rejectNotes}
                                onChange={(e) => setRejectNotes(e.target.value)}
                                rows={3}
                                placeholder="Explain why this submission is being rejected..."
                                className="w-full px-4 py-3 text-sm outline-none resize-none transition-all"
                                style={{
                                    borderRadius: '14px',
                                    border: '2px solid oklch(0.85 0.06 25)',
                                    backgroundColor: 'oklch(0.98 0.005 25)',
                                    color: 'oklch(0.25 0.02 25)',
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Actions Footer */}
                {canReview && (
                    <div
                        className="p-5 flex flex-col-reverse md:flex-row justify-end gap-3"
                        style={{
                            borderTop: '1px solid oklch(0.92 0.008 250)',
                            backgroundColor: 'oklch(0.97 0.005 250)',
                        }}
                    >
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-5 py-2.5 font-semibold text-sm transition-all disabled:opacity-50"
                            style={{
                                borderRadius: '12px',
                                border: '1px solid oklch(0.88 0.008 250)',
                                color: 'oklch(0.45 0.01 250)',
                                backgroundColor: 'oklch(0.99 0.003 250)',
                            }}
                        >
                            Cancel
                        </button>

                        {onReject && !showRejectForm && (
                            <button
                                onClick={() => setShowRejectForm(true)}
                                disabled={isSubmitting}
                                className="px-5 py-2.5 font-semibold text-sm transition-all disabled:opacity-50"
                                style={{
                                    borderRadius: '12px',
                                    border: '1px solid oklch(0.85 0.06 25)',
                                    color: 'oklch(0.45 0.15 25)',
                                    backgroundColor: 'oklch(0.97 0.02 25)',
                                }}
                            >
                                Reject
                            </button>
                        )}

                        {showRejectForm && onReject && (
                            <button
                                onClick={() => {
                                    if (!rejectNotes.trim()) {
                                        alert('Please provide a reason for rejection.');
                                        return;
                                    }
                                    onReject(item.id, rejectNotes);
                                }}
                                disabled={isSubmitting || !rejectNotes.trim()}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 font-semibold text-sm transition-all disabled:opacity-50"
                                style={{
                                    borderRadius: '12px',
                                    backgroundColor: 'oklch(0.5 0.18 25)',
                                    color: 'oklch(0.98 0.005 25)',
                                }}
                            >
                                {isSubmitting && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                                Confirm Rejection
                            </button>
                        )}

                        {onApprove && !showRejectForm && (
                            <button
                                onClick={() => onApprove(item.id, pointsInput === '' ? undefined : Number(pointsInput))}
                                disabled={isSubmitting}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 font-semibold text-sm transition-all disabled:opacity-50"
                                style={{
                                    borderRadius: '12px',
                                    backgroundColor: 'oklch(0.45 0.18 160)',
                                    color: 'oklch(0.98 0.005 160)',
                                }}
                            >
                                {isSubmitting && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                                Approve and Award {currentPoints || eventDefaultPoints} pts
                            </button>
                        )}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
