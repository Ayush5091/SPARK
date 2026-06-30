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
    <div className="max-w-md md:max-w-3xl mx-auto min-h-screen bg-[#F0F0F3] font-sans relative pb-24 md:pb-12 overflow-hidden text-black selection:bg-black selection:text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 pt-10 pb-6 sticky top-0 z-20 bg-[#F0F0F3]/90 backdrop-blur-sm">
        <Link
          href="/profile"
          className="flex items-center justify-center w-12 h-12 rounded-full bg-[#F0F0F3] text-black shadow-[6px_6px_12px_#d1d1d3,-6px_-6px_12px_#ffffff] active:shadow-[inset_4px_4px_8px_#d1d1d3] transition-all"
        >
          <span className="material-icons-outlined text-2xl">arrow_back</span>
        </Link>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Profile</span>
          <h2 className="text-lg font-black tracking-tight text-black">Settings</h2>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 px-6 py-6 pb-28 space-y-8">
        {/* Profile Avatar Section */}
        <div className="flex flex-col items-center py-6 bg-[#F0F0F3] rounded-3xl shadow-[inset_6px_6px_12px_#d1d1d3,inset_-6px_-6px_12px_#ffffff] border border-white/20">
          <div className="relative group">
            <UserAvatar name={name} className="w-24 h-24 text-4xl bg-gray-900 text-white flex items-center justify-center rounded-full shadow-[4px_4px_10px_#d1d1d3]" />
          </div>
          <div className="mt-4 text-center">
            <h3 className="text-black text-xl font-black tracking-tight">{name}</h3>
            {!isAdmin && (
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mt-1">{department}</p>
            )}
            {isAdmin && (
              <span className="inline-block bg-black text-white text-[9px] font-bold px-2.5 py-1 rounded-full mt-2 uppercase tracking-widest shadow-[2px_2px_6px_#d1d1d3]">
                Administrator
              </span>
            )}
          </div>
        </div>

        {/* Personal Information Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Personal Info</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-2xl shadow-[4px_4px_8px_#d1d1d3,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#d1d1d3] transition-all ${
                isEditing ? 'text-red-600' : 'text-black'
              }`}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="space-y-5">
            {/* Name Field (Admin Only) */}
            {isAdmin && (
              <div className="p-5 bg-[#F0F0F3] rounded-2xl shadow-[6px_6px_12px_#d1d1d3,-6px_-6px_12px_#ffffff] border border-white/20">
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.name}
                    onChange={e => setEditData({ ...editData, name: e.target.value })}
                    className="w-full bg-[#F0F0F3] shadow-[inset_2px_2px_5px_#d1d1d3,inset_-2px_-2px_5px_#ffffff] border-none rounded-xl px-4 py-2 text-sm text-black outline-none focus:ring-0"
                    placeholder="Enter Name"
                  />
                ) : (
                  <p className="text-sm font-black text-black">{name}</p>
                )}
              </div>
            )}

            {/* USN Field (Students Only) */}
            {!isAdmin && (
              <div className="p-5 bg-[#F0F0F3] rounded-2xl shadow-[6px_6px_12px_#d1d1d3,-6px_-6px_12px_#ffffff] border border-white/20">
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  USN
                </label>
                <p className="text-sm font-black text-black uppercase tracking-wider">{usn}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1.5">USN cannot be changed</p>
              </div>
            )}

            {/* Email Field */}
            <div className="p-5 bg-[#F0F0F3] rounded-2xl shadow-[6px_6px_12px_#d1d1d3,-6px_-6px_12px_#ffffff] border border-white/20">
              <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                Email
              </label>
              <p className="text-sm font-black text-black truncate">{email}</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1.5">Email cannot be changed</p>
            </div>

            {/* Phone Number Field (Students Only) */}
            {!isAdmin && (
              <div className="p-5 bg-[#F0F0F3] rounded-2xl shadow-[6px_6px_12px_#d1d1d3,-6px_-6px_12px_#ffffff] border border-white/20">
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.phone_number}
                    onChange={e => setEditData({ ...editData, phone_number: e.target.value })}
                    className="w-full bg-[#F0F0F3] shadow-[inset_2px_2px_5px_#d1d1d3,inset_-2px_-2px_5px_#ffffff] border-none rounded-xl px-4 py-2 text-sm text-black outline-none focus:ring-0"
                    placeholder="Enter phone number"
                  />
                ) : (
                  <p className="text-sm font-black text-black tracking-wider">{phoneNumber}</p>
                )}
              </div>
            )}

            {/* Department Field (Students Only) */}
            {!isAdmin && (
              <div className="p-5 bg-[#F0F0F3] rounded-2xl shadow-[6px_6px_12px_#d1d1d3,-6px_-6px_12px_#ffffff] border border-white/20">
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Department
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.department}
                    onChange={e => setEditData({ ...editData, department: e.target.value })}
                    className="w-full bg-[#F0F0F3] shadow-[inset_2px_2px_5px_#d1d1d3,inset_-2px_-2px_5px_#ffffff] border-none rounded-xl px-4 py-2 text-sm text-black outline-none focus:ring-0"
                    placeholder="Enter department"
                  />
                ) : (
                  <p className="text-sm font-black text-black tracking-wider uppercase">{department}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 pt-4">
          {isEditing && (
            <button
              disabled={saving}
              onClick={handleSave}
              className="w-full h-14 bg-black text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-[4px_4px_10px_#b8b8ba] active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          )}

          <button
            onClick={logout}
            className="w-full h-12 bg-[#F0F0F3] text-red-600 font-bold text-xs uppercase tracking-widest rounded-2xl shadow-[4px_4px_8px_#d1d1d3,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#d1d1d3] transition-all flex items-center justify-center"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}