import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sendEmailAsync } from '@/lib/mail';

export async function PUT(request: Request, { params }: { params: Promise<{ request_id: string }> }) {
    try {
        const admin = requireAuth(request, 'admin');
        const { request_id } = await params;

        const { rows } = await db.query(
            `UPDATE activity_requests
       SET status = 'approved',
           approved_at = CURRENT_TIMESTAMP,
           approved_by = $1
       WHERE id = $2 AND status = 'pending'
       RETURNING id;`,
            [admin.user_id, request_id]
        );

        if (rows.length === 0) {
            return NextResponse.json({ detail: "Request not found or already processed" }, { status: 404 });
        }

        try {
            const studentData = await db.query(`
        SELECT s.id as student_id, s.email, s.name as student_name, a.name as activity_name 
        FROM activity_requests r
        JOIN students s ON r.student_id = s.id
        JOIN activities a ON r.activity_id = a.id
        WHERE r.id = $1
      `, [request_id]);

            const details = studentData.rows[0];
            if (details) {
                const emailBody = `
          <h3>Activity Request Approved</h3>
          <p>Hello ${details.student_name},</p>
          <p>Good news! Your request for the activity <strong>${details.activity_name}</strong> has been approved.</p>
          <p>You can now proceed to upload your proof of completion in the portal.</p>
        `;
                sendEmailAsync(`Approved: ${details.activity_name}`, details.email, emailBody).catch(console.error);

                // Insert In-App Notification
                await db.query(
                    `INSERT INTO notifications (student_id, message) VALUES ($1, $2)`,
                    [details.student_id, `Your request for ${details.activity_name} was approved!`]
                );
            }
        } catch (emailErr) {
            console.error("Failed to queue student email", emailErr);
        }

        return NextResponse.json({
            request_id: parseInt(request_id),
            status: "approved",
            message: "Activity request approved"
        });
    } catch (err: any) {
        return NextResponse.json({ detail: err?.message || "Error" }, { status: 400 });
    }
}
