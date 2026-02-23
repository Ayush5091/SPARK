import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { createAccessToken } from '@/lib/auth';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (!code) {
        console.error("OAuth callback received no code from Google.");
        return NextResponse.json({ detail: "OAuth failed" }, { status: 400 });
    }

    // exchange code for token
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;
    const redirectUri = `${baseUrl}/api/auth/google/callback`;
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID || '',
            client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
        console.error("Failed to exchange code for token. Response:", tokenData);
        return NextResponse.json({ detail: "OAuth token failed" }, { status: 400 });
    }

    // get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userInfo = await userRes.json();

    const googleSub = userInfo.id;
    const email = userInfo.email;
    const name = userInfo.name;

    if (!email.endsWith("@sahyadri.edu.in")) {
        return NextResponse.json({ detail: "Only college emails allowed" }, { status: 403 });
    }

    // Use the connection pool exported by db.ts safely
    try {
        const { rows } = await db.query('SELECT id FROM students WHERE google_sub = $1', [googleSub]);
        if (rows.length > 0) {
            const studentId = rows[0].id;
            const token = createAccessToken({ user_id: studentId, role: 'student' });
            return NextResponse.redirect(`${baseUrl}/auth/callback?token=${token}`);
        } else {
            const registerToken = createAccessToken({ sub: googleSub, email, name, type: 'register' });
            return NextResponse.redirect(`${baseUrl}/register?token=${registerToken}`);
        }
    } catch (error) {
        console.error("Database query failed during Google OAuth callback:", error);
        return NextResponse.json({ detail: "Database query failed" }, { status: 500 });
    }
}
