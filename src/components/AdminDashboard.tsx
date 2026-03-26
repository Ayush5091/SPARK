"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import UserAvatar from "@/components/UserAvatar";
import AdminReviewModal from "@/components/AdminReviewModal";
import EventCreateModal from "@/components/EventCreateModal";

export default function AdminDashboard() {
    const { user, token } = useAuth();

    const [submissions, setSubmissions] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [capacityEdits, setCapacityEdits] = useState<Record<number, string>>({});
    const [savingCapacityId, setSavingCapacityId] = useState<number | null>(null);

    // Modal state
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Event creation modal state
    const [isEventCreateModalOpen, setIsEventCreateModalOpen] = useState(false);

    const fetchData = async () => {
        if (!token) return;
        try {
            setIsLoading(true);
            const [eventsRes, eventSubsRes] = await Promise.all([
                fetch('/api/events', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/admin/event-submissions?status=pending_review', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (eventsRes.ok) setEvents(await eventsRes.json());

            // Add event submissions to regular submissions for review
            if (eventSubsRes.ok) {
                const eventSubmissions = await eventSubsRes.json();
                setSubmissions(eventSubmissions.map((sub: any) => ({
                    ...sub,
                    submission_id: sub.id,
                    activity_name: sub.event_name,
                    type: 'event_submission'
                })));
            } else {
                setSubmissions([]);
            }

        } catch (error) {
            console.error("Failed to fetch admin data", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [token]);

    const handleVerifySubmission = async (id: number, pointsAwarded?: number) => {
        setIsSubmitting(true);
        try {
            const endpoint = selectedItem?.type === 'event_submission'
                ? `/api/admin/event-submissions`
                : `/api/submissions/${id}/verify`;

            const body = selectedItem?.type === 'event_submission'
                ? { submission_id: id, action: 'approve', points_awarded: pointsAwarded }
                : undefined;

            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: body ? JSON.stringify(body) : undefined
            });
            if (res.ok) {
                setSubmissions(prev => prev.filter(s => s.submission_id !== id));
                setIsModalOpen(false);
                setSelectedItem(null);
            } else {
                alert("Failed to verify submission.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCapacitySave = async (eventId: number) => {
        const rawValue = capacityEdits[eventId];
        const capacityValue = rawValue === "" || rawValue === undefined ? null : parseInt(rawValue, 10);

        if (capacityValue !== null && (Number.isNaN(capacityValue) || capacityValue < 1)) {
            alert("Capacity must be a positive number or left blank.");
            return;
        }

        setSavingCapacityId(eventId);
        try {
            const res = await fetch(`/api/events/${eventId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ capacity: capacityValue })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Failed to update capacity");
            }

            setEvents(prev => prev.map(event => event.id === eventId ? { ...event, capacity: capacityValue } : event));
        } catch (err: any) {
            alert(err.message || "Failed to update capacity");
        } finally {
            setSavingCapacityId(null);
        }
    };

    const getEventStatus = (event: any) => {
        if (event.is_ongoing) return { color: 'bg-green-500', label: 'Active', textColor: 'text-green-600' };
        if (event.is_upcoming) return { color: 'bg-blue-500', label: 'Upcoming', textColor: 'text-blue-600' };
        return { color: 'bg-gray-400', label: 'Ended', textColor: 'text-gray-500' };
    };

    const getCategoryIcon = (category: string) => {
        switch (category?.toLowerCase()) {
            case 'cultural': return 'palette';
            case 'community service': return 'volunteer_activism';
            case 'technical': return 'computer';
            case 'sports': return 'sports_basketball';
            case 'professional': return 'work';
            case 'national initiative': return 'flag';
            default: return 'event';
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
            {/* Header */}
            <header className="pt-8 md:pt-10 pb-4 px-6 md:px-10 flex justify-between items-center sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4">
                    <UserAvatar name={user?.name || "Admin"} className="w-12 h-12 text-xl shadow-lg bg-black text-white dark:bg-white dark:text-black" />
                    <div>
                        <h1 className="text-sm md:text-base font-medium text-text-muted-light dark:text-text-muted-dark tracking-wide uppercase">Admin Portal</h1>
                        <h2 className="text-xl md:text-2xl font-bold leading-tight text-primary dark:text-white">Dashboard Overview</h2>
                    </div>
                </div>
                <button
                    onClick={() => setIsEventCreateModalOpen(true)}
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2 shadow-lg"
                >
                    <span className="material-icons-outlined text-xl">add</span>
                    <span className="hidden md:inline">Create Event</span>
                </button>
            </header>

            {/* Main Content */}
            <div className="flex-1 px-6 md:px-10 py-8 space-y-12 max-w-7xl mx-auto w-full">

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary dark:border-white"></div>
                    </div>
                ) : (
                    <>
                        {/* Stats Overview */}
                        <section>
                            <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-6">Quick Stats</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
                                            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">verified</span>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{submissions.length}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Pending Verifications</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center">
                                            <span className="material-symbols-outlined text-green-600 dark:text-green-400">event</span>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{events.filter(e => e.is_ongoing || e.is_upcoming).length}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Active Events</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center">
                                            <span className="material-icons-outlined text-purple-600 dark:text-purple-400">event</span>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{events.length}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Events</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Events Management */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Events Management</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage location-based events and photo verification</p>
                                </div>
                                <button
                                    onClick={() => setIsEventCreateModalOpen(true)}
                                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2"
                                >
                                    <span className="material-icons-outlined text-lg">add</span>
                                    New Event
                                </button>
                            </div>

                            {events.length === 0 ? (
                                <div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-gray-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                                    <div className="h-16 w-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                        <span className="material-symbols-outlined text-gray-400 text-3xl">event_note</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">No events created yet</h4>
                                    <p className="text-gray-500 mt-1 mb-4">Create your first location-based event for students to join.</p>
                                    <button
                                        onClick={() => setIsEventCreateModalOpen(true)}
                                        className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                                    >
                                        Create Event
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {events.slice(0, 6).map(event => {
                                        const status = getEventStatus(event);
                                        return (
                                            <div key={event.id} className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-primary text-lg">{getCategoryIcon(event.category)}</span>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 dark:text-white">{event.name}</h4>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">{event.category}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${status.color}`}>
                                                            {status.label}
                                                        </span>
                                                        <span className="text-primary font-bold">{event.points}pts</span>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{event.description}</p>

                                                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                                                    <span>📍 {event.location_name}</span>
                                                    <span>
                                                        {event.total_submissions || 0}
                                                        {event.capacity ? ` / ${event.capacity}` : ""} participants
                                                    </span>
                                                </div>

                                                <div className="mt-4 flex items-center gap-3">
                                                    <div className="flex-1">
                                                        <label className="block text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                                                            Capacity
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            placeholder="Unlimited"
                                                            value={capacityEdits[event.id] ?? (event.capacity ?? "")}
                                                            onChange={(e) => setCapacityEdits(prev => ({ ...prev, [event.id]: e.target.value }))}
                                                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => handleCapacitySave(event.id)}
                                                        disabled={savingCapacityId === event.id}
                                                        className="mt-6 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
                                                    >
                                                        {savingCapacityId === event.id ? "Saving..." : "Save"}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        {/* Pending Submissions Section */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Pending Verifications</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Student submissions awaiting verification (includes photo submissions).</p>
                                </div>
                                <div className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-bold px-3 py-1 rounded-full text-sm">
                                    {submissions.length}
                                </div>
                            </div>

                            {submissions.length === 0 ? (
                                <div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-gray-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                                    <div className="h-16 w-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                        <span className="material-symbols-outlined text-gray-400 text-3xl">verified</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">No submissions to verify</h4>
                                    <p className="text-gray-500 mt-1">All student submissions have been processed.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6">
                                    {submissions.map(sub => (
                                        <div
                                            key={sub.submission_id}
                                            onClick={() => {
                                                setSelectedItem({ ...sub, id: sub.submission_id, type: sub.type || 'submission', date: sub.submitted_at, activity: sub.activity_name });
                                                setIsModalOpen(true);
                                            }}
                                            className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow cursor-pointer"
                                        >
                                            <div className="flex items-center gap-5 md:w-1/3">
                                                <UserAvatar name={sub.student_name} className="w-12 h-12 shrink-0 border-2 border-green-100 dark:border-green-900/30" />
                                                <div>
                                                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">{sub.student_name}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium text-gray-400">
                                                            Submitted: {new Date(sub.submitted_at).toLocaleDateString()}
                                                        </span>
                                                        {sub.type === 'event_submission' && (
                                                            <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                                                                Photo Submission
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="md:w-1/3 border-l-2 border-gray-50 dark:border-gray-800 pl-6 py-2">
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Activity</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{sub.activity_name}</p>
                                            </div>

                                            <div className="md:w-1/3 flex justify-end shrink-0">
                                                <span className="text-primary font-bold hover:underline flex items-center gap-1">
                                                    Review {sub.type === 'event_submission' ? 'Photo' : 'Proof'} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>

            {/* Admin Review Modal */}
            <AdminReviewModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedItem(null); }}
                item={selectedItem}
                onApprove={handleVerifySubmission}
                isSubmitting={isSubmitting}
            />

            {/* Event Creation Modal */}
            <EventCreateModal
                isOpen={isEventCreateModalOpen}
                onClose={() => setIsEventCreateModalOpen(false)}
                onEventCreated={fetchData}
            />
        </div>
    );
}
