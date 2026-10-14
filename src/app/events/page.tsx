"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const MapLocationPicker = dynamic(() => import("@/components/MapLocationPicker"), { ssr: false });

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
  review_notes?: string | null;
  evidence_url?: string | null;
  evidence_filename?: string | null;
  is_personal?: boolean;
}

const CATEGORIES = [
  "technical",
  "cultural",
  "sports",
  "professional",
  "community service",
  "national initiative",
];

const ACCEPTED_FILES = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

// datetime-local inputs work in the student's local time; the API gets ISO (UTC) strings
const toLocalInput = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const emptyForm = () => ({
  name: "",
  description: "",
  category: "technical",
  start_time: "",
  end_time: "",
  location_name: "",
  latitude: "",
  longitude: "",
  location_radius_meters: "100",
});

const INPUT =
  "mt-2 w-full ui-input rounded-xl px-5 py-3 text-sm text-black outline-none";
const LABEL = "text-xs font-bold text-gray-500 uppercase tracking-wider ml-1";

export default function EventsPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"review" | "done">("review");
  const [submissions, setSubmissions] = useState<EventSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [evidence, setEvidence] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const fetchSubmissions = useCallback(async () => {
    if (!token || user?.role !== "student") {
      setSubmissions([]);
      setLoading(false);
      return;
    }
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
  }, [token, user?.role]);

  useEffect(() => {
    if (user?.role === "admin") {
      router.replace("/");
      return;
    }
    fetchSubmissions();
  }, [user?.role, router, fetchSubmissions]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!showCreateModal) return;
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    setFormData((prev) => ({
      ...prev,
      start_time: prev.start_time || toLocalInput(now),
      end_time: prev.end_time || toLocalInput(end),
    }));
    setFormError(null);
  }, [showCreateModal]);

  const inReview = useMemo(() => submissions.filter((s) => s.status === "pending_review"), [submissions]);
  // Rejected submissions belong here too, with their reason, rather than disappearing
  const reviewed = useMemo(() => submissions.filter((s) => s.status !== "pending_review"), [submissions]);
  const currentEvents = activeTab === "review" ? inReview : reviewed;

  // An activity that has already ended can't be checked in with the camera
  const endsInPast = useMemo(() => {
    const end = new Date(formData.end_time);
    return !Number.isNaN(end.getTime()) && end.getTime() < Date.now();
  }, [formData.end_time]);

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setFormError(null);
    router.replace("/events");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > MAX_FILE_BYTES) {
      setFormError("Files must be 10 MB or smaller.");
      e.target.value = "";
      setEvidence(null);
      return;
    }
    setFormError(null);
    setEvidence(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormError(null);

    const start = new Date(formData.start_time);
    const end = new Date(formData.end_time);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      setFormError("The end time must be after the start time.");
      return;
    }
    if (endsInPast && !evidence) {
      setFormError("This activity has already happened, so attach a report, certificate or photo as proof.");
      return;
    }

    const body = new FormData();
    body.append("name", formData.name);
    body.append("description", formData.description);
    body.append("category", formData.category);
    body.append("start_time", start.toISOString());
    body.append("end_time", end.toISOString());
    body.append("location_name", formData.location_name);
    if (formData.latitude && formData.longitude) {
      body.append("latitude", formData.latitude);
      body.append("longitude", formData.longitude);
      body.append("location_radius_meters", formData.location_radius_meters);
    }
    if (evidence) body.append("evidence", evidence);

    setIsCreating(true);
    try {
      const response = await fetch("/api/events/personal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || "Could not save the activity");
      }

      setNotice(
        data.submitted
          ? "Activity logged. Your proof is with a coordinator for review."
          : "Activity created. Check in with a photo from your dashboard while it's running."
      );
      setFormData(emptyForm());
      setEvidence(null);
      setShowMap(false);
      handleCloseModal();
      fetchSubmissions();
    } catch (err: any) {
      setFormError(err.message || "Could not save the activity");
    } finally {
      setIsCreating(false);
    }
  };

  if (user?.role === "admin") {
    return null;
  }

  return (
    <div className="max-w-md md:max-w-5xl mx-auto min-h-screen bg-[#F8F9FA] font-sans relative pb-24 md:pb-12 overflow-hidden text-black selection:bg-black selection:text-white flex flex-col">
      <header className="flex flex-col px-6 pt-10 pb-4 gap-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            aria-label="Back to home"
            className="flex items-center justify-center w-12 h-12 rounded-full text-black ui-card active:bg-[#E9ECEF] transition-all"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </Link>

          {user?.role === "student" && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-full bg-black px-5 py-3 text-xs font-bold uppercase tracking-wider text-white transition-transform active:scale-95"
            >
              <span className="material-icons-outlined text-sm">add</span>
              Log activity
            </button>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-black tracking-tight text-black">Your Event Ledger</h1>
          <p className="text-gray-500 font-medium text-sm mt-1">
            Track what&apos;s waiting for review and what has been decided.
          </p>
        </div>

        {notice && (
          <div role="status"className="flex items-start justify-between gap-3 rounded-2xl p-4 text-sm font-semibold text-black ui-card">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="material-icons-outlined text-base text-gray-500">close</button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="relative flex w-full p-1 ui-well rounded-full mt-2"role="tablist">
          <div
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full ui-card transition-transform duration-300 ease-out ${
              activeTab === "done" ? "translate-x-full" : "translate-x-0"
            }`}
          ></div>
          {([
            ["review", `In review (${inReview.length})`],
            ["done", `Reviewed (${reviewed.length})`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={`relative z-10 flex-1 py-2.5 text-xs font-bold text-center rounded-full transition-colors ${
                activeTab === key ? "text-black" : "text-gray-400 hover:text-black"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 px-6 py-6 pb-28">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-xs font-bold text-gray-400 uppercase tracking-widest">
            Loading events...
          </div>
        ) : currentEvents.length === 0 ? (
          <div className="rounded-2xl p-10 text-center text-sm font-bold text-gray-500 ui-well">
            {activeTab === "review" ? "Nothing waiting for review." : "No reviewed submissions yet."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentEvents.map((event) => {
              const badge =
                event.status === "verified"
                  ? `${event.points_awarded ?? 0} PTS`
                  : event.status === "rejected"
                    ? "REJECTED"
                    : "IN REVIEW";
              return (
                <div
                  key={event.id}
                  className="rounded-2xl p-6 ui-card flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-gray-500 text-[10px] font-bold tracking-widest uppercase">
                        {event.category}{event.is_personal ? " · Logged by you" : ""}
                      </span>
                      <h3 className="mt-1 text-lg font-black tracking-tight text-black">{event.event_name}</h3>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1.5 text-[9px] font-bold tracking-widest uppercase shrink-0 ${
                        event.status === "rejected"
                          ? "text-red-700 ui-well"
                          : "bg-black text-white "
                      }`}
                    >
                      {badge}
                    </span>
                  </div>

                  <div className="mt-4 text-xs text-gray-500 font-medium space-y-1">
                    <p className="flex items-center gap-1.5">
                      <span className="material-icons-outlined text-sm">schedule</span>
                      <span>
                        {new Date(event.start_time).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} –{" "}
                        {new Date(event.end_time).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span className="material-icons-outlined text-sm">location_on</span>
                      <span>{event.location_name}</span>
                    </p>
                  </div>

                  {event.status === "rejected" && event.review_notes && (
                    <p className="mt-4 rounded-2xl p-3 text-xs font-semibold text-gray-700 ui-well">
                      Reason: {event.review_notes}
                    </p>
                  )}

                  {event.evidence_url && (
                    <a
                      href={event.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex self-start items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-black"
                    >
                      <span className="material-icons-outlined text-sm">attach_file</span>
                      {event.evidence_filename || "View proof"}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F8F9FA]/80 backdrop-blur-sm px-4 py-8">
          <div className="absolute inset-0" onClick={handleCloseModal} />
          <div
            role="dialog"
            aria-labelledby="log-activity-title"
            className="relative z-10 w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-2xl p-6 ui-card"
          >
            <div className="flex items-center justify-between">
              <h2 id="log-activity-title" className="text-xl font-black text-black">Log an activity</h2>
              <button
                type="button"
                onClick={handleCloseModal}
                aria-label="Close"
                className="flex items-center justify-center w-9 h-9 rounded-full text-black ui-card active:bg-[#E9ECEF] transition-all"
              >
                <span className="material-icons-outlined text-lg">close</span>
              </button>
            </div>
            <p className="mt-2 text-sm font-medium text-gray-500">
              For activities outside the published events. A coordinator reviews your proof and sets the points.
            </p>

            <form onSubmit={handleCreate} className="mt-6 space-y-5">
              <div>
                <label htmlFor="act-name" className={LABEL}>Activity name</label>
                <input id="act-name" name="name" value={formData.name} onChange={handleInputChange} className={INPUT} maxLength={120} required />
              </div>

              <div>
                <label htmlFor="act-category" className={LABEL}>Category</label>
                <div className="relative mt-2">
                  <select
                    id="act-category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`${INPUT} mt-0 appearance-none cursor-pointer`}
                  >
                    {CATEGORIES.map((cat) => (
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

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="act-start" className={LABEL}>Started</label>
                  <input id="act-start" name="start_time" type="datetime-local" value={formData.start_time} onChange={handleInputChange} className={`${INPUT} [color-scheme:light]`} required />
                </div>
                <div>
                  <label htmlFor="act-end" className={LABEL}>Ended</label>
                  <input id="act-end" name="end_time" type="datetime-local" value={formData.end_time} onChange={handleInputChange} className={`${INPUT} [color-scheme:light]`} required />
                </div>
              </div>

              <div>
                <label htmlFor="act-venue" className={LABEL}>Venue or organiser</label>
                <input
                  id="act-venue"
                  name="location_name"
                  value={formData.location_name}
                  onChange={handleInputChange}
                  className={INPUT}
                  placeholder="e.g. IIT Madras, Shaastra 2026"
                  maxLength={200}
                  required
                />
              </div>

              <div>
                <label htmlFor="act-description" className={LABEL}>What you did</label>
                <textarea
                  id="act-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  maxLength={1000}
                  className={`${INPUT} p-5 resize-none`}
                />
              </div>

              {/* Proof document */}
              <div>
                <span className={LABEL}>
                  Proof {endsInPast ? <span className="text-black">(required)</span> : "(optional)"}
                </span>
                <p className="ml-1 mt-1 text-xs font-medium text-gray-500">
                  {endsInPast
                    ? "Upload a report, participation certificate or photos. PDF, Word or image, up to 10 MB."
                    : "Still running? You can check in with the camera instead, or upload a report now."}
                </p>
                <input ref={fileInput} type="file" accept={ACCEPTED_FILES} onChange={handleFile} className="sr-only" id="act-evidence" />
                <label
                  htmlFor="act-evidence"
                  className="mt-3 flex cursor-pointer items-center gap-3 rounded-2xl px-5 py-4 text-sm font-bold text-black ui-card active:bg-[#E9ECEF] focus-within:ring-2 focus-within:ring-black"
                >
                  <span className="material-icons-outlined text-lg">{evidence ? "description" : "upload_file"}</span>
                  <span className="flex-1 truncate">{evidence ? evidence.name : "Choose a file"}</span>
                  {evidence && (
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.preventDefault();
                        setEvidence(null);
                        if (fileInput.current) fileInput.current.value = "";
                      }}
                      aria-label="Remove file"
                      className="material-icons-outlined text-base text-gray-500"
                    >
                      close
                    </button>
                  )}
                </label>
              </div>

              {/* The map pin is optional context for reviewers */}
              <div className="rounded-2xl ui-card p-4">
                <button
                  type="button"
                  onClick={() => setShowMap((v) => !v)}
                  aria-expanded={showMap}
                  className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500"
                >
                  <span>Pin on map (optional){formData.latitude ? " · pinned" : ""}</span>
                  <span className="material-symbols-outlined text-lg">{showMap ? "expand_less" : "expand_more"}</span>
                </button>
                {showMap && (
                  <div className="mt-3">
                    <MapLocationPicker
                      initialLat={formData.latitude ? parseFloat(formData.latitude) : undefined}
                      initialLng={formData.longitude ? parseFloat(formData.longitude) : undefined}
                      initialRadius={parseInt(formData.location_radius_meters, 10)}
                      onLocationSelect={(lat, lng, name) => {
                        setFormData((prev) => ({
                          ...prev,
                          latitude: lat.toString(),
                          longitude: lng.toString(),
                          location_name: prev.location_name || name,
                        }));
                      }}
                      onRadiusChange={(radius) =>
                        setFormData((prev) => ({ ...prev, location_radius_meters: radius.toString() }))
                      }
                    />
                    {formData.latitude && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, latitude: "", longitude: "" }))}
                        className="mt-3 text-xs font-bold text-gray-500 hover:text-black"
                      >
                        Remove pin
                      </button>
                    )}
                  </div>
                )}
              </div>

              {formError && (
                <p role="alert"className="rounded-2xl p-4 text-sm font-semibold text-red-700 ui-well">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-2xl ui-card px-5 py-3.5 text-xs font-bold uppercase text-gray-500 active:bg-[#E9ECEF] transition-all flex-1 text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="rounded-2xl bg-black px-5 py-3.5 text-xs font-bold uppercase text-white active:scale-95 disabled:opacity-50 transition-all flex-1 text-center"
                >
                  {isCreating ? "Saving..." : evidence ? "Submit for review" : "Create activity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
