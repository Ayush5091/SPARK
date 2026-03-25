"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { FiArrowRight, FiCamera, FiClock, FiMapPin } from "react-icons/fi";
import { useRouter } from "next/navigation";

interface Event {
  id: number;
  name: string;
  description: string;
  category: string;
  points: number;
  latitude: number;
  longitude: number;
  location_name: string;
  start_time: string;
  end_time: string;
  is_ongoing: boolean;
  is_upcoming: boolean;
  is_past: boolean;
}

interface EventColorChangeCardProps {
  event: Event;
  isActive: boolean;
  index: number;
}

const getCategoryImg = (category: string) => {
  switch (category?.toLowerCase()) {
    case "technical":
      return "https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2";
    case "cultural":
      return "https://images.pexels.com/photos/176342/pexels-photo-176342.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2";
    case "community service":
      return "https://images.pexels.com/photos/2422294/pexels-photo-2422294.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2";
    case "sports":
      return "https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2";
    case "professional":
      return "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2";
    default:
      return "https://images.pexels.com/photos/2422294/pexels-photo-2422294.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2";
  }
};

const letterVariants: Variants = {
  hover: {
    y: "-50%",
  },
};

const AnimatedLetter = ({ letter }: { letter: string }) => {
  return (
    <div className="inline-block h-[30px] md:h-[36px] overflow-hidden font-bold text-xl md:text-2xl">
      <motion.span
        className="flex min-w-[4px] flex-col"
        style={{ y: "0%" }}
        variants={letterVariants}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <span>{letter}</span>
        <span>{letter}</span>
      </motion.span>
    </div>
  );
};

const EventColorChangeCard = ({ event, isActive, index }: EventColorChangeCardProps) => {
  const router = useRouter();
  const imgSrc = getCategoryImg(event.category);

  const statusLabel = event.is_ongoing 
    ? { label: "Happening Now", color: "bg-green-500" } 
    : event.is_upcoming 
    ? { label: "Upcoming", color: "bg-blue-500" } 
    : { label: "Ended", color: "bg-gray-400" };

  return (
    <motion.div
      transition={{ staggerChildren: 0.035, ease: "easeOut" }}
      whileHover="hover"
      animate={isActive ? "hover" : "initial"}
      initial="initial"
      style={{ clipPath: "inset(0px round 2rem)" }}
      className={`group relative h-72 md:h-80 w-full cursor-pointer isolate rounded-[2rem] border transition-all duration-500 ease-out transform-gpu ${
        isActive
          ? "border-neutral-900/80 bg-white shadow-[0_35px_90px_-45px_rgba(15,23,42,0.55)] -translate-y-1 scale-[1.02]"
          : "border-subtle-light dark:border-subtle-dark bg-slate-300 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.4)] hover:scale-[1.01]"
      }`}
    >
      <div
        className={`absolute inset-0 transition-all duration-500 ease-out group-hover:scale-110 group-hover:saturate-100 ${
          isActive ? "scale-110 saturate-100" : "saturate-0"
        }`}
        style={{
          backgroundImage: `url(${imgSrc})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          clipPath: "inset(0px round 2rem)"
        }}
      />
      {/* Overlay to ensure text readability */}
      <div className={`absolute inset-0 transition-all duration-500 ease-out ${
        isActive ? "bg-black/40" : "bg-black/20 group-hover:bg-black/40"
      }`}
      style={{ clipPath: "inset(0px round 2rem)" }}
      />
      
      <div className={`relative z-20 flex h-full flex-col justify-between p-6 transition-all duration-500 ease-out ${
        isActive ? "text-white" : "text-slate-100 group-hover:text-white"
      }`}>
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <span className={`w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white ${statusLabel.color}`}>
              {statusLabel.label}
            </span>
            {isActive && (
              <span className="w-fit rounded-full border border-neutral-900/15 bg-neutral-950 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                In Focus
              </span>
            )}
          </div>
          <FiArrowRight className={`text-3xl transition-all duration-500 ease-out ${isActive ? "-rotate-45" : "group-hover:-rotate-45"}`} />
        </div>

        <div>
           <div className="flex justify-between items-end mb-2">
            <h4 className="flex flex-wrap">
              {event.name.split("").map((letter, i) => (
                <AnimatedLetter letter={letter === " " ? "\u00A0" : letter} key={i} />
              ))}
            </h4>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-300">Reward</p>
              <p className="text-2xl font-bold text-white">{event.points}pts</p>
            </div>
          </div>
          
          <p className={`line-clamp-2 text-sm mb-4 transition-all duration-500 ease-out ${
            isActive ? "text-white" : "text-neutral-200 group-hover:text-white"
          }`}>
            {event.description}
          </p>

          <div className="flex flex-wrap gap-4 text-xs font-medium">
             <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-2.5 py-1.5 rounded-lg">
                <FiClock className="shrink-0" />
                <span>{new Date(event.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
             </div>
             <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-2.5 py-1.5 rounded-lg max-w-[150px]">
                <FiMapPin className="shrink-0" />
                <span className="truncate">{event.location_name}</span>
             </div>
          </div>

          <div className="mt-4 flex justify-end">
            {event.is_ongoing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/events/${event.id}/camera`);
                }}
                className="bg-white hover:bg-neutral-100 text-neutral-950 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 ease-out flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <FiCamera />
                Open Camera
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EventColorChangeCard;
