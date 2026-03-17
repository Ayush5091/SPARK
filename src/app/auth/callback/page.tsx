"use client";

import { useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();
    const hasProcessed = useRef(false);

    useEffect(() => {
        if (hasProcessed.current) return;
        const token = searchParams.get('token');
        
        if (token) {
            hasProcessed.current = true;
            login(token);
            window.location.href = '/';
        } else if (!token && searchParams.toString() !== "") {
            // handle case with no token
            hasProcessed.current = true;
            window.location.href = '/login';
        } else if (!token && searchParams.toString() === "") {
             // In some cases searchParams might be empty on first tick
             const rawUrl = window.location.href;
             if (!rawUrl.includes('token=')) {
                 hasProcessed.current = true;
                 window.location.href = '/login';
             }
        }
    }, [searchParams, login]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
            <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="text-sm font-medium text-gray-500">Authenticating...</p>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CallbackContent />
        </Suspense>
    );
}
