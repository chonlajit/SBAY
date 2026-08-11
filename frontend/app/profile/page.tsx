"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';

const BG_STYLE: React.CSSProperties = {
    backgroundColor: '#f8fafc', // Clean slate-50
    minHeight: '100vh',
};

export default function ProfilePage() {
    const router = useRouter();
    const { user, token, apiBase, refreshUser, isInitialized } = useSmartBin();

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Profile form state
    const [formData, setFormData] = useState({
        profileImageUrl: '',
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

    useEffect(() => {
        if (!isInitialized) return;
        if (!user) {
            router.replace('/login');
            return;
        }
        setFormData({
            profileImageUrl: user.profileImageUrl || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            studentId: user.studentId || '',
            faculty: user.faculty || '',
            major: user.major || '',
            academicYear: user.academicYear || '',
            address: user.address || '',
            age: user.age ? String(user.age) : ''
        });
    }, [user, isInitialized, router]);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingAvatar(true);
        const data = new FormData();
        data.append('file', file);

        try {
            const res = await fetch(`${apiBase}/api/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: data
            });
            const result = await res.json();
            if (res.ok && result.path) {
                const fullUrl = `${apiBase}${result.path}`;
                setFormData(prev => ({ ...prev, profileImageUrl: fullUrl }));
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

    if (!isInitialized || !user) return <div className="min-h-screen bg-slate-50 animate-pulse" />;

    return (
        <div style={BG_STYLE} className="pt-24 pb-12 font-sans px-4">
            <div className="max-w-3xl mx-auto space-y-6">
                
                {/* Header Area */}
                <div className="flex items-center space-x-4 mb-8">
                    <button onClick={() => router.back()} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 transition text-gray-600">
                        <i className="fa-solid fa-arrow-left"></i>
                    </button>
                    <h1 className="text-2xl font-black text-[#64964E]">โปรไฟล์ของฉัน</h1>
                </div>

                {message.text && (
                    <div className={`p-4 rounded-xl text-center font-bold ${message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-600 border border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                {/* Main Profile Form */}
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                    <form onSubmit={handleSaveProfile}>
                        {/* Top banner / Avatar */}
                        <div className="bg-[#64964E] h-32 relative flex justify-center">
                            <div className="absolute -bottom-12 relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className="w-28 h-28 bg-white rounded-full p-1 shadow-lg overflow-hidden">
                                    {formData.profileImageUrl ? (
                                        <img src={formData.profileImageUrl} alt="avatar" className="w-full h-full object-cover rounded-full" />
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
                                    <label className="text-sm font-bold text-gray-700">ชื่อ</label>
                                    <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#64964E]" placeholder="ชื่อจริง" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700">นามสกุล</label>
                                    <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#64964E]" placeholder="นามสกุล" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700">อายุ</label>
                                    <input type="number" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#64964E]" placeholder="อายุ (ปี)" />
                                </div>
                            </div>
                            
                            <div className="mt-5 space-y-1">
                                <label className="text-sm font-bold text-gray-700">ที่อยู่จัดส่ง / ติดต่อ</label>
                                <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#64964E] resize-none" placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"></textarea>
                            </div>

                            <div className="mt-8 mb-4 border-b pb-2">
                                <h2 className="text-lg font-bold text-gray-800">ข้อมูลนักศึกษา</h2>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700">รหัสนักศึกษา</label>
                                    <input type="text" value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#64964E]" placeholder="รหัสนักศึกษา 13 หลัก" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700">คณะ</label>
                                    <input type="text" value={formData.faculty} onChange={e => setFormData({...formData, faculty: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#64964E]" placeholder="คณะที่กำลังศึกษา" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700">สาขาวิชา</label>
                                    <input type="text" value={formData.major} onChange={e => setFormData({...formData, major: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#64964E]" placeholder="สาขาวิชาเอก" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700">ปีการศึกษา</label>
                                    <input type="text" value={formData.academicYear || ''} onChange={e => setFormData({...formData, academicYear: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#64964E]" placeholder="เช่น 2569" />
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
                            <button onClick={() => { setContactMode('email'); setOtpSent(false); setNewContact(''); setContactMessage({text:'', type:''}) }} className="text-sm font-bold text-[#64964E] hover:underline bg-white px-4 py-2 rounded-lg border border-[#64964E]/30 shrink-0">
                                เปลี่ยนอีเมล
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">เบอร์โทรศัพท์มือถือ</p>
                                <p className="font-medium text-gray-900 text-lg mt-0.5">{user.phoneNumber || '-'}</p>
                            </div>
                            <button onClick={() => { setContactMode('phone'); setOtpSent(false); setNewContact(''); setContactMessage({text:'', type:''}) }} className="text-sm font-bold text-[#64964E] hover:underline bg-white px-4 py-2 rounded-lg border border-[#64964E]/30 shrink-0">
                                เปลี่ยนเบอร์โทร
                            </button>
                        </div>
                    </div>
                </div>

                {/* Contact Change Modal */}
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
