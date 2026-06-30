"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function RequestActivityScreen() {
    const { token } = useAuth();
    const router = useRouter();

    const [activities, setActivities] = useState<any[]>([]);
    const [selectedActivity, setSelectedActivity] = useState("");
    const [date, setDate] = useState("");
    const [description, setDescription] = useState("");
    const [hours, setHours] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!token) return;
        fetch('/api/activities', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.json())
            .then(data => setActivities(data || []))
            .catch(console.error);
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const res = await fetch('/api/activity-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    activity_id: parseInt(selectedActivity),
                    description,
                    hours: parseInt(hours) || 0
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Failed to submit request");

            setMessage(`Success! Request ID ${data.id} created.`);
            setTimeout(() => router.push('/submissions-history'), 1500);
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };
  return (
    <div className="max-w-md md:max-w-3xl mx-auto min-h-screen bg-[#F0F0F3] font-sans relative pb-24 md:pb-12 overflow-hidden text-black selection:bg-black selection:text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-10 pb-6 sticky top-0 z-20 bg-[#F0F0F3]/90 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-[#F0F0F3] text-black shadow-[6px_6px_12px_#d1d1d3,-6px_-6px_12px_#ffffff] active:shadow-[inset_4px_4px_8px_#d1d1d3] transition-all"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Activity Request</span>
          <h1 className="text-lg font-black tracking-tight text-black">Request Activity</h1>
        </div>
        <div className="w-12"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-6 pb-28">
        {message && (
          <div className={`p-4 rounded-3xl mb-6 text-center text-xs font-bold uppercase tracking-wider ${
            message.includes('Success') 
              ? 'bg-[#F0F0F3] text-green-600 shadow-[inset_3px_3px_6px_#d1d1d3,inset_-3px_-3px_6px_#ffffff]' 
              : 'bg-[#F0F0F3] text-red-600 shadow-[inset_3px_3px_6px_#d1d1d3,inset_-3px_-3px_6px_#ffffff]'
          }`}>
            {message}
          </div>
        )}

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          {/* Category */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1" htmlFor="category">
              Activity Category
            </label>
            <div className="relative">
              <select
                required
                value={selectedActivity}
                onChange={(e) => setSelectedActivity(e.target.value)}
                className="w-full bg-[#F0F0F3] shadow-[inset_3px_3px_6px_#d1d1d3,inset_-3px_-3px_6px_#ffffff] border-none rounded-2xl px-5 py-4 pr-12 text-sm text-black outline-none focus:ring-0 appearance-none cursor-pointer"
                id="category"
              >
                <option disabled value="">Select Activity Type...</option>
                {activities.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.category} - {a.name} ({a.points} pts)</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                <span className="material-symbols-outlined text-lg">expand_more</span>
              </div>
            </div>
          </div>

          {/* Hours and Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1" htmlFor="hours">
                Hours spent
              </label>
              <input
                required
                value={hours}
                onChange={e => setHours(e.target.value)}
                className="w-full bg-[#F0F0F3] shadow-[inset_3px_3px_6px_#d1d1d3,inset_-3px_-3px_6px_#ffffff] border-none rounded-2xl px-5 py-4 text-sm text-black placeholder-gray-400 outline-none focus:ring-0"
                id="hours"
                placeholder="4"
                type="number"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1" htmlFor="date">
                Date
              </label>
              <input
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-[#F0F0F3] shadow-[inset_3px_3px_6px_#d1d1d3,inset_-3px_-3px_6px_#ffffff] border-none rounded-2xl px-5 py-4 text-sm text-black outline-none focus:ring-0 [color-scheme:light]"
                id="date"
                type="date"
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1" htmlFor="description">
              Description
            </label>
            <textarea
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-[#F0F0F3] shadow-[inset_3px_3px_6px_#d1d1d3,inset_-3px_-3px_6px_#ffffff] border-none rounded-2xl p-5 text-sm text-black placeholder-gray-400 outline-none focus:ring-0 resize-none"
              id="description"
              placeholder="Briefly describe the activity..."
              rows={4}
            ></textarea>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              disabled={loading}
              className="w-full h-14 bg-black text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-[4px_4px_10px_#b8b8ba] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              type="submit"
            >
              <span>{loading ? "Submitting..." : "Submit Request"}</span>
              <span className="material-symbols-outlined text-sm">send</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
