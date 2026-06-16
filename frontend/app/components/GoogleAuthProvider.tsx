"use client";

import { GoogleOAuthProvider } from '@react-oauth/google';

// Google Client ID — set in .env.local as NEXT_PUBLIC_GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'dummy_client_id_please_configure_in_env_file';

export default function GoogleAuthProvider({ children }: { children: React.ReactNode }) {
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            {children}
        </GoogleOAuthProvider>
    );
}
