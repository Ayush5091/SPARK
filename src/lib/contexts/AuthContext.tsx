"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    user_id?: string;
    role?: string;
    [key: string]: any;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    profile: any | null;
    profileLoading: boolean;
    login: (token: string) => void;
    logout: () => void;
    refreshProfile: () => Promise<void>;
    isLoading: boolean;
    isInitializing: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitializing, setIsInitializing] = useState(true);
    const router = useRouter();

    const parseJwt = useCallback((jwtToken: string) => {
        try {
            const base64Url = jwtToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(atob(base64));
        } catch (e) {
            return null;
        }
    }, []);

    const isTokenExpired = useCallback((payload: any) => {
        if (!payload || typeof payload.exp !== 'number') return true;
        return payload.exp * 1000 <= Date.now();
    }, []);

    const setAuthCookie = useCallback((jwtToken: string, payload: any) => {
        const expSeconds = typeof payload?.exp === 'number' ? payload.exp : undefined;
        const nowSeconds = Math.floor(Date.now() / 1000);
        const maxAge = expSeconds ? Math.max(expSeconds - nowSeconds, 0) : undefined;
        const maxAgePart = typeof maxAge === 'number' ? `; Max-Age=${maxAge}` : '';
        document.cookie = `access_token=${encodeURIComponent(jwtToken)}; Path=/; SameSite=Lax${maxAgePart}`;
    }, []);

    const clearAuthCookie = useCallback(() => {
        document.cookie = 'access_token=; Path=/; Max-Age=0; SameSite=Lax';
    }, []);

    const clearAuth = useCallback((redirectToLogin = false) => {
        localStorage.removeItem('access_token');
        clearAuthCookie();
        setToken(null);
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
        if (redirectToLogin) {
            router.push('/login');
        }
    }, [router, clearAuthCookie]);

    const refreshProfile = useCallback(async (currentToken: string | null = token, currentUser: User | null = user) => {
        if (!currentToken || !currentUser?.role) {
            setProfile(null);
            setProfileLoading(false);
            return;
        }
        
        setProfileLoading(true);
        try {
            const endpoint = currentUser.role === 'admin' ? '/api/admins/me' : '/api/students/me';
            const res = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
            } else {
                if ([400, 401, 403].includes(res.status)) {
                    clearAuth();
                }
                setProfile(null);
            }
        } catch (e) {
            console.error("Failed to fetch profile", e);
            setProfile(null);
        } finally {
            setProfileLoading(false);
        }
    }, [token, user, clearAuth]);

    useEffect(() => {
        const storedToken = localStorage.getItem('access_token');
        if (storedToken) {
            const payload = parseJwt(storedToken);
            if (!payload || isTokenExpired(payload)) {
                clearAuth();
            } else {
                setAuthCookie(storedToken, payload);
                setToken(storedToken);
                setUser(payload);
                refreshProfile(storedToken, payload);
            }
        } else {
            setProfileLoading(false);
        }
        setIsLoading(false);
        setIsInitializing(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = useCallback((newToken: string) => {
        localStorage.setItem('access_token', newToken);
        setToken(newToken);
        const payload = parseJwt(newToken);
        if (!payload || isTokenExpired(payload)) {
            clearAuth(true);
            return;
        }
        setAuthCookie(newToken, payload);
        setUser(payload);
        refreshProfile(newToken, payload);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const logout = useCallback(() => {
        clearAuth(true);
    }, [clearAuth]);

    return (
        <AuthContext.Provider value={{ user, token, profile, profileLoading, login, logout, refreshProfile, isLoading, isInitializing }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
