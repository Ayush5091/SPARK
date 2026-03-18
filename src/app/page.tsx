"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import AdminDashboard from "@/components/AdminDashboard";

interface Event {
  id: number;
  name: string;
  description: string;
  category: string;
  points: number;
  latitude: number;
  longitude: number;
  location_name: string;
  start_time: string;
  end_time: string;
  is_ongoing: boolean;
  is_upcoming: boolean;
  is_past: boolean;
  total_submissions: number;
  verified_submissions: number;
  participation_rate: string;
}

export default function Home() {
  const { user, token, profile, profileLoading, isLoading, isInitializing } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all'); // all, ongoing, upcoming
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [eventsRes, notifRes] = await Promise.all([
          fetch('/api/events', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/notifications', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          setEvents(eventsData);
        }

        if (notifRes.ok) {
          setNotifications(await notifRes.json());
        }
      } catch (error) {
        console.error("Failed to fetch events data", error);
      } finally {
        setEventsLoading(false);
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

  const getCategoryIconInfo = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'cultural':
        return { icon: 'palette', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', color: 'purple' };
      case 'community service':
        return { icon: 'volunteer_activism', bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-600 dark:text-pink-400', color: 'pink' };
      case 'technical':
        return { icon: 'computer', bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400', color: 'teal' };
      case 'sports':
        return { icon: 'sports_basketball', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', color: 'orange' };
      case 'professional':
        return { icon: 'work', bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', color: 'indigo' };
      case 'national initiative':
        return { icon: 'flag', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', color: 'emerald' };
      default:
        return { icon: 'event', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', color: 'blue' };
    }
  };

  const getEventStatus = (event: Event) => {
    if (event.is_ongoing) return { label: 'Happening Now', color: 'bg-green-500', textColor: 'text-green-500' };
    if (event.is_upcoming) return { label: 'Upcoming', color: 'bg-blue-500', textColor: 'text-blue-500' };
    return { label: 'Ended', color: 'bg-gray-400', textColor: 'text-gray-400' };
  };

  // Filter events based on selected filters
  const filteredEvents = events.filter(event => {
    if (filter !== 'all') {
      if (filter === 'ongoing' && !event.is_ongoing) return false;
      if (filter === 'upcoming' && !event.is_upcoming) return false;
    }
    if (selectedCategory !== 'all' && event.category !== selectedCategory) return false;
    return true;
  });

  const categories = ['all', 'technical', 'cultural', 'sports', 'professional', 'community service', 'national initiative'];

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

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="pt-8 md:pt-10 pb-4 px-6 md:px-10 flex justify-between items-center sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <UserAvatar name={profile?.name || user?.name} className="w-10 h-10 md:w-12 md:h-12 text-lg md:text-xl shadow-lg" />
          <div>
            <h1 className="text-sm md:text-base font-medium text-text-muted-light dark:text-text-muted-dark">Discover,</h1>
            <h2 className="text-lg md:text-2xl font-bold leading-tight text-primary dark:text-white">Live Events</h2>
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
                        <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Filter Section */}
      <div className="px-6 md:px-10 pb-4 space-y-4">
        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto">
          {['all', 'upcoming', 'ongoing'].map(filterOption => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === filterOption
                  ? 'bg-primary text-white'
                  : 'bg-subtle-light dark:bg-subtle-dark text-text-light dark:text-text-dark hover:bg-primary hover:text-white'
              }`}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-primary text-white'
                  : 'bg-card-light dark:bg-card-dark text-text-muted-light dark:text-text-muted-dark hover:bg-subtle-light dark:hover:bg-subtle-dark'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Events Feed */}
      <div className="flex-1 px-6 md:px-10 pb-24 space-y-6 max-w-4xl mx-auto w-full">
        {eventsLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-24 w-24 bg-subtle-light dark:bg-subtle-dark rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-icons-outlined text-4xl text-text-muted-light dark:text-text-muted-dark">event_busy</span>
            </div>
            <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-2">No events found</h3>
            <p className="text-text-muted-light dark:text-text-muted-dark">Try adjusting your filters to see more events.</p>
          </div>
        ) : (
          filteredEvents.map(event => {
            const categoryInfo = getCategoryIconInfo(event.category);
            const statusInfo = getEventStatus(event);

            return (
              <div key={event.id} className="bg-card-light dark:bg-card-dark rounded-2xl p-6 shadow-soft border border-subtle-light dark:border-subtle-dark">
                {/* Event Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${categoryInfo.bg} ${categoryInfo.text}`}>
                      <span className="material-icons-outlined text-2xl">{categoryInfo.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-text-light dark:text-text-dark">{event.name}</h3>
                      <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{event.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    <span className="text-primary dark:text-white font-bold text-xl">{event.points}pts</span>
                  </div>
                </div>

                {/* Event Description */}
                <p className="text-text-light dark:text-text-dark mb-4 leading-relaxed">{event.description}</p>

                {/* Event Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-icons-outlined text-text-muted-light dark:text-text-muted-dark">schedule</span>
                    <div>
                      <p className="text-sm font-medium text-text-light dark:text-text-dark">
                        {new Date(event.start_time).toLocaleDateString()} • {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
                        Duration: {Math.round((new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / (1000 * 60 * 60))} hours
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-icons-outlined text-text-muted-light dark:text-text-muted-dark">location_on</span>
                    <div>
                      <p className="text-sm font-medium text-text-light dark:text-text-dark">{event.location_name}</p>
                      <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
                        {event.total_submissions} participants • {event.participation_rate}% verified
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex justify-end">
                  {event.is_ongoing ? (
                    <button
                      onClick={() => router.push(`/events/${event.id}/camera`)}
                      className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2"
                    >
                      <span className="material-icons-outlined">camera_alt</span>
                      Take Photo
                    </button>
                  ) : event.is_upcoming ? (
                    <button className="bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 cursor-not-allowed opacity-50">
                      <span className="material-icons-outlined">alarm</span>
                      Starts Soon
                    </button>
                  ) : (
                    <button className="bg-gray-400 text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 cursor-not-allowed opacity-50">
                      <span className="material-icons-outlined">check</span>
                      Event Ended
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}