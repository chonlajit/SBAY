"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

type Step = 'identifier' | 'reset';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const { sendForgotPasswordOtp, resetPassword } = useSmartBin();

    const [step, setStep] = useState<Step>('identifier');
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [cooldown, setCooldown] = useState(0);

    React.useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const getPasswordStrength = (pwd: string) => {
        if (!pwd) return { label: '', color: 'text-gray-400', barColor: 'bg-gray-200', percent: 0 };
        if (pwd.length < 8) return { label: 'สั้นเกินไป (ต้อง 8-20 ตัว)', color: 'text-red-500', barColor: 'bg-red-500', percent: 20 };
        if (pwd.length > 20) return { label: 'ยาวเกินไป (ต้องไม่เกิน 20 ตัว)', color: 'text-red-500', barColor: 'bg-red-500', percent: 100 };
        
        let score = 0;
        if (/[a-z]/.test(pwd)) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^a-zA-Z0-9]/.test(pwd)) score++;

        if (score <= 1) {
            return { label: 'ง่าย (เสี่ยง)', color: 'text-red-500', barColor: 'bg-red-500', percent: 33 };
        } else if (score === 2) {
            return { label: 'ปานกลาง', color: 'text-orange-500', barColor: 'bg-orange-500', percent: 66 };
        } else {
            return { label: 'ปลอดภัย (ยาก)', color: 'text-green-500', barColor: 'bg-green-500', percent: 100 };
        }
    };

    const strength = getPasswordStrength(newPassword);
    const passwordsMatch = newPassword && confirmPassword ? newPassword === confirmPassword : null;

    const handleSendOtp = async () => {
        if (!identifier.trim()) {
            setError('กรุณากรอกอีเมล หรือ เบอร์โทรศัพท์');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccessMsg('');

        const result = await sendForgotPasswordOtp(identifier.trim().toLowerCase());
        setIsLoading(false);

        if (result.success) {
            setSuccessMsg(result.message || 'ส่ง OTP สำเร็จ');
            setStep('reset');
            setCooldown(60);
        } else {
            setError(result.message || 'เกิดข้อผิดพลาดในการส่ง OTP');
        }
    };

    const handleResetPassword = async () => {
        if (!otp.trim() || !newPassword || !confirmPassword) {
            setError('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
            return;
        }

        setIsLoading(true);
        setError('');

        const result = await resetPassword(identifier.trim().toLowerCase(), otp.trim(), newPassword);
        setIsLoading(false);

        if (result.success) {
            setSuccessMsg('เปลี่ยนรหัสผ่านสำเร็จ! กำลังพากลับหน้าเข้าสู่ระบบ...');
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        } else {
            setError(result.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-600 via-emerald-500 to-teal-400 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-5">
                    <h2 className="text-xl font-bold text-white">ลืมรหัสผ่าน</h2>
                    <p className="text-green-100 text-sm mt-0.5">
                        {step === 'identifier' && 'ระบุบัญชีที่ต้องการตั้งรหัสผ่านใหม่'}
                        {step === 'reset' && 'ตั้งรหัสผ่านใหม่'}
                    </p>
                </div>

                <div className="px-6 py-6">
                    {step === 'identifier' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center">
                                    <i className="fa-solid fa-user mr-1.5 text-green-600"></i>อีเมล หรือ เบอร์โทรศัพท์
                                </label>
                                <input
                                    type="text"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    placeholder="เช่น sbay@gmail.com หรือ 0812345678"
                                    className="w-full border-2 border-gray-200 focus:border-green-500 rounded-xl px-3 py-2.5 text-gray-800 outline-none transition bg-gray-50 focus:bg-white"
                                />
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm flex items-center space-x-2">
                                    <span>⚠️</span><span>{error}</span>
                                </div>
                            )}

                            <div className="flex space-x-3 pt-2">
                                <button
                                    onClick={() => router.push('/login')}
                                    disabled={isLoading}
                                    className="w-1/3 bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-300 transition-colors disabled:opacity-50"
                                >
                                    ย้อนกลับ
                                </button>
                                <button
                                    onClick={handleSendOtp}
                                    disabled={isLoading || cooldown > 0}
                                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3.5 rounded-xl hover:from-green-600 hover:to-emerald-700 transition shadow-lg disabled:opacity-50 active:scale-95"
                                >
                                    {isLoading ? 'กำลังดำเนินการ...' : cooldown > 0 ? `รอ ${cooldown} วิ` : 'รับรหัส OTP'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'reset' && (
                        <div className="space-y-4">
                            {successMsg && (
                                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm flex items-center space-x-2">
                                    <span>✅</span><span>{successMsg}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center">
                                    <i className="fa-solid fa-key mr-1.5 text-green-600"></i>รหัส OTP 6 หลัก
                                </label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                    placeholder="กรอกรหัสที่ได้รับ"
                                    className="w-full border-2 border-gray-200 focus:border-green-500 rounded-xl px-3 py-2.5 text-center tracking-widest font-bold text-gray-800 outline-none transition bg-gray-50 focus:bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center">
                                    <i className="fa-solid fa-lock mr-1.5 text-green-600"></i>รหัสผ่านใหม่ <span className="text-red-500 ml-0.5">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="ตั้งรหัสผ่านใหม่ 8-20 ตัวอักษร"
                                        className="w-full border-2 border-gray-200 focus:border-green-500 rounded-xl px-3 py-2.5 pr-10 text-gray-800 outline-none transition bg-gray-50 focus:bg-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-green-500 transition"
                                    >
                                        <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                                    </button>
                                </div>
                                {/* Password Strength Indicator */}
                                {newPassword && (
                                    <div className="mt-1.5 space-y-1">
                                        <div className="flex justify-between items-center text-xs font-semibold">
                                            <span className="text-gray-500">ระดับความปลอดภัย:</span>
                                            <span className={strength.color}>{strength.label}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                            <div className={`${strength.barColor} h-1.5 rounded-full transition-all duration-300`} style={{ width: `${strength.percent}%` }}></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center">
                                    <i className="fa-solid fa-shield-halved mr-1.5 text-green-600"></i>ยืนยันรหัสผ่านใหม่ <span className="text-red-500 ml-0.5">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                                        className="w-full border-2 border-gray-200 focus:border-green-500 rounded-xl px-3 py-2.5 pr-10 text-gray-800 outline-none transition bg-gray-50 focus:bg-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-green-500 transition"
                                    >
                                        <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                                    </button>
                                </div>
                                {/* Real-time Match Indicator */}
                                {confirmPassword && (
                                    <div className="mt-1.5 text-xs font-bold">
                                        {passwordsMatch ? (
                                            <span className="text-green-600 flex items-center gap-1">
                                                <i className="fa-solid fa-circle-check"></i> รหัสผ่านตรงกัน
                                            </span>
                                        ) : (
                                            <span className="text-red-500 flex items-center gap-1">
                                                <i className="fa-solid fa-circle-xmark"></i> รหัสผ่านไม่ตรงกัน
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm flex items-center space-x-2">
                                    <span>⚠️</span><span>{error}</span>
                                </div>
                            )}

                            <div className="flex space-x-3 pt-2">
                                <button
                                    onClick={() => setStep('identifier')}
                                    disabled={isLoading}
                                    className="w-1/3 bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-300 transition-colors disabled:opacity-50"
                                >
                                    ย้อนกลับ
                                </button>
                                <button
                                    onClick={handleResetPassword}
                                    disabled={isLoading || !passwordsMatch || otp.length !== 6}
                                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3.5 rounded-xl hover:from-green-600 hover:to-emerald-700 transition shadow-lg disabled:opacity-50 active:scale-95"
                                >
                                    {isLoading ? 'กำลังดำเนินการ...' : 'เปลี่ยนรหัสผ่าน'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
