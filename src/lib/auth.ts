import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
}

export function createAccessToken(data: object): string {
    const expireMinutes = Number(process.env.JWT_EXPIRE_MINUTES) || 60;
    return jwt.sign(data, JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: `${expireMinutes}m`,
    });
}

export function decodeAccessToken(token: string): any {
    try {
        return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    } catch (err) {
        return null; // Invalid token
    }
}

export function requireAuth(req: Request, roleContext?: 'student' | 'admin') {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Unauthorized');
    }
    const token = authHeader.split(' ')[1];
    const payload = decodeAccessToken(token);
    if (!payload || !payload.user_id) throw new Error('Unauthorized');

    if (roleContext && payload.role !== roleContext) {
        throw new Error('Forbidden');
    }
    return payload;
}
