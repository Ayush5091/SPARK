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

    const allNavItems = [
        { label: 'Home', href: '/', icon: 'home' },
        { label: 'Requests', href: '/requests', icon: 'assignment' },
        { label: 'Add', href: '/request-activity', icon: 'add', isPrimary: true },
        { label: 'Proofs', href: '/submissions-history', icon: 'folder_shared' },
        { label: 'Profile', href: '/profile', icon: 'person' },
    ];

    // Filter items based on user role
    const navItems = user?.role === 'admin'
        ? allNavItems.filter(item => ['Home', 'Requests', 'Proofs', 'Profile'].includes(item.label))
        : allNavItems;

    const gridColsClass = navItems.length === 5 ? 'grid-cols-5' : (navItems.length === 4 ? 'grid-cols-4' : 'grid-cols-3');

    return (
        <>
            {/* Mobile Bottom Navigation */}
            <nav className={`md:hidden fixed inset-x-0 bottom-0 w-full max-w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-2 py-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] grid ${gridColsClass} items-center justify-items-center z-40 shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.15)]`}>
                {navItems.map((item) => {
                    const isActive = pathname === item.href;

                    if (item.isPrimary) {
                        return (
                            <Link href={item.href} key={item.label} className="relative -top-6 bg-gradient-to-br from-primary to-primary/90 text-white h-14 w-14 rounded-2xl shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 ease-out border border-primary/20">
                                <span className="material-icons-outlined text-2xl">{item.icon}</span>
                            </Link>
                        );
                    }

                    return (
                        <Link href={item.href} key={item.label} className={`flex flex-col items-center gap-1 group transition-all duration-200 ease-out px-2 py-1 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isActive ? 'text-primary dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-white'}`}>
                            <span className="material-icons-outlined text-2xl group-hover:scale-110 transition-transform duration-200 ease-out">{item.icon}</span>
                            <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Desktop Sidebar */}
            <nav className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-card-light dark:bg-card-dark border-r border-subtle-light dark:border-subtle-dark p-6 z-30 shadow-soft">
                <div className="flex items-center gap-3 mb-10 mt-4 px-2">
                    <div className="h-10 w-10 flex items-center justify-center bg-primary text-white rounded-xl shadow-md">
                        <span className="material-icons-outlined">local_activity</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-primary dark:text-white">AICTE <span className="text-primary/60 dark:text-white/60">Dash</span></h1>
                </div>

                <div className="flex-1 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;

                        if (item.isPrimary) {
                            return (
                                <div key={item.label} className="pt-6 pb-2">
                                    <Link href={item.href} className="w-full bg-primary text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-gray-900 active:scale-[0.98] transition-all flex items-center gap-3 group">
                                        <span className="material-icons-outlined  transition-transform text-lg">{item.icon}</span>
                                        <span>Request Activity</span>
                                    </Link>
                                </div>
                            );
                        }

                        return (
                            <Link href={item.href} key={item.label} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-subtle-light dark:bg-subtle-dark text-primary dark:text-white font-bold shadow-sm' : 'text-text-muted-light dark:text-text-muted-dark hover:bg-subtle-light/50 hover:text-primary font-medium'}`}>
                                <span className="material-icons-outlined text-[20px]">{item.icon}</span>
                                <span className="text-sm">{item.label}</span>
                            </Link>
                        );
                    })}
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
