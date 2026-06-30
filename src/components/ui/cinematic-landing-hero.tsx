"use client";

import React, { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";
import { ClosingPlasma } from "@/components/ui/closing-plasma";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP);
}

// ─── Design tokens (inline — landing page is isolated from app CSS) ───────────
// Monochrome palette: Ink Obsidian / Deep Velvet / Alabaster Base
// Color-state accents bound to domain only: Blue=Discovery, Green=Verified, Amber=Progress
const STYLES = `
  /* Typography: DM Mono for data strings, Geist for display. Both free on Google Fonts. */
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');

  .hero-root {
    --ink:       #0A0A0A;
    --surface:   #111111;
    --border:    #222222;
    --border-hi: #2D2D2D;
    --muted:     #5A5A5A;
    --text:      #F0F0F0;
    --text-dim:  #8A8A8A;
    /* Domain state accents — used ONLY for functional signals */
    --c-verify:  #22c55e;  /* GPS / proof verified */
    --c-points:  #f59e0b;  /* score / progress */
    --c-live:    #3b82f6;  /* live / ongoing event */
    font-family: var(--font-plus-jakarta-sans, 'Plus Jakarta Sans', system-ui, sans-serif);
  }

  /* ── Phone hardware ──────────────────────────────── */
  .iphone-shell {
    background: #0A0A0A;
    box-shadow:
      inset 0 0 0 1.5px #2a2a2a,
      inset 0 0 0 7px #080808,
      0 48px 96px -20px rgba(0,0,0,0.9),
      0 16px 32px -8px rgba(0,0,0,0.7);
  }
  .phone-btn {
    background: linear-gradient(90deg, #2a2a2a 0%, #111 100%);
    box-shadow: -2px 0 4px rgba(0,0,0,0.8), inset -1px 0 1px rgba(255,255,255,0.06);
  }
  .screen-inner { background: #080808; }
  .screen-sheen {
    background: linear-gradient(120deg, rgba(255,255,255,0.025) 0%, transparent 40%);
  }

  /* ── Widget rows inside phone ────────────────────── */
  .app-widget {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
  }

  /* ── Floating data badges ────────────────────────── */
  .data-badge {
    background: rgba(10,10,10,0.85);
    border: 1px solid rgba(255,255,255,0.1);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  /* ── CTA buttons ─────────────────────────────────── */
  .btn-primary {
    background: #F0F0F0;
    color: #0A0A0A;
    border: none;
    transition: background 0.2s, transform 0.2s cubic-bezier(0.23, 1, 0.32, 1),
                box-shadow 0.2s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .btn-primary:hover {
    background: #ffffff;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px -4px rgba(0,0,0,0.6);
  }
  .btn-primary:active { transform: translateY(0); }

  .btn-ghost {
    background: transparent;
    color: #8A8A8A;
    border: 1px solid #222;
    transition: background 0.2s, color 0.2s, border-color 0.2s,
                transform 0.2s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .btn-ghost:hover {
    background: rgba(255,255,255,0.04);
    color: #F0F0F0;
    border-color: #3a3a3a;
    transform: translateY(-2px);
  }
  .btn-ghost:active { transform: translateY(0); }

  /* ── Nav ─────────────────────────────────────────── */
  .hero-nav-bar {
    border-bottom: 1px solid #161616;
  }

  /* ── Noise texture ───────────────────────────────── */
  .noise-overlay {
    pointer-events: none;
    position: absolute; inset: 0;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  /* ── Progress ring ───────────────────────────────── */
  .ring-track { stroke: rgba(255,255,255,0.06); }
  .ring-fill  {
    stroke: var(--c-points);
    stroke-dasharray: 339;
    stroke-dashoffset: 339;
    stroke-linecap: round;
    transform: rotate(-90deg);
    transform-origin: center;
    transition: stroke-dashoffset 1.8s cubic-bezier(0.23, 1, 0.32, 1) 0.4s;
  }

  /* ── Reduced motion ──────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .btn-primary:hover, .btn-ghost:hover { transform: none; }
    .ring-fill { transition: none; }
  }
`;

export interface CinematicHeroProps extends React.HTMLAttributes<HTMLDivElement> {
  brandName?: string;
  tagline1?: string;
  tagline2?: string;
  description?: string;
  metricValue?: number;
  metricLabel?: string;
  cta1Text?: string;
  cta1Href?: string;
  cta2Text?: string;
  cta2Href?: string;
}

export function CinematicHero({
  brandName = "SPARK",
  tagline1 = "Your Campus Activity,",
  tagline2 = "Transparently Tracked.",
  description = "Discover live AICTE events, submit geo-verified photo proof, and earn activity points. No paperwork. No registers.",
  metricValue = 100,
  metricLabel = "points per cycle",
  cta1Text = "Student Login",
  cta1Href = "/login",
  cta2Text = "Coordinator Login",
  cta2Href = "/login",
  className,
  ...props
}: CinematicHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mockupRef    = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number>(0);
  const ringRef      = useRef<SVGCircleElement>(null);

  // Auto-play entrance — no scroll needed
  useGSAP(() => {
    // Set initial states
    gsap.set(".h-nav",    { autoAlpha: 0, y: -16 });
    gsap.set(".h-badge",  { autoAlpha: 0, y: 12 });
    gsap.set(".h-h1",     { autoAlpha: 0, y: 32 });
    gsap.set(".h-body",   { autoAlpha: 0, y: 20 });
    gsap.set(".h-stats",  { autoAlpha: 0, y: 16 });
    gsap.set(".h-cta",    { autoAlpha: 0, y: 16 });
    gsap.set(".h-trust",  { autoAlpha: 0 });
    gsap.set(".h-phone",  { autoAlpha: 0, y: 48, scale: 0.96 });
    gsap.set(".h-dbadge", { autoAlpha: 0, y: 20 });

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl
      .to(".h-nav",    { autoAlpha: 1, y: 0, duration: 0.5 })
      .to(".h-badge",  { autoAlpha: 1, y: 0, duration: 0.5 }, "-=0.2")
      .to(".h-h1",     { autoAlpha: 1, y: 0, duration: 0.65 }, "-=0.2")
      .to(".h-body",   { autoAlpha: 1, y: 0, duration: 0.55 }, "-=0.35")
      .to(".h-stats",  { autoAlpha: 1, y: 0, duration: 0.5 }, "-=0.3")
      .to(".h-cta",    { autoAlpha: 1, y: 0, duration: 0.5 }, "-=0.3")
      .to(".h-trust",  { autoAlpha: 1, duration: 0.4 }, "-=0.2")
      .to(".h-phone",  { autoAlpha: 1, y: 0, scale: 1, duration: 0.8, ease: "expo.out" }, "-=0.7")
      .to(".h-dbadge", { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.12 }, "-=0.5");

    // Animate progress ring after phone appears
    tl.call(() => {
      if (ringRef.current) {
        const circ   = 339;
        const offset = circ - (circ * 75) / 100;
        ringRef.current.style.strokeDashoffset = String(offset);
      }
    });
  }, { scope: containerRef });

  // Subtle parallax tilt on mockup — mouse only
  useGSAP((_, safe) => {
    const onMove = safe!((e: MouseEvent) => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (!mockupRef.current) return;
        const x = (e.clientX / window.innerWidth  - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        gsap.to(mockupRef.current, {
          rotationY: x * 6, rotationX: -y * 6,
          duration: 1.6, ease: "power3.out",
        });
      });
    });
    window.addEventListener("mousemove", onMove as EventListener);
    return () => {
      window.removeEventListener("mousemove", onMove as EventListener);
      cancelAnimationFrame(rafRef.current);
    };
  }, { scope: containerRef });

  return (
    <section
      ref={containerRef}
      className={cn("hero-root relative w-full min-h-screen flex flex-col overflow-hidden", className)}
      style={{ background: "var(--ink)" }}
      {...props}
    >
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      
      {/* ── Closing Plasma Background ─────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <ClosingPlasma themeMode="dark" speed={0.45} opacity={0.7} vignette={0.75} />
      </div>

      <div className="noise-overlay" aria-hidden="true" />

      {/* ── Subtle grid lines ──────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          ].join(","),
          backgroundSize: "72px 72px",
        }}
      />

      {/* ── Navbar ──────────────────────────────────────── */}
      <nav className="h-nav hero-nav-bar relative z-30 flex items-center justify-between px-6 md:px-12 lg:px-20 h-16">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "#F0F0F0" }}
          >
            <span className="font-black text-xs" style={{ color: "#0A0A0A" }}>S</span>
          </div>
          <span className="font-black text-base tracking-tight" style={{ color: "#F0F0F0" }}>
            {brandName}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {["Features", "How it works", "For Students"].map((label) => (
            <span
              key={label}
              className="text-sm cursor-pointer transition-colors duration-200"
              style={{ color: "var(--muted)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#F0F0F0")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}
            >
              {label}
            </span>
          ))}
        </div>

        <a
          href={cta1Href}
          className="btn-primary text-sm font-semibold px-4 py-2 rounded-lg"
        >
          Sign in
        </a>
      </nav>

      {/* ── Hero body ───────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex items-center px-6 md:px-12 lg:px-20 pt-8 pb-20">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px] gap-16 lg:gap-24 items-center">

          {/* ── LEFT: Copy + CTAs ─────────────────────────── */}
          <div className="flex flex-col gap-8 order-2 lg:order-1">



            {/* Headline */}
            <h1
              className="h-h1 font-black leading-[1.06] tracking-[-0.03em]"
              style={{
                color: "var(--text)",
                fontSize: "clamp(2.4rem, 5.5vw, 4.2rem)",
                textWrap: "balance",
              }}
            >
              {tagline1}
              <br />
              <span style={{ color: "#FFFFFF" }}>{tagline2}</span>
            </h1>

            {/* Body */}
            <p
              className="h-body text-base md:text-lg leading-relaxed"
              style={{ color: "var(--muted)", maxWidth: "52ch" }}
            >
              {description}
            </p>

            {/* Stats row */}
            <div className="h-stats flex items-center gap-8 flex-wrap">
              {[
                { val: "100+", label: "Activity points", accent: "var(--c-points)" },
                { val: "50+",  label: "Events / semester", accent: "var(--c-live)" },
                { val: "100%", label: "Geo-verified",       accent: "var(--c-verify)" },
              ].map(({ val, label, accent }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-2xl font-black" style={{ color: "#F0F0F0" }}>{val}</span>
                  <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>{label}</span>
                  <div className="h-[2px] w-8 rounded-full mt-1" style={{ background: accent }} />
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="h-cta flex flex-col sm:flex-row gap-3">
              <a
                href={cta1Href}
                id="hero-student-login"
                className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold"
              >
                <span className="material-icons-outlined text-[18px]" aria-hidden="true">school</span>
                {cta1Text}
              </a>
              <a
                href={cta2Href}
                id="hero-coordinator-login"
                className="btn-ghost inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold"
              >
                <span className="material-icons-outlined text-[18px]" aria-hidden="true">admin_panel_settings</span>
                {cta2Text}
              </a>
            </div>

            {/* Trust line */}
            <p className="h-trust text-xs" style={{ color: "#3a3a3a" }}>
              Trusted by AICTE institutions · No paperwork · Instant verification
            </p>
          </div>

          {/* ── RIGHT: iPhone mockup ──────────────────────── */}
          <div
            className="h-phone order-1 lg:order-2 relative flex items-center justify-center"
            style={{ perspective: "1200px" }}
          >
            {/* Badge: GPS Verified */}
            <div
              className="h-dbadge data-badge absolute top-6 -left-4 lg:-left-12 flex items-center gap-2.5 rounded-xl px-3 py-2.5 z-20"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}
              >
                <span className="material-icons-outlined text-[15px]" style={{ color: "var(--c-verify)" }}>location_on</span>
              </div>
              <div>
                <p className="text-[11px] font-semibold" style={{ color: "#E0E0E0" }}>GPS Verified</p>
                <p className="text-[9px] font-mono" style={{ color: "var(--muted)" }}>LAT 19.12 · LNG 72.56</p>
              </div>
            </div>

            {/* Badge: Points */}
            <div
              className="h-dbadge data-badge absolute bottom-16 -right-4 lg:-right-10 flex items-center gap-2.5 rounded-xl px-3 py-2.5 z-20"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}
              >
                <span className="material-icons-outlined text-[15px]" style={{ color: "var(--c-points)" }}>emoji_events</span>
              </div>
              <div>
                <p className="text-[11px] font-semibold" style={{ color: "#E0E0E0" }}>75 / 100 pts</p>
                <p className="text-[9px]" style={{ color: "var(--muted)" }}>AICTE verified</p>
              </div>
            </div>

            {/* Badge: Streak */}
            <div
              className="h-dbadge data-badge absolute top-1/2 -left-4 lg:-left-14 -translate-y-1/2 flex items-center gap-2.5 rounded-xl px-3 py-2.5 z-20"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}
              >
                <span className="material-icons-outlined text-[15px]" style={{ color: "var(--c-live)" }}>local_fire_department</span>
              </div>
              <div>
                <p className="text-[11px] font-semibold" style={{ color: "#E0E0E0" }}>5-event streak</p>
                <p className="text-[9px]" style={{ color: "var(--muted)" }}>Check-ins active</p>
              </div>
            </div>

            {/* iPhone */}
            <div
              ref={mockupRef}
              className="iphone-shell relative w-[255px] h-[530px] rounded-[2.75rem] will-change-transform"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Side buttons */}
              <div className="phone-btn absolute top-[108px] -left-[3px] w-[3px] h-[20px] rounded-l-sm" aria-hidden="true" />
              <div className="phone-btn absolute top-[142px] -left-[3px] w-[3px] h-[40px] rounded-l-sm" aria-hidden="true" />
              <div className="phone-btn absolute top-[196px] -left-[3px] w-[3px] h-[40px] rounded-l-sm" aria-hidden="true" />
              <div className="phone-btn absolute top-[152px] -right-[3px] w-[3px] h-[62px] rounded-r-sm scale-x-[-1]" aria-hidden="true" />

              {/* Screen */}
              <div className="screen-inner absolute inset-[7px] rounded-[2.3rem] overflow-hidden">
                <div className="screen-sheen absolute inset-0 z-40 pointer-events-none" aria-hidden="true" />

                {/* Dynamic Island */}
                <div
                  className="absolute top-[5px] left-1/2 -translate-x-1/2 w-[88px] h-[24px] rounded-full z-50 flex items-center justify-end px-3"
                  style={{ background: "#000" }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: "var(--c-verify)", boxShadow: "0 0 6px var(--c-verify)" }}
                  />
                </div>

                {/* App UI */}
                <div className="relative w-full h-full pt-10 px-4 pb-5 flex flex-col" style={{ color: "#E0E0E0" }}>
                  {/* App header */}
                  <div className="flex justify-between items-center mb-5">
                    <div>
                      <p className="text-[8px] tracking-[0.2em] font-bold uppercase" style={{ color: "#3a3a3a" }}>Today</p>
                      <p className="text-base font-black tracking-tight" style={{ color: "#F0F0F0" }}>{brandName}</p>
                    </div>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#8A8A8A" }}
                    >
                      SK
                    </div>
                  </div>

                  {/* Progress ring */}
                  <div className="relative w-[132px] h-[132px] mx-auto flex items-center justify-center mb-5">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 132 132" aria-label="75 of 100 activity points">
                      <circle className="ring-track" cx="66" cy="66" r="54" fill="none" strokeWidth="9" />
                      <circle ref={ringRef} className="ring-fill" cx="66" cy="66" r="54" fill="none" strokeWidth="9" />
                    </svg>
                    <div className="text-center z-10">
                      <p className="text-3xl font-black leading-none" style={{ color: "#F0F0F0" }}>75</p>
                      <p className="text-[7px] uppercase tracking-[0.15em] font-bold mt-1" style={{ color: "#3a3a3a" }}>{metricLabel}</p>
                    </div>
                  </div>

                  {/* Activity feed */}
                  <div className="flex flex-col gap-2 flex-1">
                    {/* Row 1 */}
                    <div className="app-widget rounded-xl p-2.5 flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                        style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}
                      >
                        <span className="material-icons-outlined text-[13px]" style={{ color: "var(--c-verify)" }}>check_circle</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold truncate" style={{ color: "#D0D0D0" }}>AI Workshop</p>
                        <p className="text-[8px]" style={{ color: "#3a3a3a" }}>+10 pts earned</p>
                      </div>
                      <span className="text-[8px] font-bold flex-shrink-0" style={{ color: "var(--c-verify)" }}>✓</span>
                    </div>

                    {/* Row 2 */}
                    <div className="app-widget rounded-xl p-2.5 flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                        style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}
                      >
                        <span className="material-icons-outlined text-[13px]" style={{ color: "var(--c-live)" }}>location_on</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold truncate" style={{ color: "#D0D0D0" }}>GPS Check-in</p>
                        <p className="text-[8px]" style={{ color: "#3a3a3a" }}>Campus Auditorium</p>
                      </div>
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
                        style={{ background: "var(--c-verify)" }}
                      />
                    </div>

                    {/* Row 3 */}
                    <div className="app-widget rounded-xl p-2.5 flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                        style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}
                      >
                        <span className="material-icons-outlined text-[13px]" style={{ color: "var(--c-points)" }}>bolt</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold truncate" style={{ color: "#D0D0D0" }}>GenAI Hackathon</p>
                        <p className="text-[8px]" style={{ color: "#3a3a3a" }}>20 pts · Upcoming</p>
                      </div>
                      <span
                        className="text-[7px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                        style={{ background: "rgba(59,130,246,0.15)", color: "var(--c-live)", border: "1px solid rgba(59,130,246,0.2)" }}
                      >
                        LIVE
                      </span>
                    </div>
                  </div>

                  {/* Home indicator */}
                  <div
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[88px] h-[3px] rounded-full"
                    style={{ background: "rgba(255,255,255,0.12)" }}
                  />
                </div>
              </div>
            </div>

            {/* Glow beneath phone */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-12 rounded-full pointer-events-none"
              style={{ background: "rgba(255,255,255,0.04)", filter: "blur(24px)" }}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {/* Fade into next section */}
      <div
        className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, #0A0A0A)" }}
        aria-hidden="true"
      />
    </section>
  );
}
