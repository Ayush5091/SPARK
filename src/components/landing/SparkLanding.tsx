"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowDown, ArrowRight, Check, MapPin, SlidersHorizontal, Users, X } from "lucide-react";
import type { PhoneIntro, PhonePose } from "./PhoneScene";
import { PhoneScreen, SCREEN_H, SCREEN_W } from "./PhoneScreens";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const PhoneScene = dynamic(() => import("./PhoneScene"), { ssr: false });

const RAISED = "shadow-[8px_8px_16px_#d1d1d3,-8px_-8px_16px_#ffffff]";
const RAISED_SM = "shadow-[4px_4px_10px_#d1d1d3,-4px_-4px_10px_#ffffff]";
const INSET = "shadow-[inset_4px_4px_8px_#d1d1d3,inset_-4px_-4px_8px_#ffffff]";

const TAU = Math.PI * 2;

// One pose per scroll anchor: hero, the four pipeline checks, coordinators, close.
const DESKTOP_POSES: PhonePose[] = [
  { x: 0.46, y: -0.02, rx: 0.1, ry: -0.45, rz: 0.06, s: 1.12 },
  { x: 0.46, y: 0, rx: 0.04, ry: -0.24, rz: -0.03, s: 1.06 },
  { x: -0.46, y: 0, rx: 0.06, ry: 0.32, rz: 0.04, s: 1.06 },
  { x: 0.46, y: 0, rx: -0.05, ry: -0.18, rz: -0.07, s: 1.1 },
  { x: -0.44, y: 0, rx: 0.02, ry: TAU + 0.22, rz: 0.02, s: 1.14 },
  { x: 0.5, y: 0, rx: 0.1, ry: TAU - 0.38, rz: 0.04, s: 0.98 },
  // Comes to rest inside the closing card, next to the call to action
  { x: 0.48, y: -0.14, rx: 0.08, ry: TAU - 0.42, rz: 0.06, s: 0.9 },
];

// On phones the 3D phone sits above the copy, which stays in the lower half of each section.
const MOBILE_POSES: PhonePose[] = [
  { x: 0.04, y: -0.56, rx: 0.12, ry: -0.36, rz: 0.05, s: 0.6 },
  { x: 0, y: 0.5, rx: 0.06, ry: -0.2, rz: -0.03, s: 0.56 },
  { x: 0, y: 0.5, rx: 0.06, ry: 0.24, rz: 0.03, s: 0.56 },
  { x: 0, y: 0.5, rx: -0.04, ry: -0.16, rz: -0.05, s: 0.56 },
  { x: 0, y: 0.5, rx: 0.02, ry: TAU + 0.16, rz: 0.02, s: 0.58 },
  { x: 0, y: 1.9, rx: 0.1, ry: TAU - 0.4, rz: 0.04, s: 0.74 },
  { x: 0, y: 1.9, rx: 0.3, ry: TAU - 0.9, rz: 0.2, s: 0.74 },
];

// Which phone screen each anchor shows
const SCREEN_FOR_ANCHOR = [0, 1, 2, 3, 4, 5, 0];

const CHECKS = ["Event live", "At the venue", "Live photo", "Points added"];

const STAGES = [
  {
    title: "Check-in opens when the event does.",
    body: "Coordinators publish every event with a venue, a time window and the points it is worth. The camera only opens while the event is running, with 30 minutes of grace on either side.",
    readout: [
      ["Window", "2:00 – 4:00 PM"],
      ["Grace", "± 30 min"],
    ],
    tone: "text-blue-700",
    status: "Live now",
  },
  {
    title: "Your phone shows you're actually there.",
    body: "When you open the camera, SPARK takes a GPS fix and measures how far you are from the venue. Anywhere inside the event's radius counts, 100 m unless the coordinator sets a different one.",
    readout: [
      ["Distance", "38 m"],
      ["Radius", "100 m"],
    ],
    tone: "text-green-700",
    status: "Inside radius",
  },
  {
    title: "One photo, taken on the spot.",
    body: "Check-ins come straight from the camera. There is no gallery upload, so an old photo can't stand in for showing up, and the capture time is checked against the event window.",
    readout: [
      ["Captured", "2:47 PM"],
      ["Accepted", "1:30 – 4:30 PM"],
    ],
    tone: "text-green-700",
    status: "In window",
  },
  {
    title: "Both checks pass. The points are yours.",
    body: "When distance and time both check out, the submission is approved on the spot. Points go straight onto your scorecard and a notification confirms it. No register, no signature, no waiting.",
    readout: [
      ["Awarded", "+20 pts"],
      ["Scorecard", "80 / 100"],
    ],
    tone: "text-amber-800",
    status: "Auto-verified",
  },
];

const QUEUE = [
  { name: "Aarav M.", event: "Hackathon Day 2", issue: "180 m from venue", detail: "limit 100 m" },
  { name: "Sneha K.", event: "Blood Donation Drive", issue: "No location data", detail: "GPS was off" },
  { name: "Kabir S.", event: "Guest Lecture: VLSI", issue: "52 min after window", detail: "grace 30 min" },
];

let webglSupport: boolean | undefined;
function getWebGL() {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement("canvas");
      webglSupport = !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}
const noopSubscribe = () => () => {};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const getReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;

function CheckRail({ done }: { done: number }) {
  return (
    <ol className="flex flex-wrap gap-2" aria-label={`${done} of ${CHECKS.length} checks complete`}>
      {CHECKS.map((label, i) => {
        const complete = i < done;
        return (
          <li
            key={label}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold sm:px-3 sm:py-1.5 sm:text-xs ${
              complete ? "bg-black text-white" : `text-gray-600 ${INSET}`
            }`}
          >
            {complete ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : <span className="h-1.5 w-1.5 rounded-full bg-gray-400" aria-hidden="true" />}
            {label}
          </li>
        );
      })}
    </ol>
  );
}

function FallbackPhone({ stage }: { stage: number }) {
  // Shown when WebGL is unavailable: the same screen in a flat device frame
  return (
    <div className="pointer-events-none fixed right-[6vw] top-1/2 hidden -translate-y-1/2 lg:block" aria-hidden="true">
      <div className="rounded-[46px] bg-[#141416] p-[7px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)]" style={{ width: SCREEN_W * 0.82 + 14 }}>
        <div style={{ width: SCREEN_W * 0.82, height: SCREEN_H * 0.82, overflow: "hidden", borderRadius: 38 }}>
          <div style={{ transform: "scale(0.82)", transformOrigin: "top left" }}>
            <PhoneScreen stage={stage} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SparkLanding() {
  const rootRef = useRef<HTMLDivElement>(null);
  const poseRef = useRef<PhonePose>({ ...DESKTOP_POSES[0] });
  const introRef = useRef<PhoneIntro>({ y: 0, ry: 0 });
  const screenRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);
  const webgl = useSyncExternalStore(noopSubscribe, getWebGL, () => null);
  const reduceMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const anchors = gsap.utils.toArray<HTMLElement>("[data-anchor]", root);
      const mm = gsap.matchMedia();

      // Scroll drives the phone between poses; each section's arrival finishes its pose.
      mm.add(
        { desktop: "(min-width: 1024px)", mobile: "(max-width: 1023px)", reduce: "(prefers-reduced-motion: reduce)" },
        (ctx) => {
          const { desktop, reduce } = ctx.conditions as { desktop: boolean; reduce: boolean };
          const poses = desktop ? DESKTOP_POSES : MOBILE_POSES;
          Object.assign(poseRef.current, poses[0]);

          anchors.forEach((anchor, i) => {
            if (i > 0) {
              gsap.fromTo(poseRef.current, { ...poses[i - 1] }, {
                ...poses[i],
                ease: "none",
                immediateRender: false,
                // Reduced motion: jump between poses instead of travelling
                duration: reduce ? 0 : 1,
                scrollTrigger: reduce
                  ? { trigger: anchor, start: "top 55%", toggleActions: "play none none reverse" }
                  : // The closing section is shorter than a screen, so it finishes arriving earlier
                    { trigger: anchor, start: "top 90%", end: i === anchors.length - 1 ? "top 45%" : "top 15%", scrub: true },
              });
            }
            ScrollTrigger.create({
              trigger: anchor,
              start: "top 55%",
              end: "bottom 55%",
              onToggle: (self) => {
                if (self.isActive) setStage(SCREEN_FOR_ANCHOR[i]);
              },
            });
          });

          if (reduce) return;

          // Entrance: copy rises out of its line masks, the phone swings up into place
          introRef.current.y = -1.6;
          introRef.current.ry = -1.2;
          const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
          tl.from(".hero-line > span", { yPercent: 110, duration: 1.1, stagger: 0.09 })
            .from(".hero-fade", { autoAlpha: 0, y: 18, filter: "blur(6px)", duration: 0.9, stagger: 0.08 }, "-=0.75")
            .to(introRef.current, { y: 0, ry: 0, duration: 1.6, ease: "expo.out" }, 0.15);

          gsap.utils.toArray<HTMLElement>(".reveal", root).forEach((el) => {
            gsap.from(el, {
              autoAlpha: 0,
              y: 36,
              filter: "blur(8px)",
              duration: 0.9,
              ease: "expo.out",
              scrollTrigger: { trigger: el, start: "top 82%", once: true },
            });
          });

          gsap.from(".queue-row", {
            autoAlpha: 0,
            x: -24,
            duration: 0.7,
            stagger: 0.12,
            ease: "expo.out",
            scrollTrigger: { trigger: ".queue-panel", start: "top 75%", once: true },
          });
        },
      );

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className="relative w-full bg-[#F0F0F3] font-body text-black antialiased selection:bg-black selection:text-white">
      {/* The 3D phone lives in a fixed layer and travels with the reader */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        {webgl && (
          <>
            <PhoneScene poseRef={poseRef} introRef={introRef} screenRef={screenRef} reduceMotion={reduceMotion} />
            {/* Projected onto the phone's glass every frame by PhoneScene */}
            <div ref={screenRef} className="absolute left-0 top-0 origin-top-left" style={{ visibility: "hidden", willChange: "transform, opacity" }}>
              <PhoneScreen stage={stage} />
            </div>
          </>
        )}
      </div>
      {webgl === false && <FallbackPhone stage={stage} />}

      <header className="sticky top-0 z-30 bg-[#F0F0F3]/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:h-20">
          <Link href="/" className="flex items-center gap-2.5 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-black text-sm font-black text-white ${RAISED_SM}`}>S</span>
            <span className="text-lg font-black tracking-tight">SPARK</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <a href="#how" className="hidden rounded-xl px-3 py-2 text-sm font-bold text-gray-600 transition-colors hover:text-black md:block">
              How it works
            </a>
            <a href="#coordinators" className="hidden rounded-xl px-3 py-2 text-sm font-bold text-gray-600 transition-colors hover:text-black md:block">
              For coordinators
            </a>
            <Link
              href="/login"
              className={`ml-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-shadow active:shadow-[inset_3px_3px_6px_#d1d1d3,inset_-3px_-3px_6px_#ffffff] ${RAISED_SM}`}
            >
              Sign in
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section data-anchor className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-6xl flex-col px-4 pb-10 pt-8 sm:px-6 lg:min-h-[calc(100svh-5rem)] lg:justify-center lg:pb-24 lg:pt-0">
          <div className="max-w-xl">
            <h1 className="text-[clamp(3.25rem,9vw,6rem)] font-black leading-[0.9] tracking-[-0.045em]" style={{ textWrap: "balance" }}>
              <span className="hero-line block overflow-hidden pb-[0.06em]"><span className="block">Show up.</span></span>
              <span className="hero-line block overflow-hidden pb-[0.06em]"><span className="block">Snap it.</span></span>
              <span className="hero-line block overflow-hidden pb-[0.06em]"><span className="block text-gray-400">Points in.</span></span>
            </h1>
            <p className="hero-fade mt-6 max-w-[42ch] text-base font-medium leading-relaxed text-gray-600 sm:text-lg">
              SPARK checks your photo against the event&apos;s location and time, so your AICTE activity points land the moment you check in, not after a stack of signatures.
            </p>
            <div className="hero-fade mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-6 py-4 text-sm font-bold text-white shadow-[6px_6px_14px_#bdbdc0,-6px_-6px_14px_#ffffff] transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
              >
                Student login
                <ArrowRight size={16} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className={`inline-flex items-center justify-center rounded-2xl px-6 py-4 text-sm font-bold transition-shadow active:shadow-[inset_4px_4px_8px_#d1d1d3,inset_-4px_-4px_8px_#ffffff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black ${RAISED}`}
              >
                Coordinator login
              </Link>
            </div>
          </div>
          <a href="#how" className="hero-fade absolute bottom-8 left-6 hidden items-center gap-2 text-sm font-bold text-gray-500 transition-colors hover:text-black lg:flex">
            <ArrowDown size={16} strokeWidth={2.5} aria-hidden="true" /> Follow one check-in
          </a>
        </section>

        {/* The pipeline, one check per screen */}
        <div id="how" className="scroll-mt-16">
          {STAGES.map((s, i) => {
            const copyRight = i % 2 === 1;
            return (
              <section
                key={s.title}
                data-anchor
                className={`mx-auto flex min-h-[100svh] max-w-6xl items-end px-4 pb-10 sm:px-6 lg:items-center lg:pb-0 ${copyRight ? "lg:justify-end" : ""}`}
              >
                <div className={`reveal w-full rounded-3xl bg-[#F0F0F3]/90 p-5 backdrop-blur-sm sm:p-6 lg:max-w-[30rem] lg:bg-transparent lg:p-0 lg:backdrop-blur-none ${RAISED} lg:shadow-none`}>
                  <CheckRail done={i + 1} />
                  <h2 className="mt-4 text-[clamp(1.75rem,4.4vw,3.25rem)] font-black leading-[1.02] tracking-[-0.035em] lg:mt-6" style={{ textWrap: "balance" }}>
                    {s.title}
                  </h2>
                  <p className="mt-3 max-w-[52ch] text-[15px] font-medium leading-relaxed text-gray-600 sm:text-base lg:mt-4">{s.body}</p>
                  <div className={`mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl px-4 py-3 sm:px-5 sm:py-4 lg:mt-6 ${INSET}`}>
                    {s.readout.map(([k, v]) => (
                      <div key={k}>
                        <p className="text-xs font-bold text-gray-500">{k}</p>
                        <p className="font-mono text-lg font-bold tracking-tight">{v}</p>
                      </div>
                    ))}
                    <span className={`ml-auto flex items-center gap-1.5 text-sm font-bold ${s.tone}`}>
                      <Check size={15} strokeWidth={3} aria-hidden="true" /> {s.status}
                    </span>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {/* Coordinators */}
        <section id="coordinators" data-anchor className="mx-auto flex min-h-[100svh] max-w-6xl scroll-mt-16 items-center px-4 py-24 sm:px-6">
          <div className="w-full lg:max-w-[34rem]">
            <h2 className="reveal text-[clamp(2rem,4.4vw,3.25rem)] font-black leading-[1.02] tracking-[-0.035em]" style={{ textWrap: "balance" }}>
              Coordinators only see the edge cases.
            </h2>
            <p className="reveal mt-4 max-w-[52ch] text-base font-medium leading-relaxed text-gray-600">
              Photos taken outside the radius or the time window, or without location data, go to a review queue with the distance and timing already worked out. Approve to award the points, or reject with a note.
            </p>

            <div className={`queue-panel reveal mt-8 rounded-3xl p-5 sm:p-6 ${RAISED}`} aria-label="Example review queue">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black tracking-tight">Review queue</h3>
                <span className="rounded-full bg-black px-2.5 py-1 text-xs font-bold text-white">{QUEUE.length} pending</span>
              </div>
              <ul className="mt-4 flex flex-col gap-3">
                {QUEUE.map((q) => (
                  <li key={q.name} className={`queue-row flex items-center gap-3 rounded-2xl p-3.5 sm:gap-4 ${INSET}`}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                      {q.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black leading-snug">
                        {q.name} <span className="block font-semibold text-gray-500 sm:inline">{q.event}</span>
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-red-700">
                        {q.issue} <span className="font-semibold text-gray-500">({q.detail})</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2" aria-hidden="true">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-gray-700 ${RAISED_SM}`}>
                        <X size={15} strokeWidth={3} />
                      </span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
                        <Check size={15} strokeWidth={3} />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs font-semibold text-gray-500">Example queue. Names are illustrative.</p>
            </div>

            <ul className="reveal mt-10 grid gap-5 sm:grid-cols-3">
              {[
                { icon: MapPin, text: "Pin the venue on a map and set its radius." },
                { icon: SlidersHorizontal, text: "Choose the time window, points and capacity." },
                { icon: Users, text: "See who checked in, and who needs a look." },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm font-semibold leading-snug text-gray-700">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${RAISED_SM}`}>
                    <Icon size={16} strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Close */}
        <section data-anchor className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6">
          <div className={`reveal flex flex-col justify-center rounded-[2rem] p-8 sm:p-14 lg:min-h-[34rem] ${RAISED}`}>
            <h2 className="max-w-[16ch] text-[clamp(2.4rem,6vw,4.5rem)] font-black leading-[0.95] tracking-[-0.045em]" style={{ textWrap: "balance" }}>
              Your next event already counts.
            </h2>
            <p className="mt-5 max-w-[46ch] text-base font-medium leading-relaxed text-gray-600">
              Sign in with Google or your college email to see what&apos;s live on campus today.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-6 py-4 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
              >
                Student login
                <ArrowRight size={16} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className={`inline-flex items-center justify-center rounded-2xl px-6 py-4 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black ${INSET}`}
              >
                Coordinator login
              </Link>
            </div>
          </div>
          <footer className="mt-12 flex flex-col justify-between gap-2 text-sm font-semibold text-gray-500 sm:flex-row">
            <span>SPARK · AICTE activity points, verified on the spot.</span>
            <span>Phone screens show example data.</span>
          </footer>
        </section>
      </main>
    </div>
  );
}
