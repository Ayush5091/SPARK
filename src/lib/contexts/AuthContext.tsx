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
                setProfile(null);
            }
        } catch (e) {
            console.error("Failed to fetch profile", e);
            setProfile(null);
        } finally {
            setProfileLoading(false);
        }
    }, [token, user]);

    useEffect(() => {
        const storedToken = localStorage.getItem('access_token');
        if (storedToken) {
            try {
                setToken(storedToken);
                const base64Url = storedToken.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(atob(base64));
                setUser(payload);
                refreshProfile(storedToken, payload);
            } catch (e) {
                console.error("Failed to decode token", e);
                localStorage.removeItem('access_token');
                setProfileLoading(false);
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
        try {
            const base64Url = newToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(atob(base64));
            setUser(payload);
            refreshProfile(newToken, payload);
        } catch (e) {
            console.error("Failed to parse token generated at login");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('access_token');
        setToken(null);
        setUser(null);
        setProfile(null);
        router.push('/login');
    }, [router]);

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
