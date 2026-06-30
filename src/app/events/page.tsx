"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import MapLocationPicker from "@/components/MapLocationPicker";

interface EventSubmission {
  id: number;
  event_id: number;
  event_name: string;
  event_points: number;
  points_awarded: number | null;
  status: "pending_review" | "verified" | "rejected";
  submitted_at: string;
  start_time: string;
  end_time: string;
  category: string;
  location_name: string;
}

export default function EventsPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"registered" | "completed">("registered");
  const [submissions, setSubmissions] = useState<EventSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mapTouched, setMapTouched] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "technical",
    start_time: "",
    end_time: "",
    location_name: "",
    latitude: "12.971598",
    longitude: "77.594566",
    location_radius_meters: "100",
  });

  const categories = [
    "technical",
    "cultural",
    "sports",
    "professional",
    "community service",
    "national initiative",
  ];

  useEffect(() => {
    if (user?.role === "admin") {
      router.replace("/");
      return;
    }

    if (!token || user?.role !== "student") {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/event-submissions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSubmissions(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to load event submissions", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [token, user?.role]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!showCreateModal) return;
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    const format = (value: Date) => value.toISOString().slice(0, 16);

    setFormData((prev) => ({
      ...prev,
      start_time: prev.start_time || format(now),
      end_time: prev.end_time || format(end),
    }));
    setMapTouched(false);
  }, [showCreateModal]);

  const registeredEvents = useMemo(
    () => submissions.filter((event) => event.status === "pending_review"),
    [submissions]
  );

  const completedEvents = useMemo(
    () => submissions.filter((event) => event.status === "verified"),
    [submissions]
  );

  const currentEvents = activeTab === "registered" ? registeredEvents : completedEvents;

  const handleCloseModal = () => {
    setShowCreateModal(false);
    router.replace("/events");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!mapTouched) {
      alert("Please choose a location on the map before creating the event.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/events/personal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          location_radius_meters: parseInt(formData.location_radius_meters, 10),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to create event");
      }

      setFormData({
        name: "",
        description: "",
        category: "technical",
        start_time: "",
        end_time: "",
        location_name: "",
        latitude: "12.971598",
        longitude: "77.594566",
        location_radius_meters: "100",
      });
      setMapTouched(false);

      handleCloseModal();
    } catch (err: any) {
      alert(err.message || "Failed to create event");
    } finally {
      setIsCreating(false);
    }
  };

  if (user?.role === "admin") {
    return null;
  }

  return (
    <div className="max-w-md md:max-w-5xl mx-auto min-h-screen bg-[#F0F0F3] font-sans relative pb-24 md:pb-12 overflow-hidden text-black selection:bg-black selection:text-white flex flex-col">
      <header className="flex flex-col px-6 pt-10 pb-4 gap-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center justify-center w-12 h-12 rounded-full bg-[#F0F0F3] text-black shadow-[6px_6px_12px_#d1d1d3,-6px_-6px_12px_#ffffff] active:shadow-[inset_4px_4px_8px_#d1d1d3,inset_-4px_-4px_8px_#ffffff] transition-all"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </Link>

          {user?.role === "student" && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-full bg-black px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-[4px_4px_10px_#9ca3af] transition-transform active:scale-95"
            >
              <span className="material-icons-outlined text-sm">add</span>
              Start Event
            </button>
          )}
        </div>

        <div>
          <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
            Student Events
          </span>
          <h1 className="text-3xl font-black tracking-tight text-black mt-1">
            Your Event Ledger
          </h1>
          <p className="text-gray-500 font-medium text-xs mt-1">
            Keep tabs on what you have registered for and what you have completed.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="relative flex w-full p-1 bg-[#F0F0F3] shadow-[inset_4px_4px_8px_#d1d1d3,inset_-4px_-4px_8px_#ffffff] rounded-full mt-2">
          <div
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#F0F0F3] rounded-full shadow-[2px_2px_6px_#d1d1d3,-2px_-2px_6px_#ffffff] transition-transform duration-300 ease-out ${
              activeTab === "completed" ? "translate-x-full" : "translate-x-0"
            }`}
          ></div>
          <button
            type="button"
            onClick={() => setActiveTab("registered")}
            className={`relative z-10 flex-1 py-2.5 text-xs font-bold text-center rounded-full transition-colors ${
              activeTab === "registered" ? "text-black" : "text-gray-400 hover:text-black"
            }`}
          >
            Registered
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`relative z-10 flex-1 py-2.5 text-xs font-bold text-center rounded-full transition-colors ${
              activeTab === "completed" ? "text-black" : "text-gray-400 hover:text-black"
            }`}
          >
            Completed
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 py-6 pb-28">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-xs font-bold text-gray-400 uppercase tracking-widest">
            Loading events...
          </div>
        ) : currentEvents.length === 0 ? (
          <div className="rounded-3xl bg-[#F0F0F3] p-10 text-center text-xs font-bold uppercase tracking-wider text-gray-500 shadow-[inset_6px_6px_12px_#d1d1d3,inset_-6px_-6px_12px_#ffffff] border border-gray-100/50">
            No {activeTab} events yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-3xl bg-[#F0F0F3] p-6 shadow-[8px_8px_16px_#d1d1d3,-8px_-8px_16px_#ffffff] flex flex-col justify-between transition-all duration-300 hover:shadow-[4px_4px_8px_#d1d1d3,-4px_-4px_8px_#ffffff]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-gray-500 text-[10px] font-bold tracking-widest uppercase">
                      {event.category}
                    </span>
                    <h3 className="mt-1 text-lg font-black tracking-tight text-black">
                      {event.event_name}
                    </h3>
                  </div>
                  <span className="rounded-full bg-black px-3 py-1.5 text-[9px] font-bold tracking-widest text-white shadow-[2px_2px_6px_#d1d1d3] uppercase shrink-0">
                    {event.status === "verified"
                      ? `${event.points_awarded ?? event.event_points} PTS`
                      : "PENDING"}
                  </span>
                </div>

                <div className="mt-4 text-xs text-gray-500 font-medium space-y-1">
                  <p className="flex items-center gap-1.5">
                    <span className="material-icons-outlined text-sm">schedule</span>
                    <span>Start: {new Date(event.start_time).toLocaleString()}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="material-icons-outlined text-sm">schedule</span>
                    <span>End: {new Date(event.end_time).toLocaleString()}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="material-icons-outlined text-sm">location_on</span>
                    <span>Location: {event.location_name}</span>
                  </p>
                </div>

                <div className="mt-5 inline-flex self-start items-center rounded-full bg-[#F0F0F3] px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-500 shadow-[inset_2px_2px_4px_#d1d1d3,inset_-2px_-2px_4px_#ffffff]">
                  {event.status === "pending_review"
                    ? "Registered"
                    : event.points_awarded == null
                      ? "Awaiting admin points"
                      : "Completed"}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F0F0F3]/80 backdrop-blur-sm px-4 py-8">
          <div className="absolute inset-0" onClick={handleCloseModal} />
          <div className="relative z-10 w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-3xl bg-[#F0F0F3] p-6 shadow-[12px_12px_24px_#d1d1d3,-12px_-12px_24px_#ffffff] border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Personal Event</span>
                <h2 className="text-xl font-black text-black mt-1">Start Event</h2>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-[#F0F0F3] text-black shadow-[4px_4px_8px_#d1d1d3,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#d1d1d3] transition-all"
              >
                <span className="material-icons-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Event Name</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-2 w-full bg-[#F0F0F3] shadow-[inset_3px_3px_6px_#d1d1d3,inset_-3px_-3px_6px_#ffffff] border-none rounded-2xl px-5 py-4 text-sm text-black placeholder-gray-400 outline-none focus:ring-0"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Category</label>
                <div className="relative mt-2">
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full bg-[#F0F0F3] shadow-[inset_3px_3px_6px_#d1d1d3,inset_-3px_-3px_6px_#ffffff] border-none rounded-2xl px-5 py-4 text-sm text-black outline-none focus:ring-0 appearance-none cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                    <span className="material-symbols-outlined text-lg">expand_more</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[#F0F0F3] shadow-[inset_2px_2px_5px_#d1d1d3,inset_-2px_-2px_5px_#ffffff] p-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">
                Points are set by admin after review.
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Start Time</label>
                  <input
                    name="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    className="mt-2 w-full bg-[#F0F0F3] shadow-[inset_3px_3px_6px_#d1d1d3,inset_-3px_-3px_6px_#ffffff] border-none rounded-2xl px-5 py-4 text-sm text-black outline-none focus:ring-0 [color-scheme:light]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">End Time</label>
                  <input
                    name="end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    className="mt-2 w-full bg-[#F0F0F3] shadow-[inset_3px_3px_6px_#d1d1d3,inset_-3px_-3px_6px_#ffffff] border-none rounded-2xl px-5 py-4 text-sm text-black outline-none focus:ring-0 [color-scheme:light]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-2 w-full bg-[#F0F0F3] shadow-[inset_3px_3px_6px_#d1d1d3,inset_-3px_-3px_6px_#ffffff] border-none rounded-2xl p-5 text-sm text-black placeholder-gray-400 outline-none focus:ring-0 resize-none"
                />
              </div>

              <div className="rounded-2xl bg-[#F0F0F3] shadow-[8px_8px_16px_#d1d1d3,-8px_-8px_16px_#ffffff] p-4 border border-white/20">
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase ml-1">Location Map</span>
                <div className="mt-3 space-y-4">
                  <MapLocationPicker
                    initialLat={parseFloat(formData.latitude)}
                    initialLng={parseFloat(formData.longitude)}
                    initialRadius={parseInt(formData.location_radius_meters, 10)}
                    onLocationSelect={(lat, lng, name) => {
                      setMapTouched(true);
                      setFormData((prev) => ({
                        ...prev,
                        latitude: lat.toString(),
                        longitude: lng.toString(),
                        location_name: name,
                      }));
                    }}
                    onRadiusChange={(radius) =>
                      setFormData((prev) => ({
                        ...prev,
                        location_radius_meters: radius.toString(),
                      }))
                    }
                  />
                  <div className="text-[10px] font-bold uppercase tracking-wider text-center text-gray-400">
                    {mapTouched ? "Location Selected" : "Tap map to set position"}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Location Label</label>
                    <input
                      name="location_name"
                      value={formData.location_name}
                      onChange={handleInputChange}
                      className="mt-2 w-full bg-[#F0F0F3] shadow-[inset_3px_3px_6px_#d1d1d3,inset_-3px_-3px_6px_#ffffff] border-none rounded-2xl px-5 py-4 text-sm text-black placeholder-gray-400 outline-none focus:ring-0"
                      placeholder="e.g. Auditorium"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-2xl bg-[#F0F0F3] shadow-[4px_4px_8px_#d1d1d3,-4px_-4px_8px_#ffffff] px-5 py-3.5 text-xs font-bold uppercase text-gray-500 active:shadow-[inset_2px_2px_4px_#d1d1d3] transition-all flex-1 text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="rounded-2xl bg-black px-5 py-3.5 text-xs font-bold uppercase text-white shadow-[4px_4px_8px_#b8b8ba] active:scale-95 disabled:opacity-50 transition-all flex-1 text-center"
                >
                  {isCreating ? "Creating..." : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
