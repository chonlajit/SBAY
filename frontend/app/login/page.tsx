"use client";

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';
import { useGoogleLogin } from '@react-oauth/google';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

type LoginMethod = 'email' | 'phone';

function LoginContent() {
    const [method, setMethod] = useState<LoginMethod>('email');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [notRegistered, setNotRegistered] = useState<{ show: boolean; email: string }>({ show: false, email: '' });

    const router = useRouter();
    const searchParams = useSearchParams();
    const { loginWithPassword, loginWithGoogle } = useSmartBin();

    const machineId = searchParams.get('mech_id') || 'default-machine';

    // ── Google Login ──
    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setIsLoading(true);
            setError('');
            setNotRegistered({ show: false, email: '' });

            try {
                // We use access_token to fetch email to display if not registered
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const userInfo = await userInfoRes.json();
                const email = userInfo.email;

                const result = await loginWithGoogle(tokenResponse.access_token, machineId);
                setIsLoading(false);

                if (result.success) {
                    const mech = searchParams.get('mech_id');
                    if (mech) router.push(`/operation/${mech}`);
                    else router.push('/dashboard');
                } else {
                    if (result.email) {
                        setNotRegistered({ show: true, email: result.email });
                    } else {
                        setError(result.message || 'เกิดข้อผิดพลาด');
                    }
                }
            } catch (e: any) {
                setIsLoading(false);
                setError('เกิดข้อผิดพลาดในการเชื่อมต่อ Google');
            }
        },
        onError: () => setError('ยกเลิกการเข้าสู่ระบบด้วย Google'),
        flow: 'implicit',
    });

    // ── Password Login ──
    const handleLogin = async () => {
        if (!identifier.trim() || !password.trim()) {
            setError('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        setIsLoading(true);
        setError('');
        setNotRegistered({ show: false, email: '' });

        const result = await loginWithPassword(identifier.trim().toLowerCase(), password, machineId);

        setIsLoading(false);

        if (result.success) {
            const mech = searchParams.get('mech_id');
            if (mech) router.push(`/operation/${mech}`);
            else router.push('/dashboard');
        } else {
            setError(result.message || 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง');
            if (result.message?.includes('ไม่พบ')) {
                setNotRegistered({ show: true, email: method === 'email' ? identifier : '' });
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-600 via-emerald-500 to-teal-400 flex flex-col items-center justify-center p-4">
            {/* Logo */}
            <div className="mb-8 text-center">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-2xl">
                    <span className="text-4xl">♻️</span>
                </div>
                <h1 className="text-3xl font-black text-white tracking-wider drop-shadow">SBAY</h1>
                <p className="text-white/80 text-sm mt-1">Smart Recycling Platform</p>
            </div>

            {/* Card */}
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-6">
                    <h2 className="text-xl font-bold text-white">เข้าสู่ระบบ</h2>
                    <p className="text-green-100 text-sm mt-0.5">กรอกข้อมูลเพื่อเข้าใช้งาน</p>
                </div>

                <div className="px-6 py-7 space-y-5">
                    {/* Google Login */}
                    <button
                        onClick={() => handleGoogleLogin()}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center space-x-3 bg-white border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 text-gray-700 font-bold py-3.5 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed group"
                    >
                        {isLoading ? (
                            <span className="flex items-center space-x-2">
                                <svg className="animate-spin w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                <span>กำลังดำเนินการ...</span>
                            </span>
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span className="text-base group-hover:text-green-700 transition-colors">เข้าสู่ระบบด้วย Google</span>
                            </>
                        )}
                    </button>

                    <div className="flex items-center space-x-3">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-gray-400 text-xs font-semibold">หรือใช้บัญชีปกติ</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* Method Selector */}
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                        <button
                            onClick={() => { setMethod('email'); setError(''); }}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${method === 'email' ? 'bg-white text-green-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            อีเมล / Username
                        </button>
                        <button
                            onClick={() => { setMethod('phone'); setError(''); }}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${method === 'phone' ? 'bg-white text-green-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            เบอร์โทร
                        </button>
                    </div>

                    {/* Identifer Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                            {method === 'email' ? '📧 อีเมล หรือ Username' : '📱 เบอร์โทรศัพท์ของคุณ'}
                        </label>
                        <input
                            type={method === 'email' ? 'text' : 'tel'}
                            value={identifier}
                            onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
                            placeholder={method === 'email' ? 'example@email.com หรือ user123' : '08X-XXX-XXXX'}
                            className="w-full border-2 border-gray-200 focus:border-green-500 rounded-xl px-4 py-3 text-gray-800 outline-none transition bg-gray-50 focus:bg-white"
                        />
                    </div>

                    {/* Password Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                            🔑 รหัสผ่าน
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                placeholder="รหัสผ่านของคุณ"
                                className="w-full border-2 border-gray-200 focus:border-green-500 rounded-xl px-4 py-3 pr-10 text-gray-800 outline-none transition bg-gray-50 focus:bg-white"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-green-500 transition"
                            >
                                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleLogin}
                        disabled={isLoading || !identifier.trim() || !password.trim()}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3.5 rounded-xl hover:from-green-600 hover:to-emerald-700 transition shadow-lg disabled:opacity-50 active:scale-95 text-base"
                    >
                        {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ →'}
                    </button>

                    {notRegistered.show && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 space-y-3">
                            <div className="flex items-start space-x-2">
                                <span className="text-amber-500 mt-0.5">⚠️</span>
                                <div>
                                    <p className="text-amber-700 text-sm font-semibold">ยังไม่มีบัญชีในระบบ</p>
                                    {notRegistered.email && (
                                        <p className="text-amber-600 text-xs mt-0.5">
                                            ข้อมูลนี้ยังไม่ได้ลงทะเบียน
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => router.push('/register')}
                                className="w-full bg-amber-500 text-white font-bold py-2.5 rounded-lg hover:bg-amber-600 transition active:scale-95 text-sm"
                            >
                                📝 ลงทะเบียนสมาชิกเลย
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm flex items-center space-x-2">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="text-center pt-2">
                        <span className="text-gray-500 text-sm">ยังไม่มีบัญชี? </span>
                        <button
                            onClick={() => router.push('/register')}
                            className="text-green-600 font-bold text-sm hover:underline"
                        >
                            สมัครสมาชิก
                        </button>
                    </div>
                </div>
            </div>

            <p className="text-white/60 text-xs mt-6">SBAY Smart Bin Platform © 2025</p>
        </div>
    );
}

export default function LoginPage() {
    return (
        <React.Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center">
                <div className="text-white text-lg font-bold">กำลังโหลด...</div>
            </div>
        }>
            <LoginContent />
        </React.Suspense>
    );
}
