"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Bell, Camera, CheckCircle2, Clock, Hourglass, MapPin } from "lucide-react";
import Link from "next/link";

export interface StudentHomeEvent {
  id: number;
  name: string;
  category: string;
  points: number;
  location_name: string;
  start_time: string;
  end_time: string;
  is_ongoing: boolean;
  is_upcoming: boolean;
}

export interface StudentHomeDashboardProps {
  events: StudentHomeEvent[];
  eventsLoading: boolean;
  name: string;
  totalPoints: number;
  completedEvents: number;
  pendingEvents: number;
  notifications: any[];
  unreadCount: number;
  isNotificationsOpen: boolean;
  onToggleNotifications: () => void;
}

// Clay surface tokens shared by every card on this screen
const RAISED = "ui-card";
const RAISED_SM = "ui-card";
const INSET = "ui-well";
const PRESS = "active:bg-[#E9ECEF]";
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black";

const POINTS_TARGET = 100;
const EASE = [0.16, 1, 0.3, 1] as const;

const formatEventTime = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);
  const day = s.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const time = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time(s)} – ${time(e)}`;
};

const formatSpan = (ms: number) => {
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.round(hours / 24)} days`;
};

const eventTiming = (event: StudentHomeEvent) => {
  const now = Date.now();
  if (event.is_ongoing) return `Ends in ${formatSpan(new Date(event.end_time).getTime() - now)}`;
  return `Starts in ${formatSpan(new Date(event.start_time).getTime() - now)}`;
};

const formatAgo = (value: string) => {
  const diff = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diff)) return "";
  if (diff < 60000) return "Just now";
  if (diff < 86400000) return `${formatSpan(diff)} ago`;
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const rise = (i: number, reduce: boolean | null) =>
  reduce
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease: EASE, delay: 0.05 + i * 0.06 },
      };

export default function StudentHomeDashboard({
  events = [],
  eventsLoading = false,
  name,
  totalPoints,
  completedEvents,
  pendingEvents,
  notifications = [],
  unreadCount = 0,
  isNotificationsOpen = false,
  onToggleNotifications,
}: StudentHomeDashboardProps) {
  const reduce = useReducedMotion();
  const firstName = name.split(" ")[0];
  const initial = firstName.charAt(0).toUpperCase();
  const pointsPercentage = Math.min(100, Math.max(0, (totalPoints / POINTS_TARGET) * 100));
  const remaining = Math.max(0, POINTS_TARGET - totalPoints);
  const liveCount = events.filter((e) => e.is_ongoing).length;

  // Escape closes the notifications panel
  useEffect(() => {
    if (!isNotificationsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onToggleNotifications();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isNotificationsOpen, onToggleNotifications]);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#F8F9FA] pb-28 font-sans text-black selection:bg-black selection:text-white md:max-w-5xl md:pb-16">
      {/* Header */}
      <header className="relative flex items-center justify-between px-6 pb-2 pt-10 md:px-8">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gray-900 text-base font-bold text-white`}>
            {initial}
          </div>
          <p className="text-base font-bold text-gray-600">
            Welcome back, <span className="font-black text-black">{firstName}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleNotifications}
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
          aria-expanded={isNotificationsOpen}
          className={`relative flex h-11 w-11 items-center justify-center rounded-full text-black transition-shadow duration-200 ${RAISED_SM} ${PRESS} ${FOCUS} ${
            isNotificationsOpen ? INSET : ""
          }`}
        >
          <Bell size={19} strokeWidth={2.5} />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-black" />
          )}
        </button>

        <AnimatePresence>
          {isNotificationsOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={onToggleNotifications} aria-hidden="true" />
              <motion.div
                role="dialog"
                aria-label="Notifications"
                className={`absolute right-6 top-[5.5rem] z-20 w-[min(22rem,calc(100vw-3rem))] origin-top-right overflow-hidden rounded-2xl md:right-8 ${RAISED}`}
                initial={reduce ? false : { opacity: 0, scale: 0.96, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -4 }}
                transition={{ duration: 0.22, ease: EASE }}
              >
                <div className="flex items-center justify-between px-5 pb-3 pt-4">
                  <h3 className="text-sm font-black">Notifications</h3>
                  {unreadCount > 0 && <span className="text-xs font-bold text-gray-500">{unreadCount} new</span>}
                </div>
                <div className="max-h-80 overflow-y-auto px-2 pb-2">
                  {notifications.length === 0 ? (
                    <p className="px-3 py-8 text-center text-sm font-semibold text-gray-500">You&apos;re all caught up.</p>
                  ) : (
                    notifications.map((n: any) => (
                      <div key={n.id} className={`flex gap-3 rounded-2xl px-3 py-3 ${!n.is_read ? INSET : ""}`}>
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!n.is_read ? "bg-black" : "bg-transparent"}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-snug text-black">{n.message}</p>
                          <p className="mt-1 text-xs font-semibold text-gray-500">{formatAgo(n.created_at)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      {/* Intro */}
      <motion.section className="px-6 pb-8 pt-6 md:px-8" {...rise(0, reduce)}>
        <h1 className="text-4xl font-black leading-[1.05] tracking-tighter md:text-5xl" style={{ textWrap: "balance" }}>
          Ready for your next activity?
        </h1>
        <p className="mt-3 max-w-[60ch] text-[15px] font-medium leading-relaxed text-gray-500">
          Find events, submit photo proof, and track your activity points.
        </p>
      </motion.section>

      {/* Progress */}
      <section className="grid grid-cols-2 gap-5 px-6 md:grid-cols-3 md:px-8" aria-label="Your progress">
        <motion.div className={`col-span-2 flex flex-col justify-between gap-6 rounded-2xl p-6 ${RAISED}`} {...rise(1, reduce)}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-gray-500">Activity points</h2>
              <p className="mt-1 text-5xl font-black tracking-tighter">
                {totalPoints}
                <span className="ml-1.5 text-base font-bold tracking-normal text-gray-400">/ {POINTS_TARGET}</span>
              </p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold text-gray-600 ${INSET}`}>
              {remaining > 0 ? `${remaining} to go` : "Target reached"}
            </span>
          </div>
          <div
            className={`h-4 w-full overflow-hidden rounded-full bg-[#E9ECEF] p-1 ${INSET}`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={POINTS_TARGET}
            aria-valuenow={totalPoints}
            aria-label="Activity points progress"
          >
            <motion.div
              className="h-full rounded-full bg-black"
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${pointsPercentage}%` }}
              transition={{ duration: 1.1, ease: EASE, delay: 0.25 }}
            />
          </div>
          <div className="-mt-3 flex justify-between px-1 text-xs font-semibold text-gray-400" aria-hidden="true">
            {[0, 25, 50, 75, 100].map((mark) => (
              <span key={mark} className={totalPoints >= mark ? "text-gray-600" : ""}>{mark}</span>
            ))}
          </div>
        </motion.div>

        <div className="col-span-2 grid grid-cols-2 gap-5 md:col-span-1 md:grid-cols-1">
          {[
            { label: "Completed", value: completedEvents, icon: CheckCircle2 },
            { label: "In review", value: pendingEvents, icon: Hourglass },
          ].map(({ label, value, icon: Icon }, i) => (
            <motion.div key={label} className={`flex items-center justify-between gap-3 rounded-2xl p-5 ${RAISED}`} {...rise(2 + i, reduce)}>
              <div>
                <h2 className="text-sm font-bold text-gray-500">{label}</h2>
                <p className="mt-0.5 text-3xl font-black tracking-tighter">{value}</p>
              </div>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-gray-500 ${INSET}`}>
                <Icon size={18} strokeWidth={2.5} aria-hidden="true" />
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Live & upcoming events */}
      <section className="mt-12 px-6 md:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="text-xl font-black tracking-tight">
            Live &amp; upcoming
            {liveCount > 0 && (
              <span className="ml-2 inline-flex translate-y-[-2px] items-center gap-1.5 rounded-full bg-black px-2.5 py-1 align-middle text-xs font-bold text-white">
                <span className="relative flex h-1.5 w-1.5">
                  {!reduce && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />}
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                {liveCount} live
              </span>
            )}
          </h2>
          <Link href="/events" className={`group flex shrink-0 items-center gap-1 rounded-lg text-sm font-bold text-gray-500 transition-colors hover:text-black ${FOCUS}`}>
            My events <ArrowRight size={15} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>

        {eventsLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2" aria-busy="true" aria-label="Loading events">
            {[0, 1].map((i) => (
              <div key={i} className={`flex flex-col gap-4 rounded-2xl p-6 ${RAISED}`}>
                <div className="h-6 w-28 animate-pulse rounded-full bg-[#E9ECEF]" />
                <div className="h-6 w-3/4 animate-pulse rounded-lg bg-[#E9ECEF]" />
                <div className="h-4 w-1/2 animate-pulse rounded-lg bg-[#E9ECEF]" />
                <div className="h-12 w-full animate-pulse rounded-2xl bg-[#E9ECEF]" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className={`flex flex-col items-center gap-3 rounded-2xl px-6 py-10 text-center ${INSET}`}>
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-gray-500 ${RAISED_SM}`}>
              <Clock size={20} strokeWidth={2.5} aria-hidden="true" />
            </span>
            <p className="text-lg font-black">No events right now</p>
            <p className="max-w-[36ch] text-sm font-medium text-gray-500">
              New events appear here as soon as a coordinator publishes them.
            </p>
            <Link href="/events" className={`mt-2 rounded-2xl px-5 py-3 text-sm font-bold transition-shadow ${RAISED_SM} ${PRESS} ${FOCUS}`}>
              View my events
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {events.map((event, i) => (
              <motion.article
                key={event.id}
                className={`flex flex-col gap-4 rounded-2xl p-6 transition-shadow duration-300 hover:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.06)] ${RAISED}`}
                {...rise(4 + i, reduce)}
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      event.is_ongoing ? "bg-black text-white" : `text-gray-600 ${INSET}`
                    }`}
                  >
                    {event.is_ongoing ? "Happening now" : "Upcoming"}
                  </span>
                  <span className="text-sm font-black">+{event.points} pts</span>
                </div>

                <div>
                  <h3 className="text-lg font-black leading-snug tracking-tight" style={{ textWrap: "balance" }}>
                    {event.name}
                  </h3>
                  <p className="mt-1 text-sm font-semibold capitalize text-gray-500">{event.category}</p>
                </div>

                <div className="flex flex-col gap-2 text-sm font-semibold text-gray-600">
                  <span className="flex items-start gap-2">
                    <MapPin size={15} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {event.location_name}
                  </span>
                  <span className="flex items-start gap-2">
                    <Clock size={15} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {formatEventTime(event.start_time, event.end_time)}
                  </span>
                </div>

                <div className="mt-auto pt-1">
                  {event.is_ongoing ? (
                    <Link
                      href={`/events/${event.id}/camera`}
                      className={`group flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-sm font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] ${FOCUS}`}
                    >
                      <Camera size={16} strokeWidth={2.5} aria-hidden="true" />
                      Check in with photo
                      <span className="text-xs font-semibold text-white/60">· {eventTiming(event)}</span>
                    </Link>
                  ) : (
                    <p className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-gray-500 ${INSET}`}>
                      <Clock size={15} strokeWidth={2.5} aria-hidden="true" />
                      {eventTiming(event)}
                    </p>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
