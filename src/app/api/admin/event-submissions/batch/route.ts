import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthErrorStatus, requireAuth } from '@/lib/auth';

// POST - Batch approve or reject multiple submissions
export async function POST(request: NextRequest) {
  try {
    const authData = requireAuth(request, 'admin');
    const adminId = authData.user_id;

    const body = await request.json();
    const { submission_ids, action, review_notes } = body;

    if (!submission_ids || !Array.isArray(submission_ids) || submission_ids.length === 0) {
      return NextResponse.json(
        { detail: 'submission_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { detail: 'Action must be either "approve" or "reject"' },
        { status: 400 }
      );
    }

    const newStatus = action === 'approve' ? 'verified' : 'rejected';
    const results: { id: number; status: string; points_awarded: number }[] = [];
    const errors: { id: number; error: string }[] = [];

    // Process each submission in a transaction-like manner
    for (const submissionId of submission_ids) {
      try {
        // Get submission with event details
        const subQuery = await db.query(
          `SELECT es.*, e.points, e.name as event_name
           FROM event_submissions es
           JOIN events e ON es.event_id = e.id
           WHERE es.id = $1 AND es.status = 'pending_review'`,
          [submissionId]
        );

        if (subQuery.rows.length === 0) {
          errors.push({ id: submissionId, error: 'Not found or already processed' });
          continue;
        }

        const submission = subQuery.rows[0];
        const pointsAwarded = action === 'approve' ? submission.points : 0;

        // Update submission status
        await db.query(
          `UPDATE event_submissions
           SET status = $1, reviewed_at = NOW(), reviewed_by = $2,
               review_notes = $3, points_awarded = $4
           WHERE id = $5`,
          [newStatus, adminId, review_notes || null, pointsAwarded, submissionId]
        );

        // Award points if approved
        if (action === 'approve') {
          await db.query(
            `UPDATE students SET total_points = total_points + $1 WHERE id = $2`,
            [pointsAwarded, submission.student_id]
          );
        }

        // Notify student
        const notificationMessage = action === 'approve'
          ? `Your submission for "${submission.event_name}" has been approved! You've been awarded ${pointsAwarded} points.`
          : `Your submission for "${submission.event_name}" has been rejected. ${review_notes || 'Please contact admin for details.'}`;

        await db.query(
          `INSERT INTO notifications (student_id, message, is_read, created_at)
           VALUES ($1, $2, false, NOW())`,
          [submission.student_id, notificationMessage]
        );

        results.push({ id: submissionId, status: newStatus, points_awarded: pointsAwarded });

      } catch (err: any) {
        errors.push({ id: submissionId, error: err.message || 'Processing failed' });
      }
    }

    return NextResponse.json({
      processed: results.length,
      failed: errors.length,
      results,
      errors
    });

  } catch (error: any) {
    console.error('Batch review error:', error);
    const authStatus = getAuthErrorStatus(error);
    return NextResponse.json(
      { detail: error.message || 'Internal server error' },
      { status: authStatus ?? 500 }
    );
  }
}
