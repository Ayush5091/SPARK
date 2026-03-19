import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { verifyPhotoSubmission, EventDetails } from '@/lib/photo-verification';

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

    // Validate file type
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json({ detail: 'File must be an image' }, { status: 400 });
    }

    // Parse user location data (from browser geolocation)
    let userLocation: { latitude: number; longitude: number; timestamp: number } | null = null;
    if (userLocationStr) {
      try {
        userLocation = JSON.parse(userLocationStr);
      } catch (error) {
        console.error('Failed to parse user location:', error);
      }
    }

    // Convert photo to buffer
    const arrayBuffer = await photo.arrayBuffer();
    const photoBuffer = Buffer.from(arrayBuffer);

    // Get event details from database
    const eventQuery = await db.query(
      `SELECT id, name, latitude, longitude, start_time, end_time,
              location_radius_meters, time_tolerance_minutes, points
       FROM events
       WHERE id = $1 AND status = 'active'`,
      [eventId]
    );

    if (eventQuery.rows.length === 0) {
      return NextResponse.json({ detail: 'Event not found or inactive' }, { status: 404 });
    }

    const eventData = eventQuery.rows[0];
    const eventDetails: EventDetails = {
      id: eventData.id,
      name: eventData.name,
      latitude: parseFloat(eventData.latitude),
      longitude: parseFloat(eventData.longitude),
      start_time: new Date(eventData.start_time),
      end_time: new Date(eventData.end_time),
      location_radius_meters: eventData.location_radius_meters || 100,
      time_tolerance_minutes: eventData.time_tolerance_minutes || 30
    };

    // Verify photo against event (now with user location fallback)
    const verificationResult = await verifyPhotoSubmission(photoBuffer, eventDetails, userLocation);

    // Check if student already has a submission for this event
    const existingSubmissionQuery = await db.query(
      `SELECT id, status, points_awarded FROM event_submissions
       WHERE student_id = $1 AND event_id = $2`,
      [studentId, eventId]
    );

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
             points_awarded = $5
         WHERE id = $6`,
        [
          JSON.stringify(verificationResult.metadata),
          JSON.stringify(verificationResult),
          verificationResult.isValid ? 'verified' : 'pending_review',
          verificationResult.isValid,
          verificationResult.isValid ? eventData.points : 0,
          submissionId
        ]
      );
    } else {
      // Create new submission record
      const submissionQuery = await db.query(
        `INSERT INTO event_submissions
         (student_id, event_id, photo_metadata, verification_result, status, submitted_at, auto_verified, points_awarded)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
         RETURNING id`,
        [
          studentId,
          eventId,
          JSON.stringify(verificationResult.metadata),
          JSON.stringify(verificationResult),
          verificationResult.isValid ? 'verified' : 'pending_review',
          verificationResult.isValid,
          verificationResult.isValid ? eventData.points : 0
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

    if (verificationResult.isValid) {
      // Create notification for successful submission/update
      await db.query(
        `INSERT INTO notifications (student_id, message, is_read, created_at)
         VALUES ($1, $2, false, NOW())`,
        [studentId, notificationMessage]
      );
    } else {
      // Create notification for manual review
      await db.query(
        `INSERT INTO notifications (student_id, message, is_read, created_at)
         VALUES ($1, $2, false, NOW())`,
        [studentId, notificationMessage]
      );

      // Notify admins about pending review (only for new submissions or updates that need review)
      if (!isUpdate || !verificationResult.isValid) {
        const adminQuery = await db.query('SELECT id FROM admins');
        const adminNotificationMessage = isUpdate
          ? `Student updated their photo submission for "${eventData.name}" - requires manual review.`
          : `New photo submission for "${eventData.name}" requires manual review.`;

        for (const admin of adminQuery.rows) {
          await db.query(
            `INSERT INTO notifications (student_id, message, is_read, created_at)
             VALUES ($1, $2, false, NOW())`,
            [admin.id, adminNotificationMessage]
          );
        }
      }
    }

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
    return NextResponse.json(
      { detail: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}