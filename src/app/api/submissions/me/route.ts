import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthErrorStatus, requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const user = requireAuth(request, 'student');

        const { rows } = await db.query(`
      SELECT s.id, a.name, a.points, a.category, s.status, s.submitted_at, s.request_id, s.description, s.proof, s.hours_spent, s.activity_date
      FROM submissions s
      JOIN activity_requests r ON s.request_id = r.id
      JOIN activities a ON r.activity_id = a.id
      WHERE r.student_id = $1
      ORDER BY s.submitted_at DESC;
    `, [user.user_id]);

        return NextResponse.json(rows.map(r => ({
            submission_id: r.id,
            activity: r.name,
            points: r.points,
            category: r.category,
            status: r.status,
            submitted_at: r.submitted_at,
            request_id: r.request_id,
            description: r.description,
            proof: r.proof,
            hours_spent: r.hours_spent,
            activity_date: r.activity_date
        })));
    } catch (err: any) {
        const authStatus = getAuthErrorStatus(err);
        return NextResponse.json({ detail: err?.message || "Unauthorized" }, { status: authStatus ?? 400 });
    }
}
