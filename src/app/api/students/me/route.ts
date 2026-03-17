import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const user = requireAuth(request, 'student');

        const { rows } = await db.query(`
            SELECT 
                st.id, st.name, st.email, st.usn, st.phone_number, st.department,
                COALESCE(SUM(CASE WHEN su.status = 'verified' THEN a.points ELSE 0 END), 0) as total_points,
                COUNT(su.id) as completed_activities
            FROM students st
            LEFT JOIN activity_requests r ON st.id = r.student_id
            LEFT JOIN submissions su ON r.id = su.request_id AND su.status = 'verified'
            LEFT JOIN activities a ON r.activity_id = a.id
            WHERE st.id = $1
            GROUP BY st.id, st.name, st.email, st.usn, st.phone_number, st.department
        `, [user.user_id]);

        if (rows.length === 0) {
            return NextResponse.json({ detail: "Student not found" }, { status: 404 });
        }

        return NextResponse.json(rows[0]);
    } catch (err: any) {
        return NextResponse.json({ detail: err?.message || "Unauthorized" }, { status: 400 });
    }
}

export async function PUT(request: Request) {
    try {
        const user = requireAuth(request, 'student');
        const body = await request.json();
        const { phone_number, department } = body;

        await db.query(
            'UPDATE students SET phone_number = $1, department = $2 WHERE id = $3',
            [phone_number, department, user.user_id]
        );

        return NextResponse.json({ message: "Profile updated successfully" });
    } catch (err: any) {
        return NextResponse.json({ detail: err?.message || "Error updating profile" }, { status: 400 });
    }
}
