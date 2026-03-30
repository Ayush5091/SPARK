import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { createAccessToken } from '@/lib/auth';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const isMobile = url.searchParams.get('source') === 'mobile';

    if (!code) {
        console.error("OAuth callback received no code from Google.");
        return NextResponse.json({ detail: "OAuth failed: no code provided" }, { status: 400 });
    }

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;

    // Mobile uses 'postmessage'; web uses the actual callback URL
    const redirectUri = isMobile
        ? 'postmessage'
        : `${baseUrl}/api/auth/google/callback`;

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
        console.error(`Failed to exchange ${isMobile ? 'server auth code (mobile)' : 'auth code (web)'} for token. Response:`, tokenData);
        return NextResponse.json(
            { detail: `OAuth token exchange failed: ${tokenData.error_description ?? tokenData.error ?? 'unknown'}` },
            { status: 400 }
        );
    }

    // Get user info using the access token
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userInfo = await userRes.json();

    const googleSub = userInfo.id;
    const email = userInfo.email;
    const name = userInfo.name;
    const photoUrl = userInfo.picture;

    if (!email || !email.endsWith("@sahyadri.edu.in")) {
        if (isMobile) {
            return NextResponse.json({ detail: "Only Sahyadri college emails (@sahyadri.edu.in) are allowed." }, { status: 403 });
        }
        return NextResponse.redirect(`${baseUrl}/login?error=email_not_allowed`);
    }

    try {
        const { rows } = await db.query('SELECT id FROM students WHERE google_sub = $1', [googleSub]);
        if (rows.length > 0) {
            const studentId = rows[0].id;
            const token = createAccessToken({ user_id: studentId, role: 'student' });

            if (isMobile) {
                // Mobile: return JSON directly
                return NextResponse.json({ access_token: token, role: 'student' });
            } else {
                // Web: redirect to frontend callback page with token
                return NextResponse.redirect(`${baseUrl}/auth/callback?token=${token}`);
            }
        } else {
            const registerToken = createAccessToken({ sub: googleSub, email, name, photo_url: photoUrl, type: 'register' });

            if (isMobile) {
                // Mobile: return JSON so Flutter can navigate to register screen
                return NextResponse.json({ register_token: registerToken, name, photo_url: photoUrl });
            } else {
                // Web: redirect to registration page
                return NextResponse.redirect(`${baseUrl}/register?token=${registerToken}`);
            }
        }
    } catch (error) {
        console.error("Database query failed during Google OAuth callback:", error);
        return NextResponse.json({ detail: "Database query failed" }, { status: 500 });
    }
}
