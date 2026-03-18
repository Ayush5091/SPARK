import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    requireAuth(request, 'admin');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending_review';
    const eventId = searchParams.get('event_id');

    let queryStr = `
      SELECT es.id, es.student_id, es.event_id, es.status,
             es.submitted_at, es.verification_result, es.photo_metadata,
             s.name as student_name, s.email as student_email, s.usn,
             e.name as event_name, e.points as event_points,
             e.latitude as event_latitude, e.longitude as event_longitude,
             e.location_name, e.start_time, e.end_time
      FROM event_submissions es
      JOIN students s ON es.student_id = s.id
      JOIN events e ON es.event_id = e.id
      WHERE es.status = $1
    `;

    const params: any[] = [status];

    if (eventId) {
      params.push(eventId);
      queryStr += ` AND es.event_id = $${params.length}`;
    }

    queryStr += ` ORDER BY es.submitted_at ASC`;

    const { rows } = await db.query(queryStr, params);

    // Parse JSON fields
    const submissions = rows.map(submission => {
      let verificationResult = null;
      let photoMetadata = null;

      try {
        verificationResult = submission.verification_result ? JSON.parse(submission.verification_result) : null;
      } catch (e) {
        console.error('Error parsing verification_result:', e);
      }

      try {
        photoMetadata = submission.photo_metadata ? JSON.parse(submission.photo_metadata) : null;
      } catch (e) {
        console.error('Error parsing photo_metadata:', e);
      }

      return {
        ...submission,
        verification_result: verificationResult,
        photo_metadata: photoMetadata
      };
    });

    return NextResponse.json(submissions);

  } catch (error: any) {
    console.error('Get admin submissions error:', error);
    return NextResponse.json(
      { detail: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authData = requireAuth(request, 'admin');
    const adminId = authData.user_id;

    const body = await request.json();
    const { submission_id, action, review_notes } = body;

    if (!submission_id || !action) {
      return NextResponse.json(
        { detail: 'Missing required fields: submission_id, action' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { detail: 'Action must be either "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Get submission details
    const submissionQuery = await db.query(
      `SELECT es.*, e.points, e.name as event_name
       FROM event_submissions es
       JOIN events e ON es.event_id = e.id
       WHERE es.id = $1 AND es.status = 'pending_review'`,
      [submission_id]
    );

    if (submissionQuery.rows.length === 0) {
      return NextResponse.json(
        { detail: 'Submission not found or not pending review' },
        { status: 404 }
      );
    }

    const submission = submissionQuery.rows[0];
    const newStatus = action === 'approve' ? 'verified' : 'rejected';
    const pointsAwarded = action === 'approve' ? submission.points : 0;

    // Update submission
    await db.query(
      `UPDATE event_submissions
       SET status = $1, reviewed_at = NOW(), reviewed_by = $2,
           review_notes = $3, points_awarded = $4
       WHERE id = $5`,
      [newStatus, adminId, review_notes, pointsAwarded, submission_id]
    );

    // Award points if approved
    if (action === 'approve') {
      await db.query(
        `UPDATE students
         SET total_points = total_points + $1
         WHERE id = $2`,
        [submission.points, submission.student_id]
      );
    }

    // Create notification for student
    const notificationMessage = action === 'approve'
      ? `Your submission for "${submission.event_name}" has been approved! You've been awarded ${submission.points} points.`
      : `Your submission for "${submission.event_name}" has been rejected. ${review_notes || 'Please contact admin for more details.'}`;

    await db.query(
      `INSERT INTO notifications (user_id, message, is_read, created_at)
       VALUES ($1, $2, false, NOW())`,
      [submission.student_id, notificationMessage]
    );

    return NextResponse.json({
      message: `Submission ${action}d successfully`,
      points_awarded: pointsAwarded
    });

  } catch (error: any) {
    console.error('Review submission error:', error);
    return NextResponse.json(
      { detail: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}