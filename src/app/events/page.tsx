"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
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

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#f6f4ef]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(18,80,99,0.28),transparent_70%)]"></div>
        <div className="absolute right-[-10%] top-[-5%] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(245,181,125,0.32),transparent_68%)]"></div>
        <div className="absolute bottom-[-10%] left-1/4 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(70,120,90,0.22),transparent_70%)]"></div>
      </div>

      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/70 px-6 pb-4 pt-10 backdrop-blur-xl md:px-10 md:pt-16">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.36em] text-[#4c6a63]">
              Student Events
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0f1f1b] md:text-5xl">
              Your Event Ledger
            </h1>
            <p className="mt-2 text-sm text-[#5a6f68] md:text-base">
              Keep tabs on what you have registered for and what you have completed.
            </p>
          </div>
          {user?.role === "student" && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="hidden items-center gap-2 rounded-full bg-[#0f1f1b] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_-18px_rgba(6,24,20,0.8)] transition-transform hover:-translate-y-0.5 md:flex"
            >
              <span className="material-icons-outlined text-lg">add</span>
              Start Event
            </button>
          )}
        </div>

        <div className="relative mx-auto mt-8 flex w-full max-w-xl overflow-hidden rounded-full border border-white/40 bg-white/40 p-1.5 shadow-[0_12px_40px_-24px_rgba(6,24,20,0.6)] backdrop-blur-xl">
          <div
            className={`absolute left-1.5 top-1.5 h-[calc(100%-12px)] w-[calc(50%-6px)] rounded-full bg-white shadow-[0_8px_20px_-10px_rgba(6,24,20,0.65)] transition-transform duration-300 ${
              activeTab === "completed" ? "translate-x-[calc(100%+6px)]" : ""
            }`}
          ></div>
          <button
            type="button"
            onClick={() => setActiveTab("registered")}
            className={`relative z-10 flex-1 rounded-full py-2.5 text-sm font-semibold transition-colors md:text-base ${
              activeTab === "registered" ? "text-[#0f1f1b]" : "text-[#6b7f77]"
            }`}
          >
            Registered
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`relative z-10 flex-1 rounded-full py-2.5 text-sm font-semibold transition-colors md:text-base ${
              activeTab === "completed" ? "text-[#0f1f1b]" : "text-[#6b7f77]"
            }`}
          >
            Completed
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 md:px-10">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">Loading events...</div>
        ) : currentEvents.length === 0 ? (
          <div className="rounded-3xl border border-white/70 bg-white/80 p-10 text-center text-[#6b7f77] shadow-[0_20px_60px_-40px_rgba(12,24,20,0.6)] backdrop-blur">
            No {activeTab} events yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {currentEvents.map((event) => (
              <div
                key={event.id}
                className="group relative overflow-hidden rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_22px_70px_-45px_rgba(6,24,20,0.6)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_-40px_rgba(6,24,20,0.7)]"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(135deg,rgba(18,80,99,0.08),rgba(245,181,125,0.08))]"></div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#4c6a63]">
                      {event.category}
                    </p>
                    <h3 className="mt-2 text-lg font-bold text-[#0f1f1b]">
                      {event.event_name}
                    </h3>
                  </div>
                  <span className="rounded-full bg-[#0f1f1b]/10 px-3 py-1 text-xs font-semibold text-[#0f1f1b]">
                    {event.status === "verified"
                      ? `${event.points_awarded ?? event.event_points} pts`
                      : "Points pending"}
                  </span>
                </div>

                <div className="mt-4 text-sm text-[#5a6f68]">
                  <p>Start: {new Date(event.start_time).toLocaleString()}</p>
                  <p>End: {new Date(event.end_time).toLocaleString()}</p>
                  <p>Location: {event.location_name}</p>
                </div>

                <div className="mt-4 inline-flex items-center rounded-full bg-[#f0ebe2] px-3 py-1 text-xs font-semibold text-[#6b7f77]">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="absolute inset-0" onClick={handleCloseModal} />
          <div className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#4c6a63]">Personal Event</p>
                <h2 className="mt-2 text-2xl font-bold text-[#0f1f1b]">Start Event</h2>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-full p-2 text-[#5a6f68] hover:bg-black/5"
              >
                <span className="material-icons-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-[#0f1f1b]">Event Name</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm text-[#0f1f1b]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-[#0f1f1b]">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm text-[#0f1f1b]"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-2xl border border-black/10 bg-[#f6f4ef] p-4 text-sm text-[#5a6f68]">
                  Points are set by admin after review.
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-[#0f1f1b]">Start</label>
                  <input
                    name="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm text-[#0f1f1b]"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#0f1f1b]">End</label>
                  <input
                    name="end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm text-[#0f1f1b]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[#0f1f1b]">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm text-[#0f1f1b]"
                />
              </div>

              <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#4c6a63]">Location</p>
                <div className="mt-4 space-y-4">
                  <MapLocationPicker
                    initialLat={parseFloat(formData.latitude)}
                    initialLng={parseFloat(formData.longitude)}
                    initialRadius={parseInt(formData.location_radius_meters, 10)}
                    onLocationSelect={(lat, lng, name) =>
                      {
                        setMapTouched(true);
                        setFormData((prev) => ({
                          ...prev,
                          latitude: lat.toString(),
                          longitude: lng.toString(),
                          location_name: name,
                        }));
                      }
                    }
                    onRadiusChange={(radius) =>
                      setFormData((prev) => ({
                        ...prev,
                        location_radius_meters: radius.toString(),
                      }))
                    }
                  />
                  <div className="text-xs font-medium text-[#6b7f77]">
                    {mapTouched ? "Location selected" : "Pick a spot on the map to continue"}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#0f1f1b]">Location Name</label>
                    <input
                      name="location_name"
                      value={formData.location_name}
                      onChange={handleInputChange}
                      className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm text-[#0f1f1b]"
                      placeholder="Location"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-[#5a6f68]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="rounded-xl bg-[#0f1f1b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
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
