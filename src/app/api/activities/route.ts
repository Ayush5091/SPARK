import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthErrorStatus, requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const categoryName = searchParams.get('category_name');
        const subcategoryName = searchParams.get('subcategory_name');

        let queryStr = `
      SELECT id, name, category, points
      FROM activities
      WHERE 1=1
    `;
        const params: any[] = [];
        if (categoryName) {
            params.push(categoryName);
            queryStr += ` AND category = $${params.length}`;
        }
        if (subcategoryName) {
            // Note: DB doesn't have subcategory right now based on schema
        }

        const { rows } = await db.query(queryStr, params);
        return NextResponse.json(rows);
    } catch (err: any) {
        return NextResponse.json({ detail: err?.message || "Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        requireAuth(request, 'admin');
        const body = await request.json();

        const { rows } = await db.query(
            `INSERT INTO activities (name, category, points)
       VALUES ($1, $2, $3) RETURNING id`,
            [body.name, body.category, body.points]
        );
        return NextResponse.json({ activity_id: rows[0].id });
    } catch (err: any) {
        const authStatus = getAuthErrorStatus(err);
        return NextResponse.json({ detail: err?.message || "Error" }, { status: authStatus ?? 400 });
    }
}
