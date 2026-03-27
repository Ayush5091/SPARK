"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import AdminDashboard from "@/components/AdminDashboard";
import EventFocusMap, { EventMapPoint } from "@/components/EventFocusMap";
import EventColorChangeCard from "@/components/EventColorChangeCard";
import EventDetailsModal from "@/components/EventDetailsModal";

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
  capacity?: number | null;
  capacity_remaining?: number | null;
}

export default function Home() {
  const { user, token, profile, profileLoading, isLoading, isInitializing, refreshProfile } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [activeEventId, setActiveEventId] = useState<number | null>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isOnLandingPage, setIsOnLandingPage] = useState(true);
  const [showHeader, setShowHeader] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const landingRef = useRef<HTMLDivElement | null>(null);

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

  // Enhanced scroll tracking for landing page and header visibility
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      // Check if we're past the landing page
      const pastLanding = scrollY > windowHeight * 0.3;
      setIsOnLandingPage(!pastLanding);

      // Show header when scrolling in events, hide when on landing
      setShowHeader(pastLanding);

      // Activate scroll snap after first scroll on mobile
      if (!hasScrolled && scrollY > 50 && window.innerWidth <= 1023) {
        setHasScrolled(true);
        document.documentElement.classList.add('snap-active');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasScrolled]);

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

  const scrollToLanding = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const visibleEvents = useMemo(() => {
    return events.filter((event) => !event.is_past);
  }, [events]);

  const filteredEvents = useMemo(() => {
    return visibleEvents.filter((event) => {
      if (filter !== "all") {
        if (filter === "ongoing" && !event.is_ongoing) return false;
        if (filter === "upcoming" && !event.is_upcoming) return false;
      }

      return true;
    });
  }, [visibleEvents, filter]);

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
      {/* Landing Page Section */}
      <section
        ref={landingRef}
        className="min-h-screen flex flex-col relative overflow-hidden snap-start"
      >
        {/* Modern Black Header inspired by attached image */}
        <div className="relative text-white flex-1 flex flex-col justify-center px-6 md:px-10 bg-[#07090c]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(32,140,210,0.35),transparent_70%)]"></div>
            <div className="absolute right-[-12%] top-[-10%] h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(28,180,140,0.28),transparent_68%)]"></div>
            <div className="absolute bottom-[-15%] left-1/3 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(20,120,160,0.22),transparent_70%)]"></div>
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0.6)_45%,rgba(0,0,0,0.85)_100%)]"></div>
          </div>
          <div className="max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between mb-8">
              <UserAvatar
                name={profile?.name || user?.name}
                className="w-12 h-12 md:w-14 md:h-14 text-lg md:text-xl shadow-lg border-2 border-white/20"
              />

              <div className="relative">
                <button
                  onClick={toggleNotifications}
                  className="relative p-3 rounded-full hover:bg-white/10 transition-all duration-200 text-white"
                >
                  <span className="material-icons-outlined text-2xl">notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 h-3 w-3 rounded-full bg-red-500 border-2 border-black"></span>
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
            </div>

            <div className="text-center space-y-6">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-none">
                DISCOVER
              </h1>
              <div className="relative">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-light tracking-wide text-white/80">
                  Live Events
                </h2>
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-24 h-0.5 bg-white/60"></div>
              </div>

              <div className="pt-8 space-y-4">
                <p className="text-lg md:text-xl text-white/70 max-w-lg mx-auto">
                  Immerse yourself in real-time events and participate in activities that shape your journey.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{profile?.total_points || 0}</div>
                    <div className="text-sm text-white/60">Total Points</div>
                  </div>
                  <div className="hidden sm:block w-px h-8 bg-white/20"></div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{profile?.completed_activities || 0}</div>
                    <div className="text-sm text-white/60">Activities</div>
                  </div>
                  <div className="hidden sm:block w-px h-8 bg-white/20"></div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{visibleEvents.length}</div>
                    <div className="text-sm text-white/60">Available</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Color Transition Section */}
        <div className="bg-gradient-to-b from-black via-gray-900 to-white h-32 md:h-40"></div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Conditional Header for Events Section */}
      {showHeader && (
        <header className="fixed top-0 left-0 right-0 z-50 pt-4 pb-4 px-6 md:px-10 flex justify-between items-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50 transform transition-all duration-300 ease-out">
          <button
            onClick={scrollToLanding}
            className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 px-3 py-2 rounded-xl transition-colors"
          >
            <span className="material-icons-outlined text-gray-600 dark:text-gray-300">arrow_back</span>
            <div className="text-left">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Back to</div>
              <div className="text-base font-bold text-gray-900 dark:text-white">Landing</div>
            </div>
          </button>

          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Events</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{filteredEvents.length} Available</div>
          </div>
        </header>
      )}

      {/* Events Filter Section */}
      <div className="px-6 md:px-10 pt-6 pb-4 bg-white dark:bg-gray-900">
        <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-6xl mx-auto">
          {["all", "upcoming", "ongoing"].map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ease-out whitespace-nowrap ${
                filter === filterOption
                  ? "bg-black text-white shadow-lg shadow-black/30 scale-105"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-black hover:text-white hover:scale-105 active:scale-95"
              }`}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Events Content Section */}
      <div className="flex-1 px-6 md:px-10 pb-24 max-w-6xl mx-auto w-full bg-white dark:bg-gray-900">
        {eventsLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-24 w-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-icons-outlined text-4xl text-gray-400">event_busy</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No events found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try adjusting your filters to see more events.</p>
          </div>
        ) : (
          <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-8 lg:space-y-0 lg:items-start">
            <section className={`sticky z-10 lg:self-start lg:z-auto transition-all duration-300 ${showHeader ? 'top-24' : 'top-4'}`}>
              <EventFocusMap events={mapEvents} activeEventId={activeMapEventId} />
            </section>

            <section className="min-w-0 space-y-3 lg:space-y-5 mt-4 lg:mt-0">
              {filteredEvents.map((event, index) => (
                <div
                  key={event.id}
                  ref={(node) => {
                    cardRefs.current[event.id] = node;
                  }}
                  className="min-w-0 snap-start snap-always scroll-mt-[18rem] md:scroll-mt-28 lg:scroll-mt-0 py-1 lg:py-0"
                >
                  <div className="w-full">
                    <EventColorChangeCard
                      event={event}
                      isActive={event.id === activeEventId}
                      index={index}
                      onOpen={setSelectedEvent}
                    />
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}
      </div>

      <EventDetailsModal
        event={selectedEvent}
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
