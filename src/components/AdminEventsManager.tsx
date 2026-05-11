"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { motion } from "framer-motion";
import EventCreateModal from "@/components/EventCreateModal";

export default function AdminEventsManager() {
    const { user, token, isLoading, isInitializing } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [events, setEvents] = useState<any[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [eventSort, setEventSort] = useState<"priority" | "points" | "name" | "capacity">("priority");
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    const [isEventSettingsOpen, setIsEventSettingsOpen] = useState(false);
    const [isEventCreateModalOpen, setIsEventCreateModalOpen] = useState(false);
    const [eventCreateSeed, setEventCreateSeed] = useState<any | null>(null);
    const [capacityEdits, setCapacityEdits] = useState<Record<number, string>>({});
    const [savingCapacityId, setSavingCapacityId] = useState<number | null>(null);

    const fetchEvents = async (showLoader = true) => {
        if (!token) return;

        try {
            if (showLoader) setIsLoadingEvents(true);

            const response = await fetch("/api/events", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setEvents(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Failed to fetch admin events", error);
        } finally {
            if (showLoader) setIsLoadingEvents(false);
        }
    };

    useEffect(() => {
        if (!isLoading && !isInitializing && !user) {
            router.replace("/login");
            return;
        }

        if (!isLoading && !isInitializing && user?.role !== "admin") {
            router.replace("/");
        }
    }, [user, isLoading, isInitializing, router]);

    useEffect(() => {
        fetchEvents();
    }, [token]);

    useEffect(() => {
        if (searchParams.get("new") === "1") {
            setIsEventCreateModalOpen(true);
        }
    }, [searchParams]);

    const normalizedSearch = searchQuery.trim().toLowerCase();

    const filteredEvents = useMemo(() => {
        let visibleEvents = events;

        if (normalizedSearch) {
            visibleEvents = visibleEvents.filter((event) => {
                const haystack = [event.name, event.category, event.location_name, event.points, event.capacity, event.total_submissions]
                    .filter((value) => value !== undefined && value !== null)
                    .join(" ")
                    .toLowerCase();

                return haystack.includes(normalizedSearch);
            });
        }

        const priorityFor = (event: any) => {
            if (event.is_ongoing) return 0;
            if (event.is_upcoming) return 1;
            return 2;
        };

        return [...visibleEvents].sort((a, b) => {
            switch (eventSort) {
                case "points":
                    return Number(b.points || 0) - Number(a.points || 0) || new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
                case "name":
                    return String(a.name || "").localeCompare(String(b.name || ""));
                case "capacity": {
                    const aRemaining = a.capacity_remaining === null || a.capacity_remaining === undefined ? Number.POSITIVE_INFINITY : Number(a.capacity_remaining);
                    const bRemaining = b.capacity_remaining === null || b.capacity_remaining === undefined ? Number.POSITIVE_INFINITY : Number(b.capacity_remaining);
                    return aRemaining - bRemaining || new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
                }
                case "priority":
                default:
                    return priorityFor(a) - priorityFor(b) || new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
            }
        });
    }, [events, normalizedSearch, eventSort]);

    const openCreateEventModal = (seed: any | null = null) => {
        setEventCreateSeed(seed);
        setIsEventSettingsOpen(false);
        setSelectedEvent(null);
        setIsEventCreateModalOpen(true);
    };

    const closeCreateEventModal = () => {
        setIsEventCreateModalOpen(false);
        setEventCreateSeed(null);
        router.replace("/admin/events");
    };

    const handleEventCreated = () => {
        fetchEvents(false);
    };

    const openEventSettings = (event: any) => {
        setSelectedEvent(event);
        setCapacityEdits((previous) => ({ ...previous, [event.id]: event.capacity ?? "" }));
        setIsEventSettingsOpen(true);
    };

    const handleCapacitySave = async (eventId: number) => {
        if (!token) return;

        const rawValue = capacityEdits[eventId];
        const capacityValue = rawValue === "" || rawValue === undefined ? null : parseInt(rawValue, 10);

        if (capacityValue !== null && (Number.isNaN(capacityValue) || capacityValue < 1)) {
            alert("Capacity must be a positive number or left blank.");
            return;
        }

        setSavingCapacityId(eventId);
        try {
            const response = await fetch(`/api/events/${eventId}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ capacity: capacityValue }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Failed to update capacity");
            }

            setEvents((previous) => previous.map((event) => (event.id === eventId ? { ...event, capacity: capacityValue } : event)));
        } catch (error: any) {
            alert(error.message || "Failed to update capacity");
        } finally {
            setSavingCapacityId(null);
        }
    };

    const getEventStatus = (event: any) => {
        if (event.is_ongoing) return { color: "bg-green-500", label: "Active" };
        if (event.is_upcoming) return { color: "bg-blue-500", label: "Upcoming" };
        return { color: "bg-gray-400", label: "Ended" };
    };

    const getCategoryIcon = (category: string) => {
        switch (category?.toLowerCase()) {
            case "cultural":
                return "palette";
            case "community service":
                return "volunteer_activism";
            case "technical":
                return "computer";
            case "sports":
                return "sports_basketball";
            case "professional":
                return "work";
            case "national initiative":
                return "flag";
            default:
                return "event";
        }
    };

    const totalEvents = filteredEvents.length;
    const activeEvents = filteredEvents.filter((event) => event.is_ongoing || event.is_upcoming).length;
    const liveEvents = filteredEvents.filter((event) => event.is_ongoing).length;
    const capacityLimitedEvents = filteredEvents.filter((event) => event.capacity && Number(event.total_submissions || 0) >= Number(event.capacity)).length;

    if (isLoading || isInitializing || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary text-primary"></div>
            </div>
        );
    }

    if (user.role !== "admin") {
        return null;
    }

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark">
            <motion.div
                className="px-6 lg:px-10 pt-8 pb-4"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
                <div className="mx-auto max-w-7xl flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Events</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create, duplicate, and manage events.</p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => openCreateEventModal()}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-primary-dark"
                    >
                        <span className="material-icons-outlined text-lg">add</span>
                        Create Event
                    </motion.button>
                </div>
            </motion.div>

            <main className="mx-auto w-full max-w-7xl px-6 py-4 md:px-10 lg:py-6">
                <motion.section
                    className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
                    initial="hidden" animate="show"
                    variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
                >
                    {[
                        { label: "Total events", value: totalEvents },
                        { label: "Active now", value: activeEvents },
                        { label: "Live now", value: liveEvents },
                        { label: "Capacity pressure", value: capacityLimitedEvents },
                    ].map(stat => (
                        <motion.div
                            key={stat.label}
                            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }}
                            whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}
                            className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#121212] cursor-default"
                        >
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{stat.label}</p>
                            <motion.p
                                key={stat.value}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-2 text-3xl font-bold text-gray-900 dark:text-white"
                            >
                                {stat.value}
                            </motion.p>
                        </motion.div>
                    ))}
                </motion.section>

                <section className="mt-6 rounded-3xl border border-gray-100 bg-white/90 p-6 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-[#121212]">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-2xl">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Operations toolbar</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Search, sort, and update event settings from one place.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:min-w-[56rem]">
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 sm:col-span-2 xl:col-span-2">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Search</span>
                                <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                                    <span className="material-symbols-outlined text-lg text-gray-400">search</span>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(event) => setSearchQuery(event.target.value)}
                                        placeholder="Event name, category, location, points..."
                                        className="w-full border-0 bg-transparent p-0 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                                    />
                                </div>
                            </label>

                            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Sort events</span>
                                <select
                                    value={eventSort}
                                    onChange={(event) => setEventSort(event.target.value as typeof eventSort)}
                                    className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                >
                                    <option value="priority">Priority</option>
                                    <option value="points">Points</option>
                                    <option value="capacity">Capacity pressure</option>
                                    <option value="name">Name</option>
                                </select>
                            </label>

                            <div className="flex items-end">
                                <button
                                    onClick={() => openCreateEventModal()}
                                    className="w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                                >
                                    New Event
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-8">
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Event catalog</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Open any event to edit capacity or duplicate it into a new event.</p>
                        </div>
                    </div>

                    {isLoadingEvents ? (
                        <div className="flex h-64 items-center justify-center rounded-3xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-[#121212]">
                            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
                        </div>
                    ) : filteredEvents.length === 0 ? (
                        <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-[#121212]">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800">
                                <span className="material-symbols-outlined text-3xl text-gray-400">event_note</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No events match the current filters</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try another search or create a new event template.</p>
                            <button
                                onClick={() => openCreateEventModal()}
                                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                            >
                                <span className="material-icons-outlined text-lg">add</span>
                                Create Event
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                            {filteredEvents.map((event, index) => {
                                const status = getEventStatus(event);
                                const participants = Number(event.total_submissions || 0);
                                const capacityLimit = event.capacity === null || event.capacity === undefined ? null : Number(event.capacity);
                                const capacityUsage = capacityLimit ? Math.min(100, (participants / capacityLimit) * 100) : Math.min(100, Number(event.participation_rate || 0));

                                return (
                                    <motion.button
                                        key={event.id}
                                        type="button"
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                        whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(0,0,0,0.08)" }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => openEventSettings(event)}
                                        className="group rounded-3xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-colors hover:border-primary/20 dark:border-gray-800 dark:bg-[#121212]"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex min-w-0 items-center gap-4">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                                                    <span className="material-symbols-outlined text-xl">{getCategoryIcon(event.category)}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="truncate text-base font-bold text-gray-900 dark:text-white md:text-lg">{event.name}</h3>
                                                    <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">{event.category} • {event.location_name}</p>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold text-white ${status.color}`}>{status.label}</span>
                                                <span className="text-sm font-bold text-primary">{Number(event.points || 0)} pts</span>
                                            </div>
                                        </div>

                                        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-900/60">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Participants</p>
                                                <p className="mt-1 font-semibold text-gray-900 dark:text-white">{participants}{capacityLimit ? ` / ${capacityLimit}` : ""}</p>
                                            </div>
                                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-900/60">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Capacity left</p>
                                                <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                                                    {event.capacity_remaining === null || event.capacity_remaining === undefined ? "Unlimited" : `${event.capacity_remaining} seats`}
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-900/60">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Verified rate</p>
                                                <p className="mt-1 font-semibold text-gray-900 dark:text-white">{Number(event.participation_rate || 0).toFixed(1)}%</p>
                                            </div>
                                        </div>

                                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                            <div
                                                className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e_0%,#2563eb_100%)] transition-all duration-500"
                                                style={{ width: `${capacityUsage}%` }}
                                            ></div>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                            <span>{event.is_ongoing ? "Live now" : event.is_upcoming ? "Scheduled" : "Completed"}</span>
                                            <span>Open settings for capacity edits or duplication</span>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>

            {isEventCreateModalOpen && (
                <EventCreateModal
                    isOpen={isEventCreateModalOpen}
                    onClose={closeCreateEventModal}
                    onEventCreated={handleEventCreated}
                    initialEvent={eventCreateSeed}
                />
            )}

            {isEventSettingsOpen && selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
                    <div className="absolute inset-0" onClick={() => setIsEventSettingsOpen(false)} />
                    <div className="relative z-10 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#121212]">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-400">Event Settings</p>
                                <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{selectedEvent.name}</h2>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{selectedEvent.category}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsEventSettingsOpen(false)}
                                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/60">
                                <p className="text-xs uppercase tracking-wider text-gray-400">Status</p>
                                <p className="mt-1 font-semibold text-gray-900 dark:text-white">{getEventStatus(selectedEvent).label}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/60">
                                <p className="text-xs uppercase tracking-wider text-gray-400">Points</p>
                                <p className="mt-1 font-semibold text-gray-900 dark:text-white">{selectedEvent.points} pts</p>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm md:col-span-2 dark:border-gray-800 dark:bg-gray-900/60">
                                <p className="text-xs uppercase tracking-wider text-gray-400">Location</p>
                                <p className="mt-1 font-semibold text-gray-900 dark:text-white">{selectedEvent.location_name}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/60">
                                <p className="text-xs uppercase tracking-wider text-gray-400">Starts</p>
                                <p className="mt-1 font-semibold text-gray-900 dark:text-white">{new Date(selectedEvent.start_time).toLocaleString()}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/60">
                                <p className="text-xs uppercase tracking-wider text-gray-400">Ends</p>
                                <p className="mt-1 font-semibold text-gray-900 dark:text-white">{new Date(selectedEvent.end_time).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end">
                            <div className="flex-1">
                                <label className="mb-1 block text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Capacity</label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="Unlimited"
                                    value={capacityEdits[selectedEvent.id] ?? (selectedEvent.capacity ?? "")}
                                    onChange={(event) => setCapacityEdits((previous) => ({ ...previous, [selectedEvent.id]: event.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                />
                            </div>
                            <button
                                onClick={() => handleCapacitySave(selectedEvent.id)}
                                disabled={savingCapacityId === selectedEvent.id}
                                className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                            >
                                {savingCapacityId === selectedEvent.id ? "Saving..." : "Save Changes"}
                            </button>
                        </div>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => openCreateEventModal(selectedEvent)}
                                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                                Duplicate Event
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEventSettingsOpen(false)}
                                className="rounded-xl border border-transparent px-4 py-3 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900 dark:hover:text-white"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}