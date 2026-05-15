import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthErrorStatus, requireAuth } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const student = requireAuth(request, 'student');
        const { request_id, proof, description, hours_spent, activity_date } = await request.json();

        const checkReq = await db.query(
            `SELECT id FROM activity_requests WHERE id = $1 AND student_id = $2 AND status = 'approved'`,
            [request_id, student.user_id]
        );

        if (checkReq.rows.length === 0) {
            return NextResponse.json({ detail: "Activity request is not approved or does not exist" }, { status: 400 });
        }

        const checkSub = await db.query("SELECT id FROM submissions WHERE request_id = $1", [request_id]);
        if (checkSub.rows.length > 0) {
            return NextResponse.json({ detail: "Submission already exists for this request" }, { status: 400 });
        }

        const { rows } = await db.query(
            `INSERT INTO submissions (request_id, proof, description, hours_spent, activity_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING id;`,
            [request_id, proof, description, hours_spent, activity_date]
        );

        return NextResponse.json({
            submission_id: rows[0].id,
            status: "pending",
            message: "Submission created successfully"
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
      SELECT sub.id, sub.request_id, s.name as student_name, a.name as activity_name, sub.status, sub.submitted_at, sub.description, sub.proof, sub.hours_spent, sub.activity_date
      FROM submissions sub
      JOIN activity_requests r ON sub.request_id = r.id
      JOIN students s ON r.student_id = s.id
      JOIN activities a ON r.activity_id = a.id
    `;
        const params: any[] = [];
        if (status) {
            params.push(status);
            queryStr += ` WHERE sub.status = $${params.length}`;
        }
        queryStr += ` ORDER BY sub.submitted_at DESC;`;

        const { rows } = await db.query(queryStr, params);

        return NextResponse.json(rows.map(r => ({
            submission_id: r.id,
            request_id: r.request_id,
            student_name: r.student_name,
            activity_name: r.activity_name,
            status: r.status,
            submitted_at: r.submitted_at,
            description: r.description,
            proof: r.proof,
            hours_spent: r.hours_spent,
            activity_date: r.activity_date
        })));
    } catch (err: any) {
        const authStatus = getAuthErrorStatus(err);
        return NextResponse.json({ detail: err?.message || "Error" }, { status: authStatus ?? 400 });
    }
}
