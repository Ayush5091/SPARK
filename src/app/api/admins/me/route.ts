import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthErrorStatus, requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const user = requireAuth(request, 'admin');

        const { rows } = await db.query(`
            SELECT id, name, email 
            FROM admins 
            WHERE id = $1
        `, [user.user_id]);

        if (rows.length === 0) {
            return NextResponse.json({ detail: "Admin not found" }, { status: 404 });
        }

        return NextResponse.json(rows[0]);
    } catch (err: any) {
        const authStatus = getAuthErrorStatus(err);
        return NextResponse.json({ detail: err?.message || "Unauthorized" }, { status: authStatus ?? 400 });
    }
}

export async function PUT(request: Request) {
    try {
        const user = requireAuth(request, 'admin');
        const body = await request.json();
        const { name } = body;

        await db.query(
            'UPDATE admins SET name = $1 WHERE id = $2',
            [name, user.user_id]
        );

        return NextResponse.json({ message: "Admin profile updated successfully" });
    } catch (err: any) {
        const authStatus = getAuthErrorStatus(err);
        return NextResponse.json({ detail: err?.message || "Error updating admin profile" }, { status: authStatus ?? 400 });
    }
}
