"use client";

import { useEffect, useState } from "react";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/lib/contexts/AuthContext";
import Link from "next/link";

export default function SettingsScreen() {
    const { token, logout, user, profile, profileLoading, refreshProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ phone_number: '', department: '', name: '' });
    const [saving, setSaving] = useState(false);

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        if (profile) {
            setEditData({
                phone_number: profile.phone_number || '',
                department: profile.department || '',
                name: profile.name || ''
            });
        }
    }, [profile]);

    const handleSave = async () => {
        if (!token) return;
        setSaving(true);
        try {
            const endpoint = isAdmin ? '/api/admins/me' : '/api/students/me';
            const payload = isAdmin ? { name: editData.name } : { phone_number: editData.phone_number, department: editData.department };

            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                await refreshProfile();
                setIsEditing(false);
            } else {
                console.error("Failed to save profile");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const userInfo = profile;

    if (profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary text-primary"></div>
            </div>
        );
    }

    const name = userInfo?.name || user?.name || (isAdmin ? "Admin" : "Student");
    const email = userInfo?.email || "N/A";
    const usn = userInfo?.usn || "N/A";
    const phoneNumber = userInfo?.phone_number || "Not set";
    const department = userInfo?.department || "Not set";

    return (
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <header className="pt-8 md:pt-10 pb-4 px-6 md:px-10 flex items-center gap-4 sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md">
                <Link
                    href="/profile"
                    className="p-2 rounded-full hover:bg-subtle-light dark:hover:bg-subtle-dark transition-colors text-primary dark:text-white"
                >
                    <span className="material-icons-outlined text-2xl">arrow_back</span>
                </Link>
                <div>
                    <h1 className="text-sm md:text-base font-medium text-text-muted-light dark:text-text-muted-dark">Profile</h1>
                    <h2 className="text-lg md:text-2xl font-bold leading-tight text-primary dark:text-white">Settings</h2>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 px-6 md:px-10 pb-24 space-y-8 max-w-2xl mx-auto w-full">

                {/* Profile Avatar Section */}
                <div className="flex flex-col items-center py-8 bg-gradient-to-b from-white to-background-light dark:from-[#202020] dark:to-background-dark rounded-2xl">
                    <div className="relative group">
                        <UserAvatar name={name} className="w-24 h-24 md:w-32 md:h-32 text-4xl md:text-5xl" />
                        <div className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg">
                            <span className="material-symbols-outlined text-[16px] md:text-[20px]">edit</span>
                        </div>
                    </div>
                    <div className="mt-4 text-center">
                        <h3 className="text-primary dark:text-white text-xl md:text-2xl font-bold tracking-tight">{name}</h3>
                        {!isAdmin && (
                            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-medium mt-1">{department}</p>
                        )}
                        {isAdmin && (
                            <span className="inline-block bg-black text-white text-xs font-bold px-2 py-1 rounded mt-2 uppercase tracking-wide shadow-sm">Administrator</span>
                        )}
                    </div>
                </div>

                {/* Personal Information Section */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg md:text-xl font-bold text-primary dark:text-white">Personal Information</h3>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                isEditing
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                    : 'bg-primary text-white hover:bg-gray-900'
                            }`}
                        >
                            {isEditing ? 'Cancel' : 'Edit'}
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Name Field (Admin Only) */}
                        {isAdmin && (
                            <div className="p-4 bg-[#F8F9FA] dark:bg-[#2a2a2a] rounded-2xl">
                                <label className="block text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Name
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editData.name}
                                        onChange={e => setEditData({ ...editData, name: e.target.value })}
                                        className="w-full bg-transparent border-b-2 border-primary focus:outline-none dark:text-white text-lg font-semibold pb-1"
                                        placeholder="Enter Name"
                                    />
                                ) : (
                                    <p className="text-lg font-semibold text-primary dark:text-white">{name}</p>
                                )}
                            </div>
                        )}

                        {/* USN Field (Students Only) */}
                        {!isAdmin && (
                            <div className="p-4 bg-[#F8F9FA] dark:bg-[#2a2a2a] rounded-2xl">
                                <label className="block text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    USN
                                </label>
                                <p className="text-lg font-semibold text-primary dark:text-white">{usn}</p>
                                <p className="text-xs text-slate-400 mt-1">USN cannot be changed</p>
                            </div>
                        )}

                        {/* Email Field */}
                        <div className="p-4 bg-[#F8F9FA] dark:bg-[#2a2a2a] rounded-2xl">
                            <label className="block text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                Email
                            </label>
                            <p className="text-lg font-semibold text-primary dark:text-white truncate">{email}</p>
                            <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
                        </div>

                        {/* Phone Number Field (Students Only) */}
                        {!isAdmin && (
                            <div className="p-4 bg-[#F8F9FA] dark:bg-[#2a2a2a] rounded-2xl">
                                <label className="block text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Phone Number
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editData.phone_number}
                                        onChange={e => setEditData({ ...editData, phone_number: e.target.value })}
                                        className="w-full bg-transparent border-b-2 border-primary focus:outline-none dark:text-white text-lg font-semibold pb-1"
                                        placeholder="Enter phone number"
                                    />
                                ) : (
                                    <p className="text-lg font-semibold text-primary dark:text-white">{phoneNumber}</p>
                                )}
                            </div>
                        )}

                        {/* Department Field (Students Only) */}
                        {!isAdmin && (
                            <div className="p-4 bg-[#F8F9FA] dark:bg-[#2a2a2a] rounded-2xl">
                                <label className="block text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Department
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editData.department}
                                        onChange={e => setEditData({ ...editData, department: e.target.value })}
                                        className="w-full bg-transparent border-b-2 border-primary focus:outline-none dark:text-white text-lg font-semibold pb-1"
                                        placeholder="Enter department"
                                    />
                                ) : (
                                    <p className="text-lg font-semibold text-primary dark:text-white">{department}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                    {isEditing && (
                        <button
                            disabled={saving}
                            onClick={handleSave}
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 md:py-5 rounded-xl md:rounded-2xl shadow-lg transition-all active:scale-[0.98]"
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    )}

                    <button
                        onClick={logout}
                        className="w-full text-red-500 dark:text-red-400 font-medium py-3 text-lg hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}