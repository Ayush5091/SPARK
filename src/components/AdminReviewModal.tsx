"use client";

import React, { useEffect, useState } from 'react';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: any | null;
    onApprove?: (id: number, pointsAwarded?: number) => void;
    onReject?: (id: number) => void;
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

    useEffect(() => {
        if (!item) return;
        const defaultPoints = item.points_awarded ?? item.event_points ?? item.points ?? '';
        setPointsInput(defaultPoints?.toString?.() ?? '');
    }, [item]);

    const title = "Verify Activity Proof";

    if (!isOpen || !item) return null;

    const dateStr = item.date || item.activity_date
        ? new Date(item.date || item.activity_date).toLocaleDateString()
        : "N/A";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/20">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">
                            verified
                        </span>
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
                        disabled={isSubmitting}
                    >
                        <span className="material-symbols-outlined text-gray-500">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto">

                    {/* Student Info */}
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-1">Student</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{item.student_name}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-1">Date</p>
                            <p className="text-md font-medium text-gray-900 dark:text-white">{dateStr}</p>
                        </div>
                    </div>

                    {/* Activity Info */}
                    <div>
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-1">Activity</p>
                        <p className="text-xl font-bold text-primary dark:text-blue-400">{item.activity || item.activity_name}</p>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold mt-2 bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300">
                            {item.event_points ?? item.points ?? 0} Points Target
                        </span>
                    </div>

                    {/* Description */}
                    <div>
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-2">Description / Notes</p>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl text-gray-700 dark:text-gray-300 text-sm leading-relaxed border border-gray-100 dark:border-gray-800">
                            {item.description || "No description provided by the student."}
                        </div>
                    </div>

                    {/* Submission Specifics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-2">Hours Logged</p>
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                                <span className="material-symbols-outlined text-gray-400">schedule</span>
                                <span className="font-bold text-gray-900 dark:text-white">{item.hours_spent || "N/A"}</span>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-2">Points Awarded</p>
                            <input
                                type="number"
                                min="0"
                                value={pointsInput}
                                onChange={(e) => setPointsInput(e.target.value)}
                                className="w-full rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                            />
                        </div>

                        {item.proof && (
                            <div>
                                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-2">Proof Link</p>
                                <a
                                    href={item.proof}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 transition-colors group"
                                >
                                    <span className="material-symbols-outlined">link</span>
                                    <span className="font-bold truncate">View Attachment</span>
                                    <span className="material-symbols-outlined ml-auto text-sm opacity-50 group-hover:opacity-100">open_in_new</span>
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions Footer */}
                {item.status === 'pending' && (
                    <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex flex-col-reverse md:flex-row justify-end gap-3">
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-6 py-2.5 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        {/* {onReject && (
                            <button
                                onClick={() => onReject(item.id)}
                                disabled={isSubmitting}
                                className="px-6 py-2.5 rounded-xl font-bold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:border-red-900/30 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                            >
                                Reject
                            </button>
                        )} */}

                        {onApprove && (
                            <button
                                onClick={() => onApprove(item.id, pointsInput === '' ? undefined : Number(pointsInput))}
                                disabled={isSubmitting}
                                className="flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl font-bold text-white bg-green-500 hover:bg-green-600 shadow-md transition-colors disabled:opacity-50"
                            >
                                {isSubmitting && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                                Verify & Award Points
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
