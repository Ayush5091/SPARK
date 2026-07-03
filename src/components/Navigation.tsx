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
import { motion } from 'framer-motion';

const MotionLink = motion(Link);

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
                            {[
                                { href: '/', icon: LayoutDashboard },
                                { href: '/admin/queue', icon: ClipboardCheck },
                                { href: '/admin/events', icon: Calendar },
                                { href: '/profile', icon: User }
                            ].map((item) => {
                                const active = isActive(item.href);
                                const IconComponent = item.icon;
                                return (
                                    <MotionLink
                                        key={item.href}
                                        href={item.href}
                                        className="relative flex flex-col items-center justify-center pb-2 w-12 h-12 group"
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <IconComponent 
                                            size={24} 
                                            strokeWidth={active ? 2.5 : 2} 
                                            className={`transition-colors duration-200 ${
                                                active ? 'text-black' : 'text-gray-400 group-hover:text-black'
                                            }`} 
                                        />
                                        {active && (
                                            <motion.div
                                                layoutId="active-line-mobile-admin"
                                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
                                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                            />
                                        )}
                                    </MotionLink>
                                );
                            })}
                        </>
                    ) : (
                        <>
                            {/* Student Navigation */}
                            {[
                                { href: '/', icon: Home },
                                { href: '/events', icon: Calendar },
                                { href: 'spacer', icon: null },
                                { href: '/submissions-history', icon: Clock },
                                { href: '/profile', icon: User }
                            ].map((item, index) => {
                                if (item.href === 'spacer') {
                                    return <div key={`spacer-${index}`} className="w-12"></div>;
                                }
                                const active = isActive(item.href);
                                const IconComponent = item.icon!;
                                return (
                                    <MotionLink
                                        key={item.href}
                                        href={item.href}
                                        className="relative w-12 h-12 flex items-center justify-center group"
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        {active && (
                                            <motion.div
                                                layoutId="active-circle-mobile-student"
                                                className="absolute inset-0 rounded-full bg-black shadow-[4px_4px_10px_#9ca3af]"
                                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                            />
                                        )}
                                        <IconComponent 
                                            size={active ? 22 : 24} 
                                            strokeWidth={2.5} 
                                            className={`relative z-10 transition-colors duration-200 ${
                                                active ? 'text-white' : 'text-gray-400 group-hover:text-black'
                                            }`} 
                                        />
                                    </MotionLink>
                                );
                            })}

                            {/* Center FAB */}
                            <MotionLink 
                                href="/events" 
                                className="absolute left-1/2 -translate-x-1/2 -top-6 w-16 h-16 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-[4px_10px_20px_rgba(0,0,0,0.3)] border-4 border-[#F0F0F3] z-20"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            >
                                <Plus size={28} strokeWidth={3} />
                            </MotionLink>
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
                        <div className="flex flex-col gap-1">
                            {[
                                { href: '/', label: 'Overview' },
                                { href: '/admin/queue', label: 'Review Queue' },
                                { href: '/admin/events', label: 'Events' },
                                { href: '/profile', label: 'Profile' }
                            ].map((item) => {
                                const active = isActive(item.href);
                                return (
                                    <MotionLink
                                        key={item.href}
                                        href={item.href}
                                        className={`relative flex items-center gap-3 py-2.5 pl-4 pr-3 rounded-r-lg transition-colors ${
                                            active 
                                                ? 'text-black font-bold bg-gray-50' 
                                                : 'text-gray-600 hover:text-black font-medium'
                                        }`}
                                        whileHover={active ? {} : { x: 3 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {active && (
                                            <motion.div
                                                layoutId="active-border-desktop-admin"
                                                className="absolute left-0 top-0 bottom-0 w-1 bg-black rounded-r"
                                                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                            />
                                        )}
                                        <span className="text-sm relative z-10">{item.label}</span>
                                    </MotionLink>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {[
                                { href: '/', icon: Home, label: 'Home' },
                                { href: '/events', icon: Calendar, label: 'Events' },
                                { href: '/submissions-history', icon: Clock, label: 'History' },
                                { href: '/profile', icon: User, label: 'Profile' }
                            ].map((item) => {
                                const active = isActive(item.href);
                                const IconComponent = item.icon;
                                return (
                                    <MotionLink
                                        key={item.href}
                                        href={item.href}
                                        className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors ${
                                            active 
                                                ? 'text-black font-black' 
                                                : 'text-gray-500 hover:text-black font-bold'
                                        }`}
                                        whileHover={active ? {} : { x: 4 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {active && (
                                            <motion.div
                                                layoutId="active-bg-desktop-student"
                                                className="absolute inset-0 bg-[#F0F0F3] shadow-[4px_4px_8px_#d1d1d3,-4px_-4px_8px_#ffffff] rounded-2xl -z-10"
                                                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                            />
                                        )}
                                        <IconComponent size={20} strokeWidth={2.5} className="relative z-10" />
                                        <span className="text-xs uppercase tracking-wider relative z-10">{item.label}</span>
                                    </MotionLink>
                                );
                            })}

                            <MotionLink
                                href="/events?new=1"
                                className="flex items-center justify-center gap-2 rounded-2xl bg-black text-white px-4 py-4 text-xs font-bold uppercase tracking-widest shadow-[4px_4px_10px_#9ca3af] mt-6"
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            >
                                <Plus size={16} strokeWidth={3} />
                                <span>Start Event</span>
                            </MotionLink>
                        </div>
                    )}
                </div>

                <div className="mt-auto pt-6 border-t border-gray-200/50">
                    <motion.button 
                        onClick={logout} 
                        className={`w-full flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all p-3.5 ${
                            isAdmin
                                ? 'bg-white border border-gray-200 text-black hover:bg-gray-50 rounded-md shadow-none'
                                : 'bg-[#F0F0F3] text-red-600 rounded-2xl shadow-[4px_4px_8px_#d1d1d3,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#d1d1d3]'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <LogOut size={20} strokeWidth={2.5} />
                        <span>Log out</span>
                    </motion.button>
                </div>
            </nav>
        </>
    );
}
