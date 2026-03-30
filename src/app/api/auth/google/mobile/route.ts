import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { createAccessToken } from '@/lib/auth';

// Mobile-specific Google auth endpoint.
// Receives an ID token from the Android Google Sign-In SDK,
// verifies it directly with Google's tokeninfo API (no redirect_uri needed),
// then returns a JWT or register token as JSON.
export async function POST(request: Request) {
    let body: { id_token?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ detail: 'Invalid request body' }, { status: 400 });
    }

    const idToken = body.id_token;
    if (!idToken) {
        return NextResponse.json({ detail: 'id_token is required' }, { status: 400 });
    }

    // Verify the ID token with Google's tokeninfo endpoint
    const tokenInfoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    const tokenInfo = await tokenInfoRes.json();

    if (!tokenInfoRes.ok || tokenInfo.error) {
        console.error('Invalid ID token:', tokenInfo);
        return NextResponse.json({ detail: 'Invalid Google ID token' }, { status: 401 });
    }

    // Validate the token was issued for our app
    const expectedClientId = process.env.GOOGLE_CLIENT_ID;
    if (tokenInfo.aud !== expectedClientId) {
        console.error(`Token audience mismatch. Expected: ${expectedClientId}, got: ${tokenInfo.aud}`);
        return NextResponse.json({ detail: 'Token audience mismatch' }, { status: 401 });
    }

    const googleSub = tokenInfo.sub;
    const email = tokenInfo.email;
    const name = tokenInfo.name;
    const photoUrl = tokenInfo.picture;

    if (!email || !email.endsWith('@sahyadri.edu.in')) {
        return NextResponse.json(
            { detail: 'Only Sahyadri college emails (@sahyadri.edu.in) are allowed.' },
            { status: 403 }
        );
    }

    try {
        const { rows } = await db.query('SELECT id FROM students WHERE google_sub = $1', [googleSub]);
        if (rows.length > 0) {
            // Existing student — issue a JWT
            const studentId = rows[0].id;
            const token = createAccessToken({ user_id: studentId, role: 'student' });
            return NextResponse.json({ access_token: token, role: 'student' });
        } else {
            // New user — issue a register token so the app can navigate to registration
            const registerToken = createAccessToken({
                sub: googleSub, email, name, photo_url: photoUrl, type: 'register'
            });
            return NextResponse.json({ register_token: registerToken, name, photo_url: photoUrl });
        }
    } catch (error) {
        console.error('Database error in mobile Google auth:', error);
        return NextResponse.json({ detail: 'Database error' }, { status: 500 });
    }
}
