"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';

interface PartnerReward {
    id: string;
    name: string;
    description: string;
    pointCost: number;
    rewardType: string;
    category: string;
    imageUrl?: string;
    active: boolean;
    stock: number;
    requiredFields?: string[];
}

interface Partner {
    id: string;
    name: string;
    description: string;
    logoUrl?: string;
    category: string;
    active: boolean;
    rewards: PartnerReward[];
}

const STORE_CATEGORIES = ['อาหาร & เครื่องดื่ม', 'สำหรับนักศึกษา', 'ร้านค้า', 'บริการ', 'ความงาม', 'ไอที & เทคโนโลยี', 'อื่นๆ'];
const REWARD_CATEGORIES = ['สินค้า', 'ส่วนลดร้านค้า', 'สำหรับนักศึกษา'];
const REWARD_TYPES = ['DISCOUNT', 'FREEBIE', 'VOUCHER', 'OTHER'];
const REWARD_TYPE_LABELS: Record<string, string> = {
    DISCOUNT: 'ส่วนลด', FREEBIE: 'ของแถม', VOUCHER: 'คูปอง', OTHER: 'อื่นๆ'
};
const REWARD_CATEGORY_COLORS: Record<string, string> = {
    'สินค้า': 'bg-blue-100 text-blue-700',
    'ส่วนลดร้านค้า': 'bg-orange-100 text-orange-700',
    'สำหรับนักศึกษา': 'bg-emerald-100 text-emerald-700',
};
const REWARD_CATEGORY_ICONS: Record<string, string> = {
    'สินค้า': 'fa-box',
    'ส่วนลดร้านค้า': 'fa-tag',
    'สำหรับนักศึกษา': 'fa-graduation-cap',
};

const emptyReward: Omit<PartnerReward, 'id'> = {
    name: '', description: '', pointCost: 100, rewardType: 'DISCOUNT', category: 'สินค้า', imageUrl: '', active: true, stock: -1, requiredFields: []
};

export default function PartnerPortalPage() {
    const router = useRouter();
    const { user, token, apiBase, isInitialized } = useSmartBin();
    const [partner, setPartner] = useState<Partner | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState<'rewards' | 'settings' | 'redemptions'>('rewards');
    const [pendingRedemptions, setPendingRedemptions] = useState<any[]>([]);

    // Partner info edit form
    const [partnerForm, setPartnerForm] = useState({
        name: '', description: '', logoUrl: '', category: 'อาหาร & เครื่องดื่ม'
    });

    // Reward form
    const [showRewardModal, setShowRewardModal] = useState(false);
    const [editingReward, setEditingReward] = useState<PartnerReward | null>(null);
    const [rewardForm, setRewardForm] = useState<typeof emptyReward>({ ...emptyReward });

    const fetchPartnerData = useCallback(async () => {
        if (!apiBase || !token) return;
        setLoading(true);
        try {
            const res = await fetch(`${apiBase}/partner/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPartner(data);
                setPartnerForm({
                    name: data.name || '',
                    description: data.description || '',
                    logoUrl: data.logoUrl || '',
                    category: data.category || 'อาหาร & เครื่องดื่ม'
                });
                // Fetch pending redemptions for student-category partners
                const redemptionsRes = await fetch(`${apiBase}/partner/redemptions/pending`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (redemptionsRes.ok) {
                    setPendingRedemptions(await redemptionsRes.json());
                }
            } else if (res.status === 403 || res.status === 401) {
                setError("คุณไม่มีสิทธิ์เข้าถึงหน้านี้ หรือไม่ได้ผูกร้านค้ากับบัญชีของคุณ");
            } else {
                setError("เกิดข้อผิดพลาดในการโหลดข้อมูลร้านค้า");
            }
        } catch (e) {
            setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [apiBase, token]);

    useEffect(() => {
        if (isInitialized) {
            if (!user || (user.role !== 'PARTNER' && user.role !== 'ADMIN')) {
                setError("เข้าถึงไม่ได้: คุณไม่ใช่ Partner หรือ Admin");
                setLoading(false);
            } else {
                fetchPartnerData();
            }
        }
    }, [user, isInitialized, fetchPartnerData]);

    // === Redemption Approve/Reject ===
    const handleApproveRedemption = async (redemptionId: string) => {
        if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการอนุมัติการแลกคะแนนนี้?')) return;
        if (!token) return;
        try {
            const res = await fetch(`${apiBase}/partner/redemptions/${redemptionId}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert('อนุมัติสำเร็จ!');
                fetchPartnerData();
            } else {
                alert('ไม่สามารถอนุมัติได้');
            }
        } catch (e) {
            console.error('Approve failed', e);
        }
    };

    const handleRejectRedemption = async (redemptionId: string) => {
        if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการปฏิเสธการแลกคะแนนนี้? (คะแนนจะถูกคืนให้ผู้ใช้)')) return;
        if (!token) return;
        try {
            const res = await fetch(`${apiBase}/partner/redemptions/${redemptionId}/reject`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert('ปฏิเสธการแลกคะแนนสำเร็จ ระบบได้คืนคะแนนให้ผู้ใช้แล้ว');
                fetchPartnerData();
            } else {
                alert('ไม่สามารถปฏิเสธได้');
            }
        } catch (e) {
            console.error('Reject failed', e);
        }
    };

    // === Update Partner Store Profile ===
    const saveStoreProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(`${apiBase}/partner/me`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(partnerForm)
            });
            if (res.ok) {
                alert('บันทึกข้อมูลร้านสำเร็จ!');
                fetchPartnerData();
            } else {
                alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
            }
        } catch (e) {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        } finally {
            setSaving(false);
        }
    };

    // === Reward CRUD ===
    const openAddReward = () => {
        setEditingReward(null);
        setRewardForm({ ...emptyReward });
        setShowRewardModal(true);
    };

    const openEditReward = (reward: PartnerReward) => {
        setEditingReward(reward);
        setRewardForm({
            name: reward.name,
            description: reward.description,
            pointCost: reward.pointCost,
            rewardType: reward.rewardType,
            category: reward.category || 'สินค้า',
            imageUrl: reward.imageUrl || '',
            active: reward.active,
            stock: reward.stock,
            requiredFields: reward.requiredFields || []
        });
        setShowRewardModal(true);
    };

    const saveReward = async () => {
        if (!partner) return;
        setSaving(true);
        try {
            const url = editingReward
                ? `${apiBase}/partner/me/rewards/${editingReward.id}`
                : `${apiBase}/partner/me/rewards`;
            const method = editingReward ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(rewardForm)
            });
            if (res.ok) {
                setShowRewardModal(false);
                fetchPartnerData();
            } else {
                alert('เกิดข้อผิดพลาดในการบันทึกของรางวัล');
            }
        } catch (e) {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        } finally {
            setSaving(false);
        }
    };

    const deleteReward = async (rewardId: string) => {
        if (!confirm('ลบของรางวัลชิ้นนี้?')) return;
        try {
            const res = await fetch(`${apiBase}/partner/me/rewards/${rewardId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchPartnerData();
            } else {
                alert('เกิดข้อผิดพลาดในการลบของรางวัล');
            }
        } catch (e) {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    };

    const toggleRewardActive = async (reward: any) => {
        try {
            const res = await fetch(`${apiBase}/partner/me/rewards/${reward.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...reward, active: !reward.active })
            });
            if (res.ok) { fetchPartnerData(); }
            else { alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ'); }
        } catch (e) { alert('เกิดข้อผิดพลาด'); }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const res = await fetch(`${apiBase?.replace('/api', '')}/api/upload`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                const baseUrl = apiBase?.replace('/api', '') || '';
                const fullUrl = `${baseUrl}${data.url}`;
                setter(fullUrl);
            } else {
                alert('อัปโหลดไฟล์ล้มเหลว: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Upload error', error);
            alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundImage: "url('/images/bg_loginregis.jpg')", backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#64964E]"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundImage: "url('/images/bg_loginregis.jpg')", backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
                <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl text-red-500">🤝</span>
                    </div>
                    <h1 className="text-xl font-bold text-gray-800 mb-2">ปฏิเสธการเข้าถึง</h1>
                    <p className="text-gray-500 text-sm mb-6">{error}</p>
                    <button onClick={() => router.push('/')} className="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl hover:bg-slate-900 transition active:scale-95">
                        กลับสู่หน้าหลัก
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20" style={{ backgroundImage: "url('/images/bg_loginregis.jpg')", backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
            {/* Header / Store Profile */}
            {partner && (
                <div className="bg-[#64964E]/80 backdrop-blur-md text-white p-6 rounded-b-3xl shadow-xl border-b border-white/20">
                    <div className="max-w-7xl xl:max-w-[95%] mx-auto flex flex-col md:flex-row items-center gap-6 pt-4 pb-2">
                        <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-lg border-2 border-white/20">
                            {partner.logoUrl ? (
                                <img src={partner.logoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <i className="fa-solid fa-store text-purple-600 text-3xl"></i>
                            )}
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap">
                                <h1 className="font-black text-2xl tracking-tight">{partner.name}</h1>
                                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${partner.active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'} border border-white/10`}>
                                    {partner.active ? 'เปิดร้านอยู่' : 'ปิดร้านชั่วคราว'}
                                </span>
                                <span className="text-xs bg-white/20 font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">{partner.category}</span>
                            </div>
                            <p className="text-indigo-200 text-sm mt-1">{partner.description || 'ไม่มีคำอธิบายร้านค้า'}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => router.push('/')}
                                className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/25 transition"
                                title="หน้าแรก"
                            >
                                <i className="fa-solid fa-house"></i>
                            </button>
                            <button
                                onClick={fetchPartnerData}
                                className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/25 transition"
                                title="รีเฟรชข้อมูล"
                            >
                                <i className="fa-solid fa-arrows-rotate"></i>
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-2 max-w-7xl xl:max-w-[95%] mx-auto mt-6 bg-white/10 rounded-2xl p-1 backdrop-blur-sm">
                        <button
                            onClick={() => setActiveTab('rewards')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'rewards' ? 'bg-white text-[#64964E] shadow-sm' : 'text-white/85 hover:text-white'}`}
                        >
                            <i className="fa-solid fa-gift"></i> จัดการของรางวัล
                            <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'rewards' ? 'bg-[#64964E]/20 text-[#64964E]' : 'bg-white/20'}`}>
                                {partner.rewards?.length || 0}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'settings' ? 'bg-white text-[#64964E] shadow-sm' : 'text-white/85 hover:text-white'}`}
                        >
                            <i className="fa-solid fa-gears"></i> ตั้งค่าร้านค้า
                        </button>
                        {partner.category === 'สำหรับนักศึกษา' && (
                            <button
                                onClick={() => setActiveTab('redemptions')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'redemptions' ? 'bg-white text-[#64964E] shadow-sm' : 'text-white/85 hover:text-white'}`}
                            >
                                <i className="fa-solid fa-graduation-cap"></i> อนุมัติการแลกคะแนน
                                {pendingRedemptions.length > 0 && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'redemptions' ? 'bg-orange-100 text-orange-700' : 'bg-orange-500 text-white'}`}>
                                        {pendingRedemptions.length}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="max-w-7xl xl:max-w-[95%] mx-auto px-4 pt-6">
                {partner && activeTab === 'rewards' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-black text-slate-800 text-lg">รายการของรางวัล</h2>
                                <p className="text-xs text-slate-400">เพิ่มและจัดการของรางวัลที่ให้นักศึกษามาแลกได้</p>
                            </div>
                            <button
                                onClick={openAddReward}
                                className="flex items-center gap-2 bg-[#64964E] hover:bg-[#527d40] text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition active:scale-95"
                            >
                                <i className="fa-solid fa-plus"></i> เพิ่มของรางวัล
                            </button>
                        </div>

                        {/* Category Summary */}
                        <div className="flex gap-2 flex-wrap">
                            {REWARD_CATEGORIES.map(cat => {
                                const count = partner.rewards?.filter(r => r.category === cat).length || 0;
                                return count > 0 ? (
                                    <div key={cat} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium ${REWARD_CATEGORY_COLORS[cat]}`}>
                                        <i className={`fa-solid ${REWARD_CATEGORY_ICONS[cat]} text-[10px]`}></i>
                                        {cat} ({count})
                                    </div>
                                ) : null;
                            })}
                        </div>

                        {!partner.rewards || partner.rewards.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                <i className="fa-solid fa-gift text-5xl text-slate-300 block mb-3 animate-bounce"></i>
                                <p className="font-bold text-slate-500 text-lg">ยังไม่มีรายการของรางวัล</p>
                                <p className="text-slate-400 text-sm mt-1">กดปุ่ม &quot;เพิ่มของรางวัล&quot; เพื่อเริ่มต้นสร้างรายการแรก</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {partner.rewards.map(reward => (
                                    <div key={reward.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col justify-between hover:shadow-md transition">
                                        <div className="p-5 flex gap-4">
                                            <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center overflow-hidden shrink-0 border border-green-100">
                                                {reward.imageUrl ? (
                                                    <img src={reward.imageUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <i className="fa-solid fa-gift text-green-500 text-2xl"></i>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h3 className="font-bold text-slate-800 truncate text-base">{reward.name}</h3>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${reward.active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                                                        {reward.active ? 'เปิด' : 'ปิด'}
                                                    </span>
                                                </div>
                                                <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{reward.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
                                                
                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                    {reward.category && (
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${REWARD_CATEGORY_COLORS[reward.category] || 'bg-slate-100 text-slate-500'}`}>
                                                            <i className={`fa-solid ${REWARD_CATEGORY_ICONS[reward.category] || 'fa-tag'} text-[8px]`}></i>
                                                            {reward.category}
                                                        </span>
                                                    )}
                                                    <span className="text-xs bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full">{REWARD_TYPE_LABELS[reward.rewardType]}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 px-5 py-3 border-t border-slate-50 flex items-center justify-between">
                                            <div>
                                                <span className="text-xs text-slate-400 block leading-none">ต้องใช้</span>
                                                <span className="text-lg font-black text-green-600">{reward.pointCost.toLocaleString()} <span className="text-xs text-green-500">แต้ม</span></span>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <div 
                                                    className={`w-9 h-5 rounded-full mr-2 cursor-pointer transition flex items-center ${reward.active ? 'bg-[#64964E]' : 'bg-slate-300'}`} 
                                                    onClick={() => toggleRewardActive(reward)}
                                                    title={reward.active ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
                                                >
                                                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${reward.active ? 'translate-x-[18px]' : 'translate-x-[2px]'}`}></div>
                                                </div>
                                                <button
                                                    onClick={() => openEditReward(reward)}
                                                    className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500 flex items-center justify-center transition"
                                                    title="แก้ไข"
                                                >
                                                    <i className="fa-solid fa-pen text-xs"></i>
                                                </button>
                                                <button
                                                    onClick={() => deleteReward(reward.id)}
                                                    className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 flex items-center justify-center transition"
                                                    title="ลบ"
                                                >
                                                    <i className="fa-solid fa-trash text-xs"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Settings Tab */}
                {partner && activeTab === 'settings' && (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 max-w-lg mx-auto">
                        <h2 className="font-black text-slate-800 text-lg mb-4 flex items-center gap-2">
                            <i className="fa-solid fa-store text-indigo-500"></i> ตั้งค่าข้อมูลร้านค้า
                        </h2>
                        
                        <form onSubmit={saveStoreProfile} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1.5 block">ชื่อร้านค้า *</label>
                                <input
                                    type="text"
                                    required
                                    value={partnerForm.name}
                                    onChange={e => setPartnerForm(p => ({ ...p, name: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                    placeholder="เช่น มอคค่าคาเฟ่"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1.5 block">คำอธิบายรายละเอียดร้าน</label>
                                <textarea
                                    value={partnerForm.description}
                                    onChange={e => setPartnerForm(p => ({ ...p, description: e.target.value }))}
                                    rows={3}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                                    placeholder="รายละเอียด เช่น ที่อยู่ เวลาเปิด-ปิด เมนูแนะนำ หรือเงื่อนไข"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">หมวดหมู่ร้านค้า</label>
                                    <select
                                        value={partnerForm.category}
                                        onChange={e => setPartnerForm(p => ({ ...p, category: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 bg-white"
                                    >
                                        {STORE_CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">อัปโหลดโลโก้ร้านค้า</label>
                                    {partnerForm.logoUrl && (
                                        <div className="mb-2 w-16 h-16 rounded-full overflow-hidden border border-slate-200">
                                            <img src={partnerForm.logoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => handleFileUpload(e, url => setPartnerForm(p => ({ ...p, logoUrl: url })))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving || !partnerForm.name}
                                className="w-full mt-4 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition disabled:opacity-50 active:scale-95"
                            >
                                {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลร้านค้า'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Redemptions Approval Tab (for สำหรับนักศึกษา partners) */}
                {partner && activeTab === 'redemptions' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-black text-slate-800 text-lg">รออนุมัติการแลกคะแนน</h2>
                                <p className="text-xs text-slate-400">รายการแลกคะแนนงานจิตอาสาและหน่วยกิจกรรมนักศึกษาที่รอการอนุมัติ</p>
                            </div>
                            <button onClick={fetchPartnerData} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition">
                                <i className="fa-solid fa-arrows-rotate text-slate-500 text-sm"></i>
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-orange-100 bg-orange-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-clock text-orange-500"></i>
                                    <span className="font-bold text-orange-800">รออนุมัติ</span>
                                </div>
                                {pendingRedemptions.length > 0 && (
                                    <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                        {pendingRedemptions.length} รายการ
                                    </span>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-100">
                                        <tr>
                                            <th className="px-5 py-3">เวลา</th>
                                            <th className="px-5 py-3">รหัสนักศึกษา</th>
                                            <th className="px-5 py-3">ชื่อ-นามสกุล</th>
                                            <th className="px-5 py-3">คณะ/สาขา</th>
                                            <th className="px-5 py-3">สิ่งที่ขอแลก</th>
                                            <th className="px-5 py-3 text-center">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {pendingRedemptions.map((r: any) => (
                                            <tr key={r.id} className="hover:bg-slate-50/80 transition">
                                                <td className="px-5 py-3 text-xs text-slate-500">
                                                    {new Date(r.timestamp).toLocaleString('th-TH')}
                                                </td>
                                                <td className="px-5 py-3 font-mono text-slate-600">
                                                    {r.studentId || '-'}
                                                </td>
                                                <td className="px-5 py-3 font-bold text-slate-700">
                                                    {r.firstName ? `${r.title || ''} ${r.firstName} ${r.lastName || ''}`.trim() : '-'}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="text-sm font-semibold text-slate-800">{r.faculty || '-'}</div>
                                                    <div className="text-xs text-slate-500">{r.major || '-'}</div>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="font-bold text-slate-800">
                                                        {r.rewardType === 'VOLUNTEER'
                                                            ? `จิตอาสา ${r.value} ชั่วโมง`
                                                            : `${r.details} ${r.value} หน่วย`}
                                                    </div>
                                                    <div className="text-[10px] text-orange-600 mt-0.5">ใช้ {r.cost} แต้ม</div>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleApproveRedemption(r.id)}
                                                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                                                        >
                                                            <i className="fa-solid fa-check mr-1"></i>อนุมัติ
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectRedemption(r.id)}
                                                            className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                                                        >
                                                            <i className="fa-solid fa-xmark mr-1"></i>ปฏิเสธ
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {pendingRedemptions.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-5 py-12 text-center">
                                                    <i className="fa-solid fa-circle-check text-3xl text-emerald-300 mb-2 block"></i>
                                                    <div className="text-slate-400 font-medium">ไม่มีรายการรออนุมัติ</div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* === Reward Modal === */}
            {showRewardModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="font-black text-lg text-slate-800">{editingReward ? 'แก้ไขของรางวัล' : 'เพิ่มของรางวัลใหม่'}</h2>
                                <p className="text-xs text-slate-400 mt-0.5">ร้านค้าของคุณ: {partner?.name}</p>
                            </div>
                            <button onClick={() => setShowRewardModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                <i className="fa-solid fa-times text-slate-500"></i>
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">ชื่อของรางวัล *</label>
                                <input
                                    value={rewardForm.name}
                                    onChange={e => setRewardForm(r => ({ ...r, name: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
                                    placeholder="เช่น ส่วนลด 20 บาท หรือ ชานม 1 แก้ว"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">รายละเอียด / เงื่อนไขของรางวัล</label>
                                <input
                                    value={rewardForm.description}
                                    onChange={e => setRewardForm(r => ({ ...r, description: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400"
                                    placeholder="เช่น เฉพาะวันจันทร์-ศุกร์ เท่านั้น"
                                />
                            </div>

                            {/* Category Selection — visual cards */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-2 block">หมวดหมู่ของรางวัล *</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {REWARD_CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setRewardForm(r => ({ ...r, category: cat }))}
                                            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition text-center ${rewardForm.category === cat ? 'border-[#64964E] bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${rewardForm.category === cat ? 'bg-green-100' : 'bg-slate-100'}`}>
                                                <i className={`fa-solid ${REWARD_CATEGORY_ICONS[cat]} text-sm ${rewardForm.category === cat ? 'text-green-600' : 'text-slate-400'}`}></i>
                                            </div>
                                            <span className={`text-xs font-bold leading-tight ${rewardForm.category === cat ? 'text-green-700' : 'text-slate-500'}`}>{cat}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">ต้องใช้กี่แต้ม *</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={rewardForm.pointCost}
                                        onChange={e => setRewardForm(r => ({ ...r, pointCost: parseInt(e.target.value) || 0 }))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">ประเภทรางวัล</label>
                                    <select
                                        value={rewardForm.rewardType}
                                        onChange={e => setRewardForm(r => ({ ...r, rewardType: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400 bg-white"
                                    >
                                        {REWARD_TYPES.map(t => (
                                            <option key={t} value={t}>{REWARD_TYPE_LABELS[t]}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">จำนวนสินค้าคงเหลือ (-1 = ไม่จำกัด)</label>
                                    <input
                                        type="number"
                                        min={-1}
                                        value={rewardForm.stock}
                                        onChange={e => setRewardForm(r => ({ ...r, stock: parseInt(e.target.value) || -1 }))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">อัปโหลดรูปภาพของรางวัล</label>
                                    {rewardForm.imageUrl && (
                                        <div className="mb-2 h-20 w-32 rounded-lg overflow-hidden border border-slate-200">
                                            <img src={rewardForm.imageUrl} alt="Reward Preview" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => handleFileUpload(e, url => setRewardForm(r => ({ ...r, imageUrl: url })))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                    />
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 mt-2">
                                <label className="text-sm font-bold text-slate-700 mb-3 block">ข้อมูลที่ต้องการจากลูกค้าตอนแลกรางวัล</label>
                                <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                                    {[
                                        { id: 'NAME', label: 'ชื่อ-นามสกุล' },
                                        { id: 'ADDRESS', label: 'ที่อยู่' },
                                        { id: 'AGE', label: 'อายุ' },
                                        { id: 'PHONE', label: 'เบอร์โทร' },
                                        { id: 'EMAIL', label: 'อีเมล' },
                                        ...((partner?.category === 'ร้านสำหรับนักศึกษา' || rewardForm.category === 'สำหรับนักศึกษา') ? [
                                            { id: 'STUDENT_ID', label: 'รหัสนักศึกษา' },
                                            { id: 'FACULTY', label: 'คณะ' },
                                            { id: 'MAJOR', label: 'สาขา' }
                                        ] : [])
                                    ].map(field => (
                                        <label key={field.id} className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 text-[#64964E] focus:ring-[#64964E] border-gray-300 rounded"
                                                checked={rewardForm.requiredFields?.includes(field.id)}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setRewardForm(prev => {
                                                        const reqs = prev.requiredFields || [];
                                                        if (checked) return { ...prev, requiredFields: [...reqs, field.id] };
                                                        return { ...prev, requiredFields: reqs.filter(id => id !== field.id) };
                                                    });
                                                }}
                                            />
                                            <span>{field.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer pt-2">
                                <div
                                    className={`w-10 h-6 rounded-full transition ${rewardForm.active ? 'bg-[#64964E]' : 'bg-slate-300'} relative`}
                                    onClick={() => setRewardForm(r => ({ ...r, active: !r.active }))}
                                >
                                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${rewardForm.active ? 'translate-x-4' : ''}`}></div>
                                </div>
                                <span className="text-sm font-medium text-slate-700">เปิดให้แลกในหน้าแลกคะแนน</span>
                            </label>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowRewardModal(false)}
                                className="flex-1 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={saveReward}
                                disabled={saving || !rewardForm.name || rewardForm.pointCost < 1}
                                className="flex-1 py-3 rounded-xl bg-[#64964E] text-white font-bold hover:shadow-lg hover:bg-[#527d40] transition disabled:opacity-50"
                            >
                                {saving ? 'กำลังบันทึก...' : 'บันทึกของรางวัล'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
