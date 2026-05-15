import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthErrorStatus, requireAuth } from '@/lib/auth';
import { calculateSemester } from '@/lib/student';

export async function GET(request: Request) {
    try {
        const user = requireAuth(request, 'student');

        const { rows } = await db.query(`
            SELECT
                st.id, st.name, st.email, st.usn, st.phone_number, st.department, st.semester,
                COALESCE(st.total_points, 0) as total_points,
                COUNT(es.id) FILTER (WHERE es.status = 'verified') as completed_activities
            FROM students st
            LEFT JOIN event_submissions es ON st.id = es.student_id
            WHERE st.id = $1
            GROUP BY st.id, st.name, st.email, st.usn, st.phone_number, st.department, st.semester, st.total_points
        `, [user.user_id]);

        if (rows.length === 0) {
            return NextResponse.json({ detail: "Student not found" }, { status: 404 });
        }

        const student = rows[0];
        // Auto-update semester calculation
        const currentSemester = calculateSemester(student.email, student.usn);
        if (currentSemester && currentSemester !== student.semester) {
            student.semester = currentSemester;
            // Optionally update the DB in background
            db.query('UPDATE students SET semester = $1 WHERE id = $2', [currentSemester, student.id]).catch(console.error);
        }

        return NextResponse.json(student);
    } catch (err: any) {
        const authStatus = getAuthErrorStatus(err);
        return NextResponse.json({ detail: err?.message || "Unauthorized" }, { status: authStatus ?? 400 });
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
        const authStatus = getAuthErrorStatus(err);
        return NextResponse.json({ detail: err?.message || "Error updating profile" }, { status: authStatus ?? 400 });
    }
}
