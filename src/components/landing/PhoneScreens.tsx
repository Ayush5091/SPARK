"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bell, Calendar, Camera, Check, Clock, Home, MapPin, ShieldCheck, User, X } from "lucide-react";
import { useEffect, useState } from "react";

// The phone's screen is plain DOM drawn in the student dashboard's own clay style, so the
// landing page shows the real product rather than a picture of it. All data is demo data.

export const SCREEN_W = 300;
export const SCREEN_H = 640;

const RAISED = "ui-card";
const INSET = "ui-well";

const EVENT = {
  name: "Robotics Club Open Lab",
  category: "Technical",
  venue: "Innovation Lab, Block C",
  window: "2:00 – 4:00 PM",
  points: 20,
};

function StatusBar({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-6 pt-3 text-[11px] font-bold ${dark ? "text-white" : "text-black"}`}>
      <span>2:47</span>
      <span className="flex items-center gap-1">
        <span className={`h-2 w-4 rounded-[3px] border ${dark ? "border-white/70" : "border-black/60"} p-px`}>
          <span className={`block h-full w-3/4 rounded-[1px] ${dark ? "bg-white" : "bg-black"}`} />
        </span>
      </span>
    </div>
  );
}

function HomeScreen() {
  return (
    <div className="flex h-full flex-col px-5 pb-6">
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white ${RAISED}`}>R</div>
          <span className="text-[15px] font-black tracking-tight">Welcome back, Riya.</span>
        </div>
        <div className={`relative flex h-9 w-9 items-center justify-center rounded-full ${RAISED}`}>
          <Bell size={15} strokeWidth={2.5} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-black" />
        </div>
      </div>

      <h2 className="mt-6 text-[26px] font-black leading-[1.05] tracking-tighter">Ready for your next activity?</h2>

      <div className={`mt-5 rounded-2xl p-5 ${RAISED}`}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Total points</p>
        <p className="mt-1 text-[32px] font-black tracking-tighter">
          60 <span className="text-sm font-bold text-gray-400">/ 100</span>
        </p>
        <div className={`mt-3 h-3.5 rounded-full bg-[#E9ECEF] p-[3px] ${INSET}`}>
          <div className="h-full w-[60%] rounded-full bg-black" />
        </div>
      </div>

      <div className={`mt-5 flex flex-col gap-3 rounded-2xl p-5 ${RAISED}`}>
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-black px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-white">Happening now</span>
          <span className="text-[13px] font-black">+{EVENT.points} pts</span>
        </div>
        <p className="text-[16px] font-black leading-snug tracking-tight">{EVENT.name}</p>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600">
          <MapPin size={12} strokeWidth={2.5} /> {EVENT.venue}
        </p>
        <div className="mt-1 rounded-2xl bg-black py-2.5 text-center text-[12px] font-bold text-white">Check in with photo</div>
      </div>

      <div className={`mt-auto flex items-center justify-around rounded-full px-2 py-2.5 ${RAISED}`}>
        {[Home, Calendar, Clock, User].map((Icon, i) => (
          <span key={i} className={`flex h-9 w-9 items-center justify-center rounded-full ${i === 0 ? "bg-black text-white" : "text-gray-500"}`}>
            <Icon size={16} strokeWidth={2.5} />
          </span>
        ))}
      </div>
    </div>
  );
}

function LiveScreen() {
  return (
    <div className="flex h-full flex-col px-5 pb-6">
      <p className="mt-6 text-[11px] font-bold text-gray-500">← Events</p>
      <div className="mt-4 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-600" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-blue-700">Live now</span>
      </div>
      <h2 className="mt-2 text-[26px] font-black leading-[1.05] tracking-tighter">{EVENT.name}</h2>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-gray-500">{EVENT.category} · +{EVENT.points} pts</p>

      <div className={`mt-6 flex flex-col gap-3 rounded-2xl p-5 ${INSET}`}>
        <Row icon={<MapPin size={14} strokeWidth={2.5} />} label="Venue" value={EVENT.venue} />
        <Row icon={<Clock size={14} strokeWidth={2.5} />} label="Event window" value={EVENT.window} />
        <Row icon={<ShieldCheck size={14} strokeWidth={2.5} />} label="Check-in" value="Open now" />
      </div>

      <div className={`mt-5 rounded-2xl p-4 ${RAISED}`}>
        <p className="text-[11px] font-semibold leading-relaxed text-gray-600">
          Go to the venue and tap the button below to check in with a photo.
        </p>
      </div>

      <div className="mt-auto rounded-2xl bg-black py-3 text-center text-[12px] font-bold text-white">Check in with photo</div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${RAISED}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
        <p className="truncate text-[12px] font-bold">{value}</p>
      </div>
    </div>
  );
}

function GeofenceScreen() {
  const reduce = useReducedMotion();
  return (
    <div className="flex h-full flex-col px-5 pb-6">
      <h2 className="mt-6 text-[22px] font-black leading-tight tracking-tighter">You&apos;re at the venue</h2>
      <p className="mt-1 text-[11px] font-semibold text-gray-500">{EVENT.venue}</p>

      <div className={`relative mt-5 aspect-square w-full overflow-hidden rounded-2xl bg-[#E9ECEF] ${INSET}`}>
        {/* Campus blocks */}
        <svg viewBox="0 0 260 260" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <g fill="#dcdce0">
            <rect x="14" y="18" width="70" height="44" rx="6" />
            <rect x="100" y="12" width="56" height="70" rx="6" />
            <rect x="176" y="24" width="70" height="40" rx="6" />
            <rect x="16" y="190" width="84" height="54" rx="6" />
            <rect x="180" y="176" width="64" height="70" rx="6" />
          </g>
          <path d="M0 140 H260 M130 0 V260" stroke="#f6f6f8" strokeWidth="10" />
          <circle cx="130" cy="140" r="92" fill="rgba(34,197,94,0.08)" stroke="#16a34a" strokeWidth="1.5" strokeDasharray="5 5" />
        </svg>
        {/* Venue pin */}
        <div className="absolute left-1/2 top-[54%] flex -translate-x-1/2 -translate-y-full flex-col items-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white shadow-lg">
            <MapPin size={15} strokeWidth={2.5} />
          </div>
        </div>
        {/* Student position */}
        <motion.div
          className="absolute left-[64%] top-[40%]"
          initial={reduce ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.25, type: "spring", stiffness: 260, damping: 18 }}
        >
          <span className="absolute -inset-3 rounded-full bg-blue-500/20" />
          <span className="relative block h-3.5 w-3.5 rounded-full border-[3px] border-white bg-blue-600 shadow" />
        </motion.div>
      </div>

      <div className={`mt-5 flex items-center justify-between rounded-2xl p-4 ${RAISED}`}>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Location</p>
          <p className="text-[16px] font-black tracking-tight">Confirmed</p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-green-600 px-2.5 py-1 text-[10px] font-bold text-white">
          <Check size={11} strokeWidth={3} /> Inside
        </span>
      </div>
    </div>
  );
}

function CameraScreen() {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex h-full flex-col bg-[#0b0b0c] text-white">
      <StatusBar dark />
      <div className="relative mx-3 mt-4 flex-1 overflow-hidden rounded-[22px]">
        {/* Viewfinder scene: a lab bench, drawn */}
        <svg viewBox="0 0 274 420" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="vf-wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3b4250" />
              <stop offset="1" stopColor="#262a33" />
            </linearGradient>
            <linearGradient id="vf-bench" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#8a6a4a" />
              <stop offset="1" stopColor="#5c4632" />
            </linearGradient>
          </defs>
          <rect width="274" height="420" fill="url(#vf-wall)" />
          <rect x="20" y="40" width="96" height="70" rx="4" fill="#4b5465" />
          <rect x="140" y="30" width="110" height="60" rx="4" fill="#d9e4f2" opacity="0.18" />
          <rect y="270" width="274" height="150" fill="url(#vf-bench)" />
          <rect y="262" width="274" height="12" fill="#a4835f" />
          {/* robot arm */}
          <g stroke="#f2b33d" strokeWidth="14" strokeLinecap="round" fill="none">
            <path d="M150 262 L150 214 L192 168 L230 186" />
          </g>
          <circle cx="150" cy="214" r="10" fill="#22252b" />
          <circle cx="192" cy="168" r="9" fill="#22252b" />
          <rect x="128" y="250" width="44" height="16" rx="4" fill="#22252b" />
          {/* people */}
          <circle cx="62" cy="176" r="20" fill="#c9926b" />
          <path d="M28 262 C30 214 94 214 96 262 Z" fill="#2f6fd6" />
          <circle cx="104" cy="190" r="16" fill="#8d5f43" />
          <path d="M78 262 C80 226 128 226 130 262 Z" fill="#e2e2e2" />
          <rect x="40" y="290" width="70" height="36" rx="4" fill="#2a2d33" />
          <rect x="182" y="300" width="56" height="20" rx="3" fill="#3a8f5c" />
        </svg>
        {/* framing corners */}
        {["left-3 top-3 border-l-2 border-t-2", "right-3 top-3 border-r-2 border-t-2", "bottom-3 left-3 border-b-2 border-l-2", "bottom-3 right-3 border-b-2 border-r-2"].map((c) => (
          <span key={c} className={`absolute h-5 w-5 rounded-[3px] border-white/80 ${c}`} />
        ))}
        <div className="absolute left-3 right-3 top-10 flex justify-between">
          <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold backdrop-blur">At the venue</span>
          <span className="rounded-full bg-black/60 px-2.5 py-1 font-mono text-[10px] font-bold backdrop-blur">2:47 PM</span>
        </div>
        {!reduce && (
          <motion.span
            className="absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 0.85, 0] }}
            transition={{ duration: 1.6, times: [0, 0.55, 0.62, 1], repeat: Infinity, repeatDelay: 1.4 }}
          />
        )}
      </div>
      <div className="flex items-center justify-between px-8 pb-7 pt-5">
        <span className="text-[10px] font-bold text-white/60">Take photo</span>
        <span className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/90">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black">
            <Camera size={18} strokeWidth={2.5} />
          </span>
        </span>
        <span className="text-[10px] font-bold text-white/60">Proof</span>
      </div>
    </div>
  );
}

function CountUp({ from, to }: { from: number; to: number }) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? to : from);
  useEffect(() => {
    if (reduce) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start - 450) / 900);
      const eased = t <= 0 ? 0 : 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to, reduce]);
  return <>{value}</>;
}

function VerifiedScreen() {
  const reduce = useReducedMotion();
  return (
    <div className="flex h-full flex-col px-5 pb-6">
      <div className="mt-8 flex flex-col items-center text-center">
        <motion.div
          className="flex h-20 w-20 items-center justify-center rounded-full bg-green-600 text-white ui-card"
          initial={reduce ? false : { scale: 0.4, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.1 }}
        >
          <Check size={38} strokeWidth={3.5} />
        </motion.div>
        <h2 className="mt-5 text-[24px] font-black leading-tight tracking-tighter">Verified automatically</h2>
        <p className="mt-1 text-[11px] font-semibold text-gray-500">{EVENT.name}</p>
      </div>

      <div className={`mt-6 rounded-2xl p-5 ${RAISED}`}>
        <div className="flex items-end justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Total points</p>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800">+{EVENT.points}</span>
        </div>
        <p className="mt-1 text-[34px] font-black tracking-tighter">
          <CountUp from={60} to={80} /> <span className="text-sm font-bold text-gray-400">/ 100</span>
        </p>
        <div className={`mt-3 h-3.5 rounded-full bg-[#E9ECEF] p-[3px] ${INSET}`}>
          <motion.div
            className="h-full rounded-full bg-black"
            initial={reduce ? false : { width: "60%" }}
            animate={{ width: "80%" }}
            transition={{ delay: 0.45, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      <div className={`mt-5 flex flex-col gap-2.5 rounded-2xl p-4 ${INSET}`}>
        {[
          ["Location", "At the venue"],
          ["Time", "During the event"],
          ["Points", "Added"],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-gray-500">{k}</span>
            <span className="flex items-center gap-1.5 font-bold">
              {v} <Check size={12} strokeWidth={3} className="text-green-600" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InboxScreen() {
  return (
    <div className="flex h-full flex-col px-5 pb-6">
      <h2 className="mt-6 text-[22px] font-black tracking-tighter">Notifications</h2>
      <div className="mt-5 flex flex-col gap-3">
        <div className={`rounded-2xl p-4 ${RAISED}`}>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white"><Check size={12} strokeWidth={3} /></span>
            <span className="text-[12px] font-black">Approved by coordinator</span>
          </div>
          <p className="mt-2 text-[11px] font-semibold leading-relaxed text-gray-600">
            Your photo for “Hackathon Day 2” was reviewed and approved. You&apos;ve been awarded 30 points.
          </p>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">2 min ago</p>
        </div>
        <div className={`rounded-2xl p-4 ${RAISED}`}>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E9ECEF] text-gray-700"><Clock size={12} strokeWidth={3} /></span>
            <span className="text-[12px] font-black">Submitted for review</span>
          </div>
          <p className="mt-2 text-[11px] font-semibold leading-relaxed text-gray-600">
            We couldn&apos;t confirm your location, so a coordinator will take a look.
          </p>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">1 h ago</p>
        </div>
        <div className={`rounded-2xl p-4 opacity-70 ${INSET}`}>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E9ECEF] text-gray-700"><X size={12} strokeWidth={3} /></span>
            <span className="text-[12px] font-black">Check-in closed</span>
          </div>
          <p className="mt-2 text-[11px] font-semibold leading-relaxed text-gray-600">Debate Society Finals ended at 6:00 PM.</p>
        </div>
      </div>
    </div>
  );
}

const SCREENS = [HomeScreen, LiveScreen, GeofenceScreen, CameraScreen, VerifiedScreen, InboxScreen];

export function PhoneScreen({ stage }: { stage: number }) {
  const index = Math.max(0, Math.min(SCREENS.length - 1, stage));
  const Screen = SCREENS[index];
  const dark = index === 3;
  return (
    <div
      className={`relative overflow-hidden rounded-[38px] font-body antialiased ${dark ? "bg-[#0b0b0c]" : "bg-[#F8F9FA] text-black"}`}
      style={{ width: SCREEN_W, height: SCREEN_H }}
    >
      {/* Dynamic island */}
      <div className="absolute left-1/2 top-2.5 z-20 h-6 w-[86px] -translate-x-1/2 rounded-full bg-black" />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={index}
          className="absolute inset-0 flex flex-col"
          initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {!dark && <StatusBar />}
          <div className="min-h-0 flex-1">
            <Screen />
          </div>
        </motion.div>
      </AnimatePresence>
      <div className={`absolute bottom-2 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full ${dark ? "bg-white/50" : "bg-black/70"}`} />
    </div>
  );
}
