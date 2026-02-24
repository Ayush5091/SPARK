"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import Link from 'next/navigation';
import { useRouter } from 'next/navigation';
import AdminReviewModal from '@/components/AdminReviewModal';

export default function SubmissionsHistoryScreen() {
    const { token, user } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'pending' | 'verified'>('pending');
    const [historyItems, setHistoryItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!token) return;
        const fetchData = async () => {
            try {
                const reqEndpoint = user?.role === 'admin' ? '/api/activity-requests' : '/api/activity-requests/me';
                const subEndpoint = user?.role === 'admin' ? '/api/submissions' : '/api/submissions/me';

                const [reqRes, subRes] = await Promise.all([
                    fetch(reqEndpoint, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(subEndpoint, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                const requests = await reqRes.json();
                const submissions = await subRes.json();

                const subMap = new Map();
                if (Array.isArray(submissions)) {
                    submissions.forEach((s: any) => subMap.set(s.request_id || s.id, s)); // Admin API might return just id
                }

                const items: any[] = [];
                if (Array.isArray(requests)) {
                    requests.forEach((r: any) => {
                        const sub = subMap.get(r.request_id || r.id); // Admin API returns request_id in submissions, id in requests
                        if (sub) {
                            items.push({
                                type: 'submission',
                                id: sub.submission_id || sub.id,
                                request_id: r.request_id || r.id,
                                activity: r.activity || r.activity_name,
                                points: r.points,
                                category: r.category,
                                status: sub.status, // pending, verified, rejected
                                date: sub.submitted_at,
                                student_name: sub.student_name || r.student_name,
                                description: sub.description,
                                proof: sub.proof,
                                hours_spent: sub.hours_spent,
                                activity_date: sub.activity_date
                            });
                        } else {
                            items.push({
                                type: 'request',
                                id: r.request_id || r.id,
                                request_id: r.request_id || r.id,
                                activity: r.activity || r.activity_name,
                                points: r.points,
                                category: r.category,
                                status: r.status, // pending, approved, rejected
                                date: r.requested_at,
                                student_name: r.student_name,
                                description: r.description
                            });
                        }
                    });
                }

                // Sort by date descending
                items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setHistoryItems(items);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token, user]);

    const handleVerify = async (id: number) => {
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/submissions/${id}/verify`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setHistoryItems(prev => prev.map(item => item.id === id ? { ...item, status: 'verified' } : item));
                setIsModalOpen(false);
                setSelectedItem(null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // For students: "Pending" means approved requests (waiting for proof) OR pending submissions (waiting for admin).
    // For admins: "Pending" means pending submissions (waiting for admin verification).
    const pendingItems = historyItems.filter(i =>
        user?.role === 'admin' ?
            (i.type === 'submission' && i.status === 'pending') :
            (i.status !== 'verified' && i.status !== 'rejected' && !(i.type === 'request' && i.status === 'pending'))
    );
    const verifiedItems = historyItems.filter(i =>
        user?.role === 'admin' ?
            (i.status === 'verified' || i.status === 'rejected' || (i.type === 'request' && (i.status === 'approved' || i.status === 'rejected'))) :
            (i.status === 'verified' || i.status === 'rejected')
    );
    const currentItems = activeTab === 'pending' ? pendingItems : verifiedItems;

    const getStatusDisplay = (item: any) => {
        if (item.type === 'request') {
            if (item.status === 'approved') return { text: 'Approved (Awaiting Proof)', color: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' };
            if (item.status === 'rejected') return { text: 'Request Rejected', color: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' };
            if (item.status === 'pending') return { text: 'Request Pending', color: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' };
        } else {
            if (item.status === 'pending') return { text: 'Under Review', color: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' };
            if (item.status === 'verified') return { text: 'Verified', color: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' };
            if (item.status === 'rejected') return { text: 'Proof Rejected', color: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' };
        }
        return { text: 'Unknown', color: 'text-gray-500', dot: 'bg-gray-500' };
    };
    return (
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-6 md:px-10 pt-10 md:pt-16 pb-4">
                <div className="flex items-center justify-between mb-6 max-w-5xl mx-auto w-full">
                    <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-text-main dark:text-white">Submissions</h1>
                    <div className="flex items-center gap-4">
                        {user?.role !== 'admin' && (
                            <button onClick={() => router.push('/request-activity')} className="hidden md:flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:bg-blue-600 transition-colors">
                                <span className="material-symbols-outlined">add</span> Create Request
                            </button>
                        )}
                        <button className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-white dark:bg-gray-800 shadow-sm text-text-main dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700">
                            <span className="material-symbols-outlined text-xl md:text-2xl">notifications</span>
                        </button>
                    </div>
                </div>

                {/* Segmented Control */}
                <div className="relative flex w-full max-w-xl mx-auto p-1.5 bg-gray-200/50 dark:bg-gray-800/80 rounded-full">
                    <div className={`absolute left-1.5 top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white dark:bg-gray-700 rounded-full shadow-sm z-0 transition-transform duration-300 ${activeTab === 'verified' ? 'translate-x-[calc(100%+6px)]' : ''}`}></div>
                    <button onClick={() => setActiveTab('pending')} className={`relative z-10 flex-1 py-2.5 md:py-3 text-sm md:text-base font-semibold text-center rounded-full transition-colors ${activeTab === 'pending' ? 'text-text-main dark:text-white' : 'text-slate-500 dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`}>
                        Pending Updates
                    </button>
                    <button onClick={() => setActiveTab('verified')} className={`relative z-10 flex-1 py-2.5 md:py-3 text-sm md:text-base font-medium text-center rounded-full transition-colors ${activeTab === 'verified' ? 'text-text-main dark:text-white' : 'text-slate-500 dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`}>
                        Verified History
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 px-5 md:px-10 py-8 space-y-6 pb-24 max-w-5xl mx-auto w-full">

                <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-xs md:text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                        {activeTab === 'pending' ? `In Progress (${pendingItems.length})` : `Completed (${verifiedItems.length})`}
                    </span>
                    <span className="text-sm font-medium text-primary cursor-pointer hover:text-blue-700 transition-colors">View Guidelines</span>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8"><p className="text-gray-500">Loading history...</p></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {currentItems.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400">
                                No {activeTab} records found.
                            </div>
                        ) : currentItems.map((item, idx) => {
                            const statusInfo = getStatusDisplay(item);
                            const actName = item.activity || 'Unknown Activity';
                            const pointsText = `+${item.points ?? 0} Pts`;
                            const dateStr = item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
                            const isAdmin = user?.role === 'admin';

                            return (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        if (isAdmin && item.status === 'pending' && item.type === 'submission') {
                                            setSelectedItem(item);
                                            setIsModalOpen(true);
                                        }
                                    }}
                                    className={`group relative flex flex-col ${item.status === 'verified' ? 'bg-white/80 dark:bg-gray-900/60' : 'bg-white dark:bg-gray-900'} rounded-[2rem] p-6 shadow-soft hover:shadow-xl transition-all duration-300 border border-transparent hover:border-primary/20 ${isAdmin && item.status === 'pending' && item.type === 'submission' ? 'cursor-pointer' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <h3 className="text-lg md:text-xl font-bold text-text-main dark:text-white leading-tight mb-1.5">
                                                {item.student_name ? `${item.student_name} - ${actName}` : actName}
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">{dateStr}</p>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold mb-2 ${item.status === 'verified' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-100 dark:border-green-800/30' : 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300'}`}>
                                                {pointsText}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-auto flex items-center justify-between pt-5 border-t border-gray-50 dark:border-gray-800/60">
                                        <div className="flex items-center gap-2.5">
                                            {item.status === 'verified' ? (
                                                <span className="material-symbols-outlined text-green-500 text-[20px]">verified</span>
                                            ) : (
                                                <span className="relative flex h-3 w-3">
                                                    {item.status !== 'rejected' && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusInfo.dot}`}></span>}
                                                    <span className={`relative inline-flex rounded-full h-3 w-3 ${statusInfo.dot}`}></span>
                                                </span>
                                            )}
                                            <span className={`text-sm font-bold tracking-wide ${statusInfo.color}`}>{statusInfo.text}</span>
                                        </div>

                                        {/* Show an action button if it's approved (submit proof) */}
                                        {user?.role === 'student' && item.status === 'approved' && item.type === 'request' && (
                                            <button onClick={(e) => { e.stopPropagation(); router.push('/submit-proof'); }} className="flex items-center justify-center px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all text-sm font-bold">
                                                Submit Proof
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Admin Review Modal */}
            <AdminReviewModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedItem(null); }}
                item={selectedItem}
                onApprove={selectedItem?.type === 'request' ? undefined : handleVerify} // We only verify here, approve is on the other page
                isSubmitting={isSubmitting}
            />
        </div>
    );
}
