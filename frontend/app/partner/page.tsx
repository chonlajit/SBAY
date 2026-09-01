"use client"
import React, { useEffect, useState, useCallback } from 'react';
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
    accumulatedPoints?: number;
}

interface Redemption {
    id: string;
    referenceCode?: string;
    userId: string;
    rewardType: string;
    cost: number;
    value: number;
    details: string;
    status: string;
    timestamp: string;
    username?: string;
    title?: string;
    firstName?: string;
    lastName?: string;
    studentId?: string;
    faculty?: string;
    major?: string;
    academicYear?: string;
    address?: string;
    age?: number;
    email?: string;
    phoneNumber?: string;
    partnerId?: string;
    partnerRewardId?: string;
}

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

export default function PartnerProductsPage() {
    const router = useRouter();
    const { apiBase, token, user, isInitialized } = useSmartBin();
    const [partner, setPartner] = useState<Partner | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Tabs
    const [activeTab, setActiveTab] = useState<'rewards' | 'pending' | 'approved'>('rewards');
    const [searchQuery, setSearchQuery] = useState('');
    const [pendingRedemptions, setPendingRedemptions] = useState<Redemption[]>([]);
    const [approvedRedemptions, setApprovedRedemptions] = useState<Redemption[]>([]);
    const [selectedRedemption, setSelectedRedemption] = useState<Redemption | null>(null);

    // Reward modal
    const [showRewardModal, setShowRewardModal] = useState(false);
    const [editingReward, setEditingReward] = useState<PartnerReward | null>(null);
    const [rewardForm, setRewardForm] = useState<typeof emptyReward>({ ...emptyReward });

    // Store info edit
    const [showStoreModal, setShowStoreModal] = useState(false);
    const [storeForm, setStoreForm] = useState({ name: '', description: '', logoUrl: '' });

    useEffect(() => {
        if (isInitialized && (!user || (user.role !== 'PARTNER' && user.role !== 'ADMIN'))) {
            router.push('/');
        }
    }, [user, isInitialized, router]);

    const fetchMyPartner = useCallback(async () => {
        if (!apiBase || !token) return;
        setLoading(true);
        try {
            const res = await fetch(`${apiBase}/partner/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPartner(data);
            } else {
                console.error('Failed to fetch partner:', res.status);
            }
        } catch (e) {
            console.error('Failed to load partner data', e);
        } finally {
            setLoading(false);
        }
    }, [apiBase, token]);

    const fetchRedemptions = useCallback(async () => {
        if (!apiBase || !token) return;
        try {
            const pendingRes = await fetch(`${apiBase}/partner/redemptions/pending`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (pendingRes.ok) setPendingRedemptions(await pendingRes.json());
            const approvedRes = await fetch(`${apiBase}/partner/redemptions/approved`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (approvedRes.ok) setApprovedRedemptions(await approvedRes.json());
        } catch (e) {
            console.error('Failed to load redemptions', e);
        }
    }, [apiBase, token]);

    useEffect(() => {
        if (user && (user.role === 'PARTNER' || user.role === 'ADMIN')) {
            fetchMyPartner();
            fetchRedemptions();
        }
    }, [user, fetchMyPartner, fetchRedemptions]);

    // === Reward CRUD ===
    const openAddReward = () => {
        setEditingReward(null);
        const isStudent = partner?.category === 'ร้านสำหรับนักศึกษา';
        setRewardForm({
            ...emptyReward,
            category: isStudent ? 'สำหรับนักศึกษา' : 'สินค้า',
            rewardType: isStudent ? 'ACTIVITY' : 'OTHER'
        });
        setShowRewardModal(true);
    };
    const openEditReward = (reward: PartnerReward) => {
        setEditingReward(reward);
        setRewardForm({
            name: reward.name, description: reward.description, pointCost: reward.pointCost,
            rewardType: reward.rewardType, category: reward.category || 'สินค้า',
            imageUrl: reward.imageUrl || '', active: reward.active, stock: reward.stock,
            requiredFields: reward.requiredFields || []
        });
        setShowRewardModal(true);
    };
    const saveReward = async () => {
        setSaving(true);
        try {
            const url = editingReward
                ? `${apiBase}/partner/me/rewards/${editingReward.id}`
                : `${apiBase}/partner/me/rewards`;
            const method = editingReward ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(rewardForm)
            });
            if (res.ok) { setShowRewardModal(false); fetchMyPartner(); }
            else { alert('เกิดข้อผิดพลาด'); }
        } catch (e) { alert('เกิดข้อผิดพลาด'); }
        finally { setSaving(false); }
    };
    const deleteReward = async (rewardId: string) => {
        if (!confirm('ลบรายการนี้?')) return;
        await fetch(`${apiBase}/partner/me/rewards/${rewardId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchMyPartner();
    };

    const toggleRewardActive = async (reward: PartnerReward) => {
        try {
            const res = await fetch(`${apiBase}/partner/me/rewards/${reward.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...reward, active: !reward.active })
            });
            if (res.ok) fetchMyPartner();
            else alert('Error updating status');
        } catch (e) { alert('Error'); }
    };
    const approveRedemption = async (id: string) => {
        if (!confirm('ยืนยันการอนุมัติการแลกของรางวัลนี้?')) return;
        try {
            const res = await fetch(`${apiBase}/partner/redemptions/${id}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchRedemptions();
                setSelectedRedemption(null);
            } else alert('เกิดข้อผิดพลาด');
        } catch (e) { alert('เกิดข้อผิดพลาด'); }
    };

    const rejectRedemption = async (id: string) => {
        const reason = prompt('ระบุเหตุผลที่ไม่อนุมัติ (ถ้ามี):');
        if (reason === null) return;
        try {
            const res = await fetch(`${apiBase}/partner/redemptions/${id}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: reason || 'ถูกปฏิเสธโดยร้านค้า' })
            });
            if (res.ok) {
                fetchRedemptions();
                setSelectedRedemption(null);
            } else alert('เกิดข้อผิดพลาด');
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
                alert('Upload failed: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Upload error', error);
            alert('Upload error');
        }
    };

    // === Store Info Edit ===
    const openStoreEdit = () => {
        if (!partner) return;
        setStoreForm({ name: partner.name, description: partner.description, logoUrl: partner.logoUrl || '' });
        setShowStoreModal(true);
    };
    const saveStoreInfo = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${apiBase}/partner/me`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...partner, ...storeForm })
            });
            if (res.ok) { setShowStoreModal(false); fetchMyPartner(); }
            else { alert('เกิดข้อผิดพลาด'); }
        } catch (e) { alert('เกิดข้อผิดพลาด'); }
        finally { setSaving(false); }
    };

    if (!isInitialized || !user) return null;

    const rewards = partner?.rewards || [];
    const activeRewards = rewards.filter(r => r.active);
    const inactiveRewards = rewards.filter(r => !r.active);

    return (
        <div className="min-h-screen pb-24" style={{ backgroundImage: "url('/images/bg_loginregis.jpg')", backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
            {/* Header */}
            <div className="bg-[#64964E]/80 backdrop-blur-md text-white p-6 rounded-b-3xl shadow-xl border-b border-white/20">
                <div className="flex items-center justify-between max-w-7xl xl:max-w-[95%] mx-auto">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push('/')} className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition">
                            <i className="fa-solid fa-arrow-left text-sm"></i>
                        </button>
                        <div>
                            <h1 className="font-black text-xl">ร้านของฉัน</h1>
                            <p className="text-white/80 text-xs">จัดการร้านค้าและของรางวัล</p>
                        </div>
                    </div>
                    <button onClick={openAddReward} className="flex items-center gap-2 bg-white text-[#64964E] font-bold text-sm px-4 py-2.5 rounded-xl shadow-md hover:bg-green-50 transition active:scale-95">
                        <i className="fa-solid fa-plus"></i> เพิ่มรางวัล
                    </button>
                </div>
            </div>

            <div className="max-w-7xl xl:max-w-[95%] mx-auto px-4 pt-5 space-y-4">
                {loading ? (
                    <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#64964E]"></div></div>
                ) : !partner ? (
                    <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        <i className="fa-solid fa-store-slash text-5xl text-slate-300 block mb-3"></i>
                        <p className="font-bold text-slate-500 text-lg">ยังไม่มีร้านที่ผูกกับบัญชีนี้</p>
                        <p className="text-slate-400 text-sm mt-1">กรุณาติดต่อแอดมินเพื่อสร้างร้านให้คุณ</p>
                    </div>
                ) : (
                    <>
                        {/* Store Info Card */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center overflow-hidden shrink-0 border border-green-100">
                                    {partner.logoUrl
                                        ? <img src={partner.logoUrl} alt="" className="w-full h-full object-cover" />
                                        : <i className="fa-solid fa-store text-green-500 text-2xl"></i>
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="font-black text-slate-800 text-lg">{partner.name}</h2>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${partner.active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                                            {partner.active ? 'เปิดใช้งาน' : 'ปิดอยู่'}
                                        </span>
                                    </div>
                                    <p className="text-slate-400 text-xs mt-0.5 truncate">{partner.description || 'ไม่มีคำอธิบาย'}</p>
                                    <span className="inline-block mt-1 text-xs bg-[#64964E]/10 text-[#64964E] font-medium px-2 py-0.5 rounded-full">{partner.category}</span>
                                </div>
                                <button onClick={openStoreEdit} className="w-10 h-10 rounded-xl bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition shrink-0">
                                    <i className="fa-solid fa-pen text-blue-500 text-sm"></i>
                                </button>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center">
                                <div className="text-2xl font-black text-amber-500">{partner.accumulatedPoints ? Math.floor(partner.accumulatedPoints).toLocaleString() : '0'}</div>
                                <div className="text-xs text-slate-400 mt-0.5">แต้มสะสมของร้าน</div>
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center">
                                <div className="text-2xl font-black text-[#64964E]">{rewards.length}</div>
                                <div className="text-xs text-slate-400 mt-0.5">รางวัลทั้งหมด</div>
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center">
                                <div className="text-2xl font-black text-green-600">{activeRewards.length}</div>
                                <div className="text-xs text-slate-400 mt-0.5">เปิดใช้งาน</div>
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center">
                                <div className="text-2xl font-black text-slate-400">{inactiveRewards.length}</div>
                                <div className="text-xs text-slate-400 mt-0.5">ปิดอยู่</div>
                            </div>
                        </div>

                        {/* Category Summary */}
                        <div className="flex gap-2 flex-wrap">
                            {REWARD_CATEGORIES.map(cat => {
                                const count = rewards.filter(r => r.category === cat).length;
                                return count > 0 ? (
                                    <div key={cat} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium ${REWARD_CATEGORY_COLORS[cat]}`}>
                                        <i className={`fa-solid ${REWARD_CATEGORY_ICONS[cat]} text-[10px]`}></i>
                                        {cat} ({count})
                                    </div>
                                ) : null;
                            })}
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 bg-white p-1 rounded-2xl shadow-sm border border-slate-100 mb-2">
                            <button onClick={() => setActiveTab('rewards')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition ${activeTab === 'rewards' ? 'bg-[#64964E] text-white' : 'text-slate-500 hover:bg-slate-50'}`}>จัดการของรางวัล</button>
                            <button onClick={() => setActiveTab('pending')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${activeTab === 'pending' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                                รอตรวจสอบ {pendingRedemptions.length > 0 && <span className="bg-white text-orange-500 px-1.5 py-0.5 rounded-full text-[10px] leading-none">{pendingRedemptions.length}</span>}
                            </button>
                            <button onClick={() => setActiveTab('approved')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition ${activeTab === 'approved' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>ประวัติที่อนุมัติแล้ว</button>
                        </div>

                        {/* Rewards List */}
                        {activeTab === 'rewards' && (
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mt-4">
                                <div className="p-4 border-b border-slate-100 bg-[#64964E]/5 flex items-center justify-between">
                                    <h3 className="font-black text-slate-800 text-sm">รายการของรางวัล</h3>
                                    <button onClick={openAddReward} className="flex items-center gap-1.5 bg-[#64964E] text-white font-bold text-xs px-3 py-1.5 rounded-xl hover:bg-[#527d40] transition">
                                        <i className="fa-solid fa-plus text-[10px]"></i> เพิ่ม
                                    </button>
                                </div>

                                {rewards.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400">
                                        <i className="fa-solid fa-gift text-4xl block mb-3 opacity-30"></i>
                                        <p className="font-bold text-sm">ยังไม่มีของรางวัล</p>
                                        <p className="text-xs mt-1">กดปุ่ม "เพิ่มรางวัล" เพื่อเริ่มต้น</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {rewards.map(reward => (
                                            <div key={reward.id} className="flex items-center gap-3 p-4 hover:bg-slate-50/50 transition">
                                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center shrink-0 border border-emerald-100">
                                                    {reward.imageUrl
                                                        ? <img src={reward.imageUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                                                        : <i className="fa-solid fa-gift text-emerald-400"></i>
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-slate-700 text-sm truncate">{reward.name}</span>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${reward.active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-400'}`}>
                                                            {reward.active ? 'เปิด' : 'ปิด'}
                                                        </span>
                                                        {reward.category && (
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${REWARD_CATEGORY_COLORS[reward.category] || 'bg-slate-100 text-slate-500'}`}>
                                                                <i className={`fa-solid ${REWARD_CATEGORY_ICONS[reward.category] || 'fa-tag'} text-[8px]`}></i>
                                                                {reward.category}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs font-black text-emerald-600">{reward.pointCost.toLocaleString()} แต้ม</span>
                                                        <span className="text-xs text-slate-400">|</span>
                                                        <span className="text-xs text-slate-500">{REWARD_TYPE_LABELS[reward.rewardType] || reward.rewardType}</span>
                                                        {reward.stock >= 0 && <span className="text-xs text-orange-500">คงเหลือ: {reward.stock}</span>}
                                                        {reward.stock < 0 && <span className="text-xs text-slate-400">ไม่จำกัด</span>}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1.5 shrink-0 items-center">
                                                    <div
                                                        className={`w-9 h-5 rounded-full mr-2 cursor-pointer transition flex items-center ${reward.active ? 'bg-[#64964E]' : 'bg-slate-300'}`}
                                                        onClick={() => toggleRewardActive(reward)}
                                                        title={reward.active ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
                                                    >
                                                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${reward.active ? 'translate-x-[18px]' : 'translate-x-[2px]'}`}></div>
                                                    </div>
                                                    <button onClick={() => openEditReward(reward)} className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition">
                                                        <i className="fa-solid fa-pen text-blue-400 text-[10px]"></i>
                                                    </button>
                                                    <button onClick={() => deleteReward(reward.id)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition">
                                                        <i className="fa-solid fa-trash text-red-400 text-[10px]"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'pending' && (
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mt-4">
                                <div className="p-4 border-b border-slate-100 bg-orange-50 flex items-center justify-between">
                                    <h3 className="font-black text-orange-800 text-sm">รายการรอตรวจสอบ</h3>
                                    <input
                                        type="text"
                                        placeholder="ค้นหารหัสอ้างอิง..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="border border-orange-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-orange-400 w-48"
                                    />
                                </div>
                                {pendingRedemptions.filter(r => (r.referenceCode || r.id).toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                                    <div className="text-center py-12 text-slate-400">
                                        <i className="fa-solid fa-check-circle text-4xl block mb-3 opacity-30 text-orange-400"></i>
                                        <p className="font-bold text-sm">ไม่พบรายการที่ค้นหา</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {pendingRedemptions.filter(r => (r.referenceCode || r.id).toLowerCase().includes(searchQuery.toLowerCase())).map(r => (
                                            <div key={r.id} className="p-4 hover:bg-slate-50 flex justify-between items-center transition">
                                                <div>
                                                    <div className="font-black text-slate-700 text-lg">{r.referenceCode || r.id}</div>
                                                    <div className="text-xs text-slate-500 font-medium">ชื่อสินค้า: {r.details}</div>
                                                    <div className="text-xs text-slate-500 font-medium">จำนวน: {r.value}</div>
                                                    <div className="text-xs text-slate-400 mt-1">{new Date(r.timestamp).toLocaleString('th-TH')}</div>
                                                </div>
                                                <button onClick={() => setSelectedRedemption(r)} className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition shadow-sm">
                                                    ตรวจสอบ
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'approved' && (
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mt-4">
                                <div className="p-4 border-b border-slate-100 bg-emerald-50 flex items-center justify-between">
                                    <h3 className="font-black text-emerald-800 text-sm">ประวัติที่อนุมัติแล้ว</h3>
                                    <input
                                        type="text"
                                        placeholder="ค้นหารหัสอ้างอิง..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="border border-emerald-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-emerald-400 w-48"
                                    />
                                </div>
                                {approvedRedemptions.filter(r => (r.referenceCode || r.id).toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                                    <div className="text-center py-12 text-slate-400">
                                        <i className="fa-solid fa-history text-4xl block mb-3 opacity-30"></i>
                                        <p className="font-bold text-sm">ไม่พบประวัติที่ค้นหา</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {approvedRedemptions.filter(r => (r.referenceCode || r.id).toLowerCase().includes(searchQuery.toLowerCase())).map(r => (
                                            <div key={r.id} className="p-4 hover:bg-slate-50 transition">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-black text-slate-700">{r.referenceCode || r.id} <span className="text-emerald-500 text-xs ml-1"><i className="fa-solid fa-check-circle"></i> อนุมัติแล้ว</span></div>
                                                        <div className="text-xs text-slate-500 font-medium mt-1">ชื่อสินค้า: {r.details}</div>
                                                        <div className="text-xs text-slate-500 font-medium">จำนวน: {r.value}</div>
                                                        <div className="text-xs text-slate-400 mt-1">{new Date(r.timestamp).toLocaleString('th-TH')}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-bold text-emerald-600">{r.cost.toLocaleString()} แต้ม</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* === Reward Modal === */}
            {showRewardModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-black text-lg text-slate-800">{editingReward ? 'แก้ไขของรางวัล' : 'เพิ่มของรางวัลใหม่'}</h2>
                            <button onClick={() => setShowRewardModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><i className="fa-solid fa-times text-slate-500"></i></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">ชื่อรางวัล *</label>
                                <input value={rewardForm.name} onChange={e => setRewardForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100" placeholder="เช่น ส่วนลด 10%" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">คำอธิบาย</label>
                                <textarea value={rewardForm.description} onChange={e => setRewardForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 resize-none" placeholder="รายละเอียดเพิ่มเติม" />
                            </div>
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 mb-2">
                                <p className="font-bold mb-1"><i className="fa-solid fa-circle-info mr-1"></i> คำแนะนำการตั้งแต้ม (100 แต้ม = 1 บาท)</p>
                                <p>ระบบจะมีการหักค่าแพลตฟอร์ม 10% เพื่อความสะดวก กรุณากรอก <b>มูลค่าจริงของสินค้า</b> ในช่องแรก แล้วระบบจะคำนวณแต้มที่รวมหัก 10% ให้ในช่องถัดไปอัตโนมัติ (แนะนำให้ตั้งแต้มตามที่ระบบคำนวณ หรือใกล้เคียง)</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 items-end">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 flex flex-wrap items-center justify-between gap-1">
                                        <span>มูลค่าจริง (บาท)</span>
                                        <span className="text-[10px] text-green-500 font-normal bg-green-50 px-1 rounded">100 แต้ม = 1 บาท</span>
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="เช่น 10"
                                        onChange={e => {
                                            const baht = parseFloat(e.target.value);
                                            if (!isNaN(baht)) {
                                                // หาร 0.9 เพื่อให้แน่ใจว่าเวลาหัก 10% (คูณ 0.9) จะได้ยอดเท่ากับราคาเต็มพอดี
                                                const points = Math.ceil((baht * 100) / 0.9);
                                                setRewardForm(f => ({ ...f, pointCost: points }));
                                            }
                                        }}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">คะแนนที่ใช้แลก (รวมหัก 10%) *</label>
                                    <input type="number" value={rewardForm.pointCost} onChange={e => setRewardForm(f => ({ ...f, pointCost: e.target.value === '' ? ('' as any) : parseInt(e.target.value) }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400 bg-slate-50" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">จำนวน (-1 = ไม่จำกัด)</label>
                                    <input type="number" value={rewardForm.stock} onChange={e => setRewardForm(f => ({ ...f, stock: e.target.value === '' ? ('' as any) : parseInt(e.target.value) }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">ประเภทรางวัล</label>
                                <select
                                    value={rewardForm.rewardType === 'ACTIVITY' || rewardForm.rewardType === 'VOLUNTEER' ? rewardForm.rewardType : (rewardForm.category === 'ส่วนลดร้านค้า' ? 'DISCOUNT' : 'PRODUCT')}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val === 'ACTIVITY') setRewardForm(r => ({ ...r, category: 'สำหรับนักศึกษา', rewardType: 'ACTIVITY' }));
                                        else if (val === 'VOLUNTEER') setRewardForm(r => ({ ...r, category: 'สำหรับนักศึกษา', rewardType: 'VOLUNTEER' }));
                                        else if (val === 'PRODUCT') setRewardForm(r => ({ ...r, category: 'สินค้า', rewardType: 'OTHER' }));
                                        else if (val === 'DISCOUNT') setRewardForm(r => ({ ...r, category: 'ส่วนลดร้านค้า', rewardType: 'DISCOUNT' }));
                                    }}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400 bg-white"
                                >
                                    {partner?.category === 'ร้านสำหรับนักศึกษา' ? (
                                        <>
                                            <option value="ACTIVITY">หน่วยกิตกิจกรรม</option>
                                            <option value="VOLUNTEER">ชั่วโมงจิตอาสา</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="PRODUCT">สินค้า</option>
                                            <option value="DISCOUNT">ส่วนลดร้านค้า</option>
                                        </>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">URL รูปภาพ</label>
                                <div className="relative">
                                    <input value={rewardForm.imageUrl} onChange={e => setRewardForm(f => ({ ...f, imageUrl: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400 pr-24" placeholder="https://..." />
                                    <input type="file" accept="image/*" className="hidden" id="rewardImageUpload" onChange={e => handleFileUpload(e, url => setRewardForm(f => ({ ...f, imageUrl: url })))} />
                                    <label htmlFor="rewardImageUpload" className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-[#64964E]/10 text-[#64964E] rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer hover:bg-[#64964E]/20 transition">
                                        อัปโหลด
                                    </label>
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
                                            { id: 'MAJOR', label: 'สาขา' },
                                            { id: 'ACADEMIC_YEAR', label: 'ปีการศึกษา' }
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

                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className={`w-10 h-6 rounded-full transition ${rewardForm.active ? 'bg-[#64964E]' : 'bg-slate-300'} relative`} onClick={() => setRewardForm(f => ({ ...f, active: !f.active }))}>
                                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${rewardForm.active ? 'translate-x-4' : ''}`}></div>
                                </div>
                                <span className="text-sm font-medium text-slate-700">เปิดให้แสดงในหน้าแลกคะแนน</span>
                            </label>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setShowRewardModal(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition">ยกเลิก</button>
                            <button onClick={saveReward} disabled={saving || !rewardForm.name} className="flex-1 py-3 rounded-xl bg-[#64964E] text-white font-bold hover:bg-[#527d40] hover:shadow-lg transition disabled:opacity-50">
                                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === Store Edit Modal === */}
            {showStoreModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-black text-lg text-slate-800">แก้ไขข้อมูลร้าน</h2>
                            <button onClick={() => setShowStoreModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><i className="fa-solid fa-times text-slate-500"></i></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">ชื่อร้าน</label>
                                <input value={storeForm.name} onChange={e => setStoreForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">คำอธิบาย</label>
                                <textarea value={storeForm.description} onChange={e => setStoreForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 resize-none" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">URL โลโก้</label>
                                <div className="relative">
                                    <input value={storeForm.logoUrl} onChange={e => setStoreForm(f => ({ ...f, logoUrl: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400 pr-24" placeholder="https://..." />
                                    <input type="file" accept="image/*" className="hidden" id="partnerStoreLogoUpload" onChange={e => handleFileUpload(e, url => setStoreForm(f => ({ ...f, logoUrl: url })))} />
                                    <label htmlFor="partnerStoreLogoUpload" className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-[#64964E]/10 text-[#64964E] rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer hover:bg-[#64964E]/20 transition">
                                        อัปโหลด
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setShowStoreModal(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition">ยกเลิก</button>
                            <button onClick={saveStoreInfo} disabled={saving || !storeForm.name} className="flex-1 py-3 rounded-xl bg-[#64964E] text-white font-bold hover:bg-[#527d40] hover:shadow-lg transition disabled:opacity-50">
                                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === Verify Redemption Modal === */}
            {selectedRedemption && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-black text-lg text-slate-800">ตรวจสอบการแลกรางวัล</h2>
                            <button onClick={() => setSelectedRedemption(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><i className="fa-solid fa-times text-slate-500"></i></button>
                        </div>
                        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-5">
                            <div className="grid grid-cols-[100px_1fr] gap-3 text-sm items-center">
                                <div className="text-slate-500 font-bold">รหัสอ้างอิง:</div>
                                <div className="font-black text-slate-800 text-lg bg-white px-3 py-1.5 rounded-lg border border-slate-200">{selectedRedemption.referenceCode || selectedRedemption.id}</div>

                                <div className="text-slate-500 font-bold">เวลาที่แลก:</div>
                                <div className="font-bold text-slate-800">{new Date(selectedRedemption.timestamp).toLocaleString('th-TH')}</div>

                                <div className="text-slate-500 font-bold">ผู้ทำรายการ:</div>
                                <div className="font-bold text-slate-800">{selectedRedemption.username || '-'}</div>

                                {(selectedRedemption.firstName || selectedRedemption.lastName) && (
                                    <>
                                        <div className="text-slate-500 font-bold">ชื่อ-นามสกุล:</div>
                                        <div className="font-medium text-slate-700">{selectedRedemption.title || ''}{selectedRedemption.firstName || ''} {selectedRedemption.lastName || ''}</div>
                                    </>
                                )}

                                {selectedRedemption.studentId && (
                                    <>
                                        <div className="text-slate-500 font-bold">รหัสนักศึกษา:</div>
                                        <div className="font-bold text-slate-800">{selectedRedemption.studentId}</div>
                                    </>
                                )}

                                {(selectedRedemption.faculty || selectedRedemption.major) && (
                                    <>
                                        <div className="text-slate-500 font-bold">คณะ/สาขา:</div>
                                        <div className="font-medium text-slate-700">{selectedRedemption.faculty || '-'} / {selectedRedemption.major || '-'}</div>
                                    </>
                                )}

                                {selectedRedemption.academicYear && (
                                    <>
                                        <div className="text-slate-500 font-bold">ปีการศึกษา:</div>
                                        <div className="font-medium text-slate-700">{selectedRedemption.academicYear}</div>
                                    </>
                                )}

                                {selectedRedemption.phoneNumber && (
                                    <>
                                        <div className="text-slate-500 font-bold">เบอร์โทร:</div>
                                        <div className="font-medium text-slate-700">{selectedRedemption.phoneNumber}</div>
                                    </>
                                )}

                                {selectedRedemption.email && (
                                    <>
                                        <div className="text-slate-500 font-bold">อีเมล:</div>
                                        <div className="font-medium text-slate-700">{selectedRedemption.email}</div>
                                    </>
                                )}

                                {selectedRedemption.address && (
                                    <>
                                        <div className="text-slate-500 font-bold">ที่อยู่:</div>
                                        <div className="font-medium text-slate-700">{selectedRedemption.address}</div>
                                    </>
                                )}

                                {selectedRedemption.age && (
                                    <>
                                        <div className="text-slate-500 font-bold">อายุ:</div>
                                        <div className="font-medium text-slate-700">{selectedRedemption.age} ปี</div>
                                    </>
                                )}

                                <div className="text-slate-500 font-bold mt-2 pt-2 border-t border-slate-200">รายการที่แลก:</div>
                                <div className="font-black text-emerald-600 text-base mt-2 pt-2 border-t border-slate-200">{selectedRedemption.details || 'ของรางวัล'}</div>
                            </div>
                        </div>
                        {selectedRedemption.status === 'PENDING' && (
                            <div className="flex gap-3 mt-5">
                                <button
                                    onClick={async () => {
                                        if (confirm('ต้องการปฏิเสธรายการนี้หรือไม่?')) {
                                            try {
                                                const res = await fetch(`${apiBase}/partner/redemptions/${selectedRedemption.id}/reject`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
                                                if (res.ok) {
                                                    setPendingRedemptions(p => p.filter(x => x.id !== selectedRedemption.id));
                                                    setSelectedRedemption(null);
                                                } else {
                                                    alert('ไม่สามารถปฏิเสธรายการได้');
                                                }
                                            } catch (e) {
                                                console.error(e);
                                                alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
                                            }
                                        }
                                    }}
                                    className="flex-1 py-3 rounded-xl border-2 border-red-100 text-red-500 font-bold hover:bg-red-50 transition"
                                >
                                    ปฏิเสธ
                                </button>
                                <button
                                    onClick={async () => {
                                        if (confirm('ยืนยันการอนุมัติการแลกรางวัลนี้?')) {
                                            try {
                                                const res = await fetch(`${apiBase}/partner/redemptions/${selectedRedemption.id}/approve`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
                                                if (res.ok) {
                                                    const approved = pendingRedemptions.find(x => x.id === selectedRedemption.id);
                                                    if (approved) {
                                                        approved.status = 'APPROVED';
                                                        setApprovedRedemptions(a => [approved, ...a]);
                                                    }
                                                    setPendingRedemptions(p => p.filter(x => x.id !== selectedRedemption.id));
                                                    setSelectedRedemption(null);
                                                } else {
                                                    alert('ไม่สามารถอนุมัติรายการได้');
                                                }
                                            } catch (e) {
                                                console.error(e);
                                                alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
                                            }
                                        }
                                    }}
                                    className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-black hover:bg-orange-600 hover:shadow-lg transition"
                                >
                                    ยืนยันอนุมัติ
                                </button>
                            </div>
                        )}
                        {selectedRedemption.status !== 'PENDING' && (
                            <div className="text-center p-3 mt-4 bg-slate-50 text-slate-400 font-bold rounded-xl border border-slate-100">
                                รายการนี้ถูกดำเนินการแล้ว
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
