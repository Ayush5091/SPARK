import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sendEmailAsync } from '@/lib/mail';

export async function PUT(request: Request, { params }: { params: Promise<{ submission_id: string }> }) {
    try {
        const admin = requireAuth(request, 'admin');
        const { submission_id } = await params;

        const { rows } = await db.query(
            `UPDATE submissions
       SET status = 'approved',
           verified_by = $1,
           verified_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status = 'pending'
       RETURNING id;`,
            [admin.user_id, submission_id]
        );

        if (rows.length === 0) {
            return NextResponse.json({ detail: "Submission not found or already verified" }, { status: 404 });
        }

        try {
            const studentData = await db.query(`
        SELECT st.id as student_id, st.email, st.name as student_name, a.name as activity_name, a.points 
        FROM submissions su
        JOIN activity_requests r ON su.request_id = r.id
        JOIN students st ON r.student_id = st.id
        JOIN activities a ON r.activity_id = a.id
        WHERE su.id = $1
      `, [submission_id]);

            const details = studentData.rows[0];
            if (details) {
                const emailBody = `
          <h3>Activity Submission Verified</h3>
          <p>Hello ${details.student_name},</p>
          <p>Congratulations! Your proof submission for the activity <strong>${details.activity_name}</strong> has been verified and approved by an administrator.</p>
          <p>The points for this activity have been awarded to your profile.</p>
        `;
                sendEmailAsync(`Verified: ${details.activity_name}`, details.email, emailBody).catch(console.error);

                // Insert In-App Notification
                await db.query(
                    `INSERT INTO notifications (student_id, message) VALUES ($1, $2)`,
                    [details.student_id, `Your proof for ${details.activity_name} was verified! You earned ${details.points} points.`]
                );
            }
        } catch (emailErr) {
            console.error("Failed to queue student verification email", emailErr);
        }

        return NextResponse.json({
            submission_id: parseInt(submission_id),
            status: "approved",
            message: "Submission verified successfully"
        });
    } catch (err: any) {
        return NextResponse.json({ detail: err?.message || "Error" }, { status: 400 });
    }
}
