"use client";

import React from 'react';
import AuthContainer from '../components/AuthContainer';

function LoginContent() {
    return <AuthContainer initialMode="login" />;
}

export default function LoginPage() {
    return (
        <React.Suspense fallback={
            <div className="min-h-screen bg-[#64964E] flex items-center justify-center">
                <div className="text-white text-lg font-bold">กำลังโหลด...</div>
            </div>
        }>
            <LoginContent />
        </React.Suspense>
    );
}
