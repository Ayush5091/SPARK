"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminReviewModal from '@/components/AdminReviewModal';

export default function SubmissionsHistoryScreen() {
    const { token, user } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'pending' | 'verified'>('pending');
    const [historyItems, setHistoryItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (user?.role === 'admin') {
            router.replace('/');
            return;
        }

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
                    submissions.forEach((s: any) => subMap.set(s.request_id || s.id, s));
                }

                const items: any[] = [];
                if (Array.isArray(requests)) {
                    requests.forEach((r: any) => {
                        const sub = subMap.get(r.request_id || r.id);
                        if (sub) {
                            items.push({
                                type: 'submission',
                                id: sub.submission_id || sub.id,
                                request_id: r.request_id || r.id,
                                activity: r.activity || r.activity_name,
                                points: r.points,
                                category: r.category,
                                status: sub.status,
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
                                status: r.status,
                                date: r.requested_at,
                                student_name: r.student_name,
                                description: r.description
                            });
                        }
                    });
                }

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

    const pendingItems = historyItems.filter(i => i.status === 'pending');
    const verifiedItems = historyItems.filter(i =>
        i.status === 'verified' || i.status === 'rejected' || i.status === 'approved'
    );
    const currentItems = activeTab === 'pending' ? pendingItems : verifiedItems;

    const getStatusDisplay = (item: any) => {
        if (item.type === 'request') {
            if (item.status === 'approved') return { text: 'Approved', color: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' };
            if (item.status === 'rejected') return { text: 'Request Rejected', color: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' };
            if (item.status === 'pending') return { text: 'Request Pending', color: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' };
        } else {
            if (item.status === 'pending') return { text: 'Proof Under Review', color: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' };
            if (item.status === 'verified') return { text: 'Verified', color: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' };
            if (item.status === 'rejected') return { text: 'Proof Rejected', color: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' };
        }
        return { text: 'Unknown', color: 'text-gray-500', dot: 'bg-gray-500' };
    };

    if (user?.role === 'admin') {
        return null;
    }

  return (
    <div className="max-w-md md:max-w-5xl mx-auto min-h-screen bg-[#F0F0F3] font-sans relative pb-24 md:pb-12 overflow-hidden text-black selection:bg-black selection:text-white flex flex-col">
      <header className="flex flex-col px-6 pt-10 pb-4 gap-6 sticky top-0 z-20 bg-[#F0F0F3]/90 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center justify-center w-12 h-12 rounded-full bg-[#F0F0F3] text-black shadow-[6px_6px_12px_#d1d1d3,-6px_-6px_12px_#ffffff] active:shadow-[inset_4px_4px_8px_#d1d1d3] transition-all"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </Link>
          <div className="w-12"></div>
        </div>

        <div>
          <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
            Submissions
          </span>
          <h1 className="text-3xl font-black tracking-tight text-black mt-1">
            Activity Ledger
          </h1>
        </div>

        {/* Tab Switcher */}
        <div className="relative flex w-full p-1 bg-[#F0F0F3] shadow-[inset_4px_4px_8px_#d1d1d3,inset_-4px_-4px_8px_#ffffff] rounded-full">
          <div
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#F0F0F3] rounded-full shadow-[2px_2px_6px_#d1d1d3,-2px_-2px_6px_#ffffff] transition-transform duration-300 ease-out ${
              activeTab === "verified" ? "translate-x-full" : "translate-x-0"
            }`}
          ></div>
          <button
            onClick={() => setActiveTab("pending")}
            className={`relative z-10 flex-1 py-2.5 text-xs font-bold text-center rounded-full transition-colors ${
              activeTab === "pending" ? "text-black" : "text-gray-400 hover:text-black"
            }`}
          >
            Pending Updates
          </button>
          <button
            onClick={() => setActiveTab("verified")}
            className={`relative z-10 flex-1 py-2.5 text-xs font-bold text-center rounded-full transition-colors ${
              activeTab === "verified" ? "text-black" : "text-gray-400 hover:text-black"
            }`}
          >
            Verified History
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 py-6 pb-28">
        <div className="flex items-center justify-between px-1 mb-6">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            {activeTab === "pending" ? `In Progress (${pendingItems.length})` : `Completed (${verifiedItems.length})`}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-xs font-bold text-gray-400 uppercase tracking-widest">
            Loading history...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentItems.length === 0 ? (
              <div className="col-span-full rounded-3xl bg-[#F0F0F3] p-10 text-center text-xs font-bold uppercase tracking-wider text-gray-500 shadow-[inset_6px_6px_12px_#d1d1d3,inset_-6px_-6px_12px_#ffffff] border border-gray-100/50">
                No {activeTab} records found.
              </div>
            ) : (
              currentItems.map((item, idx) => {
                const statusInfo = getStatusDisplay(item);
                const actName = item.activity || "Unknown Activity";
                const pointsText = `+${item.points ?? 0} PTS`;
                const dateStr = item.date ? new Date(item.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
                const isAdmin = user?.role === "admin";

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (isAdmin && item.status === "pending" && item.type === "submission") {
                        setSelectedItem(item);
                        setIsModalOpen(true);
                      }
                    }}
                    className={`rounded-3xl bg-[#F0F0F3] p-6 shadow-[8px_8px_16px_#d1d1d3,-8px_-8px_16px_#ffffff] flex flex-col justify-between transition-all duration-300 hover:shadow-[4px_4px_8px_#d1d1d3,-4px_-4px_8px_#ffffff] ${
                      isAdmin && item.status === "pending" && item.type === "submission" ? "cursor-pointer" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="text-lg font-black tracking-tight text-black leading-tight mb-1">
                          {item.student_name ? `${item.student_name} - ${actName}` : actName}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{dateStr}</p>
                      </div>
                      <span className="rounded-full bg-black px-3 py-1.5 text-[9px] font-bold tracking-widest text-white shadow-[2px_2px_6px_#d1d1d3] uppercase shrink-0">
                        {pointsText}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-200/50">
                      <div className="flex items-center gap-2">
                        <span className={`relative flex h-2.5 w-2.5 rounded-full ${statusInfo.dot}`}></span>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${statusInfo.color}`}>
                          {statusInfo.text}
                        </span>
                      </div>

                      {user?.role === "student" && item.status === "approved" && item.type === "request" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push("/submit-proof");
                          }}
                          className="rounded-full bg-black px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white shadow-[2px_2px_6px_#d1d1d3] transition-transform active:scale-95"
                        >
                          Submit Proof
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      <AdminReviewModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onApprove={selectedItem?.type === "request" ? undefined : handleVerify}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
