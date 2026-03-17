"use client";

import Link from "next/link";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import AdminDashboard from "@/components/AdminDashboard";

export default function Home() {
  const { user, token, profile, profileLoading, isLoading, isInitializing } = useAuth();
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
        const [reqRes, subRes, notifRes] = await Promise.all([
          fetch('/api/activity-requests/me', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/submissions/me', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/notifications', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (notifRes.ok) {
          setNotifications(await notifRes.json());
        }

        // Merge requests and submissions for Dashboard History
        let history: any[] = [];
        if (reqRes.ok && subRes.ok) {
          const requests = await reqRes.json();
          const submissions = await subRes.json();

          const subMap = new Map();
          if (Array.isArray(submissions)) {
            submissions.forEach((s: any) => subMap.set(s.request_id || s.id, s));
          }

          if (Array.isArray(requests)) {
            requests.forEach((r: any) => {
              const sub = subMap.get(r.request_id || r.id);
              if (sub) {
                history.push({ ...sub, type: 'submission', date: sub.submitted_at, activity: sub.activity || r.activity || r.activity_name });
              } else {
                history.push({ ...r, type: 'request', date: r.requested_at, activity: r.activity || r.activity_name });
              }
            });
          }
          history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }

        setRecentActivities(history.slice(0, 3)); // Only latest 3

        // Calculate past 6 months data for the graph
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const currentDate = new Date();
        const last6Months = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - (5 - i), 1);
          return { monthLabel: months[d.getMonth()], year: d.getFullYear(), month: d.getMonth(), points: 0 };
        });

        // Aggregate verified submission points and approved requests
        history.forEach((item: any) => {
          if ((item.status === 'verified' || item.status === 'approved') && item.date) {
            const d = new Date(item.date);
            const bucket = last6Months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
            if (bucket) {
              bucket.points += (item.points || 0);
            }
          }
        });

        const data = last6Months.map(b => b.points);
        const maxVal = Math.max(10, ...data); // Ensure there's at least some scale

        // Fallback static data if no history so graph doesn't look empty and flat
        if (data.every(v => v === 0)) {
          setChartData({ labels: last6Months.map(m => m.monthLabel), data: [10, 20, 15, 30, 25, 40], maxVal: 50 });
        } else {
          setChartData({ labels: last6Months.map(m => m.monthLabel), data, maxVal });
        }
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

  // Generate dynamic SVG path
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

  if (isLoading || isInitializing || !user || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary text-primary"></div>
      </div>
    );
  }

  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

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

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="pt-8 md:pt-10 pb-4 px-6 md:px-10 flex justify-between items-center sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <UserAvatar name={studentInfo?.name || user?.name} className="w-10 h-10 md:w-12 md:h-12 text-lg md:text-xl shadow-lg" />
          <div>
            <h1 className="text-sm md:text-base font-medium text-text-muted-light dark:text-text-muted-dark">Welcome back,</h1>
            <h2 className="text-lg md:text-2xl font-bold leading-tight text-primary dark:text-white">{studentInfo?.name || user?.name || "Student"}</h2>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={toggleNotifications}
            className="relative p-2 rounded-full hover:bg-subtle-light dark:hover:bg-subtle-dark transition-colors text-primary dark:text-white"
          >
            <span className="material-icons-outlined text-2xl">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-background-light dark:border-background-dark"></span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsNotificationsOpen(false)}></div>
              <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-[#202020] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 z-20 py-2">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 dark:text-white">Notifications</h3>
                </div>
                <div className="flex flex-col">
                  {notifications.length === 0 ? (
                    <p className="text-gray-500 text-sm p-4 text-center">No notifications yet.</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`p-4 border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!n.is_read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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
      <div className="flex-1 px-6 md:px-10 pb-24 space-y-8 max-w-7xl mx-auto w-full">

        {/* Points Card */}
        <section className="space-y-4">
          <div className="bg-primary text-white rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-soft relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-40 h-40 md:w-64 md:h-64 bg-white opacity-5 rounded-full blur-2xl md:blur-3xl"></div>
            <div className="flex justify-between items-start mb-6 md:mb-8 relative z-10">
              <div>
                <p className="text-sm md:text-base font-medium text-gray-300 mb-1">Total Activity Points</p>
                <h3 className="text-3xl md:text-5xl font-bold tracking-tight mt-1">{totalPoints} <span className="text-lg md:text-2xl font-normal text-gray-400">/ {targetPoints}</span></h3>
              </div>
              <div className="relative h-16 w-16 md:h-24 md:w-24">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                  <path className="text-gray-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                  <path className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${progressPercent}, 100`} strokeLinecap="round" strokeWidth="3"></path>
                </svg>
                <div className="absolute top-0 left-0 flex h-full w-full items-center justify-center">
                  <span className="text-xs md:text-sm font-bold">{progressPercent}%</span>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="mt-2 md:mt-6 pt-4 md:pt-6 border-t border-gray-800 relative z-10">
              <div className="relative flex justify-between items-end h-24 md:h-32 w-full">

                {/* SVG Line and Gradient */}
                <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: 'white', stopOpacity: 0.2 }}></stop>
                      <stop offset="100%" style={{ stopColor: 'white', stopOpacity: 0 }}></stop>
                    </linearGradient>
                  </defs>
                  <path className="chart-path drop-shadow-md" d={pathD} fill="none" stroke="white" strokeLinecap="round" strokeWidth="3"></path>
                  <path d={`${pathD} V100 H0 Z`} fill="url(#gradient)" opacity="0.5" stroke="none"></path>
                </svg>

                {/* HTML Pointer - Solves aspect ratio stretch */}
                <div
                  className="absolute w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#1A1A1A] border-2 border-white shadow-lg z-20"
                  style={{
                    left: `100%`,
                    bottom: `${100 - (finalPoint.y / 100 * 100)}%`,
                    transform: 'translate(-50%, 50%)'
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[10px] md:text-xs text-gray-400 font-medium px-1">
                {chartData.labels.map((label, idx) => (
                  <span key={idx} className={idx === chartData.labels.length - 1 ? "text-white" : ""}>{label}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions & Recent Activities grid on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          <section className="lg:col-span-4 space-y-4">
            <h3 className="text-lg md:text-xl font-bold text-text-light dark:text-text-dark mb-4">Activity Actions</h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              <Link href="/request-activity" className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-soft flex flex-col items-center justify-center gap-3 hover:scale-[1.02] hover:shadow-md active:scale-95 transition-all group border border-transparent hover:border-subtle-light dark:hover:border-subtle-dark">
                <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-subtle-light dark:bg-subtle-dark flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <span className="material-icons-outlined text-2xl md:text-3xl text-primary dark:text-white group-hover:text-white">business_center</span>
                </div>
                <div className="text-center">
                  <span className="block text-sm md:text-base font-semibold text-text-light dark:text-text-dark">Request Activity</span>
                  <span className="block text-xs md:text-sm text-text-muted-light dark:text-text-muted-dark font-medium mt-1">+ Register New</span>
                </div>
              </Link>

              <Link href="/submit-proof" className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-soft flex flex-col items-center justify-center gap-3 hover:scale-[1.02] hover:shadow-md active:scale-95 transition-all group border border-transparent hover:border-subtle-light dark:hover:border-subtle-dark">
                <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-subtle-light dark:bg-subtle-dark flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <span className="material-icons-outlined text-2xl md:text-3xl text-primary dark:text-white group-hover:text-white">upload_file</span>
                </div>
                <div className="text-center">
                  <span className="block text-sm md:text-base font-semibold text-text-light dark:text-text-dark">Submit Proof</span>
                  <span className="block text-xs md:text-sm text-text-muted-light dark:text-text-muted-dark font-medium mt-1">Link / Document</span>
                </div>
              </Link>
            </div>
          </section>

          <section className="lg:col-span-8 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg md:text-xl font-bold text-text-light dark:text-text-dark">Recent Activities</h3>
              <button className="flex items-center gap-1 text-xs md:text-sm font-semibold text-text-muted-light dark:text-text-muted-dark bg-card-light dark:bg-card-dark shadow-sm border border-subtle-light dark:border-subtle-dark hover:bg-subtle-light dark:hover:bg-subtle-dark px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-colors">
                Sort by <span className="material-icons-outlined text-sm">keyboard_arrow_down</span>
              </button>
            </div>

            <div className="space-y-4">
              {recentActivities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No recent activities. It's time to request one!
                </div>
              ) : recentActivities.map((activity, idx) => (
                <div key={idx} className={`bg-card-light dark:bg-card-dark p-4 md:p-5 rounded-2xl shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${activity.status === 'verified' ? 'opacity-80 hover:opacity-100' : 'hover:shadow-md border-2 border-transparent hover:border-subtle-light dark:hover:border-subtle-dark'}`}>
                  <div className="flex items-center gap-4 md:gap-5">
                    {(() => {
                      const catInfo = getCategoryIconInfo(activity.category);
                      return (
                        <div className={`h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-xl flex items-center justify-center ${catInfo.bg} ${catInfo.text}`}>
                          <span className="material-icons-outlined md:text-3xl">
                            {catInfo.icon}
                          </span>
                        </div>
                      );
                    })()}
                    <div>
                      <h4 className="text-sm md:text-base font-bold text-text-light dark:text-text-dark">{activity.activity_name || activity.activity || 'Activity'}</h4>
                      <p className="text-xs md:text-sm text-text-muted-light dark:text-text-muted-dark mt-0.5 md:mt-1">
                        {new Date(activity.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center md:flex-col md:items-end justify-between md:justify-center gap-1 md:gap-2">
                    <span className={`text-[10px] md:text-xs font-bold px-2 py-0.5 md:px-3 md:py-1 rounded-full uppercase tracking-wider ${activity.status === 'verified'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                      }`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
