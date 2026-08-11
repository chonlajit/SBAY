"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';
import { useGoogleLogin } from '@react-oauth/google';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { motion, AnimatePresence } from 'framer-motion';

type Mode = 'login' | 'register' | 'forgot-password';
type LoginMethod = 'email' | 'phone';
type Step = 'choose' | 'form' | 'otp';
type ForgotStep = 'email' | 'otp' | 'new-password';
type RegisterMethod = 'google' | 'manual';

export default function AuthContainer({ initialMode = 'login' }: { initialMode?: Mode }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, loginWithPassword, loginWithGoogle, sendRegisterOtp, sendForgotOtp, register, registerWithGoogle } = useSmartBin();

    const [mode, setMode] = useState<Mode>(initialMode);

    // Prefetch routes for zero latency
    useEffect(() => {
        router.prefetch('/login');
        router.prefetch('/register');
    }, [router]);

    // Sync mode with pathname or props
    useEffect(() => {
        if (pathname === '/register') {
            setMode('register');
        } else if (pathname === '/login') {
            setMode('login');
        } else {
            setMode(initialMode);
        }
    }, [pathname, initialMode]);

    const switchMode = (targetMode: Mode) => {
        setMode(targetMode);
        if (targetMode === 'login') {
            router.push('/login', { scroll: false });
        } else if (targetMode === 'register') {
            router.push('/register', { scroll: false });
        }
    };

    // ── Login State ──
    const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
    const [identifier, setIdentifier] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [isLoginLoading, setIsLoginLoading] = useState(false);
    const [notRegistered, setNotRegistered] = useState<{ show: boolean; email: string }>({ show: false, email: '' });

    // ── Forgot Password State ──
    const [forgotStep, setForgotStep] = useState<ForgotStep>('email');
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotOtp, setForgotOtp] = useState('');
    const [forgotNewPassword, setForgotNewPassword] = useState('');
    const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
    const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
    const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
    const [forgotError, setForgotError] = useState('');
    const [forgotMsg, setForgotMsg] = useState('');
    const [isForgotLoading, setIsForgotLoading] = useState(false);
    const [forgotCooldown, setForgotCooldown] = useState(0);

    useEffect(() => {
        if (forgotCooldown > 0) {
            const timer = setTimeout(() => setForgotCooldown(forgotCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [forgotCooldown]);

    const handleSendForgotOtp = async () => {
        if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
            setForgotError('กรุณากรอกอีเมลให้ถูกต้อง');
            return;
        }
        setIsForgotLoading(true);
        setForgotError('');
        setForgotMsg('');

        const res = await sendForgotOtp(forgotEmail.trim().toLowerCase());
        setIsForgotLoading(false);

        if (!res.success) {
            setForgotError(res.message || 'ไม่พบอีเมลนี้ในระบบ กรุณาตรวจสอบอีเมลหรือสมัครสมาชิกใหม่');
            return;
        }

        setForgotMsg(`ส่งรหัส OTP ไปยัง ${forgotEmail.trim()} เรียบร้อยแล้ว`);
        setForgotCooldown(60);
        setForgotStep('otp');
    };

    const handleVerifyForgotOtp = async () => {
        if (!forgotOtp.trim() || forgotOtp.trim().length < 4) {
            setForgotError('กรุณากรอกรหัส OTP ให้ครบถ้วน');
            return;
        }
        setIsForgotLoading(true);
        setForgotError('');

        try {
            let url = 'http://localhost:8070/api/auth/otp/verify';
            if (typeof window !== 'undefined') {
                const hostname = window.location.hostname;
                const port = window.location.port;
                const protocol = window.location.protocol;
                const portStr = port === '3000' ? ':8070' : (port ? `:${port}` : '');
                url = `${protocol}//${hostname}${portStr}/api/auth/otp/verify`;
            }

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail.trim().toLowerCase(), otp: forgotOtp.trim() })
            });
            const data = await res.json();
            setIsForgotLoading(false);

            if (data.error || (!data.success && !data.user && !data.token)) {
                setForgotError(data.error || 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ');
                return;
            }

            setForgotError('');
            setForgotMsg('');
            setForgotStep('new-password');
        } catch (e: any) {
            setIsForgotLoading(false);
            setForgotError('เกิดข้อผิดพลาดในการตรวจสอบรหัส OTP');
        }
    };

    const handleResetPassword = async () => {
        setForgotError('');
        setForgotMsg('');
        if (!forgotNewPassword || forgotNewPassword.length < 6) {
            setForgotError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
            return;
        }
        if (forgotNewPassword !== forgotConfirmPassword) {
            setForgotError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
            return;
        }
        setIsForgotLoading(true);

        try {
            let url = 'http://localhost:8070/api/auth/reset-password';
            if (typeof window !== 'undefined') {
                const hostname = window.location.hostname;
                const port = window.location.port;
                const protocol = window.location.protocol;
                const portStr = port === '3000' ? ':8070' : (port ? `:${port}` : '');
                url = `${protocol}//${hostname}${portStr}/api/auth/reset-password`;
            }

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identifier: forgotEmail.trim().toLowerCase(),
                    otp: forgotOtp.trim(),
                    newPassword: forgotNewPassword
                })
            });
            const data = await res.json();
            setIsForgotLoading(false);

            if (data.error || !data.success) {
                const errMsg = data.error || 'ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง';
                setForgotError(errMsg);
                return;
            }

            setForgotError('');
            setForgotMsg('🎉 เปลี่ยนรหัสผ่านสำเร็จเรียบร้อย! กำลังนำคุณไปยังหน้าเข้าสู่ระบบ...');

            setTimeout(() => {
                setMode('login');
                setForgotStep('email');
                setForgotEmail('');
                setForgotOtp('');
                setForgotNewPassword('');
                setForgotConfirmPassword('');
                setForgotMsg('');
            }, 1500);
        } catch (e: any) {
            setIsForgotLoading(false);
            const errMsg = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
            setForgotError(errMsg);
        }
    };

    const machineId = searchParams.get('mech_id') || 'default-machine';

    // ── Register State ──
    const [step, setStep] = useState<Step>('form');
    const [regMethod, setRegMethod] = useState<RegisterMethod>('manual');
    const [googleToken, setGoogleToken] = useState('');
    const [isRegLoading, setIsRegLoading] = useState(false);
    const [regError, setRegError] = useState('');
    const [otp, setOtp] = useState('');
    const [otpMsg, setOtpMsg] = useState('');
    const [showRegPassword, setShowRegPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [regForm, setRegForm] = useState({
        username: '',
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
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    // ── Handlers ──
    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setIsLoginLoading(true);
            setLoginError('');
            setNotRegistered({ show: false, email: '' });

            try {
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const userInfo = await userInfoRes.json();
                const email = userInfo.email;

                const result = await loginWithGoogle(tokenResponse.access_token, machineId);
                setIsLoginLoading(false);

                if (result.success) {
                    const mech = searchParams.get('mech_id');
                    if (mech) router.push(`/operation/${mech}`);
                    else router.push('/dashboard');
                } else {
                    if (result.email) {
                        setNotRegistered({ show: true, email: result.email });
                    } else {
                        setLoginError(result.message || 'เกิดข้อผิดพลาด');
                    }
                }
            } catch (e: any) {
                setIsLoginLoading(false);
                setLoginError('เกิดข้อผิดพลาดในการเชื่อมต่อ Google');
            }
        },
        onError: () => setLoginError('ยกเลิกการเข้าสู่ระบบด้วย Google'),
        flow: 'implicit',
    });

    const handleLogin = async () => {
        if (!identifier.trim() || !loginPassword.trim()) {
            setLoginError('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        setIsLoginLoading(true);
        setLoginError('');
        setNotRegistered({ show: false, email: '' });

        const result = await loginWithPassword(identifier.trim(), loginPassword, machineId);

        setIsLoginLoading(false);

        if (result.success) {
            const mech = searchParams.get('mech_id');
            if (mech) router.push(`/operation/${mech}`);
            else router.push('/dashboard');
        } else {
            setLoginError(result.message || 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง');
            if (result.message?.includes('ไม่พบ')) {
                setNotRegistered({ show: true, email: loginMethod === 'email' ? identifier : '' });
            }
        }
    };

    const handleRegChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setRegForm(prev => ({ ...prev, [name]: value }));
        setRegError('');
    };

    const handleGoogleRegister = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setIsRegLoading(true);
            setRegError('');
            try {
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const userInfo = await userInfoRes.json();
                setGoogleToken(tokenResponse.access_token);
                setRegForm(prev => ({
                    ...prev,
                    email: userInfo.email || '',
                    firstName: userInfo.given_name || '',
                    lastName: userInfo.family_name || '',
                    username: (userInfo.email || '').split('@')[0].replace(/[^a-zA-Z0-9_\-]/g, '')
                }));
                setRegMethod('google');
                setStep('form');
            } catch (e) {
                setRegError('เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google');
            } finally {
                setIsRegLoading(false);
            }
        },
        onError: () => setRegError('ยกเลิกการลงทะเบียนด้วย Google'),
        flow: 'implicit',
    });

    const handleFormSubmit = async () => {
        if (!regForm.username.trim() || !regForm.phoneNumber.trim() || !regForm.email.trim()) {
            setRegError('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
            return;
        }

        if (!/^[a-zA-Z0-9_\-]{3,}$/.test(regForm.username)) {
            setRegError('Username ต้องเป็นภาษาอังกฤษ ตัวเลข _, - และยาวอย่างน้อย 3 ตัวอักษร');
            return;
        }

        if (regMethod === 'manual') {
            if (!regForm.password || regForm.password.length < 8 || regForm.password.length > 20) {
                setRegError('รหัสผ่านต้องมีความยาว 8-20 ตัวอักษร');
                return;
            }
            if (regForm.password !== regForm.confirmPassword) {
                setRegError('รหัสผ่านไม่ตรงกัน');
                return;
            }
            setIsRegLoading(true);
            setRegError('');
            const result = await sendRegisterOtp(regForm.email.trim().toLowerCase());
            setIsRegLoading(false);
            if (result.success) {
                setOtpMsg(result.message || `ส่ง OTP ไปที่ ${regForm.email} เรียบร้อยแล้ว`);
                setCooldown(30);
                setStep('otp');
            } else {
                setRegError(result.message || 'เกิดข้อผิดพลาดในการส่ง OTP');
            }
        } else {
            setIsRegLoading(true);
            setRegError('');
            const result = await registerWithGoogle(googleToken, regForm);
            setIsRegLoading(false);
            if (result.success) router.push('/dashboard');
            else setRegError(result.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
        }
    };

    const handleVerifyAndRegister = async () => {
        if (otp.length !== 6) {
            setRegError('กรุณากรอก OTP 6 หลัก');
            return;
        }
        setIsRegLoading(true);
        setRegError('');
        const result = await register({ ...regForm, otp });
        setIsRegLoading(false);
        if (result.success) router.push('/dashboard');
        else setRegError(result.message || 'ลงทะเบียนไม่สำเร็จ OTP ไม่ถูกต้อง');
    };

    const passwordsMatch = regForm.password && regForm.confirmPassword && regForm.password === regForm.confirmPassword;
    const getStrength = (pass: string) => {
        if (!pass) return { label: '', color: '', barColor: '', percent: 0 };
        let score = 0;
        if (pass.length >= 8) score += 1;
        if (pass.length >= 12) score += 1;
        if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
        if (/[0-9]/.test(pass)) score += 1;
        if (/[^a-zA-Z0-9]/.test(pass)) score += 1;

        if (score <= 2) return { label: 'อ่อน', color: 'text-red-500', barColor: 'bg-red-500', percent: 33 };
        if (score <= 4) return { label: 'ปานกลาง', color: 'text-amber-500', barColor: 'bg-amber-500', percent: 66 };
        return { label: 'ปลอดภัยสูง', color: 'text-green-600', barColor: 'bg-green-600', percent: 100 };
    };
    const strength = getStrength(regForm.password);

    return (
        <div
            className="w-full h-screen min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat flex flex-col lg:flex-row items-stretch justify-between font-sans relative"
            style={{ backgroundImage: "url('/images/bg_loginregis.jpg')" }}
        >
            {/* ─── Left Section: Machine SVG & Platform Text ─── */}
            <motion.div
                className="hidden lg:flex flex-col items-center justify-center pt-6 sm:pt-10 md:pt-12 pb-4 px-4 md:px-6 relative overflow-hidden bg-transparent h-full shrink-0"
                animate={{
                    width: mode === 'login' ? '58%' : '48%'
                }}
                transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            >
                {/* SVG Machine Graphic */}
                <motion.div
                    className="w-full max-w-[440px] lg:max-w-[500px] px-2 flex justify-center items-center shrink my-auto relative -left-10 lg:-left-14"
                    animate={{ scale: mode === 'login' ? 1 : 0.94 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                >
                    <svg width="100%" height="100%" viewBox="0 0 541 365" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto max-h-[260px] lg:max-h-[320px]">
                        <path d="M292 0H497L540.5 12H336L292 0Z" fill="#b9e0a9ff" />
                        <path d="M336 12H541V365H336V12Z" fill="white" />
                        <path d="M292 0L336 12V365L292 343V0Z" fill="#8bc473ff" />
                        <path d="M359 70H464V115H359V70Z" fill="#7A7A7A" />
                        <path d="M363 74H461V111H363V74Z" fill="#6f9d5bff" />
                        <path d="M518 92.5C518 104.926 507.926 115 495.5 115C483.074 115 473 104.926 473 92.5C473 80.0736 483.074 70 495.5 70C507.926 70 518 80.0736 518 92.5Z" fill="#7A7A7A" />
                        <path d="M378 244H498V269H378V244Z" fill="#7A7A7A" />
                        <path d="M378 244H498L490.453 256H378V244Z" fill="#D9D9D9" />
                        <path d="M490 256.234L498 244V269H490V256.234Z" fill="#7A7A7A" />
                        <path d="M0 336.5L86 306.5L292 326V343L336 365L0 336.5Z" fill="#64964E" />
                    </svg>
                </motion.div>

                {/* Platform Name */}
                <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="items-center hover:opacity-80 transition shrink-0 cursor-pointer mb-8"
                >
                    <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight text-center">
                        SBAY | PLATFORM
                    </h1>
                    <p className="text-white font-semibold text-center mb-4 text-sm lg:text-base">sorting bottles with ai and yeild.</p>
                </button>
            </motion.div>

            {/* ─── Right Section: Liquid Glass Morphing Panel ─── */}
            <motion.div
                className="w-full bg-transparent flex flex-col justify-start lg:justify-center items-center h-full overflow-hidden shrink-0"
                animate={{
                    width: isMobile ? '100%' : (mode === 'login' ? '48%' : '56%')
                }}
                transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            >
                <div className="w-full h-full bg-white/30 backdrop-blur-xl border-l-0 lg:border-l border-white/50 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] rounded-none lg:rounded-l-[3.5rem] px-3 sm:px-8 py-4 lg:py-6 flex flex-col justify-start lg:justify-center items-center overflow-hidden">
                    <motion.div
                        className="w-full h-full flex flex-col items-center justify-start lg:justify-center overflow-y-auto py-2 lg:py-4"
                        style={{ scrollbarWidth: 'none' }}
                        animate={{
                            maxWidth: isMobile ? '100%' : (mode === 'login' ? 460 : 680)
                        }}
                        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                    >
                        <AnimatePresence mode="wait">
                            {mode === 'login' ? (
                                <motion.div
                                    key="login-view"
                                    initial={{ opacity: 0, x: -15, filter: 'blur(2px)' }}
                                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, x: 15, filter: 'blur(2px)' }}
                                    transition={{ duration: 0.18, ease: 'easeOut' }}
                                    className="space-y-3.5 lg:my-auto my-2 w-full mx-auto flex flex-col justify-center"
                                >
                                    {/* LOGIN CARD 1 */}
                                    <div className="rounded-t-[2rem] rounded-b-none overflow-hidden shadow-lg border border-gray-300/40 border-b-0">
                                        <div className="bg-[#64964E] text-white p-4 sm:p-4.5 flex items-center justify-between">
                                            <div className="pr-2">
                                                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                                                    เข้าสู่ระบบด้วย
                                                </h2>
                                                <p className="text-xs text-gray-200 mt-0.5 font-medium">
                                                    หรือกรอกข้อมูลเพื่อเข้าใช้งาน
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleGoogleLogin()}
                                                disabled={isLoginLoading}
                                                className="bg-white hover:bg-gray-100 text-gray-800 p-2 rounded-xl transition shadow-sm flex items-center justify-center space-x-2 shrink-0 active:scale-95"
                                            >
                                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                </svg>
                                            </button>
                                        </div>

                                        <div className="bg-[#D9D9D9] p-4 sm:p-4.5 space-y-3">
                                            <div className="flex bg-gray-200/80 p-0.5 rounded-xl text-xs font-bold text-gray-600">
                                                <button
                                                    onClick={() => setLoginMethod('email')}
                                                    className={`flex-1 py-1.5 rounded-lg transition ${loginMethod === 'email' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-900'}`}
                                                >
                                                    ใช้อีเมล
                                                </button>
                                                <button
                                                    onClick={() => setLoginMethod('phone')}
                                                    className={`flex-1 py-1.5 rounded-lg transition ${loginMethod === 'phone' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-900'}`}
                                                >
                                                    ใช้เบอร์โทรศัพท์
                                                </button>
                                            </div>

                                            <div>
                                                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                                                    {loginMethod === 'email' ? 'อีเมล' : 'เบอร์โทรศัพท์'}
                                                </label>
                                                <input
                                                    type={loginMethod === 'email' ? 'email' : 'tel'}
                                                    value={identifier}
                                                    onChange={e => { setIdentifier(e.target.value); setLoginError(''); }}
                                                    placeholder={loginMethod === 'email' ? 'เช่น email@example.com' : 'เช่น 0812345678'}
                                                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-800 text-xs sm:text-sm outline-none focus:border-[#64964E]"
                                                />
                                            </div>

                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                                                        รหัสผ่าน
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setMode('forgot-password');
                                                            setForgotStep('email');
                                                            setForgotError('');
                                                            setForgotMsg('');
                                                            setForgotEmail('');
                                                            setForgotOtp('');
                                                            setForgotNewPassword('');
                                                            setForgotConfirmPassword('');
                                                        }}
                                                        className="text-xs font-bold text-[#64964E] hover:underline cursor-pointer"
                                                    >
                                                        ลืมรหัสผ่าน?
                                                    </button>
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type={showLoginPassword ? "text" : "password"}
                                                        value={loginPassword}
                                                        onChange={e => { setLoginPassword(e.target.value); setLoginError(''); }}
                                                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                                        placeholder="กรอกรหัสผ่าน"
                                                        className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 pr-9 text-gray-800 text-xs sm:text-sm outline-none focus:border-[#64964E]"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-green-600"
                                                    >
                                                        <FontAwesomeIcon icon={showLoginPassword ? faEye : faEyeSlash} className="text-xs" />
                                                    </button>
                                                </div>
                                            </div>

                                            {loginError && (
                                                <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-red-600 font-bold text-xs flex items-center space-x-1.5">
                                                    <span>⚠️</span>
                                                    <span>{loginError}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* LOGIN CARD 2 */}
                                    <div className="bg-[#D9D9D9] rounded-t-none rounded-b-[2rem] p-4 sm:p-4.5 shadow-sm space-y-2.5">
                                        <button
                                            onClick={handleLogin}
                                            disabled={isLoginLoading || !identifier.trim() || !loginPassword.trim()}
                                            className="w-full bg-[#64964E] hover:bg-[#527d40] text-white font-bold py-3 rounded-xl transition shadow-md text-sm sm:text-base active:scale-95 disabled:opacity-50"
                                        >
                                            {isLoginLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                                        </button>

                                        <div className="text-center pt-0.5">
                                            <span className="text-xs sm:text-sm text-gray-700 font-medium">ยังไม่มีบัญชีหรอ? </span>
                                            <button
                                                onClick={() => switchMode('register')}
                                                className="text-xs sm:text-sm font-bold text-[#64964E] underline hover:text-black transition"
                                            >
                                                สมัครสมาชิก
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : mode === 'forgot-password' ? (
                                <motion.div
                                    key="forgot-password-view"
                                    initial={{ opacity: 0, scale: 0.96, filter: 'blur(3px)' }}
                                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, scale: 0.96, filter: 'blur(3px)' }}
                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                    className="space-y-3.5 lg:my-auto my-2 w-full mx-auto flex flex-col justify-center"
                                >
                                    {/* FORGOT PASSWORD CARD 1 */}
                                    <div className="rounded-t-[2rem] rounded-b-none overflow-hidden shadow-lg border border-gray-300/40 border-b-0">
                                        <div className="bg-[#64964E] text-white p-4 sm:p-4.5 flex items-center justify-between">
                                            <div>
                                                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                                                    {forgotStep === 'email' && 'ลืมรหัสผ่าน'}
                                                    {forgotStep === 'otp' && 'ยืนยันรหัส OTP'}
                                                    {forgotStep === 'new-password' && 'ตั้งรหัสผ่านใหม่'}
                                                </h2>
                                                <p className="text-xs text-gray-200 mt-0.5 font-medium">
                                                    {forgotStep === 'email' && 'กรอกอีเมลของคุณเพื่อรับรหัส OTP รีเซ็ตรหัสผ่าน'}
                                                    {forgotStep === 'otp' && `กรอกรหัส 6 หลักที่ส่งไปยัง ${forgotEmail}`}
                                                    {forgotStep === 'new-password' && 'กำหนดรหัสผ่านใหม่สำหรับเข้าใช้งานระบบ'}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setMode('login');
                                                    setForgotEmail('');
                                                    setForgotOtp('');
                                                    setForgotNewPassword('');
                                                    setForgotConfirmPassword('');
                                                    setForgotError('');
                                                    setForgotMsg('');
                                                }}
                                                className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl text-xs font-bold transition cursor-pointer"
                                            >
                                                ย้อนกลับ
                                            </button>
                                        </div>

                                        <div className="bg-[#D9D9D9] p-4 sm:p-5 space-y-4">
                                            {/* STEP 1: EMAIL */}
                                            {forgotStep === 'email' && (
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                                                            อีเมลสำหรับรับ OTP
                                                        </label>
                                                        <input
                                                            type="email"
                                                            value={forgotEmail}
                                                            onChange={e => { setForgotEmail(e.target.value); setForgotError(''); }}
                                                            onKeyDown={e => e.key === 'Enter' && handleSendForgotOtp()}
                                                            placeholder="เช่น email@example.com"
                                                            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-800 text-xs sm:text-sm outline-none focus:border-[#64964E]"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* STEP 2: OTP */}
                                            {forgotStep === 'otp' && (
                                                <div className="space-y-3">
                                                    <div className="bg-white border border-green-200 rounded-xl p-3 text-center">
                                                        <span className="text-xs text-gray-600 font-medium">รหัส OTP ถูกส่งไปที่:</span>
                                                        <p className="text-sm font-bold text-[#64964E] mt-0.5">{forgotEmail}</p>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                                                            กรอกรหัส OTP 6 หลัก
                                                        </label>
                                                        <input
                                                            type="text"
                                                            maxLength={6}
                                                            value={forgotOtp}
                                                            onChange={e => { setForgotOtp(e.target.value); setForgotError(''); }}
                                                            onKeyDown={e => e.key === 'Enter' && handleVerifyForgotOtp()}
                                                            placeholder="123456"
                                                            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-center text-lg font-mono font-bold tracking-widest text-gray-800 outline-none focus:border-[#64964E]"
                                                        />
                                                    </div>

                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-gray-600">หากไม่ได้รับรหัส?</span>
                                                        <button
                                                            type="button"
                                                            disabled={forgotCooldown > 0}
                                                            onClick={handleSendForgotOtp}
                                                            className="text-[#64964E] font-bold hover:underline disabled:opacity-50"
                                                        >
                                                            {forgotCooldown > 0 ? `ส่งใหม่ใน (${forgotCooldown}s)` : 'ส่ง OTP อีกครั้ง'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* STEP 3: NEW PASSWORD */}
                                            {forgotStep === 'new-password' && (
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                                                            รหัสผ่านใหม่
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type={showForgotNewPassword ? "text" : "password"}
                                                                value={forgotNewPassword}
                                                                onChange={e => { setForgotNewPassword(e.target.value); setForgotError(''); }}
                                                                placeholder="ตั้งรหัสผ่านใหม่"
                                                                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 pr-9 text-gray-800 text-xs sm:text-sm outline-none focus:border-[#64964E]"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-green-600"
                                                            >
                                                                <FontAwesomeIcon icon={showForgotNewPassword ? faEye : faEyeSlash} className="text-xs" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                                                            ยืนยันรหัสผ่านใหม่
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type={showForgotConfirmPassword ? "text" : "password"}
                                                                value={forgotConfirmPassword}
                                                                onChange={e => { setForgotConfirmPassword(e.target.value); setForgotError(''); }}
                                                                onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
                                                                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                                                                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 pr-9 text-gray-800 text-xs sm:text-sm outline-none focus:border-[#64964E]"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-green-600"
                                                            >
                                                                <FontAwesomeIcon icon={showForgotConfirmPassword ? faEye : faEyeSlash} className="text-xs" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {forgotError && (
                                                <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-red-600 font-bold text-xs flex items-center space-x-1.5">
                                                    <span>⚠️</span>
                                                    <span>{forgotError}</span>
                                                </div>
                                            )}

                                            {forgotMsg && !forgotError && (
                                                <div className="bg-green-50 border border-green-200 rounded-xl p-2.5 text-green-700 font-bold text-xs flex items-center space-x-1.5">
                                                    <span>✅</span>
                                                    <span>{forgotMsg}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* FORGOT PASSWORD CARD 2 */}
                                    <div className="bg-[#D9D9D9] rounded-t-none rounded-b-[2rem] p-4 sm:p-4.5 shadow-sm space-y-2.5">
                                        {forgotStep === 'email' && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); handleSendForgotOtp(); }}
                                                disabled={isForgotLoading || !forgotEmail.trim()}
                                                className="w-full bg-[#64964E] hover:bg-[#527d40] text-white font-bold py-3 rounded-xl transition shadow-md text-sm sm:text-base active:scale-95 disabled:opacity-50 cursor-pointer"
                                            >
                                                {isForgotLoading ? 'กำลังส่งรหัส OTP...' : 'รับรหัส OTP'}
                                            </button>
                                        )}

                                        {forgotStep === 'otp' && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); handleVerifyForgotOtp(); }}
                                                disabled={!forgotOtp.trim()}
                                                className="w-full bg-[#64964E] hover:bg-[#527d40] text-white font-bold py-3 rounded-xl transition shadow-md text-sm sm:text-base active:scale-95 disabled:opacity-50 cursor-pointer"
                                            >
                                                ยืนยันรหัส OTP
                                            </button>
                                        )}

                                        {forgotStep === 'new-password' && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); handleResetPassword(); }}
                                                disabled={isForgotLoading || !forgotNewPassword || !forgotConfirmPassword}
                                                className="w-full bg-[#64964E] hover:bg-[#527d40] text-white font-bold py-3 rounded-xl transition shadow-md text-sm sm:text-base active:scale-95 disabled:opacity-50 cursor-pointer"
                                            >
                                                {isForgotLoading ? 'กำลังบันทึก...' : 'ยืนยันตั้งรหัสผ่านใหม่'}
                                            </button>
                                        )}

                                        <div className="text-center pt-0.5">
                                            <button
                                                onClick={() => setMode('login')}
                                                className="text-xs sm:text-sm font-bold text-[#64964E] underline hover:text-black transition cursor-pointer"
                                            >
                                                กลับไปหน้าเข้าสู่ระบบ
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="register-view"
                                    initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
                                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                                    transition={{ duration: 0.25 }}
                                    className="w-full lg:my-auto my-2 mx-auto flex flex-col justify-start lg:justify-center shrink-0"
                                >
                                    {/* REGISTER CARD 1 */}
                                    <div className="rounded-t-[2rem] rounded-b-none overflow-hidden shadow-lg border border-gray-300/40 border-b-0">
                                        <div className="bg-[#64964E] text-white p-4 sm:p-4.5 flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <h2 className="text-lg sm:text-xl font-bold text-white">ลงทะเบียนสมาชิก</h2>
                                                <p className="text-green-100 text-xs sm:text-sm mt-0.5 font-medium">กรอกข้อมูลเพื่อสมัครสมาชิก</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-white font-bold text-sm">หรือ</span>
                                                <span className="text-white text-xs sm:text-sm font-semibold hidden sm:inline ml-1">ลงทะเบียนด้วย</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleGoogleRegister()}
                                                    disabled={isRegLoading}
                                                    className="bg-white hover:bg-gray-100 p-2 sm:px-3 sm:py-1.5 rounded-xl transition shadow-sm flex items-center justify-center space-x-2 text-gray-800 font-bold active:scale-95"
                                                    title="ลงทะเบียนด้วย Google"
                                                >
                                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-[#D9D9D9] p-4 sm:p-5">
                                            {step !== 'otp' ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Left Column */}
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                                                                Username
                                                            </label>
                                                            <input
                                                                type="text"
                                                                name="username"
                                                                value={regForm.username}
                                                                onChange={handleRegChange}
                                                                placeholder="เช่น user123"
                                                                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-800 outline-none focus:border-[#64964E] text-sm"
                                                            />
                                                            <div className="mt-1 text-[11px] text-[#64964E] font-medium leading-tight">
                                                                <span className="font-bold">เงื่อนไข Username:</span>
                                                                <ul className="list-disc list-inside ml-1">
                                                                    <li className={regForm.username.length >= 3 ? "font-bold" : ""}>ความยาวอย่างน้อย 3 ตัวอักษร</li>
                                                                    <li className={regForm.username && /^[a-zA-Z0-9_\-]+$/.test(regForm.username) ? "font-bold" : ""}>ใช้เฉพาะภาษาอังกฤษ, ตัวเลข, _, -</li>
                                                                    <li className={regForm.username && !/\s/.test(regForm.username) && !/[ก-๙]/.test(regForm.username) ? "font-bold" : ""}>ห้ามเว้นวรรค ห้ามใช้ภาษาไทย</li>
                                                                </ul>
                                                            </div>
                                                        </div>

                                                        {regMethod !== 'google' && (
                                                            <>
                                                                <div>
                                                                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                                                                        รหัสผ่าน
                                                                    </label>
                                                                    <div className="relative">
                                                                        <input
                                                                            type={showRegPassword ? "text" : "password"}
                                                                            name="password"
                                                                            value={regForm.password}
                                                                            onChange={handleRegChange}
                                                                            placeholder="ตั้งรหัสผ่าน"
                                                                            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 pr-9 text-gray-800 outline-none focus:border-[#64964E] text-sm"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setShowRegPassword(!showRegPassword)}
                                                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-green-600"
                                                                        >
                                                                            <FontAwesomeIcon icon={showRegPassword ? faEye : faEyeSlash} className="text-xs" />
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                                                                        ยืนยันรหัสผ่าน
                                                                    </label>
                                                                    <div className="relative">
                                                                        <input
                                                                            type={showConfirmPassword ? "text" : "password"}
                                                                            name="confirmPassword"
                                                                            value={regForm.confirmPassword}
                                                                            onChange={handleRegChange}
                                                                            placeholder="กรอกรหัสผ่านอีกครั้ง"
                                                                            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 pr-9 text-gray-800 outline-none focus:border-[#64964E] text-sm"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-green-600"
                                                                        >
                                                                            <FontAwesomeIcon icon={showConfirmPassword ? faEye : faEyeSlash} className="text-xs" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Right Column */}
                                                    <div className="space-y-3 flex flex-col justify-between">
                                                        <div className="space-y-3">
                                                            <div>
                                                                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                                                                    อีเมล
                                                                </label>
                                                                <input
                                                                    type="email"
                                                                    name="email"
                                                                    value={regForm.email}
                                                                    onChange={handleRegChange}
                                                                    disabled={regMethod === 'google'}
                                                                    className={`w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-800 outline-none focus:border-[#64964E] text-sm ${regMethod === 'google' ? 'bg-gray-100 opacity-70' : ''}`}
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                                                                    เบอร์โทรศัพท์
                                                                </label>
                                                                <input
                                                                    type="tel"
                                                                    name="phoneNumber"
                                                                    value={regForm.phoneNumber}
                                                                    onChange={handleRegChange}
                                                                    placeholder="0XX-XXX-XXXX"
                                                                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-800 outline-none focus:border-[#64964E] text-sm"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Notification Box */}
                                                        <div className="bg-white rounded-2xl p-3.5 min-h-[120px] shadow-sm flex flex-col justify-center items-center text-center mt-2 border border-gray-200">
                                                            {regError ? (
                                                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 w-full text-red-600 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2">
                                                                    <span className="text-base">⚠️</span>
                                                                    <span>{regError}</span>
                                                                </div>
                                                            ) : regForm.confirmPassword && !passwordsMatch ? (
                                                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 w-full text-red-600 font-bold text-xs flex items-center justify-center space-x-2">
                                                                    <i className="fa-solid fa-circle-xmark text-sm"></i>
                                                                    <span>รหัสผ่านยังไม่ตรงกัน</span>
                                                                </div>
                                                            ) : regForm.confirmPassword && passwordsMatch ? (
                                                                <div className="bg-green-50 border border-green-200 rounded-xl p-3 w-full text-green-700 font-bold text-xs flex flex-col items-center space-y-1">
                                                                    <div className="flex items-center space-x-1.5">
                                                                        <i className="fa-solid fa-circle-check text-green-600 text-sm"></i>
                                                                        <span>รหัสผ่านตรงกันเรียบร้อย</span>
                                                                    </div>
                                                                    {regForm.password && (
                                                                        <div className="text-[11px] text-gray-500 font-medium">
                                                                            ความปลอดภัย: <span className={strength.color}>{strength.label}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="text-gray-500 text-xs flex flex-col items-center space-y-1 py-1">
                                                                    <div className="w-8 h-8 rounded-full bg-green-50 text-[#64964E] flex items-center justify-center text-sm mb-0.5">
                                                                        <i className="fa-solid fa-shield-halved"></i>
                                                                    </div>
                                                                    <p className="font-bold text-gray-700">คำแนะนำการลงทะเบียน</p>
                                                                    <p className="text-[11px] text-gray-400 max-w-[210px] leading-tight">
                                                                        กรอกข้อมูลให้ครบถ้วน หากมีข้อผิดพลาดระบบจะแจ้งเตือน ณ ตรงนี้
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* OTP Step */
                                                <div className="space-y-4 max-w-sm mx-auto">
                                                    {otpMsg && (
                                                        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm text-center">
                                                            {otpMsg}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <label className="block text-sm font-semibold text-gray-700 mb-1 text-center">
                                                            รหัส OTP (6 หลัก)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            pattern="[0-9]*"
                                                            value={otp}
                                                            onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setRegError(''); }}
                                                            placeholder="000000"
                                                            maxLength={6}
                                                            className="w-full bg-white border-2 border-gray-300 rounded-xl px-4 py-3 text-2xl font-bold text-center outline-none tracking-[0.5em] focus:border-[#64964E]"
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* REGISTER CARD 2 */}
                                    <div className="bg-[#D9D9D9] rounded-t-none rounded-b-[2rem] p-4 sm:p-4.5 pt-0 shadow-sm">
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => switchMode('login')}
                                                className="w-full bg-white hover:bg-gray-100 text-gray-800 font-bold py-3 rounded-xl transition shadow-sm text-center text-sm sm:text-base active:scale-95"
                                            >
                                                กลับ
                                            </button>
                                            <button
                                                type="button"
                                                onClick={step === 'otp' ? handleVerifyAndRegister : handleFormSubmit}
                                                disabled={isRegLoading}
                                                className="w-full bg-[#64964E] hover:bg-[#527d40] text-white font-bold py-3 rounded-xl transition shadow-md text-center text-sm sm:text-base active:scale-95 disabled:opacity-50"
                                            >
                                                {isRegLoading ? 'กำลังดำเนินการ...' : step === 'otp' ? 'ยืนยัน OTP' : 'ยืนยัน'}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </motion.div>
        </div >
    );
}
