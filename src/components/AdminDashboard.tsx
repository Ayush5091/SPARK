"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/AuthContext";
import UserAvatar from "@/components/UserAvatar";
import AdminReviewModal from "@/components/AdminReviewModal";

export default function AdminDashboard() {
    const { user, token } = useAuth();

    const [submissions, setSubmissions] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [departmentFilter, setDepartmentFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Modal state
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = async (showLoader = true) => {
        if (!token) return;
        try {
            if (showLoader) setIsLoading(true);
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
            if (showLoader) setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [token]);

    const availableDepartments = useMemo(() => {
        const departments = submissions
            .map((sub) => sub.student_department)
            .filter((value) => typeof value === "string" && value.trim().length > 0);
        return Array.from(new Set(departments)).sort();
    }, [submissions]);

    const normalizedSearch = searchQuery.trim().toLowerCase();

    const filteredSubmissions = useMemo(() => {
        const byDepartment = departmentFilter === "all"
            ? submissions
            : submissions.filter((sub) => sub.student_department === departmentFilter);

        if (!normalizedSearch) return byDepartment;

        return byDepartment.filter((sub) => {
            const haystack = [
                sub.student_name,
                sub.student_department,
                sub.activity_name,
                sub.event_name,
                sub.status,
                sub.points_awarded,
                sub.event_points,
            ]
                .filter((value) => value !== undefined && value !== null)
                .join(" ")
                .toLowerCase();

            return haystack.includes(normalizedSearch);
        });
    }, [departmentFilter, submissions, normalizedSearch]);

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
                <Link
                    href="/admin/events"
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2 shadow-lg"
                >
                    <span className="material-icons-outlined text-xl">event_note</span>
                    <span className="hidden md:inline">Manage Events</span>
                </Link>
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
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredSubmissions.length}</p>
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

                        <section className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-[#121212] p-6 shadow-sm backdrop-blur-sm">
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                <div className="max-w-2xl">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Event management moved to its own page</h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        Keep the dashboard focused on approvals. Use the dedicated event manager when you need to create, duplicate, or adjust capacities.
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <Link
                                        href="/admin/events"
                                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-dark"
                                    >
                                        <span className="material-icons-outlined text-lg">event_note</span>
                                        Open Event Manager
                                    </Link>
                                    <Link
                                        href="/admin/events?new=1"
                                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                                    >
                                        <span className="material-icons-outlined text-lg">add</span>
                                        Create Event
                                    </Link>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-[#121212] p-6 shadow-sm backdrop-blur-sm">
                            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                                <div className="max-w-2xl">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Verification toolbar</h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        Search submissions and narrow the review queue by department.
                                    </p>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:min-w-[48rem]">
                                    <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 sm:col-span-2 xl:col-span-2">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Search</span>
                                        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
                                            <span className="material-symbols-outlined text-gray-400 text-lg">search</span>
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Students, departments, activities, status..."
                                                className="w-full border-0 bg-transparent p-0 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                                            />
                                        </div>
                                    </label>

                                    <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Department</span>
                                        <select
                                            value={departmentFilter}
                                            onChange={(e) => setDepartmentFilter(e.target.value)}
                                            className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white"
                                        >
                                            <option value="all">All departments</option>
                                            {availableDepartments.map((department) => (
                                                <option key={department} value={department}>
                                                    {department}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                            </div>
                        </section>

                        {/* Pending Submissions Section */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Pending Verifications</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Student submissions awaiting verification (includes photo submissions).</p>
                                </div>
                                <div className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-bold px-3 py-1 rounded-full text-sm">
                                    {filteredSubmissions.length}
                                </div>
                            </div>

                            {filteredSubmissions.length === 0 ? (
                                <div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-gray-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                                    <div className="h-16 w-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                        <span className="material-symbols-outlined text-gray-400 text-3xl">verified</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">No submissions to verify</h4>
                                    <p className="text-gray-500 mt-1">All student submissions have been processed.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-5">
                                    {filteredSubmissions.map(sub => (
                                        <button
                                            key={sub.submission_id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedItem({ ...sub, id: sub.submission_id, type: sub.type || 'submission', date: sub.submitted_at, activity: sub.activity_name });
                                                setIsModalOpen(true);
                                            }}
                                            className="group rounded-3xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lg dark:border-gray-800 dark:bg-[#121212]"
                                        >
                                            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                                                <div className="flex min-w-0 items-start gap-4 md:w-[30%]">
                                                    <UserAvatar name={sub.student_name} className="w-12 h-12 shrink-0 border-2 border-green-100 dark:border-green-900/30" />
                                                    <div className="min-w-0">
                                                        <h4 className="truncate text-lg font-bold text-gray-900 dark:text-white">{sub.student_name}</h4>
                                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{sub.student_department || 'Department not set'}</p>
                                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-400">
                                                            <span>Submitted {new Date(sub.submitted_at).toLocaleDateString()}</span>
                                                            {sub.type === 'event_submission' && (
                                                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                                    Photo Submission
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="min-w-0 rounded-2xl border border-gray-100 bg-gray-50 p-4 md:w-[42%] dark:border-gray-800 dark:bg-gray-900/60">
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Activity</p>
                                                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{sub.activity_name}</p>
                                                    {sub.type === 'event_submission' && sub.verification_result && (
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${sub.verification_result.locationMatch ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                                                                Location {sub.verification_result.locationMatch ? 'OK' : 'Mismatch'}
                                                            </span>
                                                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${sub.verification_result.timeMatch ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                                                                Time {sub.verification_result.timeMatch ? 'OK' : 'Mismatch'}
                                                            </span>
                                                            {sub.verification_result.reason && (
                                                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                                                    Evidence captured
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {sub.verification_result?.reason && (
                                                        <p className="mt-3 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                                            {sub.verification_result.reason}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between gap-3 md:w-[20%] md:flex-col md:items-end md:text-right">
                                                    <span className="text-primary font-bold transition-transform group-hover:translate-x-0.5 flex items-center gap-1">
                                                        Review {sub.type === 'event_submission' ? 'Photo' : 'Proof'} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                                    </span>
                                                    <span className="text-xs font-medium text-gray-400 md:text-right">Open the review panel for approval or point adjustments.</span>
                                                </div>
                                            </div>
                                        </button>
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
        </div>
    );
}
