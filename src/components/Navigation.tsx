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

const MotionLink = motion.create(Link);

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black';

// One navigation for every role: a white sidebar on desktop and a bottom bar on phones,
// with the same active state (ink pill) everywhere. Only the links differ by role.
const STUDENT_LINKS = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/events', icon: Calendar, label: 'Events' },
    { href: '/submissions-history', icon: Clock, label: 'History' },
    { href: '/profile', icon: User, label: 'Profile' },
];

const ADMIN_LINKS = [
    { href: '/', icon: LayoutDashboard, label: 'Overview' },
    { href: '/admin/queue', icon: ClipboardCheck, label: 'Review queue' },
    { href: '/admin/events', icon: Calendar, label: 'Events' },
    { href: '/profile', icon: User, label: 'Profile' },
];

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
    const links = isAdmin ? ADMIN_LINKS : STUDENT_LINKS;
    const action = isAdmin
        ? { href: '/admin/events?new=1', label: 'Create event' }
        : { href: '/events?new=1', label: 'Log activity' };

    return (
        <>
            {/* Mobile bottom bar */}
            <nav
                aria-label="Main"
                className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-[#E9ECEF] bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
            >
                <div className="relative mx-auto flex max-w-md items-center justify-around px-4 py-3">
                    {links.slice(0, 2).map((item) => (
                        <MobileLink key={item.href} item={item} active={isActive(item.href)} />
                    ))}

                    <MotionLink
                        href={action.href}
                        aria-label={action.label}
                        className={`flex h-12 w-12 items-center justify-center rounded-full bg-[#1A1A1A] text-white ${FOCUS}`}
                        whileTap={{ scale: 0.94 }}
                    >
                        <Plus size={22} strokeWidth={2.5} />
                    </MotionLink>

                    {links.slice(2).map((item) => (
                        <MobileLink key={item.href} item={item} active={isActive(item.href)} />
                    ))}
                </div>
            </nav>

            {/* Desktop sidebar */}
            <nav
                aria-label="Main"
                className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 z-30 border-r border-[#E9ECEF] bg-white px-4 py-6 text-[#1A1A1A]"
            >
                <Link href="/" className={`mb-10 mt-2 flex items-center gap-3 rounded-xl px-3 ${FOCUS}`}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1A1A1A] text-white">
                        <Award size={18} strokeWidth={2.5} />
                    </span>
                    <span className="text-lg font-black tracking-tight">SPARK</span>
                    {isAdmin && (
                        <span className="ml-auto rounded-md border border-[#E9ECEF] px-1.5 py-0.5 text-[11px] font-bold text-[#6C757D]">Admin</span>
                    )}
                </Link>

                <div className="flex flex-col gap-1">
                    {links.map((item) => {
                        const active = isActive(item.href);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={active ? 'page' : undefined}
                                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200 ${FOCUS} ${
                                    active ? 'font-bold text-white' : 'font-semibold text-[#495057] hover:bg-[#F1F3F5] hover:text-[#1A1A1A]'
                                }`}
                            >
                                {active && (
                                    <motion.span
                                        layoutId="nav-active"
                                        className="absolute inset-0 rounded-xl bg-[#1A1A1A]"
                                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                                    />
                                )}
                                <Icon size={18} strokeWidth={2.25} className="relative z-10" />
                                <span className="relative z-10">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>

                <Link
                    href={action.href}
                    className={`mt-6 flex items-center justify-center gap-2 rounded-xl border border-[#DEE2E6] px-4 py-2.5 text-sm font-bold transition-colors hover:border-[#1A1A1A] ${FOCUS}`}
                >
                    <Plus size={16} strokeWidth={2.5} />
                    {action.label}
                </Link>

                <div className="mt-auto border-t border-[#E9ECEF] pt-4">
                    <button
                        type="button"
                        onClick={logout}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#495057] transition-colors hover:bg-[#F1F3F5] hover:text-red-700 ${FOCUS}`}
                    >
                        <LogOut size={18} strokeWidth={2.25} />
                        Log out
                    </button>
                </div>
            </nav>
        </>
    );
}

function MobileLink({ item, active }: { item: (typeof STUDENT_LINKS)[number]; active: boolean }) {
    const Icon = item.icon;
    return (
        <Link
            href={item.href}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            className={`relative flex h-11 w-11 items-center justify-center rounded-full ${FOCUS}`}
        >
            {active && (
                <motion.span
                    layoutId="nav-active-mobile"
                    className="absolute inset-0 rounded-full bg-[#F1F3F5]"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
            )}
            <Icon
                size={21}
                strokeWidth={active ? 2.5 : 2}
                className={`relative z-10 transition-colors ${active ? 'text-[#1A1A1A]' : 'text-[#868E96]'}`}
            />
        </Link>
    );
}
