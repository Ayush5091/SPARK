"use client";

import React, { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

// ── Domain accent colors (Color-State Rule) ───────────────────────────────────
const ACCENT = {
  verify:  "#22c55e",   // GPS / proof verified
  points:  "#f59e0b",   // score / progress / amber
  live:    "#3b82f6",   // ongoing / live events
  alert:   "#ef4444",   // alerts / admin
} as const;

interface FeatureRowProps {
  heading:     string;
  body:        string;
  bullets:     string[];
  accentColor: string;
  isReversed?: boolean;
  children:    React.ReactNode;
}

function FeatureRow({ heading, body, bullets, accentColor, isReversed = false, children }: FeatureRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const items = rowRef.current?.querySelectorAll<HTMLElement>(".ri");
    if (!items?.length) return;

    // Items are visible by default; animate them in on scroll
    gsap.fromTo(
      items,
      { opacity: 0, y: 32 },
      {
        opacity: 1, y: 0,
        stagger: 0.1,
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: {
          trigger: rowRef.current,
          start: "top 82%",
          toggleActions: "play none none none",
        },
      }
    );
  }, { scope: rowRef });

  return (
    <div
      ref={rowRef}
      className={`flex flex-col lg:flex-row items-start lg:items-center gap-12 lg:gap-20 py-16 lg:py-24 ${
        isReversed ? "lg:flex-row-reverse" : ""
      }`}
      style={{ borderBottom: "1px solid #111" }}
    >
      {/* Text */}
      <div className="flex-1 flex flex-col gap-5">
        <h3
          className="ri font-black leading-tight tracking-[-0.025em]"
          style={{ color: "#F0F0F0", fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)", textWrap: "balance" }}
        >
          {heading}
        </h3>
        <p
          className="ri text-base leading-relaxed"
          style={{ color: "#5A5A5A", maxWidth: "54ch" }}
        >
          {body}
        </p>
        <ul className="ri flex flex-col gap-3 pt-1">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "#6A6A6A" }}>
              <span
                className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-[6px]"
                style={{ background: accentColor }}
              />
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Asset */}
      <div
        className="ri flex-1 w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden relative"
        style={{ border: "1px solid #1a1a1a" }}
      >
        {children}
      </div>
    </div>
  );
}

export default function SparkFeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const items = sectionRef.current?.querySelectorAll<HTMLElement>(".sh");
    if (!items?.length) return;
    gsap.fromTo(
      items,
      { opacity: 0, y: 24 },
      {
        opacity: 1, y: 0,
        stagger: 0.12,
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 88%",
        },
      }
    );
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden"
      style={{ background: "#0A0A0A" }}
      aria-label="SPARK features"
    >
      {/* Section intro */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 lg:px-20 pt-20 lg:pt-28 pb-4">
        <p className="sh text-sm font-semibold mb-4" style={{ color: "#3a3a3a" }}>
          What SPARK does
        </p>
        <h2
          className="sh font-black leading-tight tracking-[-0.03em]"
          style={{ color: "#F0F0F0", fontSize: "clamp(2rem, 4.5vw, 3.2rem)", textWrap: "balance" }}
        >
          Everything students need.<br />Nothing they don't.
        </h2>
        <p
          className="sh text-lg leading-relaxed mt-5"
          style={{ color: "#5A5A5A", maxWidth: "58ch" }}
        >
          SPARK integrates into institutional life to provide real-time event coordination, tamper-proof verification, and automatic transcript compilation.
        </p>
      </div>

      {/* Feature rows */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 lg:px-20">

        {/* Row 1 — Event discovery */}
        <FeatureRow
          heading="Live Campus Events Feed"
          body="Access a live listing of AICTE events, seminars, workshops, and sports from campus. Know capacity, location, and dates in real time."
          bullets={[
            "Filter upcoming, ongoing, and completed activities in one click.",
            "Real-time coordinate maps so you always know where to go.",
            "Check remaining capacity before attending.",
          ]}
          accentColor={ACCENT.live}
        >
          <div
            className="absolute inset-0 flex flex-col justify-between p-5"
            style={{ background: "#0D0D0D" }}
          >
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT.live }}>
                Live · 14:00
              </span>
              <span
                className="text-[8px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(59,130,246,0.1)", color: ACCENT.live, border: `1px solid rgba(59,130,246,0.2)` }}
              >
                ONGOING
              </span>
            </div>
            <div>
              <h4 className="text-base font-bold mb-1.5" style={{ color: "#E0E0E0" }}>GenAI Hackathon & Buildathon</h4>
              <p className="text-xs leading-relaxed" style={{ color: "#3a3a3a" }}>
                AICTE-approved innovation sprint exploring next-generation neural architecture templates.
              </p>
            </div>
            <div className="flex justify-between items-center pt-3" style={{ borderTop: "1px solid #1a1a1a" }}>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: ACCENT.live }}>
                <span className="material-icons-outlined text-sm">room</span>
                <span>Main Auditorium</span>
              </div>
              <span className="text-xs font-bold" style={{ color: ACCENT.points }}>⚡ 20 pts</span>
            </div>
          </div>
        </FeatureRow>

        {/* Row 2 — Geo-verification */}
        <FeatureRow
          heading="Tamper-Proof Photo Proof"
          body="Our validation model requires uploading geo-tagged photo evidence live at the event site. The system cross-checks coordinates and timestamp metadata automatically."
          bullets={[
            "Instant EXIF metadata checking to prevent fraudulent uploads.",
            "Location services for pinpoint accuracy verification.",
            "Blocks uploads from outside the event boundary or time window.",
          ]}
          accentColor={ACCENT.verify}
          isReversed
        >
          <div
            className="absolute inset-0 flex flex-col justify-between p-5"
            style={{ background: "#0D0D0D" }}
          >
            <div
              className="relative flex-1 rounded-xl flex items-center justify-center mb-4"
              style={{ border: "1px solid #1a1a1a", background: "#080808" }}
            >
              {/* Corner brackets */}
              {[
                "top-2 left-2 border-t-2 border-l-2",
                "top-2 right-2 border-t-2 border-r-2",
                "bottom-2 left-2 border-b-2 border-l-2",
                "bottom-2 right-2 border-b-2 border-r-2",
              ].map((cls, i) => (
                <div
                  key={i}
                  className={`absolute w-4 h-4 ${cls}`}
                  style={{ borderColor: ACCENT.verify }}
                />
              ))}
              <div className="text-center">
                <span className="material-icons-outlined text-3xl" style={{ color: ACCENT.verify }}>photo_camera</span>
                <p className="text-[9px] tracking-widest mt-2 font-mono" style={{ color: "#2a2a2a" }}>
                  LAT: 19.123 · LNG: 72.567
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono" style={{ color: "#3a3a3a" }}>EXIF METADATA OK</span>
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(34,197,94,0.1)", color: ACCENT.verify, border: `1px solid rgba(34,197,94,0.2)` }}
              >
                VERIFIED
              </span>
            </div>
          </div>
        </FeatureRow>

        {/* Row 3 — Points scorecard */}
        <FeatureRow
          heading="AICTE Activity Scorecard"
          body="Earning requirements are simplified with a clear visual transcript. Watch your total progress climb and view completed activity records anytime."
          bullets={[
            "Automated progress bars to show your milestones clearly.",
            "Dynamic scorecard reflecting total verification points.",
            "Downloadable activity history ready for institutional audits.",
          ]}
          accentColor={ACCENT.points}
        >
          <div
            className="absolute inset-0 flex flex-col justify-between p-5"
            style={{ background: "#0D0D0D" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: ACCENT.points }}>Total Scorecard</span>
              <span className="text-2xl font-black" style={{ color: "#F0F0F0" }}>75 / 100</span>
            </div>
            <div
              className="w-full rounded-full h-2.5 overflow-hidden my-3"
              style={{ background: "#1a1a1a" }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: "75%", background: ACCENT.points }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Completed", value: "6 Events" },
                { label: "Streak",    value: "3 Weeks"  },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl p-3 text-center"
                  style={{ background: "#111", border: "1px solid #1a1a1a" }}
                >
                  <span className="block text-[9px] uppercase tracking-wider mb-1" style={{ color: "#3a3a3a" }}>{label}</span>
                  <span className="text-base font-bold" style={{ color: "#E0E0E0" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </FeatureRow>

        {/* Row 4 — Admin panel */}
        <FeatureRow
          heading="Institutional Admin Panel"
          body="Coordinators get a clean dashboard to review submitted student proofs, analyse GPS data, and approve or reject submissions in bulk."
          bullets={[
            "Live student submission queues with GPS distance indicators.",
            "One-click approval to award verified activity points.",
            "Tamper alerts for any mismatching upload data.",
          ]}
          accentColor={ACCENT.alert}
          isReversed
        >
          <div
            className="absolute inset-0 flex flex-col justify-between p-5"
            style={{ background: "#0D0D0D" }}
          >
            <div className="pb-3" style={{ borderBottom: "1px solid #1a1a1a" }}>
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "#3a3a3a" }}>
                Submissions Queue
              </span>
            </div>
            <div className="flex flex-col gap-2.5 my-3">
              <div
                className="rounded-xl p-3 flex items-center justify-between"
                style={{ background: "#111", border: "1px solid #1a1a1a" }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ACCENT.points }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "#D0D0D0" }}>Dev Hackathon Proof</p>
                    <p className="text-[9px]" style={{ color: "#3a3a3a" }}>Student: Ayush Narayan</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ background: "rgba(34,197,94,0.12)", color: ACCENT.verify, border: `1px solid rgba(34,197,94,0.2)` }}
                    aria-label="Approve submission"
                  >✓</button>
                  <button
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ background: "rgba(239,68,68,0.12)", color: ACCENT.alert, border: `1px solid rgba(239,68,68,0.2)` }}
                    aria-label="Reject submission"
                  >×</button>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center pt-3 text-[9px]" style={{ borderTop: "1px solid #1a1a1a" }}>
              <span style={{ color: "#3a3a3a" }}>Pending: 1</span>
              <span className="font-bold" style={{ color: ACCENT.alert }}>1 ALERT</span>
            </div>
          </div>
        </FeatureRow>

      </div>

      {/* ── CTA Block ──────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 md:px-12 lg:px-20 py-20 lg:py-28">
        <div
          className="rounded-2xl p-8 md:p-14 text-center"
          style={{ background: "#0D0D0D", border: "1px solid #1a1a1a" }}
        >
          <h3
            className="font-black tracking-[-0.03em] mb-4"
            style={{ color: "#F0F0F0", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", textWrap: "balance" }}
          >
            Ready to track your points?
          </h3>
          <p className="text-base leading-relaxed mb-8 mx-auto" style={{ color: "#5A5A5A", maxWidth: "48ch" }}>
            Access the institutional SPARK portal today. Log in as a student to trace events, or as a coordinator to verify activity points.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <a
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg text-sm font-bold transition-all duration-200"
              style={{ background: "#F0F0F0", color: "#0A0A0A" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#ffffff"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#F0F0F0"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
            >
              <span className="material-icons-outlined text-[17px]" aria-hidden="true">school</span>
              Student Login
            </a>
            <a
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg text-sm font-bold transition-all duration-200"
              style={{ background: "transparent", color: "#8A8A8A", border: "1px solid #222" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F0F0F0"; (e.currentTarget as HTMLElement).style.borderColor = "#3a3a3a"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#8A8A8A"; (e.currentTarget as HTMLElement).style.borderColor = "#222"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
            >
              <span className="material-icons-outlined text-[17px]" aria-hidden="true">admin_panel_settings</span>
              Coordinator Login
            </a>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="h-12 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, #080808)" }}
        aria-hidden="true"
      />
    </section>
  );
}
