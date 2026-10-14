"use client";

import Link from "next/link";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";

export default function ProfileScreen() {
    const { user, token, profile, profileLoading, isLoading, isInitializing, logout, refreshProfile } = useAuth();
    const router = useRouter();

    const studentInfo = profile;
    const [recentActivities, setRecentActivities] = useState<any[]>([]);
    const [chartData, setChartData] = useState<{ labels: string[], data: number[], maxVal: number }>({ labels: [], data: [], maxVal: 100 });
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    useEffect(() => {
        if (isLoading) return;

        if (!user) {
            router.push('/login');
            return;
        }

        const fetchData = async () => {
            try {
                // Also refresh profile data to ensure we have latest points
                await refreshProfile();

                // Submissions to admin-published and personal events are the source of points
                const [subRes, notifRes] = await Promise.all([
                    fetch('/api/event-submissions', { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch('/api/notifications', { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                if (notifRes.ok) {
                    setNotifications(await notifRes.json());
                }

                const submissions: any[] = subRes.ok ? await subRes.json() : [];
                const history = (Array.isArray(submissions) ? submissions : [])
                    .map((sub: any) => ({
                        ...sub,
                        activity: sub.event_name,
                        date: sub.reviewed_at || sub.submitted_at,
                        status: sub.status === 'pending_review' ? 'in review' : sub.status,
                    }))
                    .filter((item: any) => item.date)
                    .sort((x: any, y: any) => new Date(y.date).getTime() - new Date(x.date).getTime());

                setRecentActivities(history.slice(0, 3)); // Only latest 3

                // Points earned per month over the last six months
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const currentDate = new Date();
                const last6Months = Array.from({ length: 6 }, (_, i) => {
                    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - (5 - i), 1);
                    return { monthLabel: months[d.getMonth()], year: d.getFullYear(), month: d.getMonth(), points: 0 };
                });

                history.forEach((item: any) => {
                    if (item.status === 'verified') {
                        const d = new Date(item.date);
                        const bucket = last6Months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
                        if (bucket) {
                            bucket.points += Number(item.points_awarded || 0);
                        }
                    }
                });

                // An empty history shows an empty chart, never placeholder numbers
                const data = last6Months.map(m => m.points);
                setChartData({ labels: last6Months.map(m => m.monthLabel), data, maxVal: Math.max(10, ...data) });
            } catch (err) {
                console.error("Failed to load dashboard data");
            }
        };

        fetchData();
    }, [user, token, isLoading, router]);

    const handleMarkAsRead = async () => {
        if (!token || unreadCount === 0) return;
        try {
            await fetch('/api/notifications', { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            console.error("Failed to mark notifications as read", err);
        }
    };

    const toggleNotifications = () => {
        const isOpening = !isNotificationsOpen;
        setIsNotificationsOpen(isOpening);
        if (isOpening) {
            handleMarkAsRead();
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    // Generate dynamic SVG path for chart
    const w = 300;
    const h = 80;
    const bottomOffset = 20; // h + offset = 100 which is the viewBox height
    const dx = w / 5; // Distance between 6 points

    // Convert data points to Y coordinates (0 to 80, inverted so 0 is top)
    const coords = chartData.data.map((val, i) => {
        const y = h - ((val / chartData.maxVal) * h) + bottomOffset; // Base line is at y=100
        return { x: i * dx, y: y };
    });

    // Calculate smooth curves
    let pathD = "M0,100";
    let finalPoint = { x: 0, y: 100 };
    if (coords.length > 0) {
        pathD = `M${coords[0].x},${coords[0].y} `;
        finalPoint = coords[0];
        if (coords.length > 1) {
            pathD = `M${coords[0].x},${coords[0].y} C ${coords[0].x + dx / 2},${coords[0].y} ${coords[1].x - dx / 2},${coords[1].y} ${coords[1].x},${coords[1].y} `;
            for (let i = 2; i < coords.length; i++) {
                pathD += `S ${coords[i].x - dx / 2},${coords[i].y} ${coords[i].x},${coords[i].y} `;
            }
            finalPoint = coords[coords.length - 1];
        }
    }

    const totalPoints = studentInfo?.total_points || 0;
    const targetPoints = 100;
    const progressPercent = Math.min(100, Math.round((totalPoints / targetPoints) * 100));

    const getCategoryIconInfo = (category: string) => {
        switch (category?.toLowerCase()) {
            case 'cultural':
                return { icon: 'palette', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' };
            case 'community service':
                return { icon: 'volunteer_activism', bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-600 dark:text-pink-400' };
            case 'technical':
                return { icon: 'computer', bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400' };
            case 'sports':
                return { icon: 'sports_basketball', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' };
            case 'professional':
                return { icon: 'work', bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400' };
            case 'national initiative':
                return { icon: 'flag', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' };
            default:
                return { icon: 'assignment', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' };
        }
    };

    if (isLoading || isInitializing || !user || profileLoading) {
        return (
            <div className="max-w-md mx-auto min-h-screen flex items-center justify-center bg-[#F8F9FA]">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Loading profile...</div>
            </div>
        );
    }

    if (user?.role === 'admin') {
        return (
            <div className="max-w-md md:max-w-5xl mx-auto min-h-screen bg-[#F8F9FA] font-sans relative pb-24 md:pb-12 overflow-hidden text-black flex flex-col">
                {/* Header */}
                <header className="flex items-center justify-between px-6 pt-10 pb-6">
                    <div className="flex items-center gap-3">
                        <UserAvatar name={profile?.name || user?.name} className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center text-lg font-bold" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Admin</span>
                            <span className="text-lg font-black tracking-tight text-black">Profile</span>
                        </div>
                    </div>
                    <Link
                        href="/settings"
                        className="flex items-center justify-center w-12 h-12 rounded-full text-black ui-card transition-all active:bg-[#E9ECEF]"
                    >
                        <span className="material-icons-outlined text-2xl">settings</span>
                    </Link>
                </header>

                {/* Admin Profile Content */}
                <div className="flex-1 px-6 py-6 space-y-8 flex flex-col">
                    <div className="rounded-2xl p-8 ui-card text-center">
                        <UserAvatar name={profile?.name || user?.name} className="w-24 h-24 text-4xl mx-auto mb-4 bg-gray-900 text-white flex items-center justify-center rounded-full " />
                        <h3 className="text-2xl font-black tracking-tight text-black">{profile?.name || user?.name || "Admin"}</h3>
                        <span className="inline-block bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded-full mt-3 uppercase tracking-widest ">Administrator</span>
                        <p className="text-gray-500 font-medium text-sm mt-4">{profile?.email || "N/A"}</p>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-5">
                        <Link href="/settings"className="p-6 rounded-2xl ui-card flex flex-col items-center justify-center gap-3 transition-transform active:scale-95">
                            <div className="h-12 w-12 rounded-2xl bg-black text-white flex items-center justify-center ">
                                <span className="material-icons-outlined text-2xl">settings</span>
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-black">Settings</span>
                        </Link>

                        <button onClick={logout} className="p-6 rounded-2xl ui-card flex flex-col items-center justify-center gap-3 transition-transform active:scale-95">
                            <div className="h-12 w-12 rounded-2xl bg-red-600 text-white flex items-center justify-center ">
                                <span className="material-icons-outlined text-2xl">logout</span>
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-red-600">Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const name = studentInfo?.name || user?.name || "Student";
    const email = studentInfo?.email || "N/A";
    const usn = studentInfo?.usn || "N/A";
    const phoneNumber = studentInfo?.phone_number || "Not set";
    const department = studentInfo?.department || "Not set";
    const semester = studentInfo?.semester || "Not set";
    const completedCount = studentInfo?.completed_activities || 0;

    return (
        <div className="max-w-md md:max-w-5xl mx-auto min-h-screen bg-[#F8F9FA] font-sans relative pb-24 md:pb-12 overflow-hidden text-black flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-6 pt-10 pb-6 sticky top-0 z-20 bg-[#F8F9FA]/90 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <Link
                        href="/"
                        className="flex items-center justify-center w-12 h-12 rounded-full text-black ui-card active:bg-[#E9ECEF] transition-all"
                    >
                        <span className="material-symbols-outlined text-2xl">arrow_back</span>
                    </Link>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Dashboard</span>
                        <span className="text-lg font-black tracking-tight text-black">{name.split(" ")[0]}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleNotifications}
                        className="relative flex items-center justify-center w-12 h-12 rounded-full text-black ui-card transition-all active:bg-[#E9ECEF]"
                    >
                        <span className="material-icons-outlined text-2xl">notifications</span>
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-black border-2 border-white"></span>
                        )}
                    </button>

                    <Link
                        href="/settings"
                        className="flex items-center justify-center w-12 h-12 rounded-full text-black ui-card transition-all active:bg-[#E9ECEF]"
                    >
                        <span className="material-icons-outlined text-2xl">settings</span>
                    </Link>

                    {/* Notifications Dropdown */}
                    {isNotificationsOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsNotificationsOpen(false)}></div>
                            <div className="absolute right-6 top-24 mt-2 w-72 max-h-80 overflow-y-auto rounded-2xl ui-card z-20 py-2">
                                <div className="px-4 py-2 border-b border-[#E9ECEF] flex justify-between items-center">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-black">Notifications</h3>
                                </div>
                                <div className="flex flex-col">
                                    {notifications.length === 0 ? (
                                        <p className="text-gray-500 text-xs p-4 text-center font-semibold uppercase">No notifications yet.</p>
                                    ) : (
                                        notifications.map(n => (
                                            <div key={n.id} className={`p-4 border-b border-gray-200/30 transition-colors ${!n.is_read ? 'bg-black/5' : ''}`}>
                                                <p className="text-xs font-medium text-black leading-relaxed">{n.message}</p>
                                                <p className="text-[10px] text-gray-400 font-bold mt-1.5 uppercase">{new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 px-6 py-6 pb-28 flex flex-col md:grid md:grid-cols-2 md:gap-8 space-y-8 md:space-y-0">
                {/* Left Column */}
                <div className="space-y-8">
                    {/* Points Card */}
                    <section className="w-full">
                        <div className="rounded-2xl p-6 ui-card relative overflow-hidden">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase block mb-1">Total Activity Points</span>
                                    <h3 className="text-3xl font-black text-black tracking-tight">{totalPoints} <span className="text-sm font-bold text-gray-400">/ {targetPoints}</span></h3>
                                </div>
                                <div className="relative h-16 w-16 shrink-0">
                                    <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                                        <path className="text-[#E9ECEF]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"fill="none"stroke="currentColor"strokeWidth="3"></path>
                                        <path className="text-black" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${progressPercent}, 100`} strokeLinecap="round" strokeWidth="3"></path>
                                    </svg>
                                    <div className="absolute top-0 left-0 flex h-full w-full items-center justify-center">
                                        <span className="text-[10px] font-black text-black">{progressPercent}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Chart */}
                            <div className="pt-4 border-t border-[#E9ECEF]">
                                <div className="relative flex justify-between items-end h-20 w-full">
                                    <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                                        <defs>
                                            <linearGradient id="gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                                                <stop offset="0%" style={{ stopColor: 'black', stopOpacity: 0.15 }}></stop>
                                                <stop offset="100%" style={{ stopColor: 'black', stopOpacity: 0 }}></stop>
                                            </linearGradient>
                                        </defs>
                                        <path className="chart-path" d={pathD} fill="none" stroke="black" strokeLinecap="round" strokeWidth="3"></path>
                                        <path d={`${pathD} V100 H0 Z`} fill="url(#gradient)" opacity="0.5" stroke="none"></path>
                                    </svg>

                                    <div
                                        className="absolute w-2.5 h-2.5 rounded-full bg-black border-2 border-white shadow-lg z-20"
                                        style={{
                                            left: `100%`,
                                            bottom: `${100 - (finalPoint.y / 100 * 100)}%`,
                                            transform: 'translate(-50%, 50%)'
                                        }}
                                    />
                                </div>
                                <div className="flex justify-between mt-2 text-[9px] text-gray-400 font-bold uppercase px-1">
                                    {chartData.labels.map((label, idx) => (
                                        <span key={idx} className={idx === chartData.labels.length - 1 ? "text-black font-black" : ""}>{label}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Stats Summary Widgets */}
                    <section className="grid grid-cols-2 gap-4">
                        <div className="rounded-2xl p-4 flex flex-col justify-between h-24 ui-card">
                            <span className="material-symbols-outlined text-black text-lg">star</span>
                            <div>
                                <p className="text-2xl font-black text-black leading-none">{totalPoints}</p>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mt-1">Total Points</p>
                            </div>
                        </div>

                        <div className="rounded-2xl p-4 flex flex-col justify-between h-24 ui-card">
                            <span className="material-symbols-outlined text-black text-lg">assignment_turned_in</span>
                            <div>
                                <p className="text-2xl font-black text-black leading-none">{completedCount}</p>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mt-1">Completed Events</p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                    {/* Profile Info Section */}
                    <section className="space-y-4">
                        <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase ml-1">Profile Info</span>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl ui-card">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">USN</span>
                                <p className="text-xs font-black text-black truncate uppercase tracking-wider">{usn}</p>
                            </div>

                            <div className="p-4 rounded-2xl ui-card">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Department</span>
                                <p className="text-xs font-black text-black truncate uppercase tracking-wider">{department}</p>
                            </div>

                            <div className="p-4 rounded-2xl ui-card">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Semester</span>
                                <p className="text-xs font-black text-black uppercase tracking-wider">{semester}</p>
                            </div>

                            <div className="p-4 rounded-2xl ui-card">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Contact</span>
                                <p className="text-xs font-black text-black uppercase tracking-wider">{phoneNumber}</p>
                            </div>
                        </div>
                    </section>

                    {/* Recent Activities */}
                    <section className="space-y-4">
                        <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase ml-1">Recent Activities</span>

                        <div className="flex flex-col gap-4">
                            {recentActivities.length === 0 ? (
                                <div className="rounded-2xl p-6 text-center text-xs font-bold uppercase tracking-wider text-gray-400 ui-well">
                                    No recent activities.
                                </div>
                            ) : recentActivities.map((activity, idx) => (
                                <div key={idx} className="p-4 rounded-2xl ui-card flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 shrink-0 rounded-xl bg-gray-900 text-white flex items-center justify-center ">
                                            <span className="material-icons-outlined text-xl">
                                                {getCategoryIconInfo(activity.category).icon}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-xs font-black text-black truncate">{activity.activity_name || activity.activity || 'Activity'}</h4>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                                                {new Date(activity.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-black ui-well">
                                        {activity.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
