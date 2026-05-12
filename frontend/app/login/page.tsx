"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';

function LoginContent() {
    const [phoneInput, setPhoneInput] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useSmartBin();

    const machineId = searchParams.get('mech_id');

    useEffect(() => {
        // If no machine ID, it means user is logging in freely (e.g. to check dashboard)
        // We allow this now.
    }, [machineId, router]);

    const handleNumClick = (num: string) => {
        if (phoneInput.length < 10) {
            setPhoneInput(prev => prev + num);
        }
    };

    const handleBackspace = () => {
        setPhoneInput(prev => prev.slice(0, -1));
    };

    const handleConfirm = async () => {
        if (phoneInput.length !== 10) {
            setError('เบอร์โทรศัพท์ต้องมี 10 หลัก');
            return;
        }

        setIsLoading(true);
        setError('');

        const result = await login(phoneInput, machineId || 'default');

        // Handle boolean vs object (backward compatibility if needed, but we changed types)
        const success = typeof result === 'object' ? result.success : result;
        const msg = typeof result === 'object' ? result.message : '';

        if (success) {
            if (machineId) {
                // Redirect to Dynamic Route for this machine
                router.push(`/operation/${machineId}`);
            } else {
                // No Machine ID -> Go to Dashboard (Check Balance)
                router.push('/dashboard');
            }
        } else {
            setError(msg || 'ไม่พบเบอร์โทรนี้ในระบบ หรือ เกิดข้อผิดพลาด');
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-green-500 font-sans p-4">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-md">
                <div className="bg-green-600 p-6 text-center">
                    <h2 className="text-2xl font-bold text-white">เข้าสู่ระบบ</h2>
                    <p className="text-green-100 text-sm">กรุณากรอกเบอร์โทรศัพท์</p>
                    {machineId ? (
                        <div className="mt-2 text-xs bg-white/20 inline-block px-2 py-1 rounded text-white">
                            Machine: {machineId}
                        </div>
                    ) : (
                        <div className="mt-2 text-xs bg-white/20 inline-block px-2 py-1 rounded text-white">
                            เช็คยอดคะแนนสะสม / แลกคะแนนสะสม
                        </div>
                    )}
                </div>

                <div className="p-8 flex flex-col items-center">
                    <div className="w-full bg-gray-100 rounded-xl p-4 mb-6 text-center relative">
                        <input
                            type="text"
                            className="bg-transparent text-2xl font-bold text-gray-800 text-center w-full outline-none tracking-widest"
                            value={phoneInput}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                if (val.length <= 10) setPhoneInput(val);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirm();
                            }}
                            placeholder="0XX-XXX-XXXX"
                            autoFocus
                        />
                        {error && <div className="absolute -bottom-6 left-0 right-0 text-red-500 text-xs">{error}</div>}
                    </div>

                    <div className="grid grid-cols-3 gap-4 w-full mb-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <button
                                key={num}
                                onClick={() => handleNumClick(num.toString())}
                                className="bg-gray-50 hover:bg-green-50 text-green-600 font-bold text-2xl py-2 rounded-xl shadow-sm transition active:scale-95 border border-gray-100"
                            >
                                {num}
                            </button>
                        ))}
                        <button onClick={() => setPhoneInput('')} className="bg-red-50 hover:bg-red-100 text-red-500 font-bold text-xl py-2 rounded-xl shadow-sm transition active:scale-95">
                            C
                        </button>
                        <button onClick={() => handleNumClick('0')} className="bg-gray-50 hover:bg-green-50 text-green-600 font-bold text-2xl py-2 rounded-xl shadow-sm transition active:scale-95 border border-gray-100">
                            0
                        </button>
                        <button onClick={handleBackspace} className="bg-orange-50 hover:bg-orange-100 text-orange-500 font-bold text-xl py-2 rounded-xl shadow-sm transition active:scale-95">
                            ⌫
                        </button>
                    </div>

                    <div className="flex space-x-4 w-full">
                        <button
                            onClick={() => router.push('/')}
                            className="flex-1 bg-gray-200 text-gray-600 font-bold py-3 rounded-full hover:bg-gray-300 transition"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isLoading}
                            className="flex-1 bg-green-500 text-white font-bold py-3 rounded-full hover:bg-green-600 transition shadow-lg disabled:opacity-50"
                        >
                            {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'ยืนยัน'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <React.Suspense fallback={<div className="flex flex-col items-center justify-center min-h-screen bg-green-500 font-sans p-4 text-white">กำลังโหลด...</div>}>
            <LoginContent />
        </React.Suspense>
    );
}
