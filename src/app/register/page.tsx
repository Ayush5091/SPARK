"use client";

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

function RegisterContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();
    const [usn, setUsn] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const token = searchParams.get('token');

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            setError("Registration token missing. Try logging in again.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, usn })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || "Registration failed");
            }

            login(data.access_token);
            router.push('/');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
    <div className="w-full min-h-screen bg-[#F8F9FA] font-sans relative flex flex-col items-center justify-center p-6 text-black selection:bg-black selection:text-white">
      <div className="w-full max-w-sm rounded-2xl p-8 ui-card flex flex-col items-center">
        <h1 className="text-black text-2xl font-black tracking-tight mb-2">Complete Profile</h1>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center leading-relaxed mb-8">
          Please enter your USN to finish setting up your account.
        </p>

        {error && (
          <div className="w-full text-red-600 text-[10px] font-bold uppercase tracking-wider p-3 rounded-2xl mb-4 border border-red-200/30 ui-well">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="w-full flex flex-col gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">USN</label>
            <input
              required
              value={usn}
              onChange={(e) => setUsn(e.target.value)}
              className="w-full h-12 px-4 ui-input rounded-xl text-black outline-none uppercase tracking-wide text-sm font-semibold"
              placeholder="e.g. 1MS21CS001"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-black text-white font-bold rounded-2xl hover:bg-gray-900 active:scale-95 transition-all disabled:opacity-50 mt-4 text-xs uppercase tracking-widest"
          >
            {loading ? "Registering..." : "Complete Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RegisterContent />
        </Suspense>
    );
}
