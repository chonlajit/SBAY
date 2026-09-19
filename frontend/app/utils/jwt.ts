/**
 * JWT Utility Functions for parsing payload and checking token expiration.
 */

export interface JwtPayload {
    sub?: string;
    role?: string;
    name?: string;
    exp?: number;
    iat?: number;
    [key: string]: any;
}

/**
 * Safely decodes a JWT token without external libraries, supporting UTF-8.
 */
export function parseJwt(token: string): JwtPayload | null {
    if (!token || typeof token !== 'string') return null;

    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        
        // Handle utf-8 encoding properly for names or custom claims
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Error parsing JWT token:', e);
        return null;
    }
}

/**
 * Checks if a JWT token is expired.
 * If token is invalid or exp is reached (with a small buffer), returns true.
 */
export function isTokenExpired(token: string | null | undefined, bufferSeconds = 15): boolean {
    if (!token) return true;

    const payload = parseJwt(token);
    if (!payload || typeof payload.exp !== 'number') {
        // If token cannot be parsed or lacks exp, consider it expired/invalid
        return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return currentTime >= payload.exp - bufferSeconds;
}

/**
 * Returns the remaining time until token expiration in milliseconds.
 * Returns 0 if already expired or invalid.
 */
export function getTokenRemainingTime(token: string | null | undefined): number {
    if (!token) return 0;

    const payload = parseJwt(token);
    if (!payload || typeof payload.exp !== 'number') {
        return 0;
    }

    const remainingMs = payload.exp * 1000 - Date.now();
    return Math.max(0, remainingMs);
}
