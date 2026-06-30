'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { 
    Home, 
    Calendar, 
    Clock, 
    User, 
    Plus, 
    LayoutDashboard, 
    ClipboardCheck, 
    LogOut,
    Award
} from "lucide-react";

export default function Navigation() {
    const pathname = usePathname();
    const { logout, user } = useAuth();

    // Hide navigation on auth pages
    if (pathname === '/login' || pathname.startsWith('/auth/') || pathname === '/register') {
        return null;
    }

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    const isAdmin = user?.role === 'admin';

    return (
        <>
            {/* Mobile Bottom Navigation */}
            <nav className={`md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 ${
                isAdmin 
                    ? 'bg-white border-t border-gray-200 rounded-t-md' 
                    : 'bg-[#F0F0F3] rounded-t-3xl shadow-[0_-8px_20px_rgba(209,209,211,0.5)]'
            }`}>
                <div className="flex items-center justify-between px-8 py-5 relative">
                    {isAdmin ? (
                        <>
                            {/* Admin Navigation */}
                            {/* Overview (/) */}
                            <Link href="/" className="flex flex-col items-center gap-1 group">
                                {isActive('/') ? (
                                    <div className="text-black font-bold border-b-2 border-black pb-1">
                                        <LayoutDashboard size={22} strokeWidth={2.5} />
                                    </div>
                                ) : (
                                    <LayoutDashboard size={24} strokeWidth={2} className="text-gray-400 hover:text-black transition-colors" />
                                )}
                            </Link>

                            {/* Review Queue (/admin/queue) */}
                            <Link href="/admin/queue" className="flex flex-col items-center gap-1 group">
                                {isActive('/admin/queue') ? (
                                    <div className="text-black font-bold border-b-2 border-black pb-1">
                                        <ClipboardCheck size={22} strokeWidth={2.5} />
                                    </div>
                                ) : (
                                    <ClipboardCheck size={24} strokeWidth={2} className="text-gray-400 hover:text-black transition-colors" />
                                )}
                            </Link>

                            {/* Events Manager (/admin/events) */}
                            <Link href="/admin/events" className="flex flex-col items-center gap-1 group">
                                {isActive('/admin/events') ? (
                                    <div className="text-black font-bold border-b-2 border-black pb-1">
                                        <Calendar size={22} strokeWidth={2.5} />
                                    </div>
                                ) : (
                                    <Calendar size={24} strokeWidth={2} className="text-gray-400 hover:text-black transition-colors" />
                                )}
                            </Link>

                            {/* Profile (/profile) */}
                            <Link href="/profile" className="flex flex-col items-center gap-1 group">
                                {isActive('/profile') ? (
                                    <div className="text-black font-bold border-b-2 border-black pb-1">
                                        <User size={22} strokeWidth={2.5} />
                                    </div>
                                ) : (
                                    <User size={24} strokeWidth={2} className="text-gray-400 hover:text-black transition-colors" />
                                )}
                            </Link>
                        </>
                    ) : (
                        <>
                            {/* Student Navigation */}
                            {/* Home (/) */}
                            <Link href="/" className="flex flex-col items-center gap-1 group">
                                {isActive('/') ? (
                                    <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow-[4px_4px_10px_#9ca3af]">
                                        <Home size={22} strokeWidth={2.5} />
                                    </div>
                                ) : (
                                    <Home size={24} strokeWidth={2.5} className="text-gray-400 hover:text-black transition-colors" />
                                )}
                            </Link>

                            {/* Events (/events) */}
                            <Link href="/events" className="flex flex-col items-center gap-1 group">
                                {isActive('/events') ? (
                                    <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow-[4px_4px_10px_#9ca3af]">
                                        <Calendar size={22} strokeWidth={2.5} />
                                    </div>
                                ) : (
                                    <Calendar size={24} strokeWidth={2.5} className="text-gray-400 hover:text-black transition-colors" />
                                )}
                            </Link>

                            {/* Center FAB placeholder to keep spacing */}
                            <div className="w-12"></div>

                            {/* History (/submissions-history) */}
                            <Link href="/submissions-history" className="flex flex-col items-center gap-1 group">
                                {isActive('/submissions-history') ? (
                                    <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow-[4px_4px_10px_#9ca3af]">
                                        <Clock size={22} strokeWidth={2.5} />
                                    </div>
                                ) : (
                                    <Clock size={24} strokeWidth={2.5} className="text-gray-400 hover:text-black transition-colors" />
                                )}
                            </Link>

                            {/* Profile (/profile) */}
                            <Link href="/profile" className="flex flex-col items-center gap-1 group">
                                {isActive('/profile') ? (
                                    <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow-[4px_4px_10px_#9ca3af]">
                                        <User size={22} strokeWidth={2.5} />
                                    </div>
                                ) : (
                                    <User size={24} strokeWidth={2.5} className="text-gray-400 hover:text-black transition-colors" />
                                )}
                            </Link>

                            {/* Center FAB */}
                            <Link href="/events" className="absolute left-1/2 -translate-x-1/2 -top-6 w-16 h-16 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-[4px_10px_20px_rgba(0,0,0,0.3)] transition-transform active:scale-95 border-4 border-[#F0F0F3]">
                                <Plus size={28} strokeWidth={3} />
                            </Link>
                        </>
                    )}
                </div>
            </nav>

            {/* Desktop Sidebar */}
            <nav className={`hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 p-6 z-30 ${
                isAdmin 
                    ? 'bg-white border-r border-gray-200 text-black' 
                    : 'bg-[#F0F0F3] border-r border-white/20 shadow-[4px_0_12px_#d1d1d3] text-black'
            }`}>
                <div className="flex items-center gap-3 mb-10 mt-4 px-2">
                    <div className={`h-10 w-10 flex items-center justify-center text-white rounded-xl ${
                        isAdmin 
                            ? 'bg-black rounded-md' 
                            : 'bg-black shadow-[2px_2px_6px_#d1d1d3]'
                    }`}>
                        <Award size={20} strokeWidth={2.5} />
                    </div>
                    <h1 className="text-lg font-black tracking-widest text-black">SPARK</h1>
                </div>

                <div className="flex-1 space-y-4">
                    {isAdmin ? (
                        <>
                            {/* Overview */}
                            <Link 
                                href="/" 
                                className={`flex items-center gap-3 py-2 px-3 transition-all ${
                                    isActive('/') 
                                        ? 'border-l-2 border-black pl-3 text-black font-bold' 
                                        : 'border-l-2 border-transparent pl-3 text-gray-600 hover:text-black font-medium'
                                }`}
                            >
                                <span className="text-sm">Overview</span>
                            </Link>

                            {/* Review Queue */}
                            <Link 
                                href="/admin/queue" 
                                className={`flex items-center gap-3 py-2 px-3 transition-all ${
                                    isActive('/admin/queue') 
                                        ? 'border-l-2 border-black pl-3 text-black font-bold' 
                                        : 'border-l-2 border-transparent pl-3 text-gray-600 hover:text-black font-medium'
                                }`}
                            >
                                <span className="text-sm">Review Queue</span>
                            </Link>

                            {/* Events */}
                            <Link 
                                href="/admin/events" 
                                className={`flex items-center gap-3 py-2 px-3 transition-all ${
                                    isActive('/admin/events') 
                                        ? 'border-l-2 border-black pl-3 text-black font-bold' 
                                        : 'border-l-2 border-transparent pl-3 text-gray-600 hover:text-black font-medium'
                                }`}
                            >
                                <span className="text-sm">Events</span>
                            </Link>

                            {/* Profile */}
                            <Link 
                                href="/profile" 
                                className={`flex items-center gap-3 py-2 px-3 transition-all ${
                                    isActive('/profile') 
                                        ? 'border-l-2 border-black pl-3 text-black font-bold' 
                                        : 'border-l-2 border-transparent pl-3 text-gray-600 hover:text-black font-medium'
                                }`}
                            >
                                <span className="text-sm">Profile</span>
                            </Link>
                        </>
                    ) : (
                        <>
                            {/* Student links */}
                            <Link 
                                href="/" 
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${
                                    isActive('/') 
                                        ? 'bg-[#F0F0F3] shadow-[4px_4px_8px_#d1d1d3,-4px_-4px_8px_#ffffff] text-black font-black' 
                                        : 'text-gray-500 hover:text-black hover:translate-x-1 font-bold'
                                }`}
                            >
                                <Home size={20} strokeWidth={2.5} />
                                <span className="text-xs uppercase tracking-wider">Home</span>
                            </Link>

                            <Link 
                                href="/events" 
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${
                                    isActive('/events') 
                                        ? 'bg-[#F0F0F3] shadow-[4px_4px_8px_#d1d1d3,-4px_-4px_8px_#ffffff] text-black font-black' 
                                        : 'text-gray-500 hover:text-black hover:translate-x-1 font-bold'
                                }`}
                            >
                                <Calendar size={20} strokeWidth={2.5} />
                                <span className="text-xs uppercase tracking-wider">Events</span>
                            </Link>

                            <Link 
                                href="/submissions-history" 
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${
                                    isActive('/submissions-history') 
                                        ? 'bg-[#F0F0F3] shadow-[4px_4px_8px_#d1d1d3,-4px_-4px_8px_#ffffff] text-black font-black' 
                                        : 'text-gray-500 hover:text-black hover:translate-x-1 font-bold'
                                }`}
                            >
                                <Clock size={20} strokeWidth={2.5} />
                                <span className="text-xs uppercase tracking-wider">History</span>
                            </Link>

                            <Link 
                                href="/profile" 
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${
                                    isActive('/profile') 
                                        ? 'bg-[#F0F0F3] shadow-[4px_4px_8px_#d1d1d3,-4px_-4px_8px_#ffffff] text-black font-black' 
                                        : 'text-gray-500 hover:text-black hover:translate-x-1 font-bold'
                                }`}
                            >
                                <User size={20} strokeWidth={2.5} />
                                <span className="text-xs uppercase tracking-wider">Profile</span>
                            </Link>

                            <Link
                                href="/events?new=1"
                                className="flex items-center justify-center gap-2 rounded-2xl bg-black text-white px-4 py-4 text-xs font-bold uppercase tracking-widest shadow-[4px_4px_10px_#9ca3af] hover:scale-[1.02] active:scale-[0.98] transition-all mt-6"
                            >
                                <Plus size={16} strokeWidth={3} />
                                <span>Start Event</span>
                            </Link>
                        </>
                    )}
                </div>

                <div className="mt-auto pt-6 border-t border-gray-200/50">
                    <button 
                        onClick={logout} 
                        className={`w-full flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all p-3.5 ${
                            isAdmin
                                ? 'bg-white border border-gray-200 text-black hover:bg-gray-50 rounded-md shadow-none'
                                : 'bg-[#F0F0F3] text-red-600 rounded-2xl shadow-[4px_4px_8px_#d1d1d3,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#d1d1d3]'
                        }`}
                    >
                        <LogOut size={20} strokeWidth={2.5} />
                        <span>Log out</span>
                    </button>
                </div>
            </nav>
        </>
    );
}
