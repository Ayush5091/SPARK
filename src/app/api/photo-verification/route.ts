import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthErrorStatus, requireAuth } from '@/lib/auth';
import { verifyPhotoSubmission, EventDetails } from '@/lib/photo-verification';
import { deleteEvidence, EvidenceError, PHOTO_TYPES, putEvidence, readEvidence } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    // Only students can submit photos for verification
    const authData = requireAuth(request, 'student');
    const studentId = authData.user_id;

    // Parse form data
    const formData = await request.formData();
    const photo = formData.get('photo') as File;
    const eventId = formData.get('event_id') as string;
    const userLocationStr = formData.get('user_location') as string;

    if (!photo) {
      return NextResponse.json({ detail: 'Photo is required' }, { status: 400 });
    }

    if (!eventId) {
      return NextResponse.json({ detail: 'Event ID is required' }, { status: 400 });
    }

    let evidence;
    try {
      evidence = await readEvidence(photo, PHOTO_TYPES);
    } catch (error) {
      if (error instanceof EvidenceError) {
        return NextResponse.json({ detail: error.message }, { status: 400 });
      }
      throw error;
    }

    // Parse user location data (from browser geolocation)
    let userLocation: { latitude: number; longitude: number; timestamp: number } | null = null;
    if (userLocationStr) {
      try {
        const parsed = JSON.parse(userLocationStr);
        const lat = Number(parsed?.latitude);
        const lng = Number(parsed?.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          userLocation = { latitude: lat, longitude: lng, timestamp: Date.now() };
        }
      } catch (error) {
        console.error('Failed to parse user location:', error);
      }
    }

    const photoBuffer = evidence.buffer;

    // Get event details from database
    const eventQuery = await db.query(
      `SELECT id, name, latitude, longitude, start_time, end_time,
              location_radius_meters, time_tolerance_minutes, points, capacity,
              COALESCE(is_personal, false) AS is_personal, personal_owner_id
       FROM events
       WHERE id = $1 AND status = 'active'`,
      [eventId]
    );

    const eventData = eventQuery.rows[0];

    // Another student's personal event is treated as nonexistent
    if (!eventData || (eventData.is_personal && Number(eventData.personal_owner_id) !== Number(studentId))) {
      return NextResponse.json({ detail: 'Event not found or inactive' }, { status: 404 });
    }
    const eventDetails: EventDetails = {
      id: eventData.id,
      name: eventData.name,
      // A personal activity may have no venue pin; it is reviewed by an admin either way
      latitude: eventData.latitude == null ? NaN : parseFloat(eventData.latitude),
      longitude: eventData.longitude == null ? NaN : parseFloat(eventData.longitude),
      start_time: new Date(eventData.start_time),
      end_time: new Date(eventData.end_time),
      location_radius_meters: eventData.location_radius_meters || 100,
      time_tolerance_minutes: eventData.time_tolerance_minutes || 30
    };

    // Check if student already has a submission for this event
    const existingSubmissionQuery = await db.query(
      `SELECT id, status, points_awarded, evidence_key FROM event_submissions
       WHERE student_id = $1 AND event_id = $2`,
      [studentId, eventId]
    );

    // Once an admin (or auto-verification) has decided, the student cannot resubmit
    // to overturn a rejection or overwrite admin-awarded points.
    const existingStatus = existingSubmissionQuery.rows[0]?.status;
    if (existingStatus && existingStatus !== 'pending_review') {
      return NextResponse.json(
        { detail: `Your submission for this event has already been ${existingStatus === 'verified' ? 'verified' : 'reviewed'} and cannot be changed` },
        { status: 409 }
      );
    }

    if (existingSubmissionQuery.rows.length === 0 && eventData.capacity) {
      const countQuery = await db.query('SELECT COUNT(*) FROM event_submissions WHERE event_id = $1', [eventId]);
      if (Number(countQuery.rows[0].count) >= Number(eventData.capacity)) {
        return NextResponse.json({ detail: 'Event capacity reached' }, { status: 403 });
      }
    }

    // Verify photo against event (now with user location fallback)
    const verificationResult = await verifyPhotoSubmission(photoBuffer, eventDetails, userLocation);

    // A personal event's location and time are chosen by the student, so matching them
    // proves nothing: always send these to an admin for review.
    if (eventData.is_personal) {
      verificationResult.isValid = false;
      verificationResult.reason = 'Personal events require admin review';
    }

    // Keep the photo so reviewers can see it, not just its metadata
    const evidenceKey = await putEvidence(`submissions/${studentId}/${eventId}`, evidence, photo.name || 'photo.jpg');
    const previousEvidenceKey: string | null = existingSubmissionQuery.rows[0]?.evidence_key ?? null;

    let submissionId: number;
    let isUpdate = false;
    let previousPointsAwarded = 0;

    if (existingSubmissionQuery.rows.length > 0) {
      // Update existing submission
      isUpdate = true;
      submissionId = existingSubmissionQuery.rows[0].id;
      previousPointsAwarded = existingSubmissionQuery.rows[0].points_awarded || 0;

      await db.query(
        `UPDATE event_submissions
         SET photo_metadata = $1,
             verification_result = $2,
             status = $3,
             submitted_at = NOW(),
             auto_verified = $4,
             points_awarded = $5,
             evidence_key = $7,
             evidence_content_type = $8,
             evidence_filename = $9
         WHERE id = $6`,
        [
          JSON.stringify(verificationResult.metadata),
          JSON.stringify(verificationResult),
          verificationResult.isValid ? 'verified' : 'pending_review',
          verificationResult.isValid,
          verificationResult.isValid ? eventData.points : 0,
          submissionId,
          evidenceKey,
          evidence.contentType,
          photo.name || 'photo.jpg'
        ]
      );
      if (previousEvidenceKey) await deleteEvidence(previousEvidenceKey);
    } else {
      // Create new submission record
      const submissionQuery = await db.query(
        `INSERT INTO event_submissions
         (student_id, event_id, photo_metadata, verification_result, status, submitted_at, auto_verified, points_awarded,
          evidence_key, evidence_content_type, evidence_filename)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          studentId,
          eventId,
          JSON.stringify(verificationResult.metadata),
          JSON.stringify(verificationResult),
          verificationResult.isValid ? 'verified' : 'pending_review',
          verificationResult.isValid,
          verificationResult.isValid ? eventData.points : 0,
          evidenceKey,
          evidence.contentType,
          photo.name || 'photo.jpg'
        ]
      );

      submissionId = submissionQuery.rows[0].id;
    }

    // Handle points update for students
    if (verificationResult.isValid) {
      if (isUpdate) {
        // For updates: adjust points (remove old points, add new points)
        const pointsDifference = eventData.points - previousPointsAwarded;
        if (pointsDifference !== 0) {
          await db.query(
            `UPDATE students
             SET total_points = total_points + $1
             WHERE id = $2`,
            [pointsDifference, studentId]
          );
        }
      } else {
        // For new submissions: add points normally
        await db.query(
          `UPDATE students
           SET total_points = total_points + $1
           WHERE id = $2`,
          [eventData.points, studentId]
        );
      }
    }

    // Create appropriate notification
    let notificationMessage: string;
    if (isUpdate) {
      if (verificationResult.isValid) {
        const pointsDifference = eventData.points - previousPointsAwarded;
        if (pointsDifference > 0) {
          notificationMessage = `Your updated submission for "${eventData.name}" has been automatically verified. You've been awarded ${pointsDifference} additional points!`;
        } else if (pointsDifference < 0) {
          notificationMessage = `Your updated submission for "${eventData.name}" has been automatically verified. ${Math.abs(pointsDifference)} points have been deducted from your previous submission.`;
        } else {
          notificationMessage = `Your updated submission for "${eventData.name}" has been automatically verified. Your points total remains the same.`;
        }
      } else {
        notificationMessage = `Your updated submission for "${eventData.name}" has been submitted for review.`;
      }
    } else {
      notificationMessage = `Your submission for "${eventData.name}" has been ${verificationResult.isValid ? 'automatically verified' : 'submitted for review'}.${verificationResult.isValid ? ` You've been awarded ${eventData.points} points!` : ''}`;
    }

    // Admins find pending submissions in their review queue. The notifications table only
    // addresses students, so writing admin alerts there sent them to unrelated students.
    await db.query(
      `INSERT INTO notifications (student_id, message, is_read, created_at)
       VALUES ($1, $2, false, NOW())`,
      [studentId, notificationMessage]
    );

    return NextResponse.json({
      submission_id: submissionId,
      verification_result: verificationResult,
      auto_verified: verificationResult.isValid,
      points_awarded: verificationResult.isValid ? eventData.points : 0,
      is_update: isUpdate,
      message: notificationMessage
    });

  } catch (error: any) {
    console.error('Photo verification error:', error);
    const authStatus = getAuthErrorStatus(error);
    return NextResponse.json(
      { detail: error.message || 'Internal server error' },
      { status: authStatus ?? 500 }
    );
  }
}