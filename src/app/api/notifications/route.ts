import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthErrorStatus, requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const student = requireAuth(request, 'student');

        const { rows } = await db.query(
            `SELECT id, message, is_read, created_at 
             FROM notifications 
             WHERE student_id = $1 
             ORDER BY created_at DESC 
             LIMIT 50;`,
            [student.user_id]
        );

        return NextResponse.json(rows);
    } catch (err: any) {
        const authStatus = getAuthErrorStatus(err);
        return NextResponse.json({ detail: err?.message || "Error" }, { status: authStatus ?? 400 });
    }
}

export async function PUT(request: Request) {
    try {
        const student = requireAuth(request, 'student');

        // Mark all as read
        const { rows } = await db.query(
            `UPDATE notifications 
             SET is_read = TRUE 
             WHERE student_id = $1 AND is_read = FALSE
             RETURNING id;`,
            [student.user_id]
        );

        return NextResponse.json({ message: "Notifications marked as read", updated: rows.length });
    } catch (err: any) {
        const authStatus = getAuthErrorStatus(err);
        return NextResponse.json({ detail: err?.message || "Error" }, { status: authStatus ?? 400 });
    }
}
