"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import Link from 'next/link';

export default function LoginPage() {
    const [role, setRole] = useState<'student' | 'admin'>('student');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();
    const { login } = useAuth();

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Login failed');
            }

            const data = await res.json();
            login(data.access_token);
            router.push('/');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
    <div className="w-full min-h-screen bg-[#F0F0F3] font-sans relative flex flex-col items-center justify-center p-6 text-black selection:bg-black selection:text-white">
      {/* Login Card Container */}
      <main className="w-full rounded-3xl bg-[#F0F0F3] p-8 shadow-[12px_12px_24px_#d1d1d3,-12px_-12px_24px_#ffffff] max-w-sm border border-white/20 flex flex-col items-center">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h2 className="text-black text-2xl font-black tracking-tight mb-1">
            {role === "student" ? "Welcome Back" : "Admin Login"}
          </h2>
          <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
            {role === "student" ? "SPARK Activity Platform" : "Access Dashboard"}
          </span>
        </div>

        {/* Slider/Toggle Component */}
        <div className="flex mb-8 w-full">
          <div className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-[#F0F0F3] shadow-[inset_3px_3px_6px_#d1d1d3,inset_-3px_-3px_6px_#ffffff] p-1 w-full relative">
            <div
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#F0F0F3] rounded-xl shadow-[2px_2px_6px_#d1d1d3,-2px_-2px_6px_#ffffff] z-0 transition-transform duration-300 ease-out"
              style={{
                transform: role === "student" ? "translateX(4px)" : "translateX(calc(100% + 4px))",
                left: 0,
              }}
            ></div>
            <label className="flex cursor-pointer grow items-center justify-center rounded-xl px-2 text-xs font-bold uppercase tracking-wider transition-all relative z-10 h-full">
              <span className={role === "student" ? "text-black font-black" : "text-gray-400"}>Student</span>
              <input
                checked={role === "student"}
                className="hidden"
                name="user-type"
                type="radio"
                value="Student"
                onChange={() => setRole("student")}
              />
            </label>
            <label className="flex cursor-pointer grow items-center justify-center rounded-xl px-2 text-xs font-bold uppercase tracking-wider transition-all relative z-10 h-full">
              <span className={role === "admin" ? "text-black font-black" : "text-gray-400"}>Admin</span>
              <input
                checked={role === "admin"}
                className="hidden"
                name="user-type"
                type="radio"
                value="Admin"
                onChange={() => setRole("admin")}
              />
            </label>
          </div>
        </div>

        {/* Forms Container */}
        <div className="relative min-h-[190px] w-full">
          {/* STUDENT VIEW */}
          <section
            className={`absolute inset-0 w-full transition-all duration-300 ease-out flex flex-col items-center justify-center ${
              role === "student"
                ? "opacity-100 translate-y-0 z-10 pointer-events-auto"
                : "opacity-0 translate-y-4 z-0 pointer-events-none"
            }`}
          >
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-6 text-center leading-relaxed">
              Sign in with institutional account <br /> to manage points ledger.
            </p>
            <a
              href="/api/auth/google/login"
              className="w-full flex items-center justify-center gap-3 bg-[#F0F0F3] shadow-[6px_6px_12px_#d1d1d3,-6px_-6px_12px_#ffffff] border border-white/20 rounded-2xl py-4 px-4 hover:shadow-[4px_4px_8px_#d1d1d3] active:shadow-[inset_3px_3px_6px_#d1d1d3] transition-all group active:scale-95"
            >
              <svg className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
              </svg>
              <span className="text-black font-bold text-xs uppercase tracking-wider">Continue with Google</span>
            </a>
          </section>

          {/* ADMIN VIEW */}
          <section
            className={`absolute inset-0 w-full transition-all duration-300 ease-out ${
              role === "admin"
                ? "opacity-100 translate-y-0 z-10 pointer-events-auto"
                : "opacity-0 translate-y-4 z-0 pointer-events-none"
            }`}
          >
            <form onSubmit={handleAdminLogin} className="space-y-4 w-full">
              {error && (
                <div className="text-red-600 text-[10px] text-center font-bold uppercase tracking-wider bg-[#F0F0F3] p-3 rounded-2xl shadow-[inset_2px_2px_4px_#d1d1d3] border border-red-200/30">
                  {error}
                </div>
              )}
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1.5">Email Address</label>
                <input
                  className="w-full bg-[#F0F0F3] shadow-[inset_3px_3px_6px_#d1d1d3,inset_-3px_-3px_6px_#ffffff] border-none rounded-2xl px-5 h-12 text-sm text-black placeholder-gray-400 outline-none focus:ring-0"
                  placeholder="admin@aicte.edu.in"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1.5">Password</label>
                <input
                  className="w-full bg-[#F0F0F3] shadow-[inset_3px_3px_6px_#d1d1d3,inset_-3px_-3px_6px_#ffffff] border-none rounded-2xl px-5 h-12 text-sm text-black placeholder-gray-400 outline-none focus:ring-0 tracking-widest"
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button
                disabled={isLoading}
                className="w-full bg-black text-white font-bold h-12 rounded-2xl shadow-[4px_4px_8px_#b8b8ba] active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 text-xs uppercase tracking-widest"
                type="submit"
              >
                <span>{isLoading ? "Authenticating..." : "Login"}</span>
                {!isLoading && <span className="material-symbols-outlined text-sm">arrow_forward</span>}
              </button>
            </form>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-[9px] font-bold uppercase tracking-widest leading-relaxed">
            © {new Date().getFullYear()} SPARK. All rights reserved.
            <br />
            <span className="inline-flex gap-3 mt-1 text-[8px]">
              <span className="hover:text-gray-600 cursor-pointer">Privacy</span>
              <span>•</span>
              <span className="hover:text-gray-600 cursor-pointer">Support</span>
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}