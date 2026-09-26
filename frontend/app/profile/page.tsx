"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';
import { getImageUrl } from '../utils/image';

export default function ProfilePage() {
    const router = useRouter();
    const { user, token, apiBase, refreshUser, isInitialized } = useSmartBin();

    const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Profile form state
    const [formData, setFormData] = useState({
        profileImageUrl: '',
        username: '',
        firstName: '',
        lastName: '',
        studentId: '',
        faculty: '',
        major: '',
        academicYear: '',
        address: '',
        age: ''
    });

    // Contact change state
    const [contactMode, setContactMode] = useState<'none' | 'email' | 'phone'>('none');
    const [newContact, setNewContact] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [contactLoading, setContactLoading] = useState(false);
    const [contactMessage, setContactMessage] = useState({ text: '', type: '' });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // ─── Security Tab State ───
    const [secStatus, setSecStatus] = useState<{
        hasPassword?: boolean;
        twoFactorEnabled?: boolean;
        email?: string;
        maskedEmail?: string;
        isAdmin?: boolean;
    } | null>(null);
    const [secLoading, setSecLoading] = useState(false);
    const [secMessage, setSecMessage] = useState({ text: '', type: '' });

    // Set Password Modal State (For Google users without password)
    const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
    const [setNewPassword, setSetNewPassword] = useState('');
    const [setConfirmPassword, setSetConfirmPassword] = useState('');
    const [showSetPassword, setShowSetPassword] = useState(false);
    const [setPasswordOtp, setSetPasswordOtp] = useState('');
    const [setPasswordOtpSent, setSetPasswordOtpSent] = useState(false);
    const [setPasswordCooldown, setSetPasswordCooldown] = useState(0);

    // Change Password Modal State (For users with password)
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [changeMethod, setChangeMethod] = useState<'old_password' | 'email_otp'>('old_password');
    const [currentPassword, setCurrentPassword] = useState('');
    const [changeNewPassword, setChangeNewPassword] = useState('');
    const [changeConfirmPassword, setChangeConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showChangeNewPassword, setShowChangeNewPassword] = useState(false);
    const [changePasswordOtp, setChangePasswordOtp] = useState('');
    const [changePasswordOtpSent, setChangePasswordOtpSent] = useState(false);
    const [changeOtpCooldown, setChangeOtpCooldown] = useState(0);

    // 2FA Modal State
    const [show2faModal, setShow2faModal] = useState(false);
    const [target2faState, setTarget2faState] = useState(false);
    const [twoFactorOtp, setTwoFactorOtp] = useState('');
    const [twoFactorOtpSent, setTwoFactorOtpSent] = useState(false);
    const [twoFactorCooldown, setTwoFactorCooldown] = useState(0);

    // Countdown timer for security OTPs
    useEffect(() => {
        const interval = setInterval(() => {
            setSetPasswordCooldown(c => (c > 0 ? c - 1 : 0));
            setChangeOtpCooldown(c => (c > 0 ? c - 1 : 0));
            setTwoFactorCooldown(c => (c > 0 ? c - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!isInitialized) return;
        if (!user) {
            router.replace('/login');
            return;
        }
        setFormData({
            profileImageUrl: user.profileImageUrl || '',
            username: user.username || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            studentId: user.studentId || '',
            faculty: user.faculty || '',
            major: user.major || '',
            academicYear: user.academicYear || '',
            address: user.address || '',
            age: user.age ? String(user.age) : ''
        });
        fetchSecurityStatus();
    }, [user, isInitialized, router]);

    const fetchSecurityStatus = async () => {
        if (!user) return;
        try {
            const res = await fetch(`${apiBase}/user/${user.id}/security-status`);
            if (res.ok) {
                const data = await res.json();
                setSecStatus(data);
            }
        } catch (e) {
            console.error("Failed to load security status", e);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingAvatar(true);
        const data = new FormData();
        data.append('file', file);

        try {
            const uploadUrl = apiBase.endsWith('/api') ? `${apiBase.slice(0, -4)}/api/upload` : `${apiBase}/upload`;
            const res = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: data
            });
            const result = await res.json();
            if (res.ok && (result.url || result.path)) {
                const imgPath = result.url || result.path;
                setFormData(prev => ({ ...prev, profileImageUrl: imgPath }));
            } else {
                setMessage({ text: 'อัปโหลดรูปภาพล้มเหลว', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'เกิดข้อผิดพลาดในการอัปโหลด', type: 'error' });
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setMessage({ text: '', type: '' });

        const payload = {
            ...formData,
            age: formData.age ? parseInt(formData.age) : null
        };

        try {
            const res = await fetch(`${apiBase}/user/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                await refreshUser();
                setMessage({ text: 'บันทึกข้อมูลเรียบร้อย', type: 'success' });
            } else {
                setMessage({ text: 'ไม่สามารถบันทึกข้อมูลได้', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleRequestOtp = async () => {
        if (!newContact.trim()) return;
        setContactLoading(true);
        setContactMessage({ text: '', type: '' });

        try {
            const res = await fetch(`${apiBase}/auth/request-change-contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: contactMode, newValue: newContact.trim() })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setOtpSent(true);
                setContactMessage({ text: data.message, type: 'success' });
            } else {
                setContactMessage({ text: data.error || 'เกิดข้อผิดพลาด', type: 'error' });
            }
        } catch (e) {
            setContactMessage({ text: 'Network Error', type: 'error' });
        } finally {
            setContactLoading(false);
        }
    };

    const handleConfirmOtp = async () => {
        if (!otp.trim()) return;
        setContactLoading(true);
        setContactMessage({ text: '', type: '' });

        try {
            const res = await fetch(`${apiBase}/auth/confirm-change-contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id, type: contactMode, newValue: newContact.trim(), otp: otp.trim() })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                await refreshUser();
                setContactMode('none');
                setOtpSent(false);
                setNewContact('');
                setOtp('');
                setMessage({ text: 'เปลี่ยนข้อมูลติดต่อสำเร็จ', type: 'success' });
            } else {
                setContactMessage({ text: data.error || 'รหัส OTP ไม่ถูกต้อง', type: 'error' });
            }
        } catch (e) {
            setContactMessage({ text: 'Network Error', type: 'error' });
        } finally {
            setContactLoading(false);
        }
    };

    // ─── Security: Password Strength Helper ───
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
        return { label: 'ปลอดภัยสูง', color: 'text-[#64964E]', barColor: 'bg-[#64964E]', percent: 100 };
    };

    // ─── Security: Send OTP Helper ───
    const sendSecurityOtp = async (): Promise<boolean> => {
        if (!user) return false;
        try {
            const res = await fetch(`${apiBase}/user/${user.id}/security-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                return true;
            } else {
                alert(data.error || 'ไม่สามารถส่งรหัส OTP ได้');
                return false;
            }
        } catch (e) {
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
            return false;
        }
    };

    // ─── Security: Handle Set Password Submit ───
    const handleSetPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!setNewPassword || setNewPassword.length < 8 || setNewPassword.length > 20) {
            setSecMessage({ text: 'รหัสผ่านต้องมีความยาว 8-20 ตัวอักษร', type: 'error' });
            return;
        }
        if (setNewPassword !== setConfirmPassword) {
            setSecMessage({ text: 'รหัสผ่านใหม่และการยืนยันไม่ตรงกัน', type: 'error' });
            return;
        }
        if (!setPasswordOtp.trim()) {
            setSecMessage({ text: 'กรุณากรอกรหัส OTP ที่ได้รับทางอีเมล', type: 'error' });
            return;
        }

        setSecLoading(true);
        setSecMessage({ text: '', type: '' });
        try {
            const res = await fetch(`${apiBase}/user/${user.id}/set-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ newPassword: setNewPassword, otp: setPasswordOtp.trim() })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                await refreshUser();
                await fetchSecurityStatus();
                setShowSetPasswordModal(false);
                setSetNewPassword('');
                setSetConfirmPassword('');
                setSetPasswordOtp('');
                setSetPasswordOtpSent(false);
                setMessage({ text: 'ตั้งรหัสผ่านสำเร็จ ตอนนี้คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านได้แล้ว', type: 'success' });
            } else {
                setSecMessage({ text: data.error || 'เกิดข้อผิดพลาดในการตั้งรหัสผ่าน', type: 'error' });
            }
        } catch (e) {
            setSecMessage({ text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ', type: 'error' });
        } finally {
            setSecLoading(false);
        }
    };

    // ─── Security: Handle Change Password Submit ───
    const handleChangePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!changeNewPassword || changeNewPassword.length < 8 || changeNewPassword.length > 20) {
            setSecMessage({ text: 'รหัสผ่านใหม่ต้องมีความยาว 8-20 ตัวอักษร', type: 'error' });
            return;
        }
        if (changeNewPassword !== changeConfirmPassword) {
            setSecMessage({ text: 'รหัสผ่านใหม่และการยืนยันไม่ตรงกัน', type: 'error' });
            return;
        }

        const payload: any = { newPassword: changeNewPassword };
        if (changeMethod === 'old_password') {
            if (!currentPassword) {
                setSecMessage({ text: 'กรุณากรอกรหัสผ่านเดิม', type: 'error' });
                return;
            }
            payload.currentPassword = currentPassword;
        } else {
            if (!changePasswordOtp.trim()) {
                setSecMessage({ text: 'กรุณากรอกรหัส OTP ที่ได้รับทางอีเมล', type: 'error' });
                return;
            }
            payload.otp = changePasswordOtp.trim();
        }

        setSecLoading(true);
        setSecMessage({ text: '', type: '' });
        try {
            const res = await fetch(`${apiBase}/user/${user.id}/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok && data.success) {
                await refreshUser();
                await fetchSecurityStatus();
                setShowChangePasswordModal(false);
                setCurrentPassword('');
                setChangeNewPassword('');
                setChangeConfirmPassword('');
                setChangePasswordOtp('');
                setChangePasswordOtpSent(false);
                setMessage({ text: 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว', type: 'success' });
            } else {
                setSecMessage({ text: data.error || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน', type: 'error' });
            }
        } catch (e) {
            setSecMessage({ text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ', type: 'error' });
        } finally {
            setSecLoading(false);
        }
    };

    // ─── Security: Handle Toggle 2FA Submit ───
    const handleToggle2faSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!twoFactorOtp.trim()) {
            setSecMessage({ text: 'กรุณากรอกรหัส OTP ที่ได้รับทางอีเมล', type: 'error' });
            return;
        }

        setSecLoading(true);
        setSecMessage({ text: '', type: '' });
        try {
            const res = await fetch(`${apiBase}/user/${user.id}/toggle-2fa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ enabled: target2faState, otp: twoFactorOtp.trim() })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                await refreshUser();
                await fetchSecurityStatus();
                setShow2faModal(false);
                setTwoFactorOtp('');
                setTwoFactorOtpSent(false);
                setMessage({ text: data.message || 'บันทึกการตั้งค่า 2FA สำเร็จ', type: 'success' });
            } else {
                setSecMessage({ text: data.error || 'เกิดข้อผิดพลาดในการตั้งค่า 2FA', type: 'error' });
            }
        } catch (e) {
            setSecMessage({ text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ', type: 'error' });
        } finally {
            setSecLoading(false);
        }
    };

    const hasPassword = secStatus?.hasPassword ?? user?.hasPassword ?? false;
    const is2faActive = secStatus?.twoFactorEnabled ?? user?.twoFactorEnabled ?? false;
    const isAdmin = secStatus?.isAdmin ?? (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.email === 'sbay.smartcompany@gmail.com');
    const displayEmail = secStatus?.maskedEmail || (user?.email ? user.email.slice(0, 3) + '***@' + user.email.split('@')[1] : 'อีเมลของคุณ');

    if (!isInitialized || !user) {
        return (
            <div style={{ backgroundImage: "url('/images/bg_loginregis.jpg')" }} className="pt-24 pb-12 font-sans px-4 min-h-screen animate-pulse">
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="flex items-center space-x-4 mb-8">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div className="w-40 h-8 bg-gray-200 rounded"></div>
                    </div>
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8 space-y-6">
                        <div className="h-12 bg-gray-200 rounded-xl"></div>
                        <div className="h-64 bg-gray-100 rounded-2xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ backgroundImage: "url('/images/bg_loginregis.jpg')" }} className="pt-1 pb-16 font-sans px-4 min-h-screen">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Header Area */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => router.back()} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 transition text-gray-600">
                            <i className="fa-solid fa-arrow-left"></i>
                        </button>
                        <h1 className="text-2xl font-black text-white">โปรไฟล์ของฉัน</h1>
                    </div>

                    {/* Role badge */}
                    <div className="bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/30 text-white text-xs font-bold flex items-center gap-1.5">
                        <i className={user.role === 'SUPER_ADMIN' ? "fa-solid fa-crown text-amber-300" : user.role === 'ADMIN' ? "fa-solid fa-user-shield text-emerald-200" : "fa-solid fa-user text-white/80"}></i>
                        <span>{user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'ADMIN' ? 'Admin' : user.role === 'PARTNER' ? 'Partner' : 'Member'}</span>
                    </div>
                </div>

                {/* Top Tabs Switcher */}
                <div className="flex bg-black/25 p-1.5 rounded-2xl backdrop-blur-md max-w-md mx-auto shadow-inner border border-white/10">
                    <button
                        type="button"
                        onClick={() => { setActiveTab('profile'); setMessage({ text: '', type: '' }); }}
                        className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                            activeTab === 'profile'
                                ? 'bg-white text-[#64964E] shadow-md scale-100'
                                : 'text-white/85 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        <i className="fa-solid fa-user text-xs"></i>
                        <span>ข้อมูลทั่วไป</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActiveTab('security'); setMessage({ text: '', type: '' }); fetchSecurityStatus(); }}
                        className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 relative ${
                            activeTab === 'security'
                                ? 'bg-white text-[#64964E] shadow-md scale-100'
                                : 'text-white/85 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        <i className="fa-solid fa-shield-halved text-xs"></i>
                        <span>ความปลอดภัย & 2FA</span>
                        {!hasPassword && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-2 right-3 animate-ping"></span>
                        )}
                    </button>
                </div>

                {/* Global Toast Message */}
                {message.text && (
                    <div className={`p-4 rounded-2xl text-center font-bold shadow-lg animate-in fade-in duration-200 ${message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-600 border border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                {/* ═════════════════════════════════════════════════════════════════════ */}
                {/* TAB 1: PROFILE GENERAL INFO                                         */}
                {/* ═════════════════════════════════════════════════════════════════════ */}
                {activeTab === 'profile' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        {/* Main Profile Form */}
                        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                            <form onSubmit={handleSaveProfile}>
                                {/* Top banner / Avatar */}
                                <div className="bg-[#64964E] h-32 relative flex justify-center">
                                    <div className="absolute -bottom-12 relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        <div className="w-28 h-28 bg-white rounded-full p-1 shadow-lg overflow-hidden">
                                            {formData.profileImageUrl ? (
                                                <img src={getImageUrl(formData.profileImageUrl)} alt="avatar" className="w-full h-full object-cover rounded-full" />
                                            ) : (
                                                <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-4xl text-gray-400 font-bold">
                                                    {(user.firstName || user.username || user.email || '?').charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute inset-1 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <i className="fa-solid fa-camera text-white text-xl"></i>
                                        </div>
                                        {uploadingAvatar && (
                                            <div className="absolute inset-1 bg-white/80 rounded-full flex items-center justify-center">
                                                <div className="w-6 h-6 border-2 border-[#64964E] border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        )}
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                    </div>
                                </div>

                                <div className="p-8 pt-16">
                                    <div className="mb-6">
                                        <h2 className="text-xl font-bold text-gray-800 mb-2 border-b pb-2">ข้อมูลส่วนตัว (Preset)</h2>
                                        <p className="text-sm text-gray-500">ข้อมูลเหล่านี้จะถูกดึงไปใช้เพื่อกรอกอัตโนมัติเวลาที่คุณแลกของรางวัล</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-1">
                                            <label className="text-sm font-bold text-gray-700">ชื่อผู้ใช้ (Username)</label>
                                            <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#64964E]" placeholder="ชื่อผู้ใช้" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-bold text-gray-700">อายุ</label>
                                            <input type="number" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#64964E]" placeholder="อายุ (ปี)" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-bold text-gray-700">ชื่อ</label>
                                            <input type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#64964E]" placeholder="ชื่อจริง" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-bold text-gray-700">นามสกุล</label>
                                            <input type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#64964E]" placeholder="นามสกุล" />
                                        </div>
                                    </div>

                                    <div className="mt-5 space-y-1">
                                        <label className="text-sm font-bold text-gray-700">ที่อยู่จัดส่ง / ติดต่อ</label>
                                        <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#64964E] resize-none" placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"></textarea>
                                    </div>

                                    <div className="mt-8 mb-4 border-b pb-2">
                                        <h2 className="text-lg font-bold text-gray-800">ข้อมูลนักศึกษา</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-1">
                                            <label className="text-sm font-bold text-gray-700">รหัสนักศึกษา</label>
                                            <input type="text" value={formData.studentId} onChange={e => setFormData({ ...formData, studentId: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#64964E]" placeholder="รหัสนักศึกษา 13 หลัก" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-bold text-gray-700">คณะ</label>
                                            <input type="text" value={formData.faculty} onChange={e => setFormData({ ...formData, faculty: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#64964E]" placeholder="คณะที่กำลังศึกษา" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-bold text-gray-700">สาขาวิชา</label>
                                            <input type="text" value={formData.major} onChange={e => setFormData({ ...formData, major: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#64964E]" placeholder="สาขาวิชาเอก" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-bold text-gray-700">ปีการศึกษา</label>
                                            <input type="text" value={formData.academicYear || ''} onChange={e => setFormData({ ...formData, academicYear: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#64964E]" placeholder="เช่น 2569" />
                                        </div>
                                    </div>

                                    <div className="mt-10 flex justify-end">
                                        <button type="submit" disabled={loading} className="bg-[#64964E] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-green-900/20 hover:bg-[#527d40] transition disabled:opacity-50 flex items-center space-x-2">
                                            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <i className="fa-solid fa-save"></i>}
                                            <span>บันทึกข้อมูล</span>
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Contact Info (Read-only + Change buttons) */}
                        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">ข้อมูลบัญชีและการติดต่อ</h2>

                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">อีเมลที่ผูกกับบัญชี</p>
                                        <p className="font-medium text-gray-900 text-lg mt-0.5">{user.email || '-'}</p>
                                    </div>
                                    <button onClick={() => { setContactMode('email'); setOtpSent(false); setNewContact(''); setContactMessage({ text: '', type: '' }) }} className="text-sm font-bold text-[#64964E] hover:underline bg-white px-4 py-2 rounded-lg border border-[#64964E]/30 shrink-0">
                                        เปลี่ยนอีเมล
                                    </button>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">เบอร์โทรศัพท์มือถือ</p>
                                        <p className="font-medium text-gray-900 text-lg mt-0.5">{user.phoneNumber || '-'}</p>
                                    </div>
                                    <button onClick={() => { setContactMode('phone'); setOtpSent(false); setNewContact(''); setContactMessage({ text: '', type: '' }) }} className="text-sm font-bold text-[#64964E] hover:underline bg-white px-4 py-2 rounded-lg border border-[#64964E]/30 shrink-0">
                                        เปลี่ยนเบอร์โทร
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═════════════════════════════════════════════════════════════════════ */}
                {/* TAB 2: SECURITY & 2FA MANAGEMENT                                    */}
                {/* ═════════════════════════════════════════════════════════════════════ */}
                {activeTab === 'security' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        {/* Security Overview Shield Card */}
                        <div className="bg-gradient-to-r from-[#527d40] to-[#64964E] rounded-3xl p-6 sm:p-7 text-white shadow-xl shadow-green-950/15 relative overflow-hidden border border-white/20">
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-13 h-13 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl text-white shadow-inner shrink-0">
                                        <i className="fa-solid fa-shield-halved"></i>
                                    </div>
                                    <div>
                                        <h2 className="text-xl sm:text-2xl font-black tracking-tight">ศูนย์ความปลอดภัยบัญชี</h2>
                                        <p className="text-white/80 text-xs sm:text-sm mt-0.5">จัดการรหัสผ่าน และการยืนยันตัวตน 2 ขั้นตอน (2FA)</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2.5">
                                    {/* Password Badge */}
                                    <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md ${
                                        hasPassword
                                            ? 'bg-white/20 text-white border border-white/30'
                                            : 'bg-amber-400/25 text-amber-100 border border-amber-300/40'
                                    }`}>
                                        <i className={hasPassword ? "fa-solid fa-circle-check text-xs" : "fa-solid fa-triangle-exclamation text-xs"}></i>
                                        <span>{hasPassword ? 'ตั้งรหัสผ่านแล้ว' : 'ยังไม่มีรหัสผ่าน (Google)'}</span>
                                    </div>

                                    {/* 2FA Badge */}
                                    <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md ${
                                        is2faActive || isAdmin
                                            ? 'bg-white/20 text-white border border-white/30'
                                            : 'bg-black/20 text-white/80 border border-white/20'
                                    }`}>
                                        <i className="fa-solid fa-shield text-xs"></i>
                                        <span>{is2faActive || isAdmin ? '2FA: เปิดใช้งาน' : '2FA: ปิดใช้งาน'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 1: PASSWORD STATUS & SETUP */}
                        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-100">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                                <div className="w-10 h-10 rounded-xl bg-[#64964E]/10 text-[#64964E] flex items-center justify-center font-bold text-base">
                                    <i className="fa-solid fa-key"></i>
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-gray-900">การจัดการรหัสผ่าน (Password)</h3>
                                    <p className="text-xs text-gray-500">สำหรับเข้าใช้งานระบบด้วยอีเมลและรหัสผ่านบนอุปกรณ์ใดก็ได้</p>
                                </div>
                            </div>

                            {!hasPassword ? (
                                /* Case 1: User has NO password (Google Login user) */
                                <div className="space-y-4">
                                    <div className="p-5 bg-[#64964E]/5 border border-[#64964E]/25 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex items-start gap-3.5">
                                            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                                <i className="fa-solid fa-triangle-exclamation text-sm"></i>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm sm:text-base">คุณยังไม่มีรหัสผ่าน (เข้าสู่ระบบด้วย Google)</h4>
                                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                                    ปัจจุบันบัญชีของคุณเข้าสู่ระบบผ่าน Google เท่านั้น คุณต้องการเพิ่มรหัสผ่านสำหรับบัญชีนี้เพื่อใช้เข้าสู่ระบบด้วยอีเมลบนเบราว์เซอร์หรือเครื่องอื่นหรือไม่?
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setShowSetPasswordModal(true);
                                                setSetPasswordOtpSent(false);
                                                setSetPasswordOtp('');
                                                setSetNewPassword('');
                                                setSetConfirmPassword('');
                                                setSecMessage({ text: '', type: '' });
                                                // Automatically send OTP
                                                const sent = await sendSecurityOtp();
                                                if (sent) {
                                                    setSetPasswordOtpSent(true);
                                                    setSetPasswordCooldown(60);
                                                }
                                            }}
                                            className="w-full sm:w-auto px-5 py-2.5 bg-[#64964E] hover:bg-[#527d40] text-white font-bold rounded-xl shadow-md shadow-[#64964E]/20 transition active:scale-95 shrink-0 text-sm flex items-center justify-center gap-2"
                                        >
                                            <i className="fa-solid fa-plus text-xs"></i>
                                            <span>เพิ่มรหัสผ่าน</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Case 2: User ALREADY has a password */
                                <div className="space-y-4">
                                    <div className="p-5 bg-gray-50 border border-gray-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex items-start gap-3.5">
                                            <div className="w-9 h-9 rounded-xl bg-[#64964E] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                                <i className="fa-solid fa-lock text-sm"></i>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-gray-900 text-sm sm:text-base">บัญชีของคุณตั้งรหัสผ่านเรียบร้อยแล้ว</h4>
                                                    <span className="bg-[#64964E]/15 text-[#527d40] text-[10px] font-black px-2 py-0.5 rounded-full">พร้อมใช้งาน</span>
                                                </div>
                                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                                    คุณสามารถเข้าสู่ระบบด้วยรหัสผ่าน หรือเข้าสู่ระบบด้วย Google ได้ตามปกติ หากต้องการเปลี่ยนรหัสผ่านเพื่อความปลอดภัย สามารถทำได้ทันที
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowChangePasswordModal(true);
                                                setCurrentPassword('');
                                                setChangeNewPassword('');
                                                setChangeConfirmPassword('');
                                                setChangePasswordOtp('');
                                                setChangePasswordOtpSent(false);
                                                setSecMessage({ text: '', type: '' });
                                            }}
                                            className="w-full sm:w-auto px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl shadow-sm transition active:scale-95 shrink-0 text-sm flex items-center justify-center gap-2"
                                        >
                                            <i className="fa-solid fa-key text-xs"></i>
                                            <span>เปลี่ยนรหัสผ่าน</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SECTION 2: TWO-FACTOR AUTHENTICATION (2FA) */}
                        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-100">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#64964E]/10 text-[#64964E] flex items-center justify-center font-bold text-base">
                                        <i className="fa-solid fa-shield-halved"></i>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900">การยืนยันตัวตน 2 ขั้นตอน (2FA)</h3>
                                        <p className="text-xs text-gray-500">ระบบรักษาความปลอดภัยด้วยรหัส OTP ส่งไปยังอีเมล</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 bg-gray-50 border border-gray-200/80 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div className="space-y-1.5 max-w-xl">
                                    <div className="flex items-center gap-2.5">
                                        <h4 className="font-bold text-gray-900 text-base">ระบบ Email OTP 2FA</h4>
                                        {isAdmin ? (
                                            <span className="bg-[#64964E]/15 text-[#527d40] text-[10px] font-black px-2.5 py-0.5 rounded-full border border-[#64964E]/30 flex items-center gap-1">
                                                <i className="fa-solid fa-shield-halved text-xs"></i>
                                                <span>นโยบายความปลอดภัย Admin</span>
                                            </span>
                                        ) : is2faActive ? (
                                            <span className="bg-[#64964E]/15 text-[#527d40] text-[10px] font-black px-2.5 py-0.5 rounded-full border border-[#64964E]/30 flex items-center gap-1">
                                                <i className="fa-solid fa-circle-check text-xs"></i>
                                                <span>เปิดใช้งานแล้ว</span>
                                            </span>
                                        ) : (
                                            <span className="bg-gray-200 text-gray-700 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                                                ปิดใช้งาน
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        เมื่อเปิดใช้งาน ทุกครั้งที่มีการเข้าสู่ระบบด้วยรหัสผ่าน ระบบจะส่งรหัสผ่านใช้ครั้งเดียว (OTP 6 หลัก) ไปยังอีเมล <strong>{displayEmail}</strong> เพื่อยืนยันตัวตน ป้องกันการถูกขโมยบัญชี
                                    </p>
                                </div>

                                <div className="shrink-0 w-full md:w-auto flex items-center justify-end">
                                    {isAdmin ? (
                                        <div className="text-xs text-[#527d40] font-bold bg-[#64964E]/10 px-3.5 py-2 rounded-xl border border-[#64964E]/20 flex items-center gap-1.5">
                                            <i className="fa-solid fa-lock"></i>
                                            <span>เปิดใช้งานตลอดเวลา</span>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const nextState = !is2faActive;
                                                setTarget2faState(nextState);
                                                setShow2faModal(true);
                                                setTwoFactorOtp('');
                                                setTwoFactorOtpSent(false);
                                                setSecMessage({ text: '', type: '' });
                                                // Send OTP to confirm toggle
                                                const sent = await sendSecurityOtp();
                                                if (sent) {
                                                    setTwoFactorOtpSent(true);
                                                    setTwoFactorCooldown(60);
                                                }
                                            }}
                                            className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition active:scale-95 flex items-center gap-2 ${
                                                is2faActive
                                                    ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                                    : 'bg-[#64964E] hover:bg-[#527d40] text-white shadow-[#64964E]/20'
                                            }`}
                                        >
                                            <i className={is2faActive ? "fa-solid fa-toggle-on text-lg text-red-600" : "fa-solid fa-toggle-off text-lg text-white/80"}></i>
                                            <span>{is2faActive ? 'ปิดใช้งาน 2FA' : 'เปิดใช้งาน 2FA'}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═════════════════════════════════════════════════════════════════════ */}
                {/* MODALS                                                              */}
                {/* ═════════════════════════════════════════════════════════════════════ */}

                {/* Modal 1: Set Password (For users without password) */}
                {showSetPasswordModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 w-full max-w-md animate-in zoom-in-95 duration-200">
                            <div className="w-14 h-14 bg-[#64964E]/10 text-[#64964E] rounded-2xl flex items-center justify-center mx-auto mb-3 text-xl font-bold border border-[#64964E]/20">
                                <i className="fa-solid fa-key"></i>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 text-center mb-1">ตั้งรหัสผ่านใหม่</h3>
                            <p className="text-xs text-gray-500 text-center mb-6 leading-relaxed">
                                กรอกรหัสผ่านใหม่และรหัส OTP 6 หลักที่ส่งไปยังอีเมล <strong>{displayEmail}</strong> เพื่อยืนยันความเป็นเจ้าของบัญชี
                            </p>

                            {secMessage.text && (
                                <div className={`mb-4 p-3 rounded-xl text-xs font-bold ${secMessage.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                    {secMessage.text}
                                </div>
                            )}

                            <form onSubmit={handleSetPasswordSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-700">รหัสผ่านใหม่ (8-20 ตัวอักษร)</label>
                                    <div className="relative mt-1">
                                        <input
                                            type={showSetPassword ? "text" : "password"}
                                            value={setNewPassword}
                                            onChange={e => setSetNewPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-[#64964E] text-sm"
                                        />
                                        <button type="button" onClick={() => setShowSetPassword(!showSetPassword)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                                            <i className={showSetPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
                                        </button>
                                    </div>
                                    {setNewPassword && (
                                        <div className="mt-1.5 flex items-center justify-between text-[11px]">
                                            <div className="w-24 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                                <div className={`h-full ${getStrength(setNewPassword).barColor}`} style={{ width: `${getStrength(setNewPassword).percent}%` }}></div>
                                            </div>
                                            <span className={`font-bold ${getStrength(setNewPassword).color}`}>ระดับความปลอดภัย: {getStrength(setNewPassword).label}</span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-700">ยืนยันรหัสผ่านใหม่อีกครั้ง</label>
                                    <input
                                        type="password"
                                        value={setConfirmPassword}
                                        onChange={e => setSetConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#64964E] text-sm"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-gray-700">รหัสยืนยัน OTP (6 หลัก)</label>
                                        <button
                                            type="button"
                                            disabled={setPasswordCooldown > 0 || secLoading}
                                            onClick={async () => {
                                                const sent = await sendSecurityOtp();
                                                if (sent) setSetPasswordCooldown(60);
                                            }}
                                            className="text-xs font-bold text-[#64964E] hover:text-[#527d40] disabled:text-gray-400 disabled:cursor-not-allowed"
                                        >
                                            {setPasswordCooldown > 0 ? `ส่งใหม่ใน (${setPasswordCooldown}s)` : 'ขอรับ OTP อีกครั้ง'}
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={setPasswordOtp}
                                        onChange={e => setSetPasswordOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                        placeholder="• • • • • •"
                                        className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-center text-xl font-bold tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-[#64964E]"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowSetPasswordModal(false)}
                                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={secLoading || !setNewPassword || setPasswordOtp.length !== 6}
                                        className="flex-1 py-3 bg-[#64964E] hover:bg-[#527d40] text-white font-bold rounded-xl text-sm shadow-lg shadow-[#64964E]/25 transition disabled:opacity-50"
                                    >
                                        {secLoading ? 'กำลังบันทึก...' : 'ยืนยันและบันทึก'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal 2: Change Password (For users with existing password) */}
                {showChangePasswordModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 w-full max-w-md animate-in zoom-in-95 duration-200">
                            <div className="w-14 h-14 bg-[#64964E]/10 text-[#64964E] rounded-2xl flex items-center justify-center mx-auto mb-3 text-xl font-bold border border-[#64964E]/20">
                                <i className="fa-solid fa-key"></i>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 text-center mb-1">เปลี่ยนรหัสผ่าน</h3>
                            <p className="text-xs text-gray-500 text-center mb-5">
                                เลือกวิธียืนยันตัวตนเพื่อเปลี่ยนรหัสผ่านใหม่
                            </p>

                            {/* Method Selector Tabs */}
                            <div className="flex bg-gray-100 p-1 rounded-xl mb-4 text-xs font-bold">
                                <button
                                    type="button"
                                    onClick={() => setChangeMethod('old_password')}
                                    className={`flex-1 py-2 rounded-lg transition ${changeMethod === 'old_password' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    ใช้รหัสผ่านเดิม
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setChangeMethod('email_otp');
                                        if (!changePasswordOtpSent) {
                                            const sent = await sendSecurityOtp();
                                            if (sent) {
                                                setChangePasswordOtpSent(true);
                                                setChangeOtpCooldown(60);
                                            }
                                        }
                                    }}
                                    className={`flex-1 py-2 rounded-lg transition ${changeMethod === 'email_otp' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    ยืนยันด้วย Email OTP
                                </button>
                            </div>

                            {secMessage.text && (
                                <div className={`mb-4 p-3 rounded-xl text-xs font-bold ${secMessage.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                    {secMessage.text}
                                </div>
                            )}

                            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                                {changeMethod === 'old_password' ? (
                                    <div>
                                        <label className="text-xs font-bold text-gray-700">รหัสผ่านปัจจุบัน (รหัสเดิม)</label>
                                        <div className="relative mt-1">
                                            <input
                                                type={showCurrentPassword ? "text" : "password"}
                                                value={currentPassword}
                                                onChange={e => setCurrentPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-[#64964E] text-sm"
                                            />
                                            <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                                                <i className={showCurrentPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-gray-700">รหัส OTP ที่ได้รับทางอีเมล</label>
                                            <button
                                                type="button"
                                                disabled={changeOtpCooldown > 0 || secLoading}
                                                onClick={async () => {
                                                    const sent = await sendSecurityOtp();
                                                    if (sent) setChangeOtpCooldown(60);
                                                }}
                                                className="text-xs font-bold text-[#64964E] hover:text-[#527d40] disabled:text-gray-400 disabled:cursor-not-allowed"
                                            >
                                                {changeOtpCooldown > 0 ? `ส่งใหม่ใน (${changeOtpCooldown}s)` : 'ขอรับ OTP อีกครั้ง'}
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            value={changePasswordOtp}
                                            onChange={e => setChangePasswordOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                            placeholder="• • • • • •"
                                            className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-center text-xl font-bold tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-[#64964E]"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-bold text-gray-700">รหัสผ่านใหม่ (8-20 ตัวอักษร)</label>
                                    <div className="relative mt-1">
                                        <input
                                            type={showChangeNewPassword ? "text" : "password"}
                                            value={changeNewPassword}
                                            onChange={e => setChangeNewPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-[#64964E] text-sm"
                                        />
                                        <button type="button" onClick={() => setShowChangeNewPassword(!showChangeNewPassword)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                                            <i className={showChangeNewPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
                                        </button>
                                    </div>
                                    {changeNewPassword && (
                                        <div className="mt-1.5 flex items-center justify-between text-[11px]">
                                            <div className="w-24 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                                <div className={`h-full ${getStrength(changeNewPassword).barColor}`} style={{ width: `${getStrength(changeNewPassword).percent}%` }}></div>
                                            </div>
                                            <span className={`font-bold ${getStrength(changeNewPassword).color}`}>ระดับ: {getStrength(changeNewPassword).label}</span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-700">ยืนยันรหัสผ่านใหม่อีกครั้ง</label>
                                    <input
                                        type="password"
                                        value={changeConfirmPassword}
                                        onChange={e => setChangeConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#64964E] text-sm"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowChangePasswordModal(false)}
                                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={secLoading || !changeNewPassword || (changeMethod === 'old_password' ? !currentPassword : changePasswordOtp.length !== 6)}
                                        className="flex-1 py-3 bg-[#64964E] hover:bg-[#527d40] text-white font-bold rounded-xl text-sm shadow-lg shadow-[#64964E]/25 transition disabled:opacity-50"
                                    >
                                        {secLoading ? 'กำลังเปลี่ยน...' : 'ยืนยันเปลี่ยนรหัส'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal 3: Toggle 2FA Confirmation */}
                {show2faModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 w-full max-w-md animate-in zoom-in-95 duration-200">
                            <div className="w-14 h-14 bg-[#64964E]/10 text-[#64964E] rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-bold border border-[#64964E]/20">
                                <i className="fa-solid fa-shield-halved"></i>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 text-center mb-1">
                                {target2faState ? 'ยืนยันเปิดใช้งาน 2FA' : 'ยืนยันปิดใช้งาน 2FA'}
                            </h3>
                            <p className="text-xs text-gray-500 text-center mb-6 leading-relaxed">
                                เพื่อความปลอดภัยสูงสุด ระบบได้ส่งรหัส OTP 6 หลักไปยังอีเมล <strong>{displayEmail}</strong> กรุณากรอกรหัสเพื่อยืนยันการตั้งค่า
                            </p>

                            {secMessage.text && (
                                <div className={`mb-4 p-3 rounded-xl text-xs font-bold ${secMessage.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                    {secMessage.text}
                                </div>
                            )}

                            <form onSubmit={handleToggle2faSubmit} className="space-y-4">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-gray-700">รหัสยืนยัน OTP (6 หลัก)</label>
                                        <button
                                            type="button"
                                            disabled={twoFactorCooldown > 0 || secLoading}
                                            onClick={async () => {
                                                const sent = await sendSecurityOtp();
                                                if (sent) setTwoFactorCooldown(60);
                                            }}
                                            className="text-xs font-bold text-[#64964E] hover:text-[#527d40] disabled:text-gray-400 disabled:cursor-not-allowed"
                                        >
                                            {twoFactorCooldown > 0 ? `ส่งใหม่ใน (${twoFactorCooldown}s)` : 'ขอรับ OTP อีกครั้ง'}
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        autoFocus
                                        value={twoFactorOtp}
                                        onChange={e => setTwoFactorOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                        placeholder="• • • • • •"
                                        className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-[#64964E]"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShow2faModal(false)}
                                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={secLoading || twoFactorOtp.length !== 6}
                                        className={`flex-1 py-3 text-white font-bold rounded-xl text-sm shadow-lg transition disabled:opacity-50 ${
                                            target2faState
                                                ? 'bg-[#64964E] hover:bg-[#527d40] shadow-[#64964E]/25'
                                                : 'bg-red-600 hover:bg-red-700 shadow-red-500/25'
                                        }`}
                                    >
                                        {secLoading ? 'กำลังตรวจสอบ...' : target2faState ? 'เปิดใช้งาน 2FA' : 'ปิดใช้งาน 2FA'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal 4: Contact Change Modal */}
                {contactMode !== 'none' && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setContactMode('none')} />
                        <div className="bg-white rounded-3xl p-6 shadow-2xl relative z-10 w-full max-w-md animate-in zoom-in-95 duration-200">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">
                                {contactMode === 'email' ? 'เปลี่ยนอีเมลใหม่' : 'เปลี่ยนเบอร์โทรใหม่'}
                            </h3>

                            {contactMessage.text && (
                                <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${contactMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                                    {contactMessage.text}
                                </div>
                            )}

                            {!otpSent ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-bold text-gray-700">{contactMode === 'email' ? 'กรอกอีเมลใหม่' : 'กรอกเบอร์โทรใหม่'}</label>
                                        <input
                                            type={contactMode === 'email' ? "email" : "tel"}
                                            value={newContact}
                                            onChange={e => setNewContact(e.target.value)}
                                            className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#64964E]"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setContactMode('none')} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition">ยกเลิก</button>
                                        <button onClick={handleRequestOtp} disabled={!newContact.trim() || contactLoading} className="flex-1 px-4 py-3 bg-[#64964E] text-white rounded-xl font-bold hover:bg-[#527d40] transition disabled:opacity-50">
                                            {contactLoading ? 'กำลังส่ง...' : 'ขอรับ OTP'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-bold text-gray-700">กรอกรหัส OTP ที่ได้รับ</label>
                                        <input
                                            type="text"
                                            value={otp}
                                            onChange={e => setOtp(e.target.value)}
                                            className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#64964E] text-center text-2xl tracking-widest font-mono"
                                            maxLength={6}
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setOtpSent(false)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition">กลับ</button>
                                        <button onClick={handleConfirmOtp} disabled={!otp.trim() || contactLoading} className="flex-1 px-4 py-3 bg-[#64964E] text-white rounded-xl font-bold hover:bg-[#527d40] transition disabled:opacity-50">
                                            {contactLoading ? 'ตรวจสอบ...' : 'ยืนยันเปลี่ยน'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
