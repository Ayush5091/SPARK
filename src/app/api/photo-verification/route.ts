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

    // Verify photo against event
    const verificationResult = await verifyPhotoSubmission(photoBuffer, eventDetails);

    // Create submission record
    const submissionQuery = await db.query(
      `INSERT INTO event_submissions
       (student_id, event_id, photo_metadata, verification_result, status, submitted_at, auto_verified)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [
        studentId,
        eventId,
        JSON.stringify(verificationResult.metadata),
        JSON.stringify(verificationResult),
        verificationResult.isValid ? 'verified' : 'pending_review',
        verificationResult.isValid
      ]
    );

    const submissionId = submissionQuery.rows[0].id;

    // If auto-verified, award points immediately
    if (verificationResult.isValid) {
      await db.query(
        `UPDATE students
         SET total_points = total_points + $1
         WHERE id = $2`,
        [eventData.points, studentId]
      );

      // Create notification for successful submission
      await db.query(
        `INSERT INTO notifications (user_id, message, is_read, created_at)
         VALUES ($1, $2, false, NOW())`,
        [
          studentId,
          `Your submission for "${eventData.name}" has been automatically verified and you've been awarded ${eventData.points} points!`
        ]
      );
    } else {
      // Create notification for manual review
      await db.query(
        `INSERT INTO notifications (user_id, message, is_read, created_at)
         VALUES ($1, $2, false, NOW())`,
        [
          studentId,
          `Your submission for "${eventData.name}" is under manual review. ${verificationResult.reason || 'Please wait for admin verification.'}`
        ]
      );

      // Notify admins about pending review
      const adminQuery = await db.query('SELECT id FROM admins');
      for (const admin of adminQuery.rows) {
        await db.query(
          `INSERT INTO notifications (user_id, message, is_read, created_at)
           VALUES ($1, $2, false, NOW())`,
          [
            admin.id,
            `New photo submission for "${eventData.name}" requires manual review.`
          ]
        );
      }
    }

    return NextResponse.json({
      submission_id: submissionId,
      verification_result: verificationResult,
      auto_verified: verificationResult.isValid,
      points_awarded: verificationResult.isValid ? eventData.points : 0
    });

  } catch (error: any) {
    console.error('Photo verification error:', error);
    return NextResponse.json(
      { detail: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}