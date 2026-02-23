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
        <div className="relative flex min-h-screen w-full flex-col bg-black overflow-y-auto font-sans antialiased">

            {/* Header / Navigation (Optional Back Button space) */}
            <div className="flex items-center p-4 justify-between z-10 hidden md:flex">
                <Link href="/" className="text-white flex size-12 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                </Link>
                <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">Login</h2>
            </div>

            {/* Hero Typography Section (Stitch Mobile Design) */}
            <main className="flex-grow flex flex-col items-center justify-start py-8 md:py-12 z-10 w-full max-w-md mx-auto relative md:max-w-4xl md:flex-row md:items-center">

                {/* Desktop Background Blur Elements (Kept for desktop flair) */}
                <div className="hidden md:block absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gray-200 opacity-20 blur-[100px] pointer-events-none"></div>

                {/* Text Content */}
                <div className="px-6 text-left w-full md:w-1/2">
                    <h1 className="text-[44px] md:text-5xl font-extrabold leading-[1.1] tracking-tight mb-4 text-white">
                        Make Progress.<br />Earn Points.
                    </h1>
                    <p className="text-[#a0aec0] text-lg leading-relaxed font-medium mb-10">
                        The centralized platform to log, manage, and verify your AICTE mandatory activity points.
                    </p>

                    {/* Feature List */}
                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="bg-[#1a1c21] p-3 rounded-xl flex items-center justify-center shrink-0 w-12 h-12">
                                <span className="material-symbols-outlined text-white">trending_up</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-white">Track Progress</h3>
                                <p className="text-[#a0aec0] text-sm leading-snug">Monitor your journey towards the 100 points milestone in real-time.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="bg-[#1a1c21] p-3 rounded-xl flex items-center justify-center shrink-0 w-12 h-12">
                                <span className="material-symbols-outlined text-white">person_pin_circle</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-white">Request Approvals</h3>
                                <p className="text-[#a0aec0] text-sm leading-snug">Submit new participation requests and get them officially verified.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="bg-[#1a1c21] p-3 rounded-xl flex items-center justify-center shrink-0 w-12 h-12">
                                <span className="material-symbols-outlined text-white">verified_user</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-white">Verify Proofs</h3>
                                <p className="text-[#a0aec0] text-sm leading-snug">Upload documentation securely for administrative verification.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Sheet Overlay (Right column on Desktop, Bottom sheet on Mobile) */}
                <div className="w-full mt-12 md:mt-0 md:w-1/2 md:p-6 transition-all z-20">
                    <div className="bg-white rounded-t-[40px] md:rounded-[40px] px-6 pt-6 pb-12 w-full shadow-[0_-10px_40px_rgba(0,0,0,0.3)] min-h-[50vh] md:min-h-0 flex flex-col">

                        {/* Mobile Handle */}
                        <div className="flex h-6 w-full items-center justify-center md:hidden mb-2">
                            <div className="h-1.5 w-12 rounded-full bg-slate-200"></div>
                        </div>

                        {/* Title (for desktop mostly) */}
                        <div className="hidden md:block mb-8 text-center text-slate-800">
                            <h2 className="text-2xl font-bold">Welcome Back</h2>
                            <p className="text-sm text-slate-500">Sign in to your account.</p>
                        </div>

                        {/* Toggle Container */}
                        <div className="relative p-1.5 rounded-2xl flex items-center mb-8 bg-[#f0f2f5] max-w-sm mx-auto w-full">
                            <button
                                onClick={() => setRole('student')}
                                className={`flex-1 text-center py-2.5 z-10 cursor-pointer text-sm font-semibold transition-colors ${role === 'student' ? 'text-[#1a202c]' : 'text-[#718096]'}`}
                            >
                                Student
                            </button>
                            <button
                                onClick={() => setRole('admin')}
                                className={`flex-1 text-center py-2.5 z-10 cursor-pointer text-sm font-semibold transition-colors ${role === 'admin' ? 'text-[#1a202c]' : 'text-[#718096]'}`}
                            >
                                Admin
                            </button>

                            {/* Slider Indicator */}
                            <div
                                className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl transition-all duration-300 ease-in-out bg-white shadow-sm`}
                                style={{ transform: role === 'student' ? 'translateX(0)' : 'translateX(100%)', left: '0.375rem', width: 'calc(50% - 6px)' }}
                            ></div>
                        </div>

                        {/* Forms Container */}
                        <div className="w-full max-w-sm mx-auto relative h-[300px]">

                            {/* STUDENT FORM */}
                            <div className={`absolute inset-0 transition-opacity duration-300 ${role === 'student' ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none z-0'}`}>
                                <a
                                    href="/api/auth/google/login"
                                    className="w-full bg-[#1a1c21] hover:bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-3 transition-colors active:scale-[0.98]"
                                >
                                    <svg className="h-5 w-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    <span>Continue with Google</span>
                                </a>
                                <p className="text-center text-[#718096] text-sm mt-6">
                                    Only authenticated sahyadri.edu.in accounts are supported.
                                </p>
                            </div>

                            {/* ADMIN FORM */}
                            <div className={`absolute inset-0 transition-opacity duration-300 ${role === 'admin' ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none z-0'}`}>
                                <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
                                    {error && <div className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded-lg">{error}</div>}

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-slate-600 text-xs font-semibold px-2">Email Address</label>
                                        <div className="relative group">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl transition-colors group-focus-within:text-black">mail</span>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full h-12 pl-12 pr-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 transition-all focus:border-black"
                                                placeholder="admin@points.com"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex justify-between items-end px-2">
                                            <label className="text-slate-600 text-xs font-semibold">Password</label>
                                        </div>
                                        <div className="relative group">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl transition-colors group-focus-within:text-black">lock</span>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full h-12 pl-12 pr-12 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 transition-all focus:border-black"
                                                placeholder="••••••••"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full mt-2 h-14 text-white text-base font-bold rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 bg-[#1a1c21] hover:bg-black disabled:opacity-70 disabled:pointer-events-none"
                                    >
                                        <span>{isLoading ? 'Authenticating...' : 'Login to Dashboard'}</span>
                                        {!isLoading && <span className="material-symbols-outlined">arrow_forward</span>}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
