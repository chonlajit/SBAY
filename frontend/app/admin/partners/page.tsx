"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../../context/SmartBinContext';

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

interface UserItem {
    id: string;
    title?: string;
    firstName: string;
    lastName: string;
    username?: string;
    phoneNumber?: string;
    studentId?: string;
    role?: string;
    partnerId?: string;
}

const GENERAL_STORE_CATEGORIES = ['ร้านขายของ', 'ร้านของสะสม', 'แฟชั่น', 'อาหาร เครื่องดื่ม', 'บริการ', 'ไอที เทคโนโลยี'];
const STORE_CATEGORIES = [...GENERAL_STORE_CATEGORIES, 'ร้านสำหรับนักศึกษา'];
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

const emptyPartner: Omit<Partner, 'id' | 'rewards'> = {
    name: '', description: '', logoUrl: '', category: 'ร้านขายของ', active: true
};
const emptyReward: Omit<PartnerReward, 'id'> = {
    name: '', description: '', pointCost: 100, rewardType: 'DISCOUNT', category: 'สินค้า', imageUrl: '', active: true, stock: -1
};

type AdminTab = 'partners' | 'users';

export default function AdminPartnersPage() {
    const [partnerNameFilter, setPartnerNameFilter] = useState('');
    const router = useRouter();
    const { user, token, apiBase, isInitialized } = useSmartBin();
    const [partners, setPartners] = useState<Partner[]>([]);
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<AdminTab>('partners');

    // Partner form
    const [showPartnerModal, setShowPartnerModal] = useState(false);
    const [partnerModalType, setPartnerModalType] = useState<'general' | 'student'>('general');
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [partnerForm, setPartnerForm] = useState<typeof emptyPartner>({ ...emptyPartner });

    // Reward form
    const [showRewardModal, setShowRewardModal] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
    const [editingReward, setEditingReward] = useState<PartnerReward | null>(null);
    const [rewardForm, setRewardForm] = useState<typeof emptyReward>({ ...emptyReward });

    const [expandedPartner, setExpandedPartner] = useState<string | null>(null);

    // Partner User assignment
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignUser, setAssignUser] = useState<UserItem | null>(null);
    const [assignPartnerId, setAssignPartnerId] = useState('');

    useEffect(() => {
        if (isInitialized && (!user || user.role !== 'ADMIN')) {
            router.push('/');
        }
    }, [user, isInitialized, router]);

    const fetchPartners = useCallback(async () => {
        if (!apiBase || !token) return;
        setLoading(true);
        try {
            const res = await fetch(`${apiBase}/admin/partners`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setPartners(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [apiBase, token]);

    const fetchUsers = useCallback(async () => {
        if (!apiBase || !token) return;
        try {
            const res = await fetch(`${apiBase}/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setUsers(await res.json());
        } catch (e) { console.error(e); }
    }, [apiBase, token]);

    useEffect(() => { fetchPartners(); fetchUsers(); }, [fetchPartners, fetchUsers]);

    // === Partner CRUD ===
    const openAddPartner = (type: 'general' | 'student') => {
        setEditingPartner(null);
        setPartnerModalType(type);
        const defaultCat = type === 'student' ? 'ร้านสำหรับนักศึกษา' : 'ร้านขายของ';
        setPartnerForm({ ...emptyPartner, category: defaultCat });
        setSelectedUserId('');
        setShowPartnerModal(true);
    };
    const openEditPartner = (p: Partner) => {
        setEditingPartner(p);
        setPartnerModalType(p.category === 'ร้านสำหรับนักศึกษา' ? 'student' : 'general');
        setPartnerForm({ name: p.name, description: p.description, logoUrl: p.logoUrl || '', category: p.category, active: p.active });
        setShowPartnerModal(true);
    };
    const savePartner = async () => {
        setSaving(true);
        try {
            const url = editingPartner ? `${apiBase}/admin/partners/${editingPartner.id}` : `${apiBase}/admin/partners`;
            const method = editingPartner ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(partnerForm)
            });
            if (res.ok) {
                const partnerData = await res.json();
                // If creating new partner and a user is selected, assign role
                if (!editingPartner && selectedUserId) {
                    await fetch(`${apiBase}/admin/user/${selectedUserId}/role`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ role: 'PARTNER', partnerId: partnerData.id })
                    });
                    setSelectedUserId('');
                }
                setShowPartnerModal(false);
                fetchPartners();
                fetchUsers();
            } else {
                const errorData = await res.json().catch(() => ({}));
                alert(`เกิดข้อผิดพลาดในการบันทึก: ${errorData.message || res.statusText || 'Unknown error'}`);
            }
        } catch (e: any) { 
            alert(`เกิดข้อผิดพลาดในการเชื่อมต่อ: ${e.message}`); 
        }
        finally { setSaving(false); }
    };
    const deletePartner = async (id: string) => {
        if (!confirm('ลบร้านนี้?')) return;
        await fetch(`${apiBase}/admin/partners/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        fetchPartners();
    };

    // === Reward CRUD ===
    const openAddReward = (partner: Partner) => {
        setSelectedPartner(partner);
        setEditingReward(null);
        const isStudent = partner.category === 'ร้านสำหรับนักศึกษา';
        setRewardForm({ 
            ...emptyReward,
            category: isStudent ? 'สำหรับนักศึกษา' : 'สินค้า',
            rewardType: isStudent ? 'ACTIVITY' : 'OTHER'
        });
        setShowRewardModal(true);
    };
    const openEditReward = (partner: Partner, reward: PartnerReward) => {
        setSelectedPartner(partner);
        setEditingReward(reward);
        setRewardForm({ name: reward.name, description: reward.description, pointCost: reward.pointCost, rewardType: reward.rewardType, category: reward.category || 'สินค้า', imageUrl: reward.imageUrl || '', active: reward.active, stock: reward.stock });
        setShowRewardModal(true);
    };
    const saveReward = async () => {
        if (!selectedPartner) return;
        setSaving(true);
        try {
            const url = editingReward
                ? `${apiBase}/admin/partners/${selectedPartner.id}/rewards/${editingReward.id}`
                : `${apiBase}/admin/partners/${selectedPartner.id}/rewards`;
            const method = editingReward ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(rewardForm)
            });
            if (res.ok) { setShowRewardModal(false); fetchPartners(); }
        } catch (e) { alert('เกิดข้อผิดพลาด'); }
        finally { setSaving(false); }
    };
    const deleteReward = async (partnerId: string, rewardId: string) => {
        if (!confirm('ลบรายการนี้?')) return;
        await fetch(`${apiBase}/admin/partners/${partnerId}/rewards/${rewardId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        fetchPartners();
    };

    // === Partner User Assignment ===
    const openAssignModal = (u: UserItem) => {
        setAssignUser(u);
        setAssignPartnerId(u.partnerId || '');
        setShowAssignModal(true);
    };
    const saveAssignPartner = async () => {
        if (!assignUser) return;
        setSaving(true);
        try {
            const res = await fetch(`${apiBase}/admin/user/${assignUser.id}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ role: 'PARTNER', partnerId: assignPartnerId })
            });
            if (res.ok) { setShowAssignModal(false); fetchUsers(); alert(`กำหนด ${assignUser.firstName} เป็น PARTNER สำเร็จ`); }
            else { alert('เกิดข้อผิดพลาด'); }
        } catch (e) { alert('เกิดข้อผิดพลาด'); }
        finally { setSaving(false); }
    };
    const removePartnerRole = async (u: UserItem) => {
        if (!confirm(`ยกเลิก role PARTNER ของ ${u.firstName} ${u.lastName}?`)) return;
        try {
            const res = await fetch(`${apiBase}/admin/user/${u.id}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ role: 'USER' })
            });
            if (res.ok) { fetchUsers(); }
        } catch (e) { console.error(e); }
    };

    if (!isInitialized || !user) return null;

    const partnerUsers = users.filter(u => u.role === 'PARTNER');
    const regularUsers = users.filter(u => u.role !== 'PARTNER' && u.role !== 'ADMIN');

    return (
        <div className="min-h-screen pb-20" style={{ backgroundImage: "url('/images/bg_loginregis.jpg')", backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
            {/* Header */}
            <div className="bg-[#64964E]/80 backdrop-blur-md text-white p-6 rounded-b-3xl shadow-xl border-b border-white/20">
                <div className="flex items-center justify-between max-w-7xl xl:max-w-[95%] mx-auto">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push('/admin')} className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition">
                            <i className="fa-solid fa-arrow-left text-sm"></i>
                        </button>
                        <div>
                            <h1 className="font-black text-xl">จัดการร้านพาร์ทเนอร์</h1>
                            <p className="text-purple-200 text-xs">Third Party Reward Partners</p>
                        </div>
                    </div>
                    {activeTab === 'partners' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => openAddPartner('general')}
                                className="flex items-center gap-1.5 bg-white text-purple-600 font-bold text-sm px-4 py-2 rounded-xl shadow-md hover:bg-purple-50 transition active:scale-95"
                            >
                                <i className="fa-solid fa-store"></i> เพิ่มร้านทั่วไป
                            </button>
                            <button
                                onClick={() => openAddPartner('student')}
                                className="flex items-center gap-1.5 bg-[#64964E] text-white font-bold text-sm px-4 py-2 rounded-xl shadow-md hover:bg-[#527d40] transition active:scale-95"
                            >
                                <i className="fa-solid fa-graduation-cap"></i> เพิ่มร้านนักศึกษา
                            </button>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 max-w-7xl xl:max-w-[95%] mx-auto mt-5 bg-white/10 rounded-2xl p-1">
                    <button
                        onClick={() => setActiveTab('partners')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition ${activeTab === 'partners' ? 'bg-white text-purple-700 shadow-sm' : 'text-white/80 hover:text-white'}`}
                    >
                        <i className="fa-solid fa-store"></i> ร้านพาร์ทเนอร์
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'partners' ? 'bg-purple-100 text-purple-600' : 'bg-white/20'}`}>{partners.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition ${activeTab === 'users' ? 'bg-white text-purple-700 shadow-sm' : 'text-white/80 hover:text-white'}`}
                    >
                        <i className="fa-solid fa-users-gear"></i> จัดการสิทธิ์ Partner
                        {partnerUsers.length > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'users' ? 'bg-purple-100 text-purple-600' : 'bg-white/20'}`}>{partnerUsers.length}</span>
                        )}
                    </button>
                </div>
            </div>

            <div className="max-w-7xl xl:max-w-[95%] mx-auto px-4 pt-6 space-y-4">

                {/* === Tab: Partners === */}
                {activeTab === 'partners' && (
                    <>
                        {/* Partner name filter */}
                        <div className="flex items-center gap-2 mb-3">
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อร้าน..."
                                value={partnerNameFilter}
                                onChange={e => setPartnerNameFilter(e.target.value)}
                                className="px-3 py-1.5 border rounded w-full"
                            />
                        </div>
                        {loading ? (
                            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div></div>
                        ) : partners.filter(p => p.name.toLowerCase().includes(partnerNameFilter.toLowerCase())).length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                <i className="fa-solid fa-store text-5xl text-slate-300 block mb-3"></i>
                                <p className="font-bold text-slate-500 text-lg">ยังไม่มีร้านพาร์ทเนอร์</p>
                                <p className="text-slate-400 text-sm mt-1">กดปุ่ม &quot;เพิ่มร้าน&quot; เพื่อเริ่มต้น</p>
                            </div>
                        ) : (
                            partners.filter(p => p.name.toLowerCase().includes(partnerNameFilter.toLowerCase())).map(partner => (
                                <div key={partner.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                                    {/* Partner Row */}
                                    <div className="flex items-center gap-4 p-5">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center overflow-hidden shrink-0 border border-purple-200">
                                            {partner.logoUrl ? <img src={partner.logoUrl} alt="" className="w-full h-full object-cover" /> : <i className="fa-solid fa-store text-purple-400 text-xl"></i>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-black text-slate-800">{partner.name}</h3>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${partner.active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                                                    {partner.active ? 'เปิด' : 'ปิด'}
                                                </span>
                                                <span className="text-xs bg-purple-50 text-purple-600 font-medium px-2 py-0.5 rounded-full">{partner.category}</span>
                                            </div>
                                            <p className="text-slate-400 text-xs truncate mt-0.5">{partner.description}</p>
                                            <p className="text-slate-500 text-xs mt-1">{partner.rewards?.length || 0} รายการของรางวัล</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button onClick={() => setExpandedPartner(expandedPartner === partner.id ? null : partner.id)} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition">
                                                <i className={`fa-solid fa-chevron-${expandedPartner === partner.id ? 'up' : 'down'} text-slate-500 text-xs`}></i>
                                            </button>
                                            <button onClick={() => openEditPartner(partner)} className="w-9 h-9 rounded-xl bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition">
                                                <i className="fa-solid fa-pen text-blue-500 text-xs"></i>
                                            </button>
                                            <button onClick={() => deletePartner(partner.id)} className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center transition">
                                                <i className="fa-solid fa-trash text-red-400 text-xs"></i>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Rewards List (expanded) */}
                                    {expandedPartner === partner.id && (
                                        <div className="border-t border-slate-100 p-4 bg-slate-50">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-bold text-slate-600 text-sm">รายการของรางวัล</h4>
                                                <button onClick={() => openAddReward(partner)} className="flex items-center gap-1.5 bg-purple-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl hover:bg-purple-600 transition">
                                                    <i className="fa-solid fa-plus text-[10px]"></i> เพิ่มของรางวัล
                                                </button>
                                            </div>

                                            {/* Category Summary */}
                                            <div className="flex gap-2 mb-3 flex-wrap">
                                                {REWARD_CATEGORIES.map(cat => {
                                                    const count = partner.rewards?.filter(r => r.category === cat).length || 0;
                                                    return count > 0 ? (
                                                        <div key={cat} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium ${REWARD_CATEGORY_COLORS[cat]}`}>
                                                            <i className={`fa-solid ${REWARD_CATEGORY_ICONS[cat]} text-[10px]`}></i>
                                                            {cat} ({count})
                                                        </div>
                                                    ) : null;
                                                })}
                                            </div>

                                            {!partner.rewards || partner.rewards.length === 0 ? (
                                                <p className="text-center text-slate-400 text-sm py-4">ยังไม่มีของรางวัล</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {partner.rewards.map(reward => (
                                                        <div key={reward.id} className="bg-white rounded-2xl p-3 flex items-center gap-3 border border-slate-100">
                                                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                                                                {reward.imageUrl ? <img src={reward.imageUrl} alt="" className="w-full h-full object-cover rounded-xl" /> : <i className="fa-solid fa-gift text-emerald-400"></i>}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-bold text-slate-700 text-sm truncate">{reward.name}</span>
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${reward.active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-400'}`}>{reward.active ? 'เปิด' : 'ปิด'}</span>
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
                                                            <div className="flex gap-1.5 shrink-0">
                                                                <button onClick={() => openEditReward(partner, reward)} className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition">
                                                                    <i className="fa-solid fa-pen text-blue-400 text-[10px]"></i>
                                                                </button>
                                                                <button onClick={() => deleteReward(partner.id, reward.id)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition">
                                                                    <i className="fa-solid fa-trash text-red-400 text-[10px]"></i>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </>
                )}

                {/* === Tab: Partner Users === */}
                {activeTab === 'users' && (
                    <div className="space-y-5">
                        {/* Current Partner Users */}
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-100 bg-violet-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
                                        <i className="fa-solid fa-handshake text-violet-600 text-sm"></i>
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 text-sm">Partner Users ปัจจุบัน</h3>
                                        <p className="text-slate-400 text-xs">ผู้ใช้ที่มีสิทธิ์จัดการร้านตัวเอง</p>
                                    </div>
                                </div>
                                <span className="bg-violet-500 text-white text-xs font-bold px-2 py-1 rounded-full">{partnerUsers.length} คน</span>
                            </div>
                            {partnerUsers.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <i className="fa-solid fa-user-slash text-3xl block mb-2 opacity-30"></i>
                                    <p className="text-sm font-medium">ยังไม่มี Partner User</p>
                                    <p className="text-xs mt-1">กำหนดสิทธิ์ได้จากตารางด้านล่าง</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {partnerUsers.map(u => {
                                        const linkedPartner = partners.find(p => p.id === u.partnerId);
                                        return (
                                            <div key={u.id} className="flex items-center gap-4 px-5 py-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center text-violet-700 font-black text-sm shrink-0">
                                                    {(u.firstName || u.username || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-slate-800 text-sm">{u.firstName} {u.lastName}</div>
                                                    <div className="text-xs text-slate-400">{u.username || u.phoneNumber}</div>
                                                    {linkedPartner && (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <i className="fa-solid fa-store text-violet-400 text-[10px]"></i>
                                                            <span className="text-xs text-violet-600 font-medium">{linkedPartner.name}</span>
                                                        </div>
                                                    )}
                                                    {!linkedPartner && u.partnerId && (
                                                        <span className="text-xs text-orange-500">ร้าน ID: {u.partnerId}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        onClick={() => openAssignModal(u)}
                                                        className="text-xs bg-blue-50 text-blue-600 font-bold px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
                                                    >
                                                        เปลี่ยนร้าน
                                                    </button>
                                                    <button
                                                        onClick={() => removePartnerRole(u)}
                                                        className="text-xs bg-red-50 text-red-500 font-bold px-3 py-1.5 rounded-lg hover:bg-red-100 transition"
                                                    >
                                                        ยกเลิก
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Assign Partner Role */}
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-100 bg-emerald-50/50 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                                    <i className="fa-solid fa-user-plus text-emerald-600 text-sm"></i>
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-sm">กำหนดสิทธิ์ Partner</h3>
                                    <p className="text-slate-400 text-xs">เลือก user ที่ต้องการให้จัดการร้านค้า</p>
                                </div>
                            </div>
                            {regularUsers.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">ไม่มี user ที่สามารถกำหนดได้</div>
                            ) : (
                                <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
                                    {regularUsers.map(u => (
                                        <div key={u.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition">
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-black text-xs shrink-0">
                                                {(u.firstName || u.username || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-slate-700 text-sm">{u.firstName} {u.lastName}</div>
                                                <div className="text-xs text-slate-400">{u.username || (u.studentId ? `รหัส: ${u.studentId}` : u.phoneNumber)}</div>
                                            </div>
                                            <button
                                                onClick={() => openAssignModal(u)}
                                                className="shrink-0 flex items-center gap-1.5 bg-violet-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-violet-600 transition active:scale-95"
                                            >
                                                <i className="fa-solid fa-handshake text-[10px]"></i> กำหนดเป็น Partner
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* === Partner Modal === */}
            {showPartnerModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className={`px-6 py-4 flex items-center justify-between ${
                            partnerModalType === 'student' ? 'bg-[#64964E] text-white' : 'bg-[#64964E] text-white'
                        }`}>
                            <div className="flex items-center gap-2">
                                <h2 className="font-medium text-xl">
                                    {editingPartner
                                        ? 'แก้ไขร้านค้า'
                                        : `เพิ่มร้านค้าใหม่ สำหรับ${partnerModalType === 'student' ? 'นักศึกษา' : 'ร้านทั่วไป'}`
                                    }
                                </h2>
                            </div>
                            <button onClick={() => setShowPartnerModal(false)} className="text-white hover:text-white/80 text-xl font-light">
                                X
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-sm text-gray-500 mb-1 block">
                                    {partnerModalType === 'student' ? 'ชื่อสถานศึกษา' : 'ชื่อร้าน'}
                                </label>
                                <input value={partnerForm.name} onChange={e => setPartnerForm(p => ({ ...p, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-[#64964E]" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-500 mb-1 flex items-center justify-between">
                                    <span>คำอธิบายสั้นๆ <span className="text-xs text-gray-400 ml-1">(50 ตัวอักษร)</span></span>
                                </label>
                                <textarea value={partnerForm.description} onChange={e => setPartnerForm(p => ({ ...p, description: e.target.value.slice(0, 50) }))} rows={2} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-[#64964E] resize-none" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-[#64964E] mb-1 block">
                                        {partnerModalType === 'student' ? 'ประเภทร้าน' : 'ประเภทร้านสำหรับร้านทั่วไป'}
                                    </label>
                                    {partnerModalType === 'student' ? (
                                        <div className="w-full border border-emerald-300 bg-emerald-50 rounded-lg px-4 py-2 text-sm text-emerald-700 font-bold flex items-center justify-between">
                                            ร้านสำหรับนักศึกษา
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <select value={partnerForm.category} onChange={e => setPartnerForm(p => ({ ...p, category: e.target.value }))} className="w-full border-none bg-[#64964E] text-white rounded-lg px-4 py-2 text-sm outline-none appearance-none cursor-pointer">
                                                {GENERAL_STORE_CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-[#64964E]">{cat}</option>)}
                                            </select>
                                            <i className="fa-solid fa-caret-down absolute right-3 top-1/2 -translate-y-1/2 text-white pointer-events-none"></i>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-sm text-[#64964E] mb-1 block leading-tight">URL โลโก้ร้าน <br/><span className="text-xs text-[#64964E] font-light">หรืออัปโหลดจากอุปกรณ์</span></label>
                                    <div className="relative">
                                        <input value={partnerForm.logoUrl} onChange={e => setPartnerForm(p => ({ ...p, logoUrl: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-[#64964E] pr-24" />
                                        <input type="file" accept="image/*" className="hidden" id="partnerLogoUpload" onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    setPartnerForm(p => ({ ...p, logoUrl: ev.target?.result as string }));
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }} />
                                        <label htmlFor="partnerLogoUpload" className="absolute right-0 top-0 h-full px-3 bg-[#64964E] text-white rounded-r-lg text-xs font-bold tracking-wider hover:bg-[#527d40] transition flex items-center gap-1 cursor-pointer">
                                            UPLOAD <i className="fa-solid fa-arrow-up"></i>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            {!editingPartner && (
                                <div className="w-1/2 ml-auto">
                                    <label className="text-sm text-[#64964E] mb-1 block">กำหนดตัวแทนPartner จาก Username</label>
                                    <div className="relative">
                                        <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="w-full border-none bg-[#64964E] text-white rounded-lg px-4 py-2 text-sm outline-none appearance-none cursor-pointer">
                                            <option value="" className="bg-[#64964E]">ไม่มี (ไม่กำหนด)</option>
                                            {regularUsers.map(u => (
                                                <option key={u.id} value={u.id} className="bg-[#64964E]">{u.firstName} {u.lastName} {u.username ? `(@${u.username})` : `(${u.phoneNumber})`}</option>
                                            ))}
                                        </select>
                                        <i className="fa-solid fa-caret-down absolute right-3 top-1/2 -translate-y-1/2 text-white pointer-events-none"></i>
                                    </div>
                                </div>
                            )}
                            
                            <label className="flex items-center gap-3 cursor-pointer mt-4">
                                <div className={`w-10 h-6 rounded-full transition ${partnerForm.active ? 'bg-[#64964E]' : 'bg-slate-300'} relative`} onClick={() => setPartnerForm(p => ({ ...p, active: !p.active }))}>
                                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${partnerForm.active ? 'translate-x-4' : ''}`}></div>
                                </div>
                                <span className="text-sm font-medium text-slate-700">เปิดให้แสดงในหน้าแลกคะแนน</span>
                            </label>

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowPartnerModal(false)} className="flex-1 py-3 rounded-xl border border-gray-300 font-bold text-gray-500 hover:bg-gray-50 transition">ยกเลิก</button>
                                <button onClick={savePartner} disabled={saving || !partnerForm.name} className="flex-1 py-3 rounded-xl bg-[#64964E] text-white font-bold hover:bg-[#527d40] transition disabled:opacity-50">
                                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* === Reward Modal === */}
            {showRewardModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="font-black text-lg text-slate-800">{editingReward ? 'แก้ไขของรางวัล' : 'เพิ่มของรางวัล'}</h2>
                                <p className="text-xs text-slate-400 mt-0.5">ร้าน: {selectedPartner?.name}</p>
                            </div>
                            <button onClick={() => setShowRewardModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><i className="fa-solid fa-times text-slate-500"></i></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">ชื่อของรางวัล *</label>
                                <input value={rewardForm.name} onChange={e => setRewardForm(r => ({ ...r, name: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" placeholder="เช่น ส่วนลด 20 บาท" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">คำอธิบาย</label>
                                <input value={rewardForm.description} onChange={e => setRewardForm(r => ({ ...r, description: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400" placeholder="รายละเอียดของรางวัล" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">ต้องใช้กี่แต้ม *</label>
                                    <input type="number" min={1} value={rewardForm.pointCost} onChange={e => setRewardForm(r => ({ ...r, pointCost: e.target.value === '' ? ('' as any) : parseInt(e.target.value) }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400" />
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
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400 bg-white"
                                    >
                                        {selectedPartner?.category === 'ร้านสำหรับนักศึกษา' ? (
                                            <>
                                                <option value="ACTIVITY">หน่วยกิตกิจกรรม</option>
                                                <option value="VOLUNTEER">ชั่วโมงจิตอาสา</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="PRODUCT">สินค้า</option>
                                                <option value="DISCOUNT">ส่วนลด</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">จำนวน (-1 = ไม่จำกัด)</label>
                                    <input type="number" min={-1} value={rewardForm.stock} onChange={e => setRewardForm(r => ({ ...r, stock: e.target.value === '' ? ('' as any) : parseInt(e.target.value) }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">URL รูปภาพ</label>
                                    <div className="relative">
                                        <input value={rewardForm.imageUrl} onChange={e => setRewardForm(r => ({ ...r, imageUrl: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400 pr-24" placeholder="https://..." />
                                        <input type="file" accept="image/*" className="hidden" id="adminRewardImageUpload" onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    setRewardForm(r => ({ ...r, imageUrl: ev.target?.result as string }));
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }} />
                                        <label htmlFor="adminRewardImageUpload" className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-emerald-100 text-emerald-600 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer hover:bg-emerald-200 transition">
                                            อัปโหลด
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className={`w-10 h-6 rounded-full transition ${rewardForm.active ? 'bg-emerald-500' : 'bg-slate-300'} relative`} onClick={() => setRewardForm(r => ({ ...r, active: !r.active }))}>
                                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${rewardForm.active ? 'translate-x-4' : ''}`}></div>
                                </div>
                                <span className="text-sm font-medium text-slate-700">เปิดให้แลกได้</span>
                            </label>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setShowRewardModal(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition">ยกเลิก</button>
                            <button onClick={saveReward} disabled={saving || !rewardForm.name || rewardForm.pointCost < 1} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold hover:shadow-lg transition disabled:opacity-50">
                                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === Assign Partner Modal === */}
            {showAssignModal && assignUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="font-black text-lg text-slate-800">กำหนดสิทธิ์ Partner</h2>
                                <p className="text-xs text-slate-400 mt-0.5">{assignUser.title} {assignUser.firstName} {assignUser.lastName}</p>
                            </div>
                            <button onClick={() => setShowAssignModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><i className="fa-solid fa-times text-slate-500"></i></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-2 block">เลือกร้านที่ต้องการผูก *</label>
                                {partners.length === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-4">ยังไม่มีร้านในระบบ กรุณาเพิ่มร้านก่อน</p>
                                ) : (
                                    <div className="space-y-2 max-h-56 overflow-y-auto">
                                        {partners.map(p => (
                                            <label key={p.id} className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition ${assignPartnerId === p.id ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                                <input type="radio" name="partner" value={p.id} checked={assignPartnerId === p.id} onChange={() => setAssignPartnerId(p.id)} className="accent-violet-600" />
                                                <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center overflow-hidden shrink-0">
                                                    {p.logoUrl ? <img src={p.logoUrl} alt="" className="w-full h-full object-cover" /> : <i className="fa-solid fa-store text-violet-500 text-sm"></i>}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                                                    <div className="text-xs text-slate-400">{p.category}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setShowAssignModal(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition">ยกเลิก</button>
                            <button onClick={saveAssignPartner} disabled={saving || !assignPartnerId} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold hover:shadow-lg transition disabled:opacity-50">
                                {saving ? 'กำลังบันทึก...' : 'ยืนยัน'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
