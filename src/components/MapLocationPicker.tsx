"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { LatLngExpression } from 'leaflet';

// Dynamic import to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

interface MapLocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  initialRadius?: number;
  onLocationSelect: (lat: number, lng: number, locationName: string) => void;
  onRadiusChange: (radius: number) => void;
}

interface MapEventsProps {
  onMapClick: (lat: number, lng: number) => void;
}

// Map click handler component
function MapEvents({ onMapClick }: MapEventsProps) {
  const { useMapEvents } = require('react-leaflet');

  useMapEvents({
    click: (e: any) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

export default function MapLocationPicker({
  initialLat = 12.971598,
  initialLng = 77.594566,
  initialRadius = 100,
  onLocationSelect,
  onRadiusChange
}: MapLocationPickerProps) {
  const [position, setPosition] = useState<LatLngExpression>([initialLat, initialLng]);
  const [radius, setRadius] = useState(initialRadius);
  const [locationName, setLocationName] = useState('Selected Location');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Import required CSS for Leaflet
    const loadMapCSS = async () => {
      const L = await import('leaflet');
      // Fix for default markers in Webpack
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      setIsLoaded(true);
    };

    loadMapCSS();
  }, []);

  // Simple reverse geocoding using a free service
  const getLocationName = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      const data = await response.json();
      return data.locality || data.city || data.principalSubdivision || 'Selected Location';
    } catch (error) {
      console.error('Failed to get location name:', error);
      return 'Selected Location';
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    const name = await getLocationName(lat, lng);
    setLocationName(name);
    onLocationSelect(lat, lng, name);
  };

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    onRadiusChange(newRadius);
  };

  if (!isLoaded) {
    return (
      <div className="w-full h-80 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Map Container */}
      <div className="w-full h-80 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-600" style={{ zIndex: 1 }}>
        <MapContainer
          center={position}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapEvents onMapClick={handleMapClick} />

          {/* Location Marker */}
          <Marker position={position}>
            <Popup>
              <div className="text-center">
                <p className="font-medium">{locationName}</p>
                <p className="text-xs text-gray-500">
                  {(position as number[])[0].toFixed(6)}, {(position as number[])[1].toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>

          {/* Radius Circle */}
          <Circle
            center={position}
            radius={radius}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#60a5fa',
              fillOpacity: 0.2,
              weight: 2
            }}
          />
        </MapContainer>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="material-icons-outlined text-blue-500 text-lg mt-0.5">info</span>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">How to use:</p>
            <ul className="space-y-1 text-xs">
              <li>• <strong>Click anywhere</strong> on the map to set event location</li>
              <li>• <strong>Adjust radius</strong> using the slider below</li>
              <li>• The blue circle shows the accepted area for photo verification</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Radius Control */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Verification Radius
          </label>
          <span className="text-sm font-bold text-primary">{radius}m</span>
        </div>
        <input
          type="range"
          min="10"
          max="500"
          step="10"
          value={radius}
          onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((radius - 10) / 490) * 100}%, #e5e7eb ${((radius - 10) / 490) * 100}%, #e5e7eb 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>10m</span>
          <span>500m</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Students must be within this radius to submit valid photos
        </p>
      </div>

      {/* Selected Location Info */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selected Location</h4>
        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
          <p><span className="font-medium">Name:</span> {locationName}</p>
          <p><span className="font-medium">Coordinates:</span> {(position as number[])[0].toFixed(6)}, {(position as number[])[1].toFixed(6)}</p>
          <p><span className="font-medium">Radius:</span> {radius} meters</p>
        </div>
      </div>

      {/* Map Icons CSS - We need to add the icons */}
      <style jsx global>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}