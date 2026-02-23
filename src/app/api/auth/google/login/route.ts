import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    const redirectUri = `${baseUrl}/api/auth/google/callback`;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid email profile&access_type=offline`;
    return NextResponse.redirect(new URL(authUrl));
}
