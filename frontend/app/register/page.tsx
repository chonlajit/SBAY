"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';
import { useGoogleLogin } from '@react-oauth/google';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

type Step = 'choose' | 'form' | 'otp';
type RegisterMethod = 'google' | 'manual';

export default function RegisterPage() {
    const router = useRouter();
    const { sendRegisterOtp, register, registerWithGoogle } = useSmartBin();

    const [step, setStep] = useState<Step>('choose');
    const [method, setMethod] = useState<RegisterMethod>('manual');
    const [googleToken, setGoogleToken] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [otp, setOtp] = useState('');
    const [otpMsg, setOtpMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [form, setForm] = useState({
        title: 'นาย',
        firstName: '',
        lastName: '',
        studentId: '',
        phoneNumber: '',
        email: '',
        password: '',
        confirmPassword: '',
        faculty: 'วิศวกรรมศาสตร์',
        major: ''
    });

    const [cooldown, setCooldown] = useState(0);

    React.useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const faculties = {
        'วิศวกรรมศาสตร์': [
            'สาขาวิชาวิศวกรรมโยธา', 'สาขาวิชาวิศวกรรมไฟฟ้า', 'สาขาวิชาวิศวกรรมเครื่องกล', 
            'สาขาวิชาวิศวกรรมอุตสาหการ', 'สาขาวิชาวิศวกรรมคอมพิวเตอร์', 'สาขาวิชาวิศวกรรมเมคคาทรอนิกส์', 
            'สาขาวิชาวิศวกรรมอิเล็กทรอนิกส์และโทรคมนาคม', 'สาขาวิชาวิศวกรรมเครื่องจักรกลเกษตร', 
            'สาขาวิชาวิศวกรรมอาหารและชีวภาพ', 'สาขาวิชาวิศวกรรมโลหการ'
        ],
        'ครุศาสตร์อุตสาหกรรม': [
            'สาขาวิชาครุศาสตร์อุตสาหกรรมโยธา', 'สาขาวิชาครุศาสตร์อุตสาหกรรมไฟฟ้า', 
            'สาขาวิชาครุศาสตร์อุตสาหกรรมอุตสาหการ', 'สาขาวิชาอิเล็กทรอนิกส์และเมคคาทรอนิกส์'
        ],
        'บริหารธุรกิจ': [
            'สาขาวิชาการจัดการ', 'สาขาวิชาการตลาด', 'สาขาวิชาการจัดการท่องเที่ยวและบริการ', 
            'สาขาวิชาการจัดการโลจิสติกส์', 'สาขาวิชาระบบสารสนเทศทางคอมพิวเตอร์', 
            'สาขาวิชาการบัญชี', 'สาขาวิชาการท่องเที่ยวและการบริการ'
        ]
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    // ── Google Register Setup ──
    const handleGoogleSetup = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setIsLoading(true);
            setError('');
            try {
                // Fetch info to pre-fill
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const userInfo = await userInfoRes.json();
                
                setForm({
                    ...form,
                    email: userInfo.email || '',
                    firstName: userInfo.given_name || '',
                    lastName: userInfo.family_name || ''
                });
                
                setGoogleToken(tokenResponse.access_token);
                setMethod('google');
                setStep('form');
            } catch (e) {
                setError('เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google');
            } finally {
                setIsLoading(false);
            }
        },
        onError: () => setError('ยกเลิกการเชื่อมต่อกับ Google'),
        flow: 'implicit',
    });

    const handleFormSubmit = async () => {
        if (!form.email || !form.firstName || !form.lastName || !form.phoneNumber || !form.faculty || !form.major || (!form.password && method !== 'google')) {
            setError('กรุณากรอกข้อมูลสำคัญให้ครบถ้วน (ชื่อ, นามสกุล, เบอร์โทร, อีเมล, รหัสผ่าน, คณะ, สาขา)');
            return;
        }
        if (method !== 'google' && form.password !== form.confirmPassword) {
            setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
            return;
        }
        if (!form.email.includes('@')) {
            setError('กรุณากรอกอีเมลให้ถูกต้อง');
            return;
        }

        setIsLoading(true);
        setError('');

        if (method === 'google') {
            // Register directly, no OTP needed
            const result = await registerWithGoogle(googleToken, form);
            setIsLoading(false);
            if (result.success) {
                router.push('/dashboard');
            } else {
                setError(result.message || 'ลงทะเบียนไม่สำเร็จ (อีเมลนี้อาจมีในระบบแล้ว)');
            }
        } else {
            // Manual -> Send OTP
            const result = await sendRegisterOtp(form.email.trim().toLowerCase());
            setIsLoading(false);

            if (result.success) {
                setOtpMsg(result.message || `ส่ง OTP ไปยัง ${form.email} แล้ว`);
                setStep('otp');
                setCooldown(30);
            } else {
                setError(result.message || 'เกิดข้อผิดพลาดในการส่ง OTP');
            }
        }
    };

    const handleResendOtp = async () => {
        if (cooldown > 0) return;
        setIsLoading(true);
        setError('');
        const result = await sendRegisterOtp(form.email.trim().toLowerCase());
        setIsLoading(false);
        if (result.success) {
            setOtpMsg(result.message || `ส่ง OTP ใหม่ไปที่ ${form.email} แล้ว`);
            setCooldown(30);
        } else {
            setError(result.message || 'เกิดข้อผิดพลาดในการส่ง OTP');
        }
    };

    // ── Verify OTP (Manual only) ──
    const handleVerifyAndRegister = async () => {
        if (otp.length !== 6) {
            setError('กรุณากรอก OTP 6 หลัก');
            return;
        }

        setIsLoading(true);
        setError('');

        const result = await register({ ...form, otp });
        setIsLoading(false);

        if (result.success) {
            router.push('/dashboard');
        } else {
            setError(result.message || 'ลงทะเบียนไม่สำเร็จ OTP ไม่ถูกต้อง หรืออีเมลมีอยู่แล้ว');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-600 via-emerald-500 to-teal-400 flex flex-col items-center justify-center p-4">
            {/* Logo */}
            <div className="mb-6 text-center">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xl">
                    <span className="text-3xl">♻️</span>
                </div>
                <h1 className="text-2xl font-black text-white tracking-wider">SBAY</h1>
                <p className="text-white/70 text-xs mt-0.5">Smart Recycling Platform</p>
            </div>

            {/* Card */}
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-5">
                    <h2 className="text-xl font-bold text-white">ลงทะเบียนสมาชิก</h2>
                    <p className="text-green-100 text-sm mt-0.5">
                        {step === 'choose' && 'เลือกวิธีสมัครสมาชิก'}
                        {step === 'form' && 'กรอกข้อมูลส่วนตัวเพื่อสะสมแต้ม'}
                        {step === 'otp' && 'ยืนยันรหัส OTP'}
                    </p>
                </div>

                <div className="px-6 py-6">
                    {/* Step 1: Choose */}
                    {step === 'choose' && (
                        <div className="space-y-4">
                            <button
                                onClick={() => handleGoogleSetup()}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center space-x-3 bg-white border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 text-gray-700 font-bold py-3.5 rounded-xl transition-all shadow-sm active:scale-95 group"
                            >
                                {isLoading ? 'กำลังเชื่อมต่อ...' : (
                                    <>
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        <span>สมัครด้วย Google (รวดเร็ว)</span>
                                    </>
                                )}
                            </button>

                            <div className="flex items-center space-x-3">
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-gray-400 text-xs font-semibold">หรือ</span>
                                <div className="flex-1 h-px bg-gray-200" />
                            </div>

                            <button
                                onClick={() => { setMethod('manual'); setStep('form'); }}
                                className="w-full bg-gray-100 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition active:scale-95"
                            >
                                กรอกข้อมูลสมัครตามปกติ
                            </button>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm flex items-center space-x-2">
                                    <span>⚠️</span><span>{error}</span>
                                </div>
                            )}

                            <div className="text-center pt-2 mt-2">
                                <span className="text-gray-500 text-sm">มีบัญชีอยู่แล้ว? </span>
                                <button onClick={() => router.push('/login')} className="text-green-600 font-bold text-sm hover:underline">
                                    เข้าสู่ระบบ
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Form */}
                    {step === 'form' && (
                        <div className="space-y-4">
                            {method === 'google' && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start space-x-3 mb-2">
                                    <span className="text-blue-500 mt-0.5">ℹ️</span>
                                    <div className="text-sm text-blue-800">
                                        <p className="font-semibold">เชื่อมต่อบัญชี Google สำเร็จ</p>
                                        <p className="text-xs opacity-90">กรุณากรอกข้อมูลส่วนตัวเพิ่มเติมเพื่อเสร็จสิ้นการลงทะเบียน</p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">
                                    📧 อีเมล <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    disabled={method === 'google'}
                                    className={`w-full border-2 border-gray-200 focus:border-green-500 rounded-xl px-3 py-2.5 text-gray-800 outline-none transition ${method === 'google' ? 'bg-gray-100 opacity-70' : 'bg-gray-50 focus:bg-white'}`}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">
                                    👤 ชื่อ-นามสกุล <span className="text-red-500">*</span>
                                </label>
                                <div className="flex space-x-2">
                                    <select
                                        name="title"
                                        value={form.title}
                                        onChange={handleChange}
                                        className="border-2 border-gray-200 focus:border-green-500 rounded-xl px-2 py-2.5 text-gray-800 text-sm outline-none bg-gray-50 w-20 shrink-0"
                                    >
                                        <option value="นาย">นาย</option>
                                        <option value="นาง">นาง</option>
                                        <option value="นางสาว">นางสาว</option>
                                    </select>
                                    <input
                                        name="firstName"
                                        value={form.firstName}
                                        onChange={handleChange}
                                        placeholder="ชื่อ"
                                        className="flex-1 border-2 border-gray-200 focus:border-green-500 rounded-xl px-3 py-2.5 text-gray-800 text-sm outline-none bg-gray-50 min-w-0"
                                    />
                                    <input
                                        name="lastName"
                                        value={form.lastName}
                                        onChange={handleChange}
                                        placeholder="นามสกุล"
                                        className="flex-1 border-2 border-gray-200 focus:border-green-500 rounded-xl px-3 py-2.5 text-gray-800 text-sm outline-none bg-gray-50 min-w-0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">
                                    📱 เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    value={form.phoneNumber}
                                    onChange={handleChange}
                                    placeholder="0XX-XXX-XXXX"
                                    className="w-full border-2 border-gray-200 focus:border-green-500 rounded-xl px-3 py-2.5 text-gray-800 outline-none transition bg-gray-50"
                                />
                            </div>

                            {method !== 'google' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-600 mb-1">
                                            🔑 รหัสผ่าน (สำหรับเข้าสู่ระบบ) <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                value={form.password}
                                                onChange={handleChange}
                                                placeholder="ตั้งรหัสผ่าน 6 ตัวขึ้นไป"
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
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-600 mb-1">
                                            🔐 ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                name="confirmPassword"
                                                value={form.confirmPassword}
                                                onChange={handleChange}
                                                placeholder="กรอกรหัสผ่านอีกครั้ง"
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
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">
                                    🎓 รหัสนักศึกษา (ถ้ามี)
                                </label>
                                <input
                                    name="studentId"
                                    value={form.studentId}
                                    onChange={handleChange}
                                    placeholder="เช่น 64XXXXXX"
                                    className="w-full border-2 border-gray-200 focus:border-green-500 rounded-xl px-3 py-2.5 text-gray-800 outline-none transition bg-gray-50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">
                                    🏢 คณะ <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="faculty"
                                    value={form.faculty}
                                    onChange={(e) => {
                                        setForm({ ...form, faculty: e.target.value, major: '' });
                                        setError('');
                                    }}
                                    className="w-full border-2 border-gray-200 focus:border-green-500 rounded-xl px-3 py-2.5 text-gray-800 outline-none transition bg-gray-50"
                                >
                                    {Object.keys(faculties).map(fac => (
                                        <option key={fac} value={fac}>{fac}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">
                                    📖 สาขาวิชา <span className="text-red-500">*</span>
                                </label>
                                <input
                                    list="major-list"
                                    name="major"
                                    value={form.major}
                                    onChange={handleChange}
                                    placeholder="พิมพ์เพื่อค้นหาสาขา..."
                                    className="w-full border-2 border-gray-200 focus:border-green-500 rounded-xl px-3 py-2.5 text-gray-800 outline-none transition bg-gray-50"
                                />
                                <datalist id="major-list">
                                    {faculties[form.faculty as keyof typeof faculties]?.map((majorOption: string) => (
                                        <option key={majorOption} value={majorOption} />
                                    ))}
                                </datalist>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm flex items-center space-x-2">
                                    <span>⚠️</span><span>{error}</span>
                                </div>
                            )}

                            <div className="flex space-x-3 pt-2">
                                <button
                                    onClick={() => setStep('choose')}
                                    className="flex-1 bg-gray-100 text-gray-600 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition active:scale-95"
                                >
                                    กลับ
                                </button>
                                <button
                                    onClick={handleFormSubmit}
                                    disabled={isLoading}
                                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3.5 rounded-xl hover:from-green-600 hover:to-emerald-700 transition shadow-lg disabled:opacity-50 active:scale-95"
                                >
                                    {isLoading ? 'กำลังดำเนินการ...' : method === 'google' ? 'เสร็จสิ้นลงทะเบียน' : 'รับ OTP →'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: OTP (Manual only) */}
                    {step === 'otp' && (
                        <div className="space-y-4">
                            {otpMsg && (
                                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm flex items-start space-x-2">
                                    <span className="mt-0.5">✅</span><span>{otpMsg}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                                    🔐 รหัส OTP (6 หลัก)
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={otp}
                                    onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                                    onKeyDown={e => e.key === 'Enter' && handleVerifyAndRegister()}
                                    placeholder="000000"
                                    maxLength={6}
                                    className="w-full border-2 border-gray-200 focus:border-green-500 rounded-xl px-4 py-3.5 text-gray-800 text-3xl font-bold text-center outline-none tracking-[0.5em] transition bg-gray-50 focus:bg-white"
                                    autoFocus
                                />
                                <p className="text-center text-gray-400 text-xs mt-2">
                                    ส่งไปยัง <span className="font-semibold text-gray-600">{form.email}</span>
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm flex items-center space-x-2">
                                    <span>⚠️</span><span>{error}</span>
                                </div>
                            )}

                            <button
                                onClick={handleVerifyAndRegister}
                                disabled={isLoading || otp.length !== 6}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3.5 rounded-xl hover:from-green-600 hover:to-emerald-700 transition shadow-lg disabled:opacity-50 active:scale-95 text-base"
                            >
                                {isLoading ? 'กำลังลงทะเบียน...' : '✓ ยืนยัน & ลงทะเบียน'}
                            </button>

                            <div className="text-center pt-1">
                                <button
                                    onClick={handleResendOtp}
                                    disabled={cooldown > 0 || isLoading}
                                    className={`text-sm font-bold ${cooldown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-green-600 hover:underline'}`}
                                >
                                    {cooldown > 0 ? `ส่งรหัสใหม่ได้ในอีก ${cooldown} วินาที` : 'ส่งรหัส OTP อีกครั้ง'}
                                </button>
                            </div>

                            <button
                                onClick={() => { setStep('form'); setOtp(''); setError(''); setOtpMsg(''); }}
                                className="w-full bg-gray-100 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-200 transition active:scale-95 text-sm"
                            >
                                ← กลับไปแก้ไขข้อมูล
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <p className="text-white/50 text-xs mt-4">SBAY Platform © 2025</p>
        </div>
    );
}
