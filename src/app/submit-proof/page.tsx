"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SubmitProofScreen() {
    const { token } = useAuth();
    const router = useRouter();

    const [approvedRequests, setApprovedRequests] = useState<any[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [proofUrl, setProofUrl] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!token) return;
        fetch('/api/activity-requests/me', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const approved = data.filter((r: any) => r.status === 'approved');
                    setApprovedRequests(approved);
                    if (approved.length > 0) setSelectedRequest(approved[0]);
                }
            })
            .catch(console.error);
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRequest) {
            setMessage("Please select an approved request to submit proof for.");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const res = await fetch('/api/submissions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    request_id: selectedRequest.request_id,
                    proof: proofUrl,
                    description: notes || ""
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Failed to submit proof");

            setMessage("Proof submitted successfully! Awaiting verification.");
            setTimeout(() => router.push('/submissions-history'), 1500);
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };
  return (
    <div className="max-w-md md:max-w-3xl mx-auto min-h-screen bg-[#F8F9FA] font-sans relative pb-24 md:pb-12 overflow-hidden text-black selection:bg-black selection:text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-10 pb-6 sticky top-0 z-20 bg-[#F8F9FA]/90 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center w-12 h-12 rounded-full text-black ui-card active:bg-[#E9ECEF] transition-all"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Verification</span>
          <h1 className="text-lg font-black tracking-tight text-black">Submit Proof</h1>
        </div>
        <div className="w-12"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-6 pb-28 space-y-6">
        {message && (
          <div className={`p-4 rounded-2xl text-center text-xs font-bold uppercase tracking-wider ${
            message.includes('successfully')
              ? ' text-green-600 ui-well'
              : ' text-red-600 ui-well'
          }`}>
            {message}
          </div>
        )}

        <div className="flex flex-col gap-6">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-2 block">
              Select Approved Activity
            </label>
            <div className="relative">
              <select
                className="w-full ui-input rounded-xl px-5 py-3 pr-12 text-sm text-black outline-none appearance-none cursor-pointer font-bold uppercase tracking-wider"
                value={selectedRequest?.request_id || ""}
                onChange={(e) => {
                  const req = approvedRequests.find(r => r.request_id === parseInt(e.target.value));
                  setSelectedRequest(req);
                }}
              >
                <option value="" disabled>Select Activity</option>
                {approvedRequests.map(req => (
                  <option key={req.request_id} value={req.request_id}>{req.activity}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                <span className="material-symbols-outlined text-lg">expand_more</span>
              </div>
            </div>
          </div>

          {selectedRequest ? (
            <div className="rounded-2xl p-6 ui-card relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest text-green-600 ui-well">
                    Approved
                  </span>
                  <span className="rounded-full bg-black px-3 py-1.5 text-[9px] font-bold tracking-widest text-white uppercase shrink-0">
                    +{selectedRequest.points} PTS
                  </span>
                </div>
                <h2 className="text-lg font-black text-black leading-tight mb-4">{selectedRequest.activity}</h2>
                <div className="flex items-center text-xs text-gray-500 font-bold uppercase tracking-wider gap-2">
                  <span className="material-symbols-outlined text-base">calendar_today</span>
                  <span>Requested: {new Date(selectedRequest.requested_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-8 text-center text-xs font-bold uppercase tracking-wider text-gray-400 ui-well">
              No approved requests available.
            </div>
          )}

          <div className="p-5 ui-well rounded-2xl">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-black mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">info</span> Instructions
            </h4>
            <ul className="text-[10px] font-medium text-gray-500 space-y-1.5 list-disc pl-4">
              <li>Ensure your Google Drive link has permissions set to &quot;Anyone with the link can view&quot;.</li>
              <li>Upload a certificate, photo, or doc proof.</li>
              <li>Provide specific notes detailing your participation.</li>
            </ul>
          </div>
        </div>

        {/* Form */}
        <form className="space-y-6 pt-4" onSubmit={handleSubmit}>
          {/* Drive Link */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
              Proof Link <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                required
                value={proofUrl}
                onChange={e => setProofUrl(e.target.value)}
                className="w-full ui-input rounded-xl px-5 py-3 text-sm text-black outline-none"
                placeholder="Paste Google Drive link"
                type="url"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
              Notes for Verifier
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full ui-input rounded-xl p-5 text-sm text-black outline-none resize-none"
              placeholder="Add details about your participation..."
              rows={4}
            ></textarea>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              disabled={loading || !selectedRequest}
              type="submit"
              className="w-full h-14 bg-black text-white font-bold text-xs uppercase tracking-widest rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? "Submitting..." : "Submit for Verification"}</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
