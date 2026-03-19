"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";

interface Event {
  id: number;
  name: string;
  description: string;
  category: string;
  points: number;
  latitude: number;
  longitude: number;
  location_name: string;
  location_radius_meters: number;
  start_time: string;
  end_time: string;
  time_tolerance_minutes: number;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export default function CameraSubmissionPage() {
  const { user, token, refreshProfile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!user || user.role !== 'student') {
      router.push('/login');
      return;
    }
    if (token) {
      fetchEvent();
    }
  }, [user, eventId, token]);

  // Only initialize camera when component mounts for students
  useEffect(() => {
    if (user?.role === 'student') {
      initializeCamera();
    }

    // Cleanup on unmount
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps array intentional - only run once

  const fetchEvent = async () => {
    try {
      const response = await fetch('/api/events', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const events = await response.json();
        const currentEvent = events.find((e: any) => e.id == eventId);
        if (currentEvent) {
          setEvent(currentEvent);
        } else {
          setError('Event not found');
        }
      } else {
        setError('Failed to load event');
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      setError('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const initializeCamera = async () => {
    try {
      setError(null);
      console.log('🎥 Initializing camera...');

      // Get location first
      await getCurrentLocation();

      // Then get camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      console.log('📷 Camera stream obtained');
      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log('🎬 Video metadata loaded');
          setCameraReady(true);
        };
        await videoRef.current.play();
        console.log('▶️ Video playing');
      }

      setPermissionsReady(true);
    } catch (error: any) {
      console.error('❌ Camera initialization error:', error);
      if (error.name === 'NotAllowedError') {
        setError('Camera and location permissions are required. Please allow access and refresh.');
      } else if (error.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Unable to access camera. Please check permissions and try again.');
      }
    }
  };

  const getCurrentLocation = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationInfo: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };
          setLocationData(locationInfo);
          console.log('📍 Location obtained:', locationInfo);
          resolve();
        },
        (error) => {
          console.error('📍 Location error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) {
      setError('Camera not ready. Please wait...');
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        setError('Canvas not supported');
        return;
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Capture frame
      ctx.drawImage(video, 0, 0);

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          setCapturedPhoto(blob);
          setPreview(URL.createObjectURL(blob));

          // Stop camera
          if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
          }

          console.log('📸 Photo captured successfully');
        } else {
          setError('Failed to capture photo. Please try again.');
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('📸 Capture error:', error);
      setError('Failed to capture photo. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!capturedPhoto || !event || !locationData) {
      setError('Photo and location data are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      const timestamp = new Date().getTime();
      const photoFile = new File([capturedPhoto], `photo_${timestamp}.jpg`, {
        type: 'image/jpeg'
      });

      formData.append('photo', photoFile);
      formData.append('event_id', eventId);
      formData.append('user_location', JSON.stringify(locationData));

      console.log('📤 Submitting photo...');

      const response = await fetch('/api/photo-verification', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        const updateText = result.is_update ? 'updated and ' : '';
        const successMessage = result.message ||
          `Photo ${updateText}submitted successfully! ${result.auto_verified ? `Auto-verified and awarded ${result.points_awarded} points!` : 'Under manual review.'}`;

        setSuccess(successMessage);

        // Refresh profile to update points in the UI
        await refreshProfile();

        setTimeout(() => router.push('/'), 3000);
      } else {
        setError(result.detail || 'Failed to submit photo');
      }
    } catch (error) {
      console.error('📤 Submit error:', error);
      setError('Failed to submit photo');
    } finally {
      setSubmitting(false);
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setPreview(null);
    setError(null);
    setCameraReady(false);
    initializeCamera();
  };

  const getCategoryIconInfo = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'cultural':
        return { icon: 'palette', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' };
      case 'community service':
        return { icon: 'volunteer_activism', bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-600 dark:text-pink-400' };
      case 'technical':
        return { icon: 'computer', bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400' };
      case 'sports':
        return { icon: 'sports_basketball', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' };
      case 'professional':
        return { icon: 'work', bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400' };
      case 'national initiative':
        return { icon: 'flag', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' };
      default:
        return { icon: 'event', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary text-primary"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark mb-4">Event Not Found</h1>
          <button
            onClick={() => router.push('/')}
            className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const categoryInfo = getCategoryIconInfo(event.category);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="pt-8 md:pt-10 pb-4 px-6 md:px-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-full hover:bg-subtle-light dark:hover:bg-subtle-dark transition-colors text-primary dark:text-white"
          >
            <span className="material-icons-outlined text-2xl">arrow_back</span>
          </button>
          <div>
            <h1 className="text-sm md:text-base font-medium text-text-muted-light dark:text-text-muted-dark">Submit Photo for</h1>
            <h2 className="text-lg md:text-2xl font-bold leading-tight text-primary dark:text-white">{event.name}</h2>
          </div>
        </div>
        <UserAvatar name={user?.name} className="w-10 h-10 md:w-12 md:h-12 text-lg md:text-xl shadow-lg" />
      </header>

      <div className="px-6 md:px-10 pb-8 max-w-2xl mx-auto">
        {/* Event Info */}
        <div className="bg-card-light dark:bg-card-dark rounded-2xl p-6 shadow-soft border border-subtle-light dark:border-subtle-dark mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${categoryInfo.bg} ${categoryInfo.text}`}>
              <span className="material-icons-outlined text-2xl">{categoryInfo.icon}</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-light dark:text-text-dark">{event.name}</h3>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{event.category} • {event.points} points</p>
            </div>
          </div>

          <p className="text-text-light dark:text-text-dark mb-4">{event.description}</p>

          <div className="flex items-center gap-2 text-sm text-text-muted-light dark:text-text-muted-dark">
            <span className="material-icons-outlined">location_on</span>
            <span>{event.location_name}</span>
            {locationData && (
              <span className="ml-2 text-green-600 dark:text-green-400">• Location verified</span>
            )}
          </div>
        </div>

        {/* Camera Interface */}
        <div className="bg-card-light dark:bg-card-dark rounded-2xl p-6 shadow-soft border border-subtle-light dark:border-subtle-dark">
          <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-4">Take Event Photo</h3>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              <button
                onClick={initializeCamera}
                className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-4">
              <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>
            </div>
          )}

          {!capturedPhoto ? (
            /* Camera View */
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                />

                {!permissionsReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                    <div className="text-center text-white">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                      <p className="text-lg font-medium">Requesting permissions...</p>
                      <p className="text-sm text-gray-300 mt-2">Please allow camera and location access</p>
                    </div>
                  </div>
                )}

                {permissionsReady && !cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                    <div className="text-center text-white">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                      <p className="text-lg font-medium">Loading camera...</p>
                    </div>
                  </div>
                )}
              </div>

              {permissionsReady && cameraReady && (
                <div className="flex justify-center">
                  <button
                    onClick={capturePhoto}
                    className="bg-primary hover:bg-primary/90 text-white p-5 rounded-full transition-colors shadow-xl"
                  >
                    <span className="material-icons-outlined text-4xl">camera_alt</span>
                  </button>
                </div>
              )}

              {!permissionsReady && (
                <div className="text-center py-6">
                  <button
                    onClick={initializeCamera}
                    className="bg-primary text-white px-8 py-4 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Start Camera
                  </button>
                </div>
              )}

              {permissionsReady && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-icons-outlined text-blue-600 dark:text-blue-400">info</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">Instructions</span>
                  </div>
                  <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                    <li>• Make sure you're at the event location</li>
                    <li>• Include yourself or event activity in the photo</li>
                    <li>• Photo will be verified automatically</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            /* Photo Preview */
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden">
                <img src={preview!} alt="Captured" className="w-full h-64 object-cover" />
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-icons-outlined text-green-600 dark:text-green-400">check_circle</span>
                  <span className="font-medium text-green-600 dark:text-green-400">Ready to Submit</span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Photo captured with location data. You'll receive {event.points} points if verified!
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={retakePhoto}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-colors"
                >
                  Retake
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <span className="material-icons-outlined">send</span>
                      Submit Photo
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}