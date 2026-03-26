"use client";

import { useEffect, useMemo, useRef } from "react";
import Map, { Layer, MapRef, Marker, Source } from "react-map-gl/maplibre";

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

const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

function createCircleGeoJson(longitude: number, latitude: number, radiusInMeters: number, points = 72) {
  const coordinates: [number, number][] = [];
  const earthRadius = 6371000;
  const latitudeInRadians = (latitude * Math.PI) / 180;

  for (let pointIndex = 0; pointIndex <= points; pointIndex += 1) {
    const angle = (pointIndex / points) * Math.PI * 2;
    const deltaLatitude = (radiusInMeters / earthRadius) * Math.sin(angle);
    const deltaLongitude =
      (radiusInMeters / (earthRadius * Math.cos(latitudeInRadians))) * Math.cos(angle);

    coordinates.push([
      longitude + (deltaLongitude * 180) / Math.PI,
      latitude + (deltaLatitude * 180) / Math.PI,
    ]);
  }

  return {
    type: "Feature" as const,
    geometry: {
      type: "Polygon" as const,
      coordinates: [coordinates],
    },
    properties: {},
  };
}

export default function EventFocusMap({ events, activeEventId }: EventFocusMapProps) {
  const mapRef = useRef<MapRef | null>(null);

  const activeEvent = useMemo(
    () => events.find((event) => event.id === activeEventId) ?? events[0] ?? null,
    [activeEventId, events]
  );

  const outerPulse = useMemo(() => {
    if (!activeEvent) return null;
    return createCircleGeoJson(activeEvent.longitude, activeEvent.latitude, 260);
  }, [activeEvent]);

  const innerPulse = useMemo(() => {
    if (!activeEvent) return null;
    return createCircleGeoJson(activeEvent.longitude, activeEvent.latitude, 80);
  }, [activeEvent]);

  useEffect(() => {
    const map = mapRef.current?.getMap();

    if (!map || !events.length) {
      return;
    }

    if (activeEvent) {
      map.flyTo({
        center: [activeEvent.longitude, activeEvent.latitude],
        zoom: 14,
        duration: 1200,
        essential: true,
      });
      return;
    }

    const bounds = events.reduce(
      (currentBounds, event) => {
        return [
          [Math.min(currentBounds[0][0], event.longitude), Math.min(currentBounds[0][1], event.latitude)],
          [Math.max(currentBounds[1][0], event.longitude), Math.max(currentBounds[1][1], event.latitude)],
        ] as [[number, number], [number, number]];
      },
      [
        [events[0].longitude, events[0].latitude],
        [events[0].longitude, events[0].latitude],
      ] as [[number, number], [number, number]]
    );

    map.fitBounds(bounds, {
      padding: 32,
      maxZoom: 12,
      duration: 1200,
      essential: true,
    });
  }, [activeEvent, events]);

  if (!events.length || !activeEvent) {
    return (
      <div className="rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_25px_80px_-40px_rgba(15,23,42,0.35)]">
        <div className="flex h-48 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-neutral-100 via-neutral-50 to-white text-center text-neutral-500 md:h-[280px] lg:h-[calc(100vh-9rem)] lg:min-h-[520px] lg:max-h-[720px]">
          Map focus becomes active when events with locations are available.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-black/20 bg-white/90 p-3 shadow-[0_25px_80px_-40px_rgba(15,23,42,0.4)] backdrop-blur-xl md:p-4">
      <div className="relative overflow-hidden rounded-[1.5rem] border border-black/12">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex items-start justify-between p-5 md:p-6">
          <div className="max-w-md">
            <h3 className="text-xl font-bold text-white drop-shadow md:text-3xl">{activeEvent.name}</h3>
            <p className="mt-1 text-sm text-white/80 md:text-base">
              {activeEvent.locationName} {"\u2022"} {activeEvent.category}
            </p>
          </div>

          <div className="hidden flex-col items-end gap-2 md:flex">
            <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-neutral-900 shadow-lg">
              {activeEvent.points} pts
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.62),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0.04)_42%,rgba(15,23,42,0.08))]"></div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-24 bg-gradient-to-t from-white/70 via-white/18 to-transparent"></div>

        <div className="event-focus-shell h-48 md:h-[280px] lg:h-[calc(100vh-9rem)] lg:min-h-[520px] lg:max-h-[720px]">
          <Map
            ref={mapRef}
            initialViewState={{
              longitude: activeEvent.longitude,
              latitude: activeEvent.latitude,
              zoom: 13,
            }}
            mapStyle={DARK_STYLE}
            style={{ width: "100%", height: "100%" }}
            interactive={false}
            attributionControl={false}
            dragRotate={false}
            touchZoomRotate={false}
            doubleClickZoom={false}
            scrollZoom={false}
            boxZoom={false}
            keyboard={false}
          >
            {outerPulse ? (
              <Source id="event-focus-pulse-outer" type="geojson" data={outerPulse}>
                <Layer
                  id="event-focus-pulse-outer-fill"
                  type="fill"
                  paint={{
                    "fill-color": "rgba(17,24,39,0.1)",
                    "fill-opacity": 0.16,
                  }}
                />
                <Layer
                  id="event-focus-pulse-outer-line"
                  type="line"
                  paint={{
                    "line-color": "rgba(17,24,39,0.24)",
                    "line-width": 1.5,
                  }}
                />
              </Source>
            ) : null}

            {innerPulse ? (
              <Source id="event-focus-pulse-inner" type="geojson" data={innerPulse}>
                <Layer
                  id="event-focus-pulse-inner-fill"
                  type="fill"
                  paint={{
                    "fill-color": "rgba(17,24,39,0.25)",
                    "fill-opacity": 0.22,
                  }}
                />
                <Layer
                  id="event-focus-pulse-inner-line"
                  type="line"
                  paint={{
                    "line-color": "rgba(17,24,39,0.55)",
                    "line-width": 1,
                  }}
                />
              </Source>
            ) : null}

            {events.map((event) => {
              const isActive = event.id === activeEvent.id;

              return (
                <Marker
                  key={event.id}
                  longitude={event.longitude}
                  latitude={event.latitude}
                  anchor="center"
                >
                  <div
                    className="rounded-full border border-white/70 transition-all duration-300"
                    style={{
                      width: isActive ? 20 : 10,
                      height: isActive ? 20 : 10,
                      backgroundColor: isActive ? "#111827" : "rgba(17,24,39,0.35)",
                      boxShadow: isActive
                        ? "0 0 0 6px rgba(17,24,39,0.18)"
                        : "0 0 0 2px rgba(17,24,39,0.08)",
                    }}
                  />
                </Marker>
              );
            })}
          </Map>
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-[2] flex items-end justify-between gap-4"></div>
      </div>
    </div>
  );
}
