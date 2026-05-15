import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthErrorStatus, requireAuth } from '@/lib/auth';
import { calculateSemester } from '@/lib/student';

export async function GET(request: NextRequest) {
  try {
    requireAuth(request, 'admin');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending_review';
    const eventId = searchParams.get('event_id');
    const category = searchParams.get('category');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    let queryStr = `
            SELECT es.id, es.student_id, es.event_id, es.status,
              es.submitted_at, es.verification_result, es.photo_metadata,
              es.points_awarded, es.review_notes,
             s.name as student_name, s.email as student_email, s.usn, s.department as student_department,
             s.semester as student_semester,
             s.total_points as student_total_points,
             e.name as event_name, e.points as event_points, e.category as event_category,
             e.latitude as event_latitude, e.longitude as event_longitude,
             e.location_name, e.start_time, e.end_time
      FROM event_submissions es
      JOIN students s ON es.student_id = s.id
      JOIN events e ON es.event_id = e.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    // Status filter: 'all' fetches everything, otherwise filter by status
    if (status !== 'all') {
      params.push(status);
      conditions.push(`es.status = $${params.length}`);
    }

    if (eventId) {
      params.push(eventId);
      conditions.push(`es.event_id = $${params.length}`);
    }

    if (category) {
      params.push(category);
      conditions.push(`e.category = $${params.length}`);
    }

    if (dateFrom) {
      params.push(dateFrom);
      conditions.push(`es.submitted_at >= $${params.length}::timestamp`);
    }

    if (dateTo) {
      params.push(dateTo);
      conditions.push(`es.submitted_at <= $${params.length}::timestamp`);
    }

    if (conditions.length > 0) {
      queryStr += ` WHERE ${conditions.join(' AND ')}`;
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
        // Already parsed (JSONB auto-parses in some drivers)
        verificationResult = submission.verification_result;
      }

      try {
        photoMetadata = submission.photo_metadata ? JSON.parse(submission.photo_metadata) : null;
      } catch (e) {
        photoMetadata = submission.photo_metadata;
      }

      // Auto-update semester for display
      const currentSemester = calculateSemester(submission.student_email, submission.usn);

      return {
        ...submission,
        student_semester: currentSemester ?? submission.student_semester,
        verification_result: verificationResult,
        photo_metadata: photoMetadata
      };
    });

    return NextResponse.json(submissions);

  } catch (error: any) {
    console.error('Get admin submissions error:', error);
    const authStatus = getAuthErrorStatus(error);
    return NextResponse.json(
      { detail: error.message || 'Internal server error' },
      { status: authStatus ?? 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authData = requireAuth(request, 'admin');
    const adminId = authData.user_id;

    const body = await request.json();
    const { submission_id, action, review_notes, points_awarded } = body;

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
    const safePoints = points_awarded !== undefined && points_awarded !== null
      ? Number(points_awarded)
      : submission.points;

    if (action === 'approve' && (Number.isNaN(safePoints) || safePoints < 0)) {
      return NextResponse.json(
        { detail: 'Points awarded must be a non-negative number' },
        { status: 400 }
      );
    }

    const pointsAwarded = action === 'approve' ? safePoints : 0;

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
        [pointsAwarded, submission.student_id]
      );
    }

    // Create notification for student
    const notificationMessage = action === 'approve'
      ? `Your submission for "${submission.event_name}" has been approved! You've been awarded ${pointsAwarded} points.`
      : `Your submission for "${submission.event_name}" has been rejected. ${review_notes || 'Please contact admin for more details.'}`;

    await db.query(
      `INSERT INTO notifications (student_id, message, is_read, created_at)
       VALUES ($1, $2, false, NOW())`,
      [submission.student_id, notificationMessage]
    );

    return NextResponse.json({
      message: `Submission ${action}d successfully`,
      points_awarded: pointsAwarded
    });

  } catch (error: any) {
    console.error('Review submission error:', error);
    const authStatus = getAuthErrorStatus(error);
    return NextResponse.json(
      { detail: error.message || 'Internal server error' },
      { status: authStatus ?? 500 }
    );
  }
}