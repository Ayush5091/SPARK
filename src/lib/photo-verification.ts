import exifr from 'exifr';

export interface EventDetails {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  start_time: Date;
  end_time: Date;
  location_radius_meters?: number; // Default to 100m if not specified
  time_tolerance_minutes?: number; // Default to 30 minutes if not specified
}

export interface PhotoMetadata {
  latitude?: number;
  longitude?: number;
  timestamp?: Date;
  make?: string;
  model?: string;
}

export interface VerificationResult {
  isValid: boolean;
  reason?: string;
  metadata: PhotoMetadata;
  locationMatch: boolean;
  timeMatch: boolean;
  distanceFromEvent?: number; // in meters
  timeDifferenceMinutes?: number;
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Extract EXIF metadata from photo buffer
 */
export async function extractPhotoMetadata(photoBuffer: Buffer): Promise<PhotoMetadata> {
  try {
    // Extract EXIF data including GPS and timestamp
    const exifData = await exifr.parse(photoBuffer, {
      gps: true,
      exif: true,
      ifd0: true,
      ifd1: true
    });

    console.log('Raw EXIF data:', exifData);

    const metadata: PhotoMetadata = {
      make: exifData?.Make,
      model: exifData?.Model
    };

    // Extract GPS coordinates
    if (exifData?.latitude && exifData?.longitude) {
      metadata.latitude = exifData.latitude;
      metadata.longitude = exifData.longitude;
    }

    // Extract timestamp - try multiple fields
    let timestamp: Date | undefined;
    if (exifData?.DateTimeOriginal) {
      timestamp = new Date(exifData.DateTimeOriginal);
    } else if (exifData?.DateTime) {
      timestamp = new Date(exifData.DateTime);
    } else if (exifData?.CreateDate) {
      timestamp = new Date(exifData.CreateDate);
    }

    if (timestamp && !isNaN(timestamp.getTime())) {
      metadata.timestamp = timestamp;
    }

    return metadata;
  } catch (error) {
    console.error('Error extracting EXIF data:', error);
    throw new Error('Failed to extract photo metadata');
  }
}

/**
 * Verify if photo metadata matches event requirements
 */
export function verifyPhotoAgainstEvent(
  metadata: PhotoMetadata,
  eventDetails: EventDetails
): VerificationResult {
  const locationRadiusMeters = eventDetails.location_radius_meters || 100;
  const timeToleranceMinutes = eventDetails.time_tolerance_minutes || 30;

  let locationMatch = false;
  let timeMatch = false;
  let distanceFromEvent: number | undefined;
  let timeDifferenceMinutes: number | undefined;
  let reason: string | undefined;

  // Check location
  if (metadata.latitude && metadata.longitude) {
    distanceFromEvent = calculateDistance(
      metadata.latitude,
      metadata.longitude,
      eventDetails.latitude,
      eventDetails.longitude
    );

    locationMatch = distanceFromEvent <= locationRadiusMeters;

    if (!locationMatch) {
      reason = `Photo taken ${Math.round(distanceFromEvent)}m from event location (max ${locationRadiusMeters}m allowed)`;
    }
  } else {
    reason = 'Photo does not contain GPS location data';
  }

  // Check time
  if (metadata.timestamp) {
    const eventStart = new Date(eventDetails.start_time);
    const eventEnd = new Date(eventDetails.end_time);
    const photoTime = metadata.timestamp;

    // Check if photo was taken within event window + tolerance
    const toleranceMs = timeToleranceMinutes * 60 * 1000;
    const allowedStart = new Date(eventStart.getTime() - toleranceMs);
    const allowedEnd = new Date(eventEnd.getTime() + toleranceMs);

    timeMatch = photoTime >= allowedStart && photoTime <= allowedEnd;

    if (!timeMatch) {
      // Calculate closest time difference
      const diffToStart = Math.abs(photoTime.getTime() - eventStart.getTime());
      const diffToEnd = Math.abs(photoTime.getTime() - eventEnd.getTime());
      const closestDiff = Math.min(diffToStart, diffToEnd);
      timeDifferenceMinutes = Math.round(closestDiff / (60 * 1000));

      if (!reason) {
        reason = `Photo taken ${timeDifferenceMinutes} minutes from event timeframe (max ${timeToleranceMinutes} minutes tolerance allowed)`;
      }
    }
  } else {
    if (!reason) {
      reason = 'Photo does not contain timestamp data';
    }
  }

  const isValid = locationMatch && timeMatch;

  return {
    isValid,
    reason: isValid ? undefined : reason,
    metadata,
    locationMatch,
    timeMatch,
    distanceFromEvent,
    timeDifferenceMinutes
  };
}

/**
 * Main verification function
 */
export async function verifyPhotoSubmission(
  photoBuffer: Buffer,
  eventDetails: EventDetails
): Promise<VerificationResult> {
  // Extract metadata from photo
  const metadata = await extractPhotoMetadata(photoBuffer);

  // Verify against event requirements
  const result = verifyPhotoAgainstEvent(metadata, eventDetails);

  console.log('Photo verification result:', {
    eventId: eventDetails.id,
    eventName: eventDetails.name,
    isValid: result.isValid,
    locationMatch: result.locationMatch,
    timeMatch: result.timeMatch,
    distanceFromEvent: result.distanceFromEvent,
    reason: result.reason
  });

  return result;
}