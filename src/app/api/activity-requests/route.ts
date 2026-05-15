import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthErrorStatus, requireAuth } from '@/lib/auth';
import { sendEmailAsync } from '@/lib/mail';

export async function POST(request: Request) {
    try {
        const student = requireAuth(request, 'student');
        const { activity_id, description } = await request.json();

        const { rows } = await db.query(
            `INSERT INTO activity_requests(student_id, activity_id, description)
       VALUES ($1, $2, $3) RETURNING id;`,
            [student.user_id, activity_id, description]
        );

        const requestId = rows[0].id;

        // Send admin notification
        try {
            const dbAdmin = await db.query("SELECT email FROM admins");
            const adminEmails = dbAdmin.rows.map(r => r.email);

            const dbStudent = await db.query("SELECT name FROM students WHERE id = $1", [student.user_id]);
            const studentName = dbStudent.rows[0]?.name || "Student";

            const dbActivity = await db.query("SELECT name FROM activities WHERE id = $1", [activity_id]);
            const activityName = dbActivity.rows[0]?.name || "Activity";

            for (const email of adminEmails) {
                const body = `
          <h3>New Activity Request</h3>
          <p>A new activity request has been submitted.</p>
          <ul>
            <li><strong>Student:</strong> ${studentName}</li>
            <li><strong>Activity:</strong> ${activityName}</li>
            <li><strong>Description:</strong> ${description || 'No description provided'}</li>
          </ul>
        `;
                // Intentionally fire and forget to simulate BackgroundTasks
                sendEmailAsync("New Activity Request Received", email, body).catch(console.error);
            }
        } catch (emailErr) {
            console.error("Failed to queue admin notification", emailErr);
        }

        return NextResponse.json({
            request_id: requestId,
            status: "pending",
            message: "Activity request Submitted"
        });
    } catch (err: any) {
        const authStatus = getAuthErrorStatus(err);
        return NextResponse.json({ detail: err?.message || "Error" }, { status: authStatus ?? 400 });
    }
}

export async function GET(request: Request) {
    try {
        requireAuth(request, 'admin');
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        let queryStr = `
      SELECT r.id, s.name as student_name, a.name as activity_name, r.status, r.requested_at, r.description
      FROM activity_requests r
      JOIN students s ON r.student_id = s.id
      JOIN activities a ON r.activity_id = a.id
    `;
        const params: any[] = [];
        if (status) {
            params.push(status);
            queryStr += ` WHERE r.status = $${params.length}`;
        }
        queryStr += ` ORDER BY r.requested_at DESC;`;

        const { rows } = await db.query(queryStr, params);

        return NextResponse.json(rows.map(r => ({
            request_id: r.id,
            student_name: r.student_name,
            activity_name: r.activity_name,
            status: r.status,
            requested_at: r.requested_at,
            description: r.description
        })));
    } catch (err: any) {
        const authStatus = getAuthErrorStatus(err);
        return NextResponse.json({ detail: err?.message || "Error" }, { status: authStatus ?? 400 });
    }
}
