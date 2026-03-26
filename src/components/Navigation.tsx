'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function Navigation() {
    const pathname = usePathname();
    const { logout, user } = useAuth();

    // Hide navigation on auth pages
    if (pathname === '/login' || pathname.startsWith('/auth/') || pathname === '/register') {
        return null;
    }

    const navItems = [
        { label: 'Home', href: '/', icon: 'home' },
        { label: 'Events', href: '/events', icon: 'event' },
        { label: 'History', href: '/submissions-history', icon: 'history' },
        { label: 'Profile', href: '/profile', icon: 'person' },
    ];

    const gridColsClass = 'grid-cols-5';

    return (
        <>
            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed inset-x-0 bottom-0 w-full max-w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-2 py-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] z-40 shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.15)]">
                <div className={`relative grid ${gridColsClass} items-center justify-items-center`}>
                    {navItems.slice(0, 2).map((item) => {
                        const isActive = pathname === item.href;

                        return (
                            <Link href={item.href} key={item.label} className={`flex flex-col items-center gap-1 group transition-all duration-200 ease-out px-2 py-1 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isActive ? 'text-primary dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-white'}`}>
                                <span className="material-icons-outlined text-2xl group-hover:scale-110 transition-transform duration-200 ease-out">{item.icon}</span>
                                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                            </Link>
                        );
                    })}

                    <div aria-hidden="true" className="h-1 w-1" />

                    {navItems.slice(2).map((item) => {
                        const isActive = pathname === item.href;

                        return (
                            <Link href={item.href} key={item.label} className={`flex flex-col items-center gap-1 group transition-all duration-200 ease-out px-2 py-1 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isActive ? 'text-primary dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-white'}`}>
                                <span className="material-icons-outlined text-2xl group-hover:scale-110 transition-transform duration-200 ease-out">{item.icon}</span>
                                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                            </Link>
                        );
                    })}

                    {user?.role !== "admin" && (
                        <Link
                            href="/events?new=1"
                            className="absolute left-1/2 -top-6 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/30 transition-all duration-200 ease-out hover:scale-105 active:scale-95"
                            aria-label="Start Event"
                        >
                            <span className="material-icons-outlined text-2xl">add</span>
                        </Link>
                    )}
                </div>
            </nav>

            {/* Desktop Sidebar */}
            <nav className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-card-light dark:bg-card-dark border-r border-subtle-light dark:border-subtle-dark p-6 z-30 shadow-soft">
                <div className="flex items-center gap-3 mb-10 mt-4 px-2">
                    <div className="h-10 w-10 flex items-center justify-center bg-primary text-white rounded-xl shadow-md">
                        <span className="material-icons-outlined">local_activity</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-primary dark:text-white">AICTE <span className="text-primary/60 dark:text-white/60">Dash</span></h1>
                </div>

                <div className="flex-1 space-y-6">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;

                        return (
                            <Link href={item.href} key={item.label} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-subtle-light dark:bg-subtle-dark text-primary dark:text-white font-bold shadow-sm' : 'text-text-muted-light dark:text-text-muted-dark hover:bg-subtle-light/50 hover:text-primary font-medium'}`}>
                                <span className="material-icons-outlined text-[20px]">{item.icon}</span>
                                <span className="text-sm">{item.label}</span>
                            </Link>
                        );
                    })}

                    {user?.role !== "admin" && (
                        <Link
                            href="/events?new=1"
                            className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary-dark"
                        >
                            <span className="material-icons-outlined text-lg">add</span>
                            Start Event
                        </Link>
                    )}
                </div>

                <div className="mt-auto pt-6 border-t border-subtle-light dark:border-subtle-dark">
                    <button onClick={logout} className="w-full flex flex-row items-center gap-3 px-4 py-3 rounded-xl transition-all text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium cursor-pointer">
                        <span className="material-icons-outlined text-[20px]">logout</span>
                        <span className="text-sm">Log out</span>
                    </button>
                </div>
            </nav>
        </>
    );
}
