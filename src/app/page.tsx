"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import AdminDashboard from "@/components/AdminDashboard";
import EventFocusMap, { EventMapPoint } from "@/components/EventFocusMap";
import EventColorChangeCard from "@/components/EventColorChangeCard";

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
  const { user, token, profile, profileLoading, isLoading, isInitializing, refreshProfile } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeEventId, setActiveEventId] = useState<number | null>(null);

  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const [eventsRes, notifRes] = await Promise.all([
          fetch("/api/events", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          setEvents(Array.isArray(eventsData) ? eventsData : []);
        }

        if (notifRes.ok) {
          const notificationData = await notifRes.json();
          setNotifications(Array.isArray(notificationData) ? notificationData : []);
        }
      } catch (error) {
        console.error("Failed to fetch events data", error);
      } finally {
        setEventsLoading(false);
      }
    };

    fetchData();
  }, [user, token, isLoading, router]);

  useEffect(() => {
    const handleFocus = async () => {
      if (user && token) {
        await refreshProfile();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user, token, refreshProfile]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async () => {
    if (!token || unreadCount === 0) return;

    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((current) => current.map((n) => ({ ...n, is_read: true })));
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

  const getCategoryIconInfo = (category: string) => {
    switch (category?.toLowerCase()) {
      case "cultural":
        return { icon: "palette", bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-600 dark:text-purple-400" };
      case "community service":
        return { icon: "volunteer_activism", bg: "bg-pink-50 dark:bg-pink-900/20", text: "text-pink-600 dark:text-pink-400" };
      case "technical":
        return { icon: "computer", bg: "bg-teal-50 dark:bg-teal-900/20", text: "text-teal-600 dark:text-teal-400" };
      case "sports":
        return { icon: "sports_basketball", bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-600 dark:text-orange-400" };
      case "professional":
        return { icon: "work", bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-600 dark:text-indigo-400" };
      case "national initiative":
        return { icon: "flag", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400" };
      default:
        return { icon: "event", bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-600 dark:text-blue-400" };
    }
  };

  const getEventStatus = (event: Event) => {
    if (event.is_ongoing) return { label: "Happening Now", color: "bg-green-500" };
    if (event.is_upcoming) return { label: "Upcoming", color: "bg-blue-500" };
    return { label: "Ended", color: "bg-gray-400" };
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (filter !== "all") {
        if (filter === "ongoing" && !event.is_ongoing) return false;
        if (filter === "upcoming" && !event.is_upcoming) return false;
      }

      if (selectedCategory !== "all" && event.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [events, filter, selectedCategory]);

  const mapEvents = useMemo<EventMapPoint[]>(() => {
    return filteredEvents
      .map((event) => ({
        id: event.id,
        name: event.name,
        category: event.category,
        locationName: event.location_name,
        latitude: Number(event.latitude),
        longitude: Number(event.longitude),
        points: Number(event.points),
        isOngoing: event.is_ongoing,
        isUpcoming: event.is_upcoming,
      }))
      .filter((event) => Number.isFinite(event.latitude) && Number.isFinite(event.longitude));
  }, [filteredEvents]);

  const activeEvent = filteredEvents.find((event) => event.id === activeEventId) ?? filteredEvents[0] ?? null;
  const activeMapEventId = mapEvents.find((event) => event.id === activeEventId)?.id ?? mapEvents[0]?.id ?? null;

  useEffect(() => {
    if (!filteredEvents.length) {
      setActiveEventId(null);
      return;
    }

    const preferredEvent =
      filteredEvents.find((event) => event.id === activeEventId) ??
      filteredEvents.find((event) => event.is_ongoing) ??
      filteredEvents.find((event) => event.is_upcoming) ??
      filteredEvents[0];

    setActiveEventId(preferredEvent.id);
  }, [activeEventId, filteredEvents]);

  useEffect(() => {
    if (!filteredEvents.length) return;

    let frameId = 0;

    const updateActiveEvent = () => {
      const viewportCenter = window.innerHeight * 0.56;
      let closestEventId: number | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;

      filteredEvents.forEach((event) => {
        const node = cardRefs.current[event.id];
        if (!node) return;

        const rect = node.getBoundingClientRect();
        const isVisible = rect.bottom > 120 && rect.top < window.innerHeight - 80;
        if (!isVisible) return;

        const cardCenter = rect.top + rect.height / 2;
        const distance = Math.abs(cardCenter - viewportCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestEventId = event.id;
        }
      });

      if (closestEventId !== null) {
        setActiveEventId((current) => (current === closestEventId ? current : closestEventId));
      }
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateActiveEvent);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [filteredEvents]);

  const categories = ["all", "technical", "cultural", "sports", "professional", "community service", "national initiative"];

  if (isLoading || isInitializing || !user || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary text-primary"></div>
      </div>
    );
  }

  if (user.role === "admin") {
    return <AdminDashboard />;
  }

  return (
    <div className="flex flex-col min-h-screen">
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
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-4 border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                          !n.is_read ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                        }`}
                      >
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

      <div className="px-6 md:px-10 pb-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {["all", "upcoming", "ongoing"].map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === filterOption
                  ? "bg-primary text-white"
                  : "bg-subtle-light dark:bg-subtle-dark text-text-light dark:text-text-dark hover:bg-primary hover:text-white"
              }`}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategory === category
                  ? "bg-primary text-white"
                  : "bg-card-light dark:bg-card-dark text-text-muted-light dark:text-text-muted-dark hover:bg-subtle-light dark:hover:bg-subtle-dark"
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-6 md:px-10 pb-24 max-w-6xl mx-auto w-full">
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
          <div className="space-y-8 lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-8 lg:space-y-0 lg:items-start">
            <section className="lg:sticky lg:top-28 lg:self-start">
              <EventFocusMap events={mapEvents} activeEventId={activeMapEventId} />
            </section>

            <section className="min-w-0 space-y-5">
              {activeEvent && (
                <div className="flex flex-col gap-3 rounded-[1.75rem] border border-black/5 bg-white/80 px-5 py-4 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.5)] backdrop-blur md:flex-row md:items-end md:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-400">Focused Event</p>
                    <h3 className="mt-2 text-xl md:text-2xl font-bold text-neutral-900">{activeEvent.name}</h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      Scroll the event list and the map trail will follow the card closest to the center.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
                    <span className="max-w-full truncate rounded-full bg-neutral-950 px-3 py-1.5 font-semibold text-white">{activeEvent.location_name}</span>
                    <span className="rounded-full bg-neutral-100 px-3 py-1.5 font-semibold text-neutral-500">{activeEvent.points} pts</span>
                  </div>
                </div>
              )}

              {filteredEvents.map((event, index) => (
                <div
                  key={event.id}
                  ref={(node) => {
                    cardRefs.current[event.id] = node;
                  }}
                  className="min-w-0"
                >
                  <EventColorChangeCard
                    event={event}
                    isActive={event.id === activeEventId}
                    index={index}
                  />
                </div>
              ))}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
