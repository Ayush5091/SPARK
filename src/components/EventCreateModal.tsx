"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import dynamic from "next/dynamic";

// Dynamically import the map to avoid SSR issues
const MapLocationPicker = dynamic(
  () => import('@/components/MapLocationPicker'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-80 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading map...</p>
        </div>
      </div>
    )
  }
);

interface EventCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void;
}

const categories = ['technical', 'cultural', 'sports', 'professional', 'community service', 'national initiative'];

// Some popular Bangalore locations for quick selection
const popularLocations = [
  { name: 'Bangalore International Convention Centre', lat: 12.971598, lng: 77.594566 },
  { name: 'Cubbon Park', lat: 12.975413, lng: 77.592834 },
  { name: 'IISc Bangalore', lat: 12.972442, lng: 77.580643 },
  { name: 'Lalbagh Botanical Garden', lat: 12.934533, lng: 77.610166 },
  { name: 'Chinnaswamy Stadium', lat: 12.966847, lng: 77.580811 },
  { name: 'Koramangala Community Center', lat: 12.958423, lng: 77.636619 },
  { name: 'Microsoft Office Bangalore', lat: 12.971902, lng: 77.640636 },
  { name: 'Bannerghatta National Park', lat: 12.847178, lng: 77.663011 },
  { name: 'UB City Mall', lat: 12.971321, lng: 77.595234 },
  { name: 'Phoenix Marketcity', lat: 12.996211, lng: 77.693413 }
];

export default function EventCreateModal({ isOpen, onClose, onEventCreated }: EventCreateModalProps) {
  const { token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'technical',
    points: '',
    capacity: '',
    latitude: '',
    longitude: '',
    location_name: '',
    location_radius_meters: '100',
    start_time: '',
    end_time: '',
    time_tolerance_minutes: '30'
  });

  // Generate default start time (tomorrow at 9 AM)
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(17, 0, 0, 0);

    setFormData(prev => ({
      ...prev,
      start_time: tomorrow.toISOString().slice(0, 16),
      end_time: tomorrowEnd.toISOString().slice(0, 16)
    }));
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLocationSelect = (location: typeof popularLocations[0]) => {
    setFormData(prev => ({
      ...prev,
      latitude: location.lat.toString(),
      longitude: location.lng.toString(),
      location_name: location.name
    }));
    setShowLocationPicker(false);
  };

  // Handle map location selection
  const handleMapLocationSelect = (lat: number, lng: number, locationName: string) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString(),
      location_name: locationName
    }));
  };

  // Handle radius change from map
  const handleMapRadiusChange = (radius: number) => {
    setFormData(prev => ({
      ...prev,
      location_radius_meters: radius.toString()
    }));
  };

  // Format date for datetime-local input
  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Get date from datetime-local input
  const getDateFromInput = (dateTimeString: string) => {
    return new Date(dateTimeString);
  };

  // Quick time setters
  const setQuickTime = (hours: number, minutes: number = 0, isEndTime: boolean = false) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + (isEndTime ? 0 : 1));
    tomorrow.setHours(hours, minutes, 0, 0);

    if (isEndTime) {
      // For end time, use the same day as start time
      const startDate = new Date(formData.start_time);
      if (!isNaN(startDate.getTime())) {
        tomorrow.setFullYear(startDate.getFullYear());
        tomorrow.setMonth(startDate.getMonth());
        tomorrow.setDate(startDate.getDate());
      }
    }

    const fieldName = isEndTime ? 'end_time' : 'start_time';
    setFormData(prev => ({
      ...prev,
      [fieldName]: formatDateTimeLocal(tomorrow)
    }));
  };

  const validateForm = () => {
    const required = ['name', 'description', 'points', 'latitude', 'longitude', 'location_name', 'start_time', 'end_time'];
    const missing = required.filter(field => !formData[field as keyof typeof formData]);

    if (missing.length > 0) {
      alert(`Please fill in: ${missing.join(', ')}`);
      return false;
    }

    const startTime = new Date(formData.start_time);
    const endTime = new Date(formData.end_time);

    if (startTime >= endTime) {
      alert('End time must be after start time');
      return false;
    }

    if (startTime <= new Date()) {
      alert('Start time must be in the future');
      return false;
    }

    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      alert('Invalid latitude (must be between -90 and 90)');
      return false;
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      alert('Invalid longitude (must be between -180 and 180)');
      return false;
    }

    if (formData.capacity) {
      const cap = parseInt(formData.capacity, 10);
      if (isNaN(cap) || cap < 1) {
        alert('Capacity must be a positive number');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          points: parseInt(formData.points),
          capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          location_radius_meters: parseInt(formData.location_radius_meters),
          time_tolerance_minutes: parseInt(formData.time_tolerance_minutes)
        })
      });

      if (response.ok) {
        alert('Event created successfully!');
        onEventCreated();
        onClose();
        // Reset form
        setFormData({
          name: '',
          description: '',
          category: 'technical',
          points: '',
          capacity: '',
          latitude: '',
          longitude: '',
          location_name: '',
          location_radius_meters: '100',
          start_time: '',
          end_time: '',
          time_tolerance_minutes: '30'
        });
      } else {
        const error = await response.json();
        alert(`Failed to create event: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cultural': return 'palette';
      case 'community service': return 'volunteer_activism';
      case 'technical': return 'computer';
      case 'sports': return 'sports_basketball';
      case 'professional': return 'work';
      case 'national initiative': return 'flag';
      default: return 'event';
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose}></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121212] rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center">
                  <span className="material-icons-outlined text-white text-xl">event</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Event</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Add a location-based activity for students</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <span className="material-icons-outlined text-gray-500">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">

              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="material-icons-outlined text-primary">info</span>
                  Basic Information
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="e.g., Tech Conference 2026"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                    placeholder="Describe what students will do at this event..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category *</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Points *</label>
                    <input
                      type="number"
                      name="points"
                      value={formData.points}
                      onChange={handleInputChange}
                      min="1"
                      max="100"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="e.g., 50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Capacity</label>
                    <input
                      type="number"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="material-icons-outlined text-primary">location_on</span>
                  Location Details
                </h3>

                {/* Location Input Method Selector */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Choose location method:</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {setShowMap(true); setShowLocationPicker(false);}}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
                        showMap
                          ? 'bg-primary text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span className="material-icons-outlined text-lg mr-2">map</span>
                      Interactive Map
                    </button>
                    <button
                      type="button"
                      onClick={() => {setShowLocationPicker(true); setShowMap(false);}}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
                        showLocationPicker
                          ? 'bg-primary text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span className="material-icons-outlined text-lg mr-2">list</span>
                      Quick Select
                    </button>
                  </div>
                </div>

                {/* Interactive Map */}
                {showMap && (
                  <div className="space-y-4">
                    <MapLocationPicker
                      initialLat={parseFloat(formData.latitude) || 12.971598}
                      initialLng={parseFloat(formData.longitude) || 77.594566}
                      initialRadius={parseInt(formData.location_radius_meters) || 100}
                      onLocationSelect={handleMapLocationSelect}
                      onRadiusChange={handleMapRadiusChange}
                    />
                  </div>
                )}

                {/* Quick Location Picker */}
                {showLocationPicker && (
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Popular Locations:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {popularLocations.map((loc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleLocationSelect(loc)}
                          className="text-left p-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
                        >
                          <div className="font-medium">{loc.name}</div>
                          <div className="text-xs text-gray-500">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual Location Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location Name *</label>
                  <input
                    type="text"
                    name="location_name"
                    value={formData.location_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="e.g., Convention Center"
                  />
                </div>

                {(!showMap && !showLocationPicker) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Latitude *</label>
                      <input
                        type="number"
                        name="latitude"
                        value={formData.latitude}
                        onChange={handleInputChange}
                        step="0.000001"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="12.971598"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Longitude *</label>
                      <input
                        type="number"
                        name="longitude"
                        value={formData.longitude}
                        onChange={handleInputChange}
                        step="0.000001"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="77.594566"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Radius (meters)</label>
                      <input
                        type="number"
                        name="location_radius_meters"
                        value={formData.location_radius_meters}
                        onChange={handleInputChange}
                        min="10"
                        max="1000"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="100"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Time */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="material-icons-outlined text-primary">schedule</span>
                  Time Settings
                </h3>

                {/* Quick Time Presets */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-3">Quick Time Presets:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickTime(9, 0)}
                      className="px-3 py-2 bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-600 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      9:00 AM
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickTime(10, 0)}
                      className="px-3 py-2 bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-600 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      10:00 AM
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickTime(14, 0)}
                      className="px-3 py-2 bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-600 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      2:00 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickTime(18, 0)}
                      className="px-3 py-2 bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-600 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      6:00 PM
                    </button>
                  </div>

                  <div className="mt-3 text-center">
                    <p className="text-xs text-blue-600 dark:text-blue-400">Click to set start time</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Time *</label>
                    <div className="relative">
                      <input
                        type="datetime-local"
                        name="start_time"
                        value={formData.start_time}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 material-icons-outlined text-gray-400 pointer-events-none">
                        access_time
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Time *</label>
                    <div className="relative">
                      <input
                        type="datetime-local"
                        name="end_time"
                        value={formData.end_time}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 material-icons-outlined text-gray-400 pointer-events-none">
                        access_time
                      </span>
                    </div>
                  </div>
                </div>

                {/* Duration Calculator */}
                {formData.start_time && formData.end_time && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Event Duration:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {(() => {
                          const start = new Date(formData.start_time);
                          const end = new Date(formData.end_time);
                          const diff = end.getTime() - start.getTime();
                          const hours = Math.floor(diff / (1000 * 60 * 60));
                          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                          return `${hours}h ${minutes}m`;
                        })()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Quick End Time Buttons */}
                {formData.start_time && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                    <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-3">Set End Time (duration from start):</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const start = new Date(formData.start_time);
                          const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // +2 hours
                          setFormData(prev => ({ ...prev, end_time: formatDateTimeLocal(end) }));
                        }}
                        className="px-3 py-2 bg-white dark:bg-gray-700 border border-green-300 dark:border-green-600 rounded-lg text-sm font-medium text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        +2 hours
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const start = new Date(formData.start_time);
                          const end = new Date(start.getTime() + 4 * 60 * 60 * 1000); // +4 hours
                          setFormData(prev => ({ ...prev, end_time: formatDateTimeLocal(end) }));
                        }}
                        className="px-3 py-2 bg-white dark:bg-gray-700 border border-green-300 dark:border-green-600 rounded-lg text-sm font-medium text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        +4 hours
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const start = new Date(formData.start_time);
                          const end = new Date(start.getTime() + 8 * 60 * 60 * 1000); // +8 hours
                          setFormData(prev => ({ ...prev, end_time: formatDateTimeLocal(end) }));
                        }}
                        className="px-3 py-2 bg-white dark:bg-gray-700 border border-green-300 dark:border-green-600 rounded-lg text-sm font-medium text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        +8 hours
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time Tolerance (minutes)</label>
                  <input
                    type="number"
                    name="time_tolerance_minutes"
                    value={formData.time_tolerance_minutes}
                    onChange={handleInputChange}
                    min="0"
                    max="120"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="30"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    How many minutes before/after the event window photos are still accepted
                  </p>
                </div>
              </div>

              {/* Preview */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="material-icons-outlined text-primary text-sm">{getCategoryIcon(formData.category)}</span>
                  Preview
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p><span className="font-medium">Name:</span> {formData.name || 'Event Name'}</p>
                  <p><span className="font-medium">Points:</span> {formData.points || '0'} pts</p>
                  <p><span className="font-medium">Capacity:</span> {formData.capacity || 'No limit'}</p>
                  <p><span className="font-medium">Location:</span> {formData.location_name || 'Location Name'}</p>
                  <p><span className="font-medium">Duration:</span> {formData.start_time && formData.end_time ?
                    `${Math.round((new Date(formData.end_time).getTime() - new Date(formData.start_time).getTime()) / (1000 * 60 * 60))} hours` :
                    'Duration'}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating...' : 'Create Event'}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </>
  );
}