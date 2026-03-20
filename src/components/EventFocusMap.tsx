"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);

export interface EventMapPoint {
  id: number;
  name: string;
  category: string;
  locationName: string;
  latitude: number;
  longitude: number;
  points: number;
  isOngoing: boolean;
  isUpcoming: boolean;
}

interface EventFocusMapProps {
  events: EventMapPoint[];
  activeEventId: number | null;
}

function MapViewportController({
  events,
  activeEvent,
}: {
  events: EventMapPoint[];
  activeEvent: EventMapPoint | null;
}) {
  const { useMap } = require("react-leaflet");
  const map = useMap();

  useEffect(() => {
    if (!events.length) return;

    if (activeEvent) {
      map.flyTo([activeEvent.latitude, activeEvent.longitude], 14, {
        animate: true,
        duration: 1.2,
      });
      return;
    }

    const bounds = events.map((event) => [event.latitude, event.longitude]) as [number, number][];
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 12 });
  }, [activeEvent, events, map]);

  return null;
}

export default function EventFocusMap({ events, activeEventId }: EventFocusMapProps) {
  const activeEvent = useMemo(
    () => events.find((event) => event.id === activeEventId) ?? events[0] ?? null,
    [activeEventId, events]
  );

  if (!events.length || !activeEvent) {
    return (
      <div className="rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_25px_80px_-40px_rgba(15,23,42,0.35)]">
        <div className="h-[280px] md:h-[360px] lg:h-[calc(100vh-9rem)] lg:min-h-[520px] lg:max-h-[720px] rounded-[1.5rem] bg-gradient-to-br from-neutral-100 via-neutral-50 to-white flex items-center justify-center text-center text-neutral-500">
          Map focus becomes active when events with locations are available.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-black/20 bg-white/90 p-3 md:p-4 shadow-[0_25px_80px_-40px_rgba(15,23,42,0.4)] backdrop-blur-xl">
      <div className="relative overflow-hidden rounded-[1.5rem] border border-black/12">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[450] flex items-start justify-between p-5 md:p-6">
          <div className="max-w-md">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-500 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-black/70"></span>
              Scroll Guided Map
            </div>
            <h3 className="text-xl md:text-3xl font-bold text-neutral-900">{activeEvent.name}</h3>
            <p className="mt-1 text-sm md:text-base text-neutral-500">
              {activeEvent.locationName} {"\u2022"} {activeEvent.category}
            </p>
          </div>

          <div className="hidden md:flex flex-col items-end gap-2">
            <span className="rounded-full border border-black/10 bg-white/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-600 backdrop-blur">
              {activeEvent.isOngoing ? "Live Now" : activeEvent.isUpcoming ? "Next Focus" : "Recent Stop"}
            </span>
            <span className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white shadow-lg">
              {activeEvent.points} pts
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 z-[430] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.62),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0.04)_42%,rgba(15,23,42,0.08))]"></div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[430] h-24 bg-gradient-to-t from-white/70 via-white/18 to-transparent"></div>

        <div className="event-focus-shell h-[280px] md:h-[360px] lg:h-[calc(100vh-9rem)] lg:min-h-[520px] lg:max-h-[720px]">
          <MapContainer
            center={[activeEvent.latitude, activeEvent.longitude]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
            attributionControl={false}
            dragging={false}
            doubleClickZoom={false}
            scrollWheelZoom={false}
            touchZoom={false}
            boxZoom={false}
            keyboard={false}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png" />

            <MapViewportController events={events} activeEvent={activeEvent} />

            {events.map((event) => {
              const isActive = event.id === activeEvent.id;

              return (
                <CircleMarker
                  key={event.id}
                  center={[event.latitude, event.longitude]}
                  radius={isActive ? 10 : 5}
                  pathOptions={{
                    color: isActive ? "#111827" : "rgba(17, 24, 39, 0.35)",
                    fillColor: isActive ? "#111827" : "rgba(17, 24, 39, 0.18)",
                    fillOpacity: isActive ? 0.95 : 0.55,
                    weight: isActive ? 2 : 1,
                  }}
                />
              );
            })}

            <Circle
              center={[activeEvent.latitude, activeEvent.longitude]}
              radius={260}
              pathOptions={{
                color: "rgba(17,24,39,0.24)",
                fillColor: "rgba(17,24,39,0.1)",
                fillOpacity: 0.16,
                weight: 1.5,
              }}
            />
            <Circle
              center={[activeEvent.latitude, activeEvent.longitude]}
              radius={80}
              pathOptions={{
                color: "rgba(17,24,39,0.55)",
                fillColor: "rgba(17,24,39,0.25)",
                fillOpacity: 0.22,
                weight: 1,
              }}
            />
          </MapContainer>
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-[460] flex items-end justify-between gap-4">
          <div className="rounded-2xl border border-black/10 bg-white/75 px-4 py-3 backdrop-blur-md">
            <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">Map Story</p>
            <p className="mt-1 text-sm font-medium text-neutral-800">
              The pin follows the card closest to the center of the viewport.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
