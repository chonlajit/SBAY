"use client";

import React, { Suspense } from 'react';
import AuthContainer from '../components/AuthContainer';

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <AuthContainer initialMode="register" />
        </Suspense>
    );
}
