import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET - Get student's event submissions
export async function GET(request: NextRequest) {
  try {
    const authData = requireAuth(request, 'student');
    const studentId = authData.user_id;

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    let queryStr = `
            SELECT es.id, es.event_id, es.status, es.auto_verified,
             es.submitted_at, es.reviewed_at, es.review_notes,
             es.points_awarded, es.verification_result,
             e.name as event_name, e.points as event_points,
              e.category, e.start_time, e.end_time, e.location_name
      FROM event_submissions es
      JOIN events e ON es.event_id = e.id
      WHERE es.student_id = $1
    `;

    const params: any[] = [studentId];

    if (eventId) {
      params.push(eventId);
      queryStr += ` AND es.event_id = $${params.length}`;
    }

    queryStr += ` ORDER BY es.submitted_at DESC`;

    const { rows } = await db.query(queryStr, params);

    // Parse JSON fields and add computed fields
    const submissions = rows.map(submission => {
      let verificationResult = null;
      try {
        verificationResult = submission.verification_result ? JSON.parse(submission.verification_result) : null;
      } catch (e) {
        console.error('Error parsing verification_result:', e);
      }

      return {
        ...submission,
        verification_result: verificationResult,
        is_pending: submission.status === 'pending_review',
        is_verified: submission.status === 'verified',
        is_rejected: submission.status === 'rejected'
      };
    });

    return NextResponse.json(submissions);

  } catch (error: any) {
    console.error('Get event submissions error:', error);
    return NextResponse.json(
      { detail: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Check if student can submit for a specific event
export async function HEAD(request: NextRequest) {
  try {
    const authData = requireAuth(request, 'student');
    const studentId = authData.user_id;

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    if (!eventId) {
      return new NextResponse(null, { status: 400 });
    }

    // Check if event exists and is active
    const eventQuery = await db.query(
      `SELECT e.id, e.start_time, e.end_time, e.status, e.capacity,
              COUNT(es.id) as total_submissions
       FROM events e
       LEFT JOIN event_submissions es ON e.id = es.event_id
       WHERE e.id = $1
       GROUP BY e.id, e.start_time, e.end_time, e.status, e.capacity`,
      [eventId]
    );

    if (eventQuery.rows.length === 0) {
      return new NextResponse(null, { status: 404 });
    }

    const event = eventQuery.rows[0];

    // Check if event is active
    if (event.status !== 'active') {
      return new NextResponse(null, {
        status: 403,
        headers: { 'X-Reason': 'Event is not active' }
      });
    }

    if (event.capacity && Number(event.total_submissions) >= Number(event.capacity)) {
      return new NextResponse(null, {
        status: 403,
        headers: { 'X-Reason': 'Event capacity reached' }
      });
    }

    // Check if student has already submitted for this event
    const submissionQuery = await db.query(
      `SELECT id FROM event_submissions WHERE student_id = $1 AND event_id = $2`,
      [studentId, eventId]
    );

    if (submissionQuery.rows.length > 0) {
      return new NextResponse(null, {
        status: 409,
        headers: { 'X-Reason': 'Already submitted for this event' }
      });
    }

    // Check if event time window allows submissions (within tolerance)
    const now = new Date();
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);

    // Allow submission 30 minutes before start and up to end time
    const allowedStart = new Date(startTime.getTime() - 30 * 60 * 1000);

    if (now < allowedStart) {
      return new NextResponse(null, {
        status: 403,
        headers: { 'X-Reason': 'Event has not started yet' }
      });
    }

    if (now > endTime) {
      return new NextResponse(null, {
        status: 403,
        headers: { 'X-Reason': 'Event has ended' }
      });
    }

    return new NextResponse(null, { status: 200 });

  } catch (error: any) {
    console.error('Check submission eligibility error:', error);
    return new NextResponse(null, { status: 500 });
  }
}