"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
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
  const { user, token, refreshProfile, isInitializing } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Mirrors cameraStream so unmount cleanup sees the live stream, not the initial null
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCameraStream(null);
  };

  // Wait for the auth provider to restore the session; on a hard refresh user is
  // still null on the first render and we'd bounce a logged-in student to /login.
  useEffect(() => {
    if (isInitializing) return;
    if (!user || user.role !== 'student') {
      router.push('/login');
      return;
    }
    if (token) {
      fetchEvent();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, eventId, token, isInitializing]);

  useEffect(() => {
    if (isInitializing || user?.role !== 'student') return;
    initializeCamera();
    return stopCamera;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitializing, user?.role]);

  // The stream can arrive while the loading screen is still up (no <video> yet), and
  // the <video> remounts after a retake, so attach whenever both exist.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !cameraStream || video.srcObject === cameraStream) return;
    video.srcObject = cameraStream;
    video.onloadedmetadata = () => setCameraReady(true);
    video.play().catch(err => console.error('Video play error:', err));
  }, [cameraStream, loading, event, capturedPhoto]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

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

  // Camera and location are requested independently so a slow or denied
  // location fix doesn't keep the camera from starting.
  const initializeCamera = async () => {
    setError(null);
    setCameraReady(false);
    getCurrentLocation();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera is unavailable. Open this page over HTTPS or on localhost.');
      return;
    }

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      streamRef.current = stream;
      setCameraStream(stream);
      setPermissionsReady(true);
    } catch (error: any) {
      console.error('Camera initialization error:', error);
      if (error.name === 'NotAllowedError') {
        setError('Camera permission was denied. Allow camera access in your browser and try again.');
      } else if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
        setError('No camera found on this device.');
      } else if (error.name === 'NotReadableError') {
        setError('The camera is in use by another app. Close it and try again.');
      } else {
        setError('Unable to access camera. Please check permissions and try again.');
      }
    }
  };

  const getCurrentLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Location is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationData({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        });
      },
      (error) => {
        console.error('Location error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission was denied. Allow location access to submit.');
        } else if (error.code === error.TIMEOUT) {
          setLocationError('Getting your location timed out.');
        } else {
          setLocationError('Could not determine your location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
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
          stopCamera();
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
    if (!capturedPhoto || !event) {
      setError('Photo is required');
      return;
    }
    if (!locationData) {
      setError('Location is required to submit. Allow location access and retry.');
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
      <div className="max-w-md mx-auto min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Loading camera verification...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="text-center space-y-6 px-6">
          <h1 className="text-2xl font-black text-black tracking-tight">Event Not Found</h1>
          <button
            onClick={() => router.push('/')}
            className="w-full h-14 bg-black text-white font-bold text-xs uppercase tracking-widest rounded-2xl active:scale-95 transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const categoryInfo = getCategoryIconInfo(event.category);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F8F9FA] font-sans relative pb-24 overflow-hidden text-black selection:bg-black selection:text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-10 pb-6 sticky top-0 z-20 bg-[#F8F9FA]/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center justify-center w-12 h-12 rounded-full text-black ui-card active:bg-[#E9ECEF] transition-all"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </Link>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Submit Photo for</span>
            <span className="text-lg font-black tracking-tight text-black max-w-[200px] truncate">{event.name}</span>
          </div>
        </div>
        <UserAvatar name={user?.name} className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center text-lg font-bold" />
      </header>

      <main className="flex-1 px-6 py-6 pb-28 space-y-6">
        {/* Event Info */}
        <div className="rounded-2xl p-6 ui-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gray-900 text-white flex items-center justify-center ">
              <span className="material-icons-outlined text-xl">{categoryInfo.icon}</span>
            </div>
            <div>
              <h3 className="text-sm font-black text-black leading-tight">{event.name}</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">{event.category} • {event.points} PTS</p>
            </div>
          </div>

          <p className="text-xs text-gray-500 font-medium mb-4 leading-relaxed">{event.description}</p>

          <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-wider pt-3 border-t border-[#E9ECEF]">
            <span className="material-icons-outlined text-sm">location_on</span>
            <span>{event.location_name}</span>
            {locationData ? (
              <span className="ml-auto text-green-600">• Location Captured</span>
            ) : locationError ? (
              <span className="ml-auto text-red-600">• No Location</span>
            ) : (
              <span className="ml-auto">• Locating…</span>
            )}
          </div>
        </div>

        {/* Camera Interface */}
        <div className="rounded-2xl p-6 ui-card">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">Take Event Photo</h3>

          {error && (
            <div className="border border-red-200/50 rounded-2xl p-4 mb-4 text-center ui-well">
              <p className="text-red-600 text-xs font-bold uppercase tracking-wider">{error}</p>
              <button
                onClick={initializeCamera}
                className="mt-3 bg-black text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-gray-900 shadow-sm"
              >
                Try Again
              </button>
            </div>
          )}

          {locationError && !locationData && (
            <div className="border border-amber-200/50 rounded-2xl p-4 mb-4 text-center ui-well">
              <p className="text-amber-700 text-xs font-bold uppercase tracking-wider">{locationError}</p>
              <button
                onClick={getCurrentLocation}
                className="mt-3 bg-black text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-gray-900 shadow-sm"
              >
                Retry Location
              </button>
            </div>
          )}

          {success && (
            <div className="border border-green-200/50 rounded-2xl p-4 mb-4 text-center ui-well">
              <p className="text-green-600 text-xs font-bold uppercase tracking-wider">{success}</p>
            </div>
          )}

          {!capturedPhoto ? (
            /* Camera View */
            <div className="space-y-6">
              <div className="relative rounded-2xl overflow-hidden bg-black shadow-[inset_4px_4px_10px_rgba(0,0,0,0.5)]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                />

                {!permissionsReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/85">
                    <div className="text-center text-white p-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3"></div>
                      <p className="text-xs font-bold uppercase tracking-wider">Requesting permissions...</p>
                      <p className="text-[10px] text-gray-400 mt-1 uppercase font-semibold">Camera and location access required</p>
                    </div>
                  </div>
                )}

                {permissionsReady && !cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/85">
                    <div className="text-center text-white p-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3"></div>
                      <p className="text-xs font-bold uppercase tracking-wider">Loading camera...</p>
                    </div>
                  </div>
                )}
              </div>

              {permissionsReady && cameraReady && (
                <div className="flex justify-center">
                  <button
                    onClick={capturePhoto}
                    className="bg-black hover:bg-gray-900 text-white p-5 rounded-full transition-transform active:scale-95 "
                  >
                    <span className="material-icons-outlined text-3xl">camera_alt</span>
                  </button>
                </div>
              )}

              {!permissionsReady && (
                <div className="text-center py-4">
                  <button
                    onClick={initializeCamera}
                    className="w-full h-14 bg-black text-white font-bold text-xs uppercase tracking-widest rounded-2xl active:scale-95 transition-all"
                  >
                    Start Camera
                  </button>
                </div>
              )}

              {permissionsReady && (
                <div className="p-5 ui-well rounded-2xl">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-black mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">info</span> Requirements
                  </h4>
                  <ul className="text-[10px] font-medium text-gray-500 space-y-1.5 list-disc pl-4">
                    <li>Confirm you are physically at the event location.</li>
                    <li>Ensure the photo is clear and contains activity proof.</li>
                    <li>The system will auto-verify your location data.</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            /* Photo Preview */
            <div className="space-y-6">
              <div className="rounded-2xl overflow-hidden shadow-[inset_4px_4px_10px_rgba(0,0,0,0.2)]">
                <img src={preview!} alt="Captured" className="w-full h-64 object-cover" />
              </div>

              <div className="p-5 ui-well rounded-2xl text-center">
                <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5 ${locationData ? 'text-green-600' : 'text-amber-600'}`}>
                  <span className="material-symbols-outlined text-sm">{locationData ? 'check_circle' : 'location_searching'}</span>
                  {locationData ? 'Ready to Submit' : 'Waiting for Location'}
                </h4>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                  {locationData
                    ? `Location data locked in. Submit to claim ${event.points} PTS.`
                    : 'Your location is needed before you can submit.'}
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={retakePhoto}
                  className="rounded-2xl ui-card px-5 py-4 text-xs font-bold uppercase text-gray-500 active:bg-[#E9ECEF] transition-all flex-1 text-center"
                >
                  Retake
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !locationData}
                  className="rounded-2xl bg-black text-white px-5 py-4 text-xs font-bold uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-all flex-1 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-icons-outlined text-sm">send</span>
                      <span>Submit Photo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
