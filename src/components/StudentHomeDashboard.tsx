"use client";

import React from "react";
import { Bell, Home, Calendar, Clock, User, Plus, MapPin } from "lucide-react";
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

const formatEventTime = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);
  const day = s.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const time = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time(s)} – ${time(e)}`;
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
  const firstName = name.split(" ")[0];
  const initial = firstName.charAt(0).toUpperCase();
  const pointsPercentage = Math.min(100, Math.max(0, totalPoints));
  return (
    <div className="max-w-md md:max-w-5xl mx-auto min-h-screen bg-[#F0F0F3] font-sans relative pb-24 md:pb-12 overflow-hidden text-black selection:bg-black selection:text-white">
      {/* 1. Header */}
      <header className="flex items-center justify-between px-6 pt-10 pb-6 relative">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center text-lg font-bold shadow-[4px_4px_10px_#d1d1d3,-4px_-4px_10px_#ffffff]">
            {initial}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
              Student Dashboard
            </span>
            <span className="text-lg font-black tracking-tight text-black">
              Welcome back, {firstName}.
            </span>
          </div>
        </div>

        <button 
          onClick={onToggleNotifications}
          className="relative flex items-center justify-center w-12 h-12 rounded-full bg-[#F0F0F3] text-black shadow-[6px_6px_12px_#d1d1d3,-6px_-6px_12px_#ffffff] transition-all active:shadow-[inset_4px_4px_8px_#d1d1d3,inset_-4px_-4px_8px_#ffffff]"
        >
          <Bell size={20} strokeWidth={2.5} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-black border-2 border-[#F0F0F3]"></span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {isNotificationsOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={onToggleNotifications}></div>
            <div className="absolute right-6 top-24 mt-2 w-72 max-h-80 overflow-y-auto bg-[#F0F0F3] rounded-3xl shadow-[8px_8px_20px_#d1d1d3,-8px_-8px_20px_#ffffff] border border-white/20 z-20 py-2">
              <div className="px-4 py-2 border-b border-gray-200/50 flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-black">Notifications</h3>
              </div>
              <div className="flex flex-col text-left">
                {notifications.length === 0 ? (
                  <p className="text-gray-500 text-xs p-4 text-center font-semibold uppercase">No notifications yet.</p>
                ) : (
                  notifications.map((n: any) => (
                    <div key={n.id} className={`p-4 border-b border-gray-200/30 transition-colors ${!n.is_read ? 'bg-black/5' : ''}`}>
                      <p className="text-xs font-medium text-black leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-1.5 uppercase">
                        {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </header>

      {/* 2. Hero Section */}
      <section className="px-6 pt-4 pb-8">
        <h1 className="text-4xl font-black leading-tight tracking-tighter text-black mb-3">
          Ready for your next activity?
        </h1>
        <p className="text-gray-500 font-medium text-sm pr-4">
          Find events, submit photo proof, and track your activity points.
        </p>
      </section>

      {/* 3. Data Cards (Grid Layout) */}
      <section className="px-6 grid grid-cols-2 md:grid-cols-3 gap-5 mb-8">
        {/* Card 1 (Progress) - Full width on mobile, 1 col on desktop */}
        <div className="col-span-2 md:col-span-1 rounded-3xl bg-[#F0F0F3] p-6 shadow-[8px_8px_16px_#d1d1d3,-8px_-8px_16px_#ffffff] flex flex-col justify-between aspect-square">
          <div>
            <h2 className="text-xs font-bold tracking-widest text-gray-500 uppercase leading-relaxed mb-3">
              Total Points
            </h2>
            <span className="text-4xl font-black text-black tracking-tighter block mb-4">
              {totalPoints} <span className="text-sm font-bold text-gray-400">/ 100</span>
            </span>
          </div>
          <div className="w-full h-4 rounded-full bg-[#e0e0e3] shadow-[inset_3px_3px_6px_#d1d1d3,inset_-3px_-3px_6px_#ffffff] overflow-hidden p-1">
            <div 
              className="h-full rounded-full bg-black transition-all duration-1000 ease-out" 
              style={{ width: `${pointsPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Card 2 (Completed) - Half width */}
        <div className="col-span-1 rounded-3xl bg-[#F0F0F3] p-6 shadow-[8px_8px_16px_#d1d1d3,-8px_-8px_16px_#ffffff] flex flex-col justify-between aspect-square">
          <h2 className="text-xs font-bold tracking-widest text-gray-500 uppercase leading-relaxed">
            Completed <br /> Events
          </h2>
          <span className="text-5xl font-black text-black tracking-tighter mt-2">
            {completedEvents}
          </span>
        </div>

        {/* Card 3 (Pending) - Half width */}
        <div className="col-span-1 rounded-3xl bg-[#F0F0F3] p-6 shadow-[8px_8px_16px_#d1d1d3,-8px_-8px_16px_#ffffff] flex flex-col justify-between aspect-square">
          <h2 className="text-xs font-bold tracking-widest text-gray-500 uppercase leading-relaxed">
            Pending <br /> Verif.
          </h2>
          <span className="text-5xl font-black text-black tracking-tighter mt-2">
            {pendingEvents}
          </span>
        </div>
      </section>

      {/* 4. Live & upcoming events */}
      <section className="px-6 mb-10">
        <h2 className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-4">
          Live &amp; Upcoming Events
        </h2>

        {eventsLoading ? (
          <div className="w-full rounded-3xl bg-[#F0F0F3] p-6 shadow-[inset_6px_6px_12px_#d1d1d3,inset_-6px_-6px_12px_#ffffff] text-center">
            <p className="text-gray-500 font-bold text-sm uppercase tracking-wider">Loading events…</p>
          </div>
        ) : events.length === 0 ? (
          <div className="w-full rounded-3xl bg-[#F0F0F3] p-6 shadow-[inset_6px_6px_12px_#d1d1d3,inset_-6px_-6px_12px_#ffffff] flex flex-col items-center justify-center text-center gap-4 border border-gray-100/50">
            <p className="text-black font-bold text-lg">
              No active events right now.
            </p>
            <Link href="/events" className="text-sm font-bold text-gray-500 hover:text-black transition-colors flex items-center gap-2">
              View My Events <span className="text-lg">→</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-3xl bg-[#F0F0F3] p-6 shadow-[8px_8px_16px_#d1d1d3,-8px_-8px_16px_#ffffff] flex flex-col gap-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                      event.is_ongoing ? "bg-black text-white" : "bg-[#e0e0e3] text-gray-600"
                    }`}
                  >
                    {event.is_ongoing ? "Happening Now" : "Upcoming"}
                  </span>
                  <span className="text-sm font-black text-black">+{event.points} pts</span>
                </div>

                <div>
                  <h3 className="text-lg font-black leading-snug tracking-tight text-black">{event.name}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">{event.category}</p>
                </div>

                <div className="flex flex-col gap-1.5 text-xs font-semibold text-gray-600">
                  <span className="flex items-start gap-2">
                    <MapPin size={14} strokeWidth={2.5} className="shrink-0 mt-px" />
                    {event.location_name}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock size={14} strokeWidth={2.5} className="shrink-0" />
                    {formatEventTime(event.start_time, event.end_time)}
                  </span>
                </div>

                {event.is_ongoing ? (
                  <Link
                    href={`/events/${event.id}/camera`}
                    className="mt-1 text-center rounded-2xl bg-black text-white text-sm font-bold py-3 transition-transform active:scale-[0.98]"
                  >
                    Check in with photo
                  </Link>
                ) : (
                  <p className="mt-1 text-center rounded-2xl text-sm font-bold py-3 text-gray-500 shadow-[inset_4px_4px_8px_#d1d1d3,inset_-4px_-4px_8px_#ffffff]">
                    Check-in opens when the event starts
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
