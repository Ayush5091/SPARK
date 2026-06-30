"use client";

import { usePathname, useRouter } from "next/navigation";
import Navigation from "./Navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useEffect } from "react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isLoading, isInitializing } = useAuth();
    const isPublicPage = pathname === '/login' || pathname?.startsWith('/auth/') || pathname === '/register' || pathname === '/demo' || (pathname === '/' && !user);

    useEffect(() => {
        // Wait until we're absolutely certain auth is initialized
        if (!isInitializing && !user && !isPublicPage) {
            router.push('/login');
        }
    }, [isInitializing, user, isPublicPage, router]);

    // Show loading spinner while AuthContext decodes token on mount or logging in
    if (isInitializing || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary text-primary"></div>
            </div>
        );
    }

    return (
        <div className={`flex min-h-screen w-full max-w-full overflow-x-clip ${isPublicPage ? 'bg-white' : 'bg-[#F0F0F3]'}`}>
            {!isPublicPage && <Navigation />}
            <main className={`flex-1 min-w-0 w-full max-w-full overflow-x-clip pb-24 md:pb-0 ${isPublicPage ? '' : 'md:ml-64'}`}>
                {children}
            </main>
        </div>
    );
}
