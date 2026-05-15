import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { createAccessToken, decodeAccessToken } from '@/lib/auth';
import { calculateSemester } from '@/lib/student';

function extractDepartment(email: string): string | null {
    if (!email) return null;
    const localPart = email.split('@')[0];
    const parts = localPart.split('.');
    if (parts.length > 1) {
        const lastPart = parts[parts.length - 1];
        const match = lastPart.match(/^([a-z]+)\d*$/i);
        if (match) {
            const code = match[1].toLowerCase();
            const deptMap: Record<string, string> = {
                'cs': 'Computer Science',
                'is': 'Information Science',
                'ai': 'AIML',
                'ec': 'Electronics and Communications',
                'me': 'Mechanical',
                'ra': 'Robotics'
            };
            return deptMap[code] || code.toUpperCase();
        }
    }
    return null;
}

export async function POST(request: Request) {
    try {
        const { token, usn } = await request.json();
        if (!token) return NextResponse.json({ detail: "Token is required" }, { status: 400 });

        const payload = decodeAccessToken(token);
        if (!payload || payload.type !== 'register') {
            return NextResponse.json({ detail: "Invalid or expired token" }, { status: 400 });
        }

        const upperUsn = usn?.toUpperCase();
        const { rows } = await db.query('SELECT id FROM students WHERE usn = $1', [upperUsn]);
        if (rows.length > 0) {
            return NextResponse.json({ detail: "USN already registered" }, { status: 400 });
        }
        const department = extractDepartment(payload.email);
        const semester = calculateSemester(payload.email, upperUsn);

        const insertRes = await db.query(
            'INSERT INTO students (name, email, google_sub, usn, department, semester) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [payload.name, payload.email, payload.sub, upperUsn, department, semester]
        );

        const studentId = insertRes.rows[0].id;
        const accessToken = createAccessToken({ user_id: studentId, role: 'student' });

        return NextResponse.json({ access_token: accessToken, token_type: 'bearer' });
    } catch (err: any) {
        return NextResponse.json({ detail: err?.message || "Database error" }, { status: 500 });
    }
}
