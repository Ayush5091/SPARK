"use client";

import { usePathname, useRouter } from "next/navigation";
import Navigation from "./Navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useEffect } from "react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isLoading, isInitializing } = useAuth();
    const isAuthPage = pathname === '/login' || pathname?.startsWith('/auth/') || pathname === '/register';

    useEffect(() => {
        // Wait until we're absolutely certain auth is initialized
        if (!isInitializing && !user && !isAuthPage) {
            router.push('/login');
        }
    }, [isInitializing, user, isAuthPage, router]);

    // Show loading spinner while AuthContext decodes token on mount OR if it's logging in (isLoading)
    if (!isAuthPage && (isInitializing || isLoading || !user)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary text-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen">
            <Navigation />
            <main className={`flex-1 overflow-x-hidden pb-20 md:pb-0 ${isAuthPage ? '' : 'md:ml-64'}`}>
                {children}
            </main>
        </div>
    );
}
