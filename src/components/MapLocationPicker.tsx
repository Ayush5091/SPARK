"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, MapLayerMouseEvent, MapRef, Marker, Popup, Source } from "react-map-gl/maplibre";

interface MapLocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  initialRadius?: number;
  onLocationSelect: (lat: number, lng: number, locationName: string) => void;
  onRadiusChange: (radius: number) => void;
}

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

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

export default function MapLocationPicker({
  initialLat = 12.971598,
  initialLng = 77.594566,
  initialRadius = 100,
  onLocationSelect,
  onRadiusChange,
}: MapLocationPickerProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [position, setPosition] = useState({ latitude: initialLat, longitude: initialLng });
  const [radius, setRadius] = useState(initialRadius);
  const [locationName, setLocationName] = useState("Selected Location");

  useEffect(() => {
    setPosition({ latitude: initialLat, longitude: initialLng });
  }, [initialLat, initialLng]);

  useEffect(() => {
    setRadius(initialRadius);
  }, [initialRadius]);

  const radiusOverlay = useMemo(
    () => createCircleGeoJson(position.longitude, position.latitude, radius),
    [position, radius]
  );

  const getLocationName = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      const data = await response.json();
      return data.locality || data.city || data.principalSubdivision || "Selected Location";
    } catch (error) {
      console.error("Failed to get location name:", error);
      return "Selected Location";
    }
  };

  const handleMapClick = async (event: MapLayerMouseEvent) => {
    const nextPosition = {
      latitude: event.lngLat.lat,
      longitude: event.lngLat.lng,
    };

    setPosition(nextPosition);
    const name = await getLocationName(nextPosition.latitude, nextPosition.longitude);
    setLocationName(name);
    onLocationSelect(nextPosition.latitude, nextPosition.longitude, name);
  };

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    onRadiusChange(newRadius);
  };

  useEffect(() => {
    mapRef.current?.flyTo({
      center: [position.longitude, position.latitude],
      duration: 800,
      essential: true,
    });
  }, [position]);

  return (
    <div className="w-full space-y-4">
      <div className="h-80 w-full overflow-hidden rounded-xl border border-gray-300 dark:border-gray-600" style={{ zIndex: 1 }}>
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: position.longitude,
            latitude: position.latitude,
            zoom: 13,
          }}
          mapStyle={MAP_STYLE}
          style={{ width: "100%", height: "100%" }}
          attributionControl={false}
          dragRotate={false}
          touchZoomRotate={false}
          onClick={handleMapClick}
        >
          <Source id="location-radius" type="geojson" data={radiusOverlay}>
            <Layer
              id="location-radius-fill"
              type="fill"
              paint={{
                "fill-color": "#6b7280",
                "fill-opacity": 0.16,
              }}
            />
            <Layer
              id="location-radius-outline"
              type="line"
              paint={{
                "line-color": "#374151",
                "line-width": 2,
              }}
            />
          </Source>

          <Marker longitude={position.longitude} latitude={position.latitude} anchor="bottom">
            <div className="relative">
              <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/10 blur-md" />
              <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-neutral-900 shadow-lg">
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
            </div>
          </Marker>

          <Popup
            longitude={position.longitude}
            latitude={position.latitude}
            anchor="top"
            closeButton={false}
            closeOnClick={false}
            offset={20}
            maxWidth="260px"
          >
            <div className="text-center">
              <p className="font-medium">{locationName}</p>
              <p className="text-xs text-gray-500">
                {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
              </p>
            </div>
          </Popup>
        </Map>
      </div>

      <div className="rounded-xl border border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/80">
        <div className="flex items-start gap-3">
          <span className="material-icons-outlined mt-0.5 text-lg text-gray-600 dark:text-gray-300">info</span>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <p className="mb-1 font-medium">How to use:</p>
            <ul className="space-y-1 text-xs">
              <li>- Click anywhere on the map to set event location</li>
              <li>- Adjust radius using the slider below</li>
              <li>- The monochrome ring shows the accepted area for photo verification</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
        <div className="mb-3 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Verification Radius</label>
          <span className="text-sm font-bold text-gray-900 dark:text-white">{radius}m</span>
        </div>
        <input
          type="range"
          min="10"
          max="500"
          step="10"
          value={radius}
          onChange={(event) => handleRadiusChange(parseInt(event.target.value, 10))}
          className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
          style={{
            background: `linear-gradient(to right, #111827 0%, #111827 ${((radius - 10) / 490) * 100}%, #e5e7eb ${((radius - 10) / 490) * 100}%, #e5e7eb 100%)`,
          }}
        />
        <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>10m</span>
          <span>500m</span>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Students must be within this radius to submit valid photos
        </p>
      </div>

      <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
        <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Selected Location</h4>
        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
          <p><span className="font-medium">Name:</span> {locationName}</p>
          <p><span className="font-medium">Coordinates:</span> {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}</p>
          <p><span className="font-medium">Radius:</span> {radius} meters</p>
        </div>
      </div>

      <style jsx global>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 9999px;
          background: #111827;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 9999px;
          background: #111827;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}
