import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthErrorStatus, requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const user = requireAuth(request, 'student');

        const { rows } = await db.query(`
      SELECT r.id, a.name, a.points, a.category, r.status, r.requested_at, r.description
      FROM activity_requests r
      JOIN activities a ON r.activity_id = a.id
      WHERE r.student_id = $1
      ORDER BY r.requested_at DESC;
    `, [user.user_id]);

        return NextResponse.json(rows.map(r => ({
            request_id: r.id,
            activity: r.name,
            points: r.points,
            category: r.category,
            status: r.status,
            requested_at: r.requested_at,
            description: r.description
        })));
    } catch (err: any) {
        const authStatus = getAuthErrorStatus(err);
        return NextResponse.json({ detail: err?.message || "Unauthorized" }, { status: authStatus ?? 400 });
    }
}
