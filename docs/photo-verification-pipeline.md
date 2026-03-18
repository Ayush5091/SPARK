# Photo Verification Pipeline Documentation

## Overview

This pipeline enables location and time-based verification of student event participation through camera photos with EXIF data validation.

## Architecture

### Core Components

1. **Photo Verification Utility** (`src/lib/photo-verification.ts`)
   - Extracts EXIF data (GPS coordinates, timestamps)
   - Calculates distance using Haversine formula
   - Validates time windows with tolerance
   - Returns structured verification results

2. **API Endpoints**
   - `POST /api/photo-verification` - Submit and verify photos
   - `GET/POST /api/events` - Event management
   - `GET /api/event-submissions` - Submission tracking
   - `GET/PUT /api/admin/event-submissions` - Admin review

3. **Database Schema**
   - `events` table - Location-based activities
   - `event_submissions` table - Photo submissions with metadata

## Workflow

### For Admins
1. **Create Event**: POST to `/api/events`
   ```json
   {
     "name": "Tech Conference 2026",
     "category": "technical",
     "points": 50,
     "latitude": 12.971598,
     "longitude": 77.594566,
     "location_name": "Convention Center",
     "start_time": "2026-03-20T09:00:00Z",
     "end_time": "2026-03-20T18:00:00Z",
     "location_radius_meters": 100,
     "time_tolerance_minutes": 30
   }
   ```

2. **Review Failed Submissions**: GET `/api/admin/event-submissions?status=pending_review`

3. **Approve/Reject**: PUT `/api/admin/event-submissions`
   ```json
   {
     "submission_id": 123,
     "action": "approve",
     "review_notes": "Valid participation confirmed"
   }
   ```

### For Students
1. **View Available Events**: GET `/api/events`
2. **Take Photo at Event**: Use camera (frontend to be implemented)
3. **Submit Photo**: POST `/api/photo-verification` with FormData
4. **Check Status**: GET `/api/event-submissions?event_id=123`

## Verification Logic

### Automatic Approval Criteria
- **Location**: Photo GPS within specified radius (default: 100m)
- **Time**: Photo timestamp within event window + tolerance (default: 30min)
- **Both conditions must pass** for auto-approval

### Manual Review Triggers
- Missing GPS coordinates
- Missing timestamp
- Location outside radius
- Time outside window
- Any EXIF extraction errors

### Response Structure
```json
{
  "submission_id": 456,
  "verification_result": {
    "isValid": false,
    "reason": "Photo taken 250m from event location (max 100m allowed)",
    "locationMatch": false,
    "timeMatch": true,
    "distanceFromEvent": 250,
    "metadata": {
      "latitude": 12.972000,
      "longitude": 77.595000,
      "timestamp": "2026-03-20T10:30:00Z"
    }
  },
  "auto_verified": false,
  "points_awarded": 0
}
```

## Security Features

1. **Camera-Only Capture**: Frontend should only allow direct camera capture, no file uploads
2. **EXIF Validation**: Extracts and validates authentic metadata
3. **Geographic Constraints**: Precise location checking with configurable radius
4. **Time Constraints**: Event window validation with tolerance
5. **Role-Based Access**: Students submit, admins create events and review

## Database Tables

### events
- Location data (lat/lng, radius)
- Time windows (start/end, tolerance)
- Event metadata (name, points, category)

### event_submissions
- Student submission tracking
- EXIF metadata storage (JSONB)
- Verification results (JSONB)
- Review workflow (status, notes)

## Future Enhancements

1. **Photo Storage**: Save actual photos (currently only metadata)
2. **Bulk Operations**: Admin bulk approve/reject
3. **Analytics**: Event participation statistics
4. **Geofencing**: More complex location validation
5. **ML Verification**: Computer vision for event validation
6. **Mobile App**: Native camera integration

## Integration Points

- **Notifications**: Auto-notifications for all verification outcomes
- **Points System**: Seamless integration with existing points tracking
- **Auth System**: Uses existing JWT authentication
- **Admin Dashboard**: Pending reviews integration needed

## Dependencies Added

- `exifr` - EXIF data extraction from images

## Next Steps

1. ✅ Backend pipeline complete
2. 🔲 Frontend camera integration
3. 🔲 Event listing UI
4. 🔲 Admin event creation form
5. 🔲 Student submission interface
6. 🔲 Admin review interface