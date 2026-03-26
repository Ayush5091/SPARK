"use client";

import { useEffect } from "react";

interface EventDetails {
  id: number;
  name: string;
  description: string;
  category: string;
  points: number;
  location_name: string;
  start_time: string;
  end_time: string;
  is_ongoing: boolean;
  is_upcoming: boolean;
  is_past: boolean;
  capacity?: number | null;
  capacity_remaining?: number | null;
}

interface EventDetailsModalProps {
  event: EventDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function EventDetailsModal({ event, isOpen, onClose }: EventDetailsModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  const statusLabel = event.is_ongoing
    ? "Live"
    : event.is_upcoming
    ? "Upcoming"
    : "Ended";

  const capacityText =
    event.capacity == null
      ? "Unlimited"
      : `${event.capacity_remaining ?? 0} of ${event.capacity} spots left`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
              {statusLabel}
            </span>
            <h2 className="mt-3 text-2xl font-bold text-neutral-900 md:text-3xl">
              {event.name}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {event.location_name} - {event.category}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
              Points
            </p>
            <p className="text-2xl font-bold text-neutral-900">{event.points}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600 md:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Starts
            </p>
            <p className="mt-1 font-medium text-neutral-900">{formatDateTime(event.start_time)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Ends
            </p>
            <p className="mt-1 font-medium text-neutral-900">{formatDateTime(event.end_time)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Capacity
            </p>
            <p className="mt-1 font-medium text-neutral-900">{capacityText}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
            About
          </p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            {event.description}
          </p>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
