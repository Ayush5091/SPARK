"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import AdminDashboard from "@/components/AdminDashboard";
import EventFocusMap, { EventMapPoint } from "@/components/EventFocusMap";
import EventColorChangeCard from "@/components/EventColorChangeCard";
import EventDetailsModal from "@/components/EventDetailsModal";
import { CinematicHero } from "@/components/ui/cinematic-landing-hero";
import SparkFeaturesSection from "@/components/SparkFeaturesSection";
import StudentHomeDashboard from "@/components/StudentHomeDashboard";

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
      // No redirect — unauthenticated users see the public landing page
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

  const totalPoints = Number(profile?.total_points || 0);
  const pointsProgress = Math.min(100, Math.max(0, totalPoints));

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

  if (isLoading || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary text-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="overflow-x-hidden w-full">
        <CinematicHero
          className="w-full"
          brandName="SPARK"
          tagline1="Your Campus Life,"
          tagline2="Fully Tracked."
          description="Discover live AICTE events, submit geo-verified photo proof, and earn activity points — no paperwork, no registers."
          metricValue={100}
          metricLabel="Points per cycle"
          cta1Text="Student Login"
          cta1Href="/login"
          cta2Text="Coordinator Login"
          cta2Href="/login"
        />
        <SparkFeaturesSection />
      </div>
    );
  }

  if (profileLoading) {
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
    <StudentHomeDashboard
      name={profile?.name || user?.name || "Student"}
      totalPoints={Number(profile?.total_points || 0)}
      completedEvents={profile?.completed_activities || 0}
      pendingEvents={0} // To be implemented later based on backend schema
      notifications={notifications}
      unreadCount={unreadCount}
      isNotificationsOpen={isNotificationsOpen}
      onToggleNotifications={toggleNotifications}
    />
  );
}
