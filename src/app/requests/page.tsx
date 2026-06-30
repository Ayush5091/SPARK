"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminReviewModal from '@/components/AdminReviewModal';

export default function RequestsScreen() {
    const { token, user } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'pending' | 'evaluated'>('pending');
    const [requestItems, setRequestItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!token) return;
        const fetchData = async () => {
            try {
                const endpoint = user?.role === 'admin' ? '/api/activity-requests' : '/api/activity-requests/me';
                const reqRes = await fetch(endpoint, { headers: { 'Authorization': `Bearer ${token}` } });
                const requests = await reqRes.json();

                const items: any[] = [];
                if (Array.isArray(requests)) {
                    requests.forEach((r: any) => {
                        items.push({
                            id: r.request_id,
                            activity: r.activity || r.activity_name,
                            points: r.points,
                            category: r.category,
                            status: r.status, // pending, approved, rejected
                            date: r.requested_at,
                            student_name: r.student_name,
                            description: r.description
                        });
                    });
                }

                // Sort by date descending
                items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setRequestItems(items);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token, user]);

    const handleApprove = async (id: number) => {
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/activity-requests/${id}/approve`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setRequestItems(prev => prev.map(item => item.id === id ? { ...item, status: 'approved' } : item));
                setIsModalOpen(false);
                setSelectedItem(null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const pendingItems = requestItems.filter(i => i.status === 'pending');
    // Only show evaluated items (rejected) for students, or all evaluated (including approved) for admins
    const evaluatedItems = requestItems.filter(i =>
        user?.role === 'admin' ? (i.status === 'approved' || i.status === 'rejected') : i.status === 'rejected'
    );
    const currentItems = activeTab === 'pending' ? pendingItems : evaluatedItems;

    const getStatusDisplay = (item: any) => {
        if (item.status === 'pending') return { text: 'Pending Approval', color: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' };
        if (item.status === 'approved') return { text: 'Approved - Submit Proof', color: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' };
        if (item.status === 'rejected') return { text: 'Request Rejected', color: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' };
        return { text: 'Unknown', color: 'text-gray-500', dot: 'bg-gray-500' };
    };

    return (
    <div className="max-w-md md:max-w-5xl mx-auto min-h-screen bg-[#F0F0F3] font-sans relative pb-24 md:pb-12 overflow-hidden text-black selection:bg-black selection:text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-10 pb-6 sticky top-0 z-20 bg-[#F0F0F3]/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center justify-center w-12 h-12 rounded-full bg-[#F0F0F3] text-black shadow-[6px_6px_12px_#d1d1d3,-6px_-6px_12px_#ffffff] active:shadow-[inset_4px_4px_8px_#d1d1d3] transition-all"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </Link>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Activity</span>
            <h1 className="text-lg font-black tracking-tight text-black">Requests</h1>
          </div>
        </div>
        
        {user?.role !== 'admin' && (
          <Link
            href="/request-activity"
            className="flex items-center justify-center w-12 h-12 rounded-full bg-[#F0F0F3] text-black shadow-[6px_6px_12px_#d1d1d3,-6px_-6px_12px_#ffffff] active:shadow-[inset_4px_4px_8px_#d1d1d3] transition-all hover:scale-105"
          >
            <span className="material-symbols-outlined text-2xl">add</span>
          </Link>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-4 pb-28 space-y-6">
        {/* Segmented Control */}
        <div className="flex h-12 items-center justify-center rounded-2xl bg-[#F0F0F3] shadow-[inset_3px_3px_6px_#d1d1d3,inset_-3px_-3px_6px_#ffffff] p-1 w-full relative">
          <div
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#F0F0F3] rounded-xl shadow-[2px_2px_6px_#d1d1d3,-2px_-2px_6px_#ffffff] z-0 transition-transform duration-300 ease-out"
            style={{
              transform: activeTab === 'evaluated' ? "translateX(calc(100% - 4px))" : "translateX(4px)",
              left: 0,
            }}
          ></div>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider relative z-10 text-center transition-colors ${
              activeTab === 'pending' ? 'text-black' : 'text-gray-400'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab('evaluated')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider relative z-10 text-center transition-colors ${
              activeTab === 'evaluated' ? 'text-black' : 'text-gray-400'
            }`}
          >
            Evaluated
          </button>
        </div>

        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            {activeTab === 'pending' ? `In Progress (${pendingItems.length})` : `Completed (${evaluatedItems.length})`}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs font-bold uppercase tracking-widest text-gray-400 animate-pulse">
            Loading requests...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentItems.length === 0 ? (
              <div className="col-span-full rounded-3xl bg-[#F0F0F3] p-12 text-center text-xs font-bold uppercase tracking-wider text-gray-400 shadow-[inset_3px_3px_6px_#d1d1d3,inset_-3px_-3px_6px_#ffffff] border border-gray-100/50">
                No {activeTab} requests found.
              </div>
            ) : currentItems.map((item, idx) => {
              const statusInfo = getStatusDisplay(item);
              const actName = item.activity || 'Unknown Activity';
              const pointsText = `+${item.points ?? 0} PTS`;
              const dateStr = item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
              const isAdmin = user?.role === 'admin';

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (isAdmin && item.status === 'pending') {
                      setSelectedItem({ ...item, type: 'request' });
                      setIsModalOpen(true);
                    }
                  }}
                  className={`bg-[#F0F0F3] rounded-3xl p-6 shadow-[8px_8px_16px_#d1d1d3,-8px_-8px_16px_#ffffff] border border-white/20 relative overflow-hidden transition-all duration-300 ${
                    isAdmin && item.status === 'pending' ? 'cursor-pointer hover:translate-y-[-2px]' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-base font-black text-black leading-tight mb-2">
                        {item.student_name ? `${item.student_name}: ${actName}` : actName}
                      </h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{dateStr}</p>
                    </div>
                    <span className="rounded-full bg-black px-3 py-1.5 text-[9px] font-bold tracking-widest text-white shadow-[2px_2px_6px_#d1d1d3] uppercase shrink-0 ml-3">
                      {pointsText}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-xs text-gray-500 font-medium mb-4 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200/50">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                        item.status === 'approved' 
                          ? 'bg-[#F0F0F3] text-green-600 shadow-[inset_2px_2px_4px_#d1d1d3,inset_-2px_-2px_4px_#ffffff]' 
                          : item.status === 'rejected'
                          ? 'bg-[#F0F0F3] text-red-600 shadow-[inset_2px_2px_4px_#d1d1d3,inset_-2px_-2px_4px_#ffffff]'
                          : 'bg-[#F0F0F3] text-orange-600 shadow-[inset_2px_2px_4px_#d1d1d3,inset_-2px_-2px_4px_#ffffff]'
                      }`}>
                        {statusInfo.text}
                      </span>
                    </div>

                    {user?.role === 'student' && item.status === 'approved' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push('/submit-proof');
                        }}
                        className="rounded-2xl bg-black text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest shadow-[2px_2px_6px_#b8b8ba] active:scale-95 transition-all"
                      >
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
        onClose={() => {
          setIsModalOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onApprove={handleApprove}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
