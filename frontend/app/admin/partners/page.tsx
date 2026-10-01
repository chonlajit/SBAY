"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../../context/SmartBinContext';
import { getImageUrl } from '../../utils/image';

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
    accumulatedPoints?: number;
}

interface PartnerStat {
    partnerId: string;
    partnerName?: string;
    totalRedemptions: number;
    salesPoints: number;
    salesBaht: number;
    profitPoints: number;
    profitBaht: number;
    partnerEarnedPoints: number;
    partnerEarnedBaht: number;
}

interface ProfitSummaryData {
    totalProfitPoints: number;
    totalProfitBaht: number;
    totalSalesPoints: number;
    totalSalesBaht: number;
    totalPartnerEarnedPoints: number;
    totalPartnerEarnedBaht: number;
    totalRedemptions: number;
    totalPartners: number;
    partnerStats: Record<string, PartnerStat>;
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

    // Filters
    const [modalUserFilter, setModalUserFilter] = useState('');
    const [assignUserFilter, setAssignUserFilter] = useState('');

    // Partner User assignment (User -> Store)
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignUser, setAssignUser] = useState<UserItem | null>(null);
    const [assignPartnerId, setAssignPartnerId] = useState('');

    // Partner User assignment (Store -> User)
    const [showStoreAssignModal, setShowStoreAssignModal] = useState(false);
    const [targetStoreForAssign, setTargetStoreForAssign] = useState<Partner | null>(null);
    const [selectedStoreUserId, setSelectedStoreUserId] = useState('');
    const [storeUserFilter, setStoreUserFilter] = useState('');

    const [profitSummary, setProfitSummary] = useState<ProfitSummaryData | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(false);

    useEffect(() => {
        const isAdminUser = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.email === 'sbay.smartcompany@gmail.com');
        if (isInitialized && !isAdminUser) {
            router.push('/');
        }
    }, [user, isInitialized, router]);

    const fetchProfitSummary = useCallback(async () => {
        if (!apiBase || !token) return;
        setLoadingSummary(true);
        try {
            const res = await fetch(`${apiBase}/admin/partners/profit-summary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setProfitSummary(data);
            }
        } catch (e) {
            console.error("fetchProfitSummary error:", e);
        } finally {
            setLoadingSummary(false);
        }
    }, [apiBase, token]);

    const fetchPartners = useCallback(async () => {
        if (!apiBase || !token) return;
        setLoading(true);
        try {
            const res = await fetch(`${apiBase}/admin/partners`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setPartners(await res.json());
            } else {
                console.error("fetchPartners error:", res.status, res.statusText);
            }
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

    useEffect(() => {
        fetchPartners();
        fetchUsers();
        fetchProfitSummary();
    }, [fetchPartners, fetchUsers, fetchProfitSummary]);

    const getStoreStats = useCallback((partner: Partner): PartnerStat => {
        if (profitSummary?.partnerStats?.[partner.id]) {
            return profitSummary.partnerStats[partner.id];
        }
        const accum = partner.accumulatedPoints || 0;
        const salesPoints = accum > 0 ? Math.round((accum / 0.9) * 100) / 100 : 0;
        const profitPoints = Math.round((salesPoints * 0.10) * 100) / 100;
        const partnerEarned = accum;
        return {
            partnerId: partner.id,
            partnerName: partner.name,
            totalRedemptions: 0,
            salesPoints,
            salesBaht: Math.round((salesPoints / 100) * 100) / 100,
            profitPoints,
            profitBaht: Math.round((profitPoints / 100) * 100) / 100,
            partnerEarnedPoints: partnerEarned,
            partnerEarnedBaht: Math.round((partnerEarned / 100) * 100) / 100,
        };
    }, [profitSummary]);

    const computedTotalProfitPoints = profitSummary?.totalProfitPoints ?? Math.round(partners.reduce((sum, p) => sum + getStoreStats(p).profitPoints, 0) * 100) / 100;
    const computedTotalProfitBaht = profitSummary?.totalProfitBaht ?? Math.round((computedTotalProfitPoints / 100) * 100) / 100;
    const computedTotalSalesPoints = profitSummary?.totalSalesPoints ?? Math.round(partners.reduce((sum, p) => sum + getStoreStats(p).salesPoints, 0) * 100) / 100;
    const computedTotalSalesBaht = profitSummary?.totalSalesBaht ?? Math.round((computedTotalSalesPoints / 100) * 100) / 100;
    const computedTotalPartnerEarnedPoints = profitSummary?.totalPartnerEarnedPoints ?? Math.round(partners.reduce((sum, p) => sum + getStoreStats(p).partnerEarnedPoints, 0) * 100) / 100;
    const computedTotalRedemptions = profitSummary?.totalRedemptions ?? 0;

    // === Partner CRUD ===
    const openAddPartner = (type: 'general' | 'student') => {
        setEditingPartner(null);
        setPartnerModalType(type);
        const defaultCat = type === 'student' ? 'ร้านสำหรับนักศึกษา' : 'ร้านขายของ';
        setPartnerForm({ ...emptyPartner, category: defaultCat });
        setSelectedUserId('');
        setModalUserFilter('');
        setShowPartnerModal(true);
    };

    const openEditPartner = (p: Partner) => {
        setEditingPartner(p);
        setPartnerModalType(p.category === 'ร้านสำหรับนักศึกษา' ? 'student' : 'general');
        setPartnerForm({ name: p.name, description: p.description, logoUrl: p.logoUrl || '', category: p.category, active: p.active });
        const existingAssigned = users.find(u => u.partnerId === p.id);
        setSelectedUserId(existingAssigned ? existingAssigned.id : '');
        setModalUserFilter('');
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
                const targetPartnerId = editingPartner ? editingPartner.id : partnerData.id;

                const currentAssigned = users.find(u => u.partnerId === targetPartnerId);
                const currentAssignedId = currentAssigned ? currentAssigned.id : '';

                if (selectedUserId && selectedUserId !== currentAssignedId) {
                    await fetch(`${apiBase}/admin/partners/${targetPartnerId}/assign-user/${selectedUserId}`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                } else if (!selectedUserId && currentAssignedId) {
                    // Admin cleared the assigned user
                    await fetch(`${apiBase}/admin/partners/${targetPartnerId}/unlink`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }

                setShowPartnerModal(false);
                fetchPartners();
                fetchUsers();
                alert(editingPartner ? 'บันทึกข้อมูลร้านค้าสำเร็จ' : 'สร้างร้านค้าใหม่สำเร็จ');
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
        const p = partners.find(item => item.id === id);
        const pName = p ? ` "${p.name}"` : '';
        if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบร้านค้า${pName}?\n\n*คำเตือน: ร้านค้าและของรางวัลทั้งหมดของร้านนี้จะถูกลบถาวร`)) return;
        setSaving(true);
        try {
            const res = await fetch(`${apiBase}/admin/partners/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                alert('ลบร้านค้าสำเร็จ');
                fetchPartners();
                fetchUsers();
            } else {
                alert('เกิดข้อผิดพลาดในการลบร้านค้า');
            }
        } catch (e: any) {
            alert(`เกิดข้อผิดพลาด: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    // ปลดผู้ดูแลออกจากร้านค้า โดยร้านค้ายังคงอยู่
    const handleUnlinkPartner = async (p: Partner) => {
        const assigned = users.find(u => u.partnerId === p.id);
        const userName = assigned ? `${assigned.firstName} ${assigned.lastName}` : 'ผู้ดูแล';
        if (!confirm(`ยืนยันการปลด ${userName} ออกจากการเป็นผู้ดูแลร้าน "${p.name}"?\n\n*หมายเหตุ: ร้านค้าและของรางวัลจะยังคงอยู่ในระบบปกติ สามารถกำหนดผู้ดูแลใหม่ได้ทุกเมื่อ`)) return;

        setSaving(true);
        try {
            const res = await fetch(`${apiBase}/admin/partners/${p.id}/unlink`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert(`ปลดผู้ดูแลร้าน "${p.name}" สำเร็จ (ร้านค้ายังคงเปิดให้บริการปกติ)`);
                fetchPartners();
                fetchUsers();
            } else {
                alert('เกิดข้อผิดพลาดในการปลดผู้ดูแล');
            }
        } catch (e: any) {
            alert(`เกิดข้อผิดพลาด: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    // กำหนดผู้ดูแลจากฝั่งร้านค้า
    const openAssignModalForStore = (p: Partner) => {
        setTargetStoreForAssign(p);
        const existingAssigned = users.find(u => u.partnerId === p.id);
        setSelectedStoreUserId(existingAssigned ? existingAssigned.id : '');
        setStoreUserFilter('');
        setShowStoreAssignModal(true);
    };

    const saveAssignUserToStore = async () => {
        if (!targetStoreForAssign) return;
        setSaving(true);
        try {
            if (selectedStoreUserId) {
                const res = await fetch(`${apiBase}/admin/partners/${targetStoreForAssign.id}/assign-user/${selectedStoreUserId}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    setShowStoreAssignModal(false);
                    fetchPartners();
                    fetchUsers();
                    alert(`กำหนดผู้ดูแลร้าน "${targetStoreForAssign.name}" สำเร็จ`);
                } else {
                    alert('เกิดข้อผิดพลาดในการกำหนดผู้ดูแล');
                }
            } else {
                const res = await fetch(`${apiBase}/admin/partners/${targetStoreForAssign.id}/unlink`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    setShowStoreAssignModal(false);
                    fetchPartners();
                    fetchUsers();
                    alert(`ปลดผู้ดูแลร้าน "${targetStoreForAssign.name}" สำเร็จ (ร้านค้ายังคงอยู่ปกติ)`);
                } else {
                    alert('เกิดข้อผิดพลาดในการปลดผู้ดูแล');
                }
            }
        } catch (e: any) {
            alert(`เกิดข้อผิดพลาด: ${e.message}`);
        } finally {
            setSaving(false);
        }
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

    // === Partner User Assignment (User -> Store) ===
    const openAssignModal = (u: UserItem) => {
        setAssignUser(u);
        setAssignPartnerId(u.partnerId || '');
        setShowAssignModal(true);
    };
    const saveAssignPartner = async () => {
        if (!assignUser || !assignPartnerId) return;
        setSaving(true);
        try {
            const res = await fetch(`${apiBase}/admin/partners/${assignPartnerId}/assign-user/${assignUser.id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setShowAssignModal(false);
                fetchPartners();
                fetchUsers();
                alert(`กำหนด ${assignUser.firstName} เป็นผู้ดูแลร้านสำเร็จ`);
            } else { alert('เกิดข้อผิดพลาด'); }
        } catch (e) { alert('เกิดข้อผิดพลาด'); }
        finally { setSaving(false); }
    };
    const removePartnerRole = async (u: UserItem) => {
        const linkedPartner = partners.find(p => p.id === u.partnerId);
        const storeName = linkedPartner ? `ร้าน "${linkedPartner.name}"` : 'ร้านค้า';
        if (!confirm(`ยืนยันการปลด ${u.firstName} ${u.lastName} ออกจากการดูแล${storeName}?\n\n*หมายเหตุ: ${storeName} จะไม่ถูกลบและยังคงอยู่ในระบบปกติ สามารถกำหนดผู้ดูแลใหม่ได้ตลอดเวลา`)) return;

        setSaving(true);
        try {
            if (u.partnerId) {
                await fetch(`${apiBase}/admin/partners/${u.partnerId}/unlink`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } else {
                await fetch(`${apiBase}/admin/user/${u.id}/role`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ role: 'USER' })
                });
            }
            fetchPartners();
            fetchUsers();
            alert(`ปลด ${u.firstName} ${u.lastName} สำเร็จ (${storeName} ยังคงอยู่ในระบบ)`);
        } catch (e) {
            console.error(e);
            alert('เกิดข้อผิดพลาด');
        } finally {
            setSaving(false);
        }
    };

    if (!isInitialized || !user) return null;

    const partnerUsers = users.filter(u => u.role === 'PARTNER');
    const regularUsers = users.filter(u => u.role !== 'PARTNER' && u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN');

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
                        {/* ======================================================== */}
                        {/* TOP PROFIT SUMMARY BANNER (รวมกำไร 10% ทุกร้านค้า) */}
                        {/* ======================================================== */}
                        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-lg border border-white/60 mb-5 relative overflow-hidden">
                            {/* Decorative background glow */}
                            <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl pointer-events-none"></div>

                            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#64964E] to-emerald-600 text-white flex items-center justify-center text-xl shadow-md shrink-0">
                                        <i className="fa-solid fa-hand-holding-dollar"></i>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h2 className="font-black text-slate-800 text-lg sm:text-xl">
                                                สรุปกำไรพาร์ทเนอร์ (10% ของสินค้า)
                                            </h2>
                                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                รวมทุกร้านค้า
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            รายได้ค่าแพลตฟอร์ม 10% จากคะแนนสินค้าที่มีการแลกสำเร็จ • อัตราแปลงค่า 100 แต้ม = 1 บาท
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => { fetchPartners(); fetchProfitSummary(); }}
                                    className="self-start md:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition active:scale-95"
                                    title="รีเฟรชข้อมูลตัวเลข"
                                >
                                    <i className={`fa-solid fa-rotate ${loadingSummary ? 'animate-spin' : ''}`}></i>
                                    <span>อัปเดตตัวเลข</span>
                                </button>
                            </div>

                            {/* Stat Cards Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 relative">
                                {/* Hero Card: 10% Total Profit */}
                                <div className="bg-gradient-to-br from-[#64964E] to-emerald-700 text-white rounded-2xl p-4 shadow-md flex flex-col justify-between relative overflow-hidden">
                                    <div className="absolute top-2 right-2 opacity-15 text-5xl">
                                        <i className="fa-solid fa-sack-dollar"></i>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between text-xs font-bold text-emerald-100 mb-1">
                                            <span>กำไรสุทธิ 10% รวมทุกร้าน</span>
                                            <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                                กำไรระบบ
                                            </span>
                                        </div>
                                        <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                                            +{computedTotalProfitPoints.toLocaleString()} <span className="text-sm font-semibold text-emerald-200">แต้ม</span>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-2 border-t border-white/20 flex items-center justify-between text-xs">
                                        <span className="text-emerald-100">มูลค่าเทียบเท่า:</span>
                                        <span className="font-black text-amber-300 text-sm">
                                            ≈ ฿{computedTotalProfitBaht.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                                        </span>
                                    </div>
                                </div>

                                {/* Card 2: Total Sales (GMV 100%) */}
                                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col justify-between hover:border-blue-200 transition">
                                    <div>
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                                            <span>ยอดแลกสินค้ารวม (100%)</span>
                                            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                                                <i className="fa-solid fa-basket-shopping"></i>
                                            </div>
                                        </div>
                                        <div className="text-2xl sm:text-3xl font-black text-slate-800">
                                            {computedTotalSalesPoints.toLocaleString()} <span className="text-sm font-semibold text-slate-400">แต้ม</span>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                        <span className="text-slate-400">มูลค่าสินค้ารวม:</span>
                                        <span className="font-bold text-blue-600">
                                            ≈ ฿{computedTotalSalesBaht.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                                        </span>
                                    </div>
                                </div>

                                {/* Card 3: Partner Earnings (90%) */}
                                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col justify-between hover:border-violet-200 transition">
                                    <div>
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                                            <span>รายได้พาร์ทเนอร์รวม (90%)</span>
                                            <div className="w-6 h-6 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center text-xs">
                                                <i className="fa-solid fa-store"></i>
                                            </div>
                                        </div>
                                        <div className="text-2xl sm:text-3xl font-black text-violet-700">
                                            {computedTotalPartnerEarnedPoints.toLocaleString()} <span className="text-sm font-semibold text-slate-400">แต้ม</span>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                        <span className="text-slate-400">เข้ากระเป๋าร้านค้า:</span>
                                        <span className="font-bold text-violet-600">
                                            ≈ ฿{(computedTotalPartnerEarnedPoints / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                                        </span>
                                    </div>
                                </div>

                                {/* Card 4: Orders & Active Stores */}
                                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col justify-between hover:border-emerald-200 transition">
                                    <div>
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                                            <span>ออเดอร์แลกสำเร็จ / ร้านค้า</span>
                                            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
                                                <i className="fa-solid fa-circle-check"></i>
                                            </div>
                                        </div>
                                        <div className="text-2xl sm:text-3xl font-black text-slate-800">
                                            {computedTotalRedemptions.toLocaleString()} <span className="text-sm font-semibold text-slate-400">รายการ</span>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                        <span className="text-slate-400">จำนวนร้านทั้งหมด:</span>
                                        <span className="font-bold text-slate-700">
                                            {partners.length} ร้านค้า
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Partner name filter */}
                        <div className="flex items-center gap-2 mb-3">
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อร้าน..."
                                value={partnerNameFilter}
                                onChange={e => setPartnerNameFilter(e.target.value)}
                                className="px-4 py-2 border border-slate-200 rounded-xl w-full bg-white/90 focus:outline-none focus:ring-2 focus:ring-[#64964E]/40"
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
                            partners.filter(p => p.name.toLowerCase().includes(partnerNameFilter.toLowerCase())).map(partner => {
                                const shopStat = getStoreStats(partner);
                                return (
                                <div key={partner.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                                    {/* Partner Row */}
                                    <div className="flex items-center gap-4 p-5">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center overflow-hidden shrink-0 border border-purple-200">
                                            {partner.logoUrl ? <img src={getImageUrl(partner.logoUrl)} alt="" className="w-full h-full object-cover" /> : <i className="fa-solid fa-store text-purple-400 text-xl"></i>}
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
                                            
                                            {/* Store Financial & Rewards Info Bar */}
                                            <div className="flex items-center gap-2 flex-wrap mt-2">
                                                {/* 10% Profit Chip */}
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 text-xs font-bold text-emerald-800 shadow-xs">
                                                    <i className="fa-solid fa-coins text-amber-500"></i>
                                                    <span>กำไร 10%: <strong className="text-emerald-700">+{shopStat.profitPoints.toLocaleString()} แต้ม</strong></span>
                                                    <span className="text-[11px] text-emerald-600 font-semibold">(≈ ฿{shopStat.profitBaht.toFixed(2)})</span>
                                                </div>

                                                {/* Store 90% Earnings Chip */}
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
                                                    <i className="fa-solid fa-store text-violet-500 text-[10px]"></i>
                                                    <span>ร้านได้ 90%: <strong className="text-violet-700">{shopStat.partnerEarnedPoints.toLocaleString()} แต้ม</strong></span>
                                                </div>

                                                {/* Rewards count & Redemptions count */}
                                                <div className="inline-flex items-center gap-2 text-xs text-slate-500">
                                                    <span><i className="fa-solid fa-gift text-slate-400 mr-1"></i>{partner.rewards?.length || 0} รายการของรางวัล</span>
                                                    {shopStat.totalRedemptions > 0 && (
                                                        <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-md">
                                                            <i className="fa-solid fa-check mr-1"></i>แลกแล้ว {shopStat.totalRedemptions} ครั้ง
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button onClick={() => setExpandedPartner(expandedPartner === partner.id ? null : partner.id)} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition" title="ดูรายละเอียดและของรางวัล">
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

                                    {/* Partner Assigned User bar */}
                                    {(() => {
                                        const assignedUser = users.find(u => u.partnerId === partner.id);
                                        return (
                                            <div className="px-5 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                                                {assignedUser ? (
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <div className="w-6 h-6 rounded-lg bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-[10px]">
                                                            {(assignedUser.firstName || assignedUser.username || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-slate-500">ผู้ดูแลร้าน:</span>
                                                        <span className="font-bold text-slate-800">{assignedUser.firstName} {assignedUser.lastName}</span>
                                                        {assignedUser.username && <span className="text-violet-600 font-mono">(@{assignedUser.username})</span>}
                                                        {assignedUser.phoneNumber && <span className="text-slate-400">({assignedUser.phoneNumber})</span>}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/70 font-medium">
                                                        <i className="fa-solid fa-store-slash text-amber-500 text-xs"></i>
                                                        <span>ยังไม่มีผู้ดูแลร้าน (ร้านค้ายังคงเปิดให้บริการปกติ)</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    {assignedUser ? (
                                                        <>
                                                            <button
                                                                onClick={() => openAssignModalForStore(partner)}
                                                                className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 font-bold hover:bg-blue-100 transition flex items-center gap-1 text-xs"
                                                            >
                                                                <i className="fa-solid fa-user-pen text-[10px]"></i> เปลี่ยนผู้ดูแล
                                                            </button>
                                                            <button
                                                                onClick={() => handleUnlinkPartner(partner)}
                                                                className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 transition flex items-center gap-1 text-xs"
                                                            >
                                                                <i className="fa-solid fa-user-slash text-[10px]"></i> ปลดผู้ดูแล
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => openAssignModalForStore(partner)}
                                                            className="px-3 py-1.5 rounded-xl bg-[#64964E] text-white font-bold hover:bg-[#527d40] transition shadow-sm flex items-center gap-1 text-xs active:scale-95"
                                                        >
                                                            <i className="fa-solid fa-user-plus text-[10px]"></i> กำหนดผู้ดูแลร้าน
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Rewards & Store Finance List (expanded) */}
                                    {expandedPartner === partner.id && (
                                        <div className="border-t border-slate-100 p-4 sm:p-5 bg-slate-50/70">
                                            {/* Store Financial Breakdown Card */}
                                            <div className="mb-5 bg-white rounded-2xl p-4 border border-emerald-100 shadow-xs">
                                                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100 flex-wrap gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#64964E] to-emerald-600 text-white flex items-center justify-center text-xs shadow-xs">
                                                            <i className="fa-solid fa-chart-line"></i>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-slate-800 text-sm">ข้อมูลยอดขาย & กำไร 10% ของร้าน {partner.name}</h4>
                                                            <p className="text-[11px] text-slate-400">ระบบหัก 10% เพื่อเป็นค่าแพลตฟอร์ม และโอนเข้ากระเป๋าร้านค้า 90% (100 แต้ม = 1 บาท)</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                                                        ส่วนแบ่ง: แพลตฟอร์ม 10% / ร้านค้า 90%
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-3.5 rounded-xl border border-emerald-200">
                                                        <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                                                            <i className="fa-solid fa-sack-dollar text-amber-500"></i> กำไรของระบบ (10%)
                                                        </div>
                                                        <div className="text-lg sm:text-xl font-black text-emerald-700 mt-1">
                                                            +{shopStat.profitPoints.toLocaleString()} <span className="text-xs font-normal">แต้ม</span>
                                                        </div>
                                                        <div className="text-xs text-emerald-600 font-bold mt-0.5">
                                                            ≈ ฿{shopStat.profitBaht.toFixed(2)} บาท
                                                        </div>
                                                    </div>

                                                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                                        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                                            <i className="fa-solid fa-store text-violet-500"></i> รายได้ร้านค้า (90%)
                                                        </div>
                                                        <div className="text-lg sm:text-xl font-black text-violet-700 mt-1">
                                                            {shopStat.partnerEarnedPoints.toLocaleString()} <span className="text-xs font-normal">แต้ม</span>
                                                        </div>
                                                        <div className="text-xs text-slate-500 font-semibold mt-0.5">
                                                            ≈ ฿{shopStat.partnerEarnedBaht.toFixed(2)} บาท
                                                        </div>
                                                    </div>

                                                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                                        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                                            <i className="fa-solid fa-basket-shopping text-blue-500"></i> ยอดแลกสินค้ารวม (100%)
                                                        </div>
                                                        <div className="text-lg sm:text-xl font-black text-slate-800 mt-1">
                                                            {shopStat.salesPoints.toLocaleString()} <span className="text-xs font-normal">แต้ม</span>
                                                        </div>
                                                        <div className="text-xs text-slate-500 font-semibold mt-0.5">
                                                            ≈ ฿{shopStat.salesBaht.toFixed(2)} บาท
                                                        </div>
                                                    </div>

                                                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                                        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                                            <i className="fa-solid fa-circle-check text-teal-500"></i> ออเดอร์แลกสำเร็จ
                                                        </div>
                                                        <div className="text-lg sm:text-xl font-black text-teal-700 mt-1">
                                                            {shopStat.totalRedemptions} <span className="text-xs font-normal">ครั้ง</span>
                                                        </div>
                                                        <div className="text-xs text-slate-400 mt-0.5">
                                                            จาก {partner.rewards?.length || 0} รายการของรางวัล
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-bold text-slate-600 text-sm">รายการของรางวัล</h4>
                                                <button onClick={() => openAddReward(partner)} className="flex items-center gap-1.5 bg-[#64964E] text-white font-bold text-xs px-3 py-1.5 rounded-xl hover:bg-[#527d40] transition">
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
                                                                {reward.imageUrl ? <img src={getImageUrl(reward.imageUrl)} alt="" className="w-full h-full object-cover rounded-xl" /> : <i className="fa-solid fa-gift text-emerald-400"></i>}
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
                            );
                            })
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

                        {/* Unassigned Stores (ร้านค้าที่ยังไม่มีผู้ดูแล) */}
                        {(() => {
                            const unassignedPartners = partners.filter(p => !users.some(u => u.partnerId === p.id));
                            if (unassignedPartners.length === 0) return null;
                            return (
                                <div className="bg-white rounded-3xl border border-amber-200 shadow-sm overflow-hidden">
                                    <div className="p-5 border-b border-amber-100 bg-amber-50/70 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                                                <i className="fa-solid fa-store-slash text-amber-600 text-sm"></i>
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-800 text-sm">ร้านค้าที่ยังไม่มีผู้ดูแล ({unassignedPartners.length} ร้าน)</h3>
                                                <p className="text-slate-500 text-xs">ร้านค้าเหล่านี้ยังคงเปิดให้บริการปกติในระบบ สามารถกำหนดผู้ดูแลใหม่ได้ทันที</p>
                                            </div>
                                        </div>
                                        <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">{unassignedPartners.length} ร้าน</span>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {unassignedPartners.map(p => (
                                            <div key={p.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                                                    {p.logoUrl ? <img src={getImageUrl(p.logoUrl)} alt="" className="w-full h-full object-cover" /> : <i className="fa-solid fa-store text-slate-400 text-sm"></i>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-slate-800 text-sm flex items-center gap-2 flex-wrap">
                                                        {p.name}
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${p.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>{p.active ? 'เปิด' : 'ปิด'}</span>
                                                        <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.2 rounded-full font-medium">{p.category}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-400 truncate">{p.description || 'ไม่มีคำอธิบาย'}</div>
                                                </div>
                                                <button
                                                    onClick={() => openAssignModalForStore(p)}
                                                    className="shrink-0 flex items-center gap-1.5 bg-[#64964E] text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-[#527d40] transition active:scale-95"
                                                >
                                                    <i className="fa-solid fa-user-plus text-[10px]"></i> กำหนดผู้ดูแล
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Assign Partner Role */}
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-100 bg-emerald-50/50 flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                                        <i className="fa-solid fa-user-plus text-emerald-600 text-sm"></i>
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 text-sm">กำหนดสิทธิ์ Partner</h3>
                                        <p className="text-slate-400 text-xs">เลือก user ที่ต้องการให้จัดการร้านค้า</p>
                                    </div>
                                </div>
                                <div className="w-full md:w-64">
                                    <input
                                        type="text"
                                        placeholder="ค้นหาชื่อ หรือ Username..."
                                        value={assignUserFilter}
                                        onChange={(e) => setAssignUserFilter(e.target.value)}
                                        className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-emerald-400"
                                    />
                                </div>
                            </div>
                            {regularUsers.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">ไม่มี user ที่สามารถกำหนดได้</div>
                            ) : (
                                <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
                                    {regularUsers.filter(u =>
                                        (u.id && u.id.toLowerCase().includes(assignUserFilter.toLowerCase())) ||
                                        (u.username && u.username.toLowerCase().includes(assignUserFilter.toLowerCase())) ||
                                        (u.phoneNumber && u.phoneNumber.toLowerCase().includes(assignUserFilter.toLowerCase())) ||
                                        (u.firstName && u.firstName.toLowerCase().includes(assignUserFilter.toLowerCase())) ||
                                        (u.lastName && u.lastName.toLowerCase().includes(assignUserFilter.toLowerCase()))
                                    ).map(u => (
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
                        <div className={`px-6 py-4 flex items-center justify-between ${partnerModalType === 'student' ? 'bg-[#64964E] text-white' : 'bg-[#64964E] text-white'
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
                                    <label className="text-sm text-[#64964E] mb-1 block leading-tight">URL โลโก้ร้าน <br /><span className="text-xs text-[#64964E] font-light">หรืออัปโหลดจากอุปกรณ์</span></label>
                                    <div className="relative">
                                        <input value={partnerForm.logoUrl} onChange={e => setPartnerForm(p => ({ ...p, logoUrl: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-[#64964E] pr-24" />
                                        <input type="file" accept="image/*" className="hidden" id="partnerLogoUpload" onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    const img = new Image();
                                                    img.onload = () => {
                                                        const canvas = document.createElement('canvas');
                                                        const MAX_WIDTH = 800;
                                                        const MAX_HEIGHT = 800;
                                                        let width = img.width;
                                                        let height = img.height;

                                                        if (width > height) {
                                                            if (width > MAX_WIDTH) {
                                                                height *= MAX_WIDTH / width;
                                                                width = MAX_WIDTH;
                                                            }
                                                        } else {
                                                            if (height > MAX_HEIGHT) {
                                                                width *= MAX_HEIGHT / height;
                                                                height = MAX_HEIGHT;
                                                            }
                                                        }

                                                        canvas.width = width;
                                                        canvas.height = height;
                                                        const ctx = canvas.getContext('2d');
                                                        ctx?.drawImage(img, 0, 0, width, height);

                                                        // Compress to 80% quality JPEG
                                                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                                                        setPartnerForm(p => ({ ...p, logoUrl: compressedBase64 }));
                                                    };
                                                    img.src = ev.target?.result as string;
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

                            <div>
                                <label className="text-sm text-[#64964E] mb-1 block font-medium">
                                    {editingPartner ? 'ผู้ดูแลร้านค้า (Partner User)' : 'กำหนดผู้ดูแลร้านค้า (ไม่บังคับ สามารถกำหนดภายหลังได้)'}
                                </label>
                                <input
                                    type="text"
                                    placeholder="ค้นหาชื่อ หรือ Username เพื่อเลือกผู้ดูแล..."
                                    value={modalUserFilter}
                                    onChange={e => setModalUserFilter(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none mb-2 focus:border-[#64964E]"
                                />
                                <div className="relative">
                                    <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="w-full border-none bg-[#64964E] text-white rounded-lg px-4 py-2 text-sm outline-none appearance-none cursor-pointer">
                                        <option value="" className="bg-[#64964E]">ไม่มี (ยังไม่กำหนดผู้ดูแล / ปลดผู้ดูแล)</option>
                                        {/* If editing, show current assigned user */}
                                        {editingPartner && users.filter(u => u.partnerId === editingPartner.id).map(u => (
                                            <option key={u.id} value={u.id} className="bg-[#64964E]">
                                                [ผู้ดูแลปัจจุบัน] {u.firstName} {u.lastName} {u.username ? `(@${u.username})` : `(${u.phoneNumber})`}
                                            </option>
                                        ))}
                                        {/* Other available users */}
                                        {users.filter(u =>
                                            (!u.partnerId || (editingPartner && u.partnerId === editingPartner.id)) &&
                                            u.role !== 'SUPER_ADMIN' &&
                                            ((u.id && u.id.toLowerCase().includes(modalUserFilter.toLowerCase())) ||
                                            (u.username && u.username.toLowerCase().includes(modalUserFilter.toLowerCase())) ||
                                            (u.phoneNumber && u.phoneNumber.toLowerCase().includes(modalUserFilter.toLowerCase())) ||
                                            (u.firstName && u.firstName.toLowerCase().includes(modalUserFilter.toLowerCase())) ||
                                            (u.lastName && u.lastName.toLowerCase().includes(modalUserFilter.toLowerCase())))
                                        ).filter(u => !(editingPartner && u.partnerId === editingPartner.id)).map(u => (
                                            <option key={u.id} value={u.id} className="bg-[#64964E]">
                                                {u.firstName} {u.lastName} {u.username ? `(@${u.username})` : `(${u.phoneNumber})`} {u.role === 'ADMIN' ? '(Admin)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <i className="fa-solid fa-caret-down absolute right-3 top-1/2 -translate-y-1/2 text-white pointer-events-none"></i>
                                </div>
                            </div>

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
                                                    {p.logoUrl ? <img src={getImageUrl(p.logoUrl)} alt="" className="w-full h-full object-cover" /> : <i className="fa-solid fa-store text-violet-500 text-sm"></i>}
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

            {/* === Assign User to Store Modal === */}
            {showStoreAssignModal && targetStoreForAssign && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="font-black text-lg text-slate-800">กำหนดผู้ดูแลร้านค้า</h2>
                                <p className="text-xs text-slate-500 mt-0.5">ร้าน: <span className="font-bold text-[#64964E]">{targetStoreForAssign.name}</span></p>
                            </div>
                            <button onClick={() => setShowStoreAssignModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><i className="fa-solid fa-times text-slate-500"></i></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <input
                                    type="text"
                                    placeholder="ค้นหาชื่อ หรือ Username..."
                                    value={storeUserFilter}
                                    onChange={e => setStoreUserFilter(e.target.value)}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none mb-3 focus:border-[#64964E]"
                                />

                                <label className="text-xs font-bold text-slate-500 mb-2 block">เลือกผู้ใช้ที่ต้องการให้เป็นผู้ดูแลร้าน</label>

                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {/* Option to clear / unlink */}
                                    <label className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition ${selectedStoreUserId === '' ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <input
                                            type="radio"
                                            name="storeUser"
                                            value=""
                                            checked={selectedStoreUserId === ''}
                                            onChange={() => setSelectedStoreUserId('')}
                                            className="accent-red-600"
                                        />
                                        <div>
                                            <div className="font-bold text-red-600 text-sm">ไม่มี (ปลดผู้ดูแลร้าน)</div>
                                            <div className="text-xs text-slate-400">ร้านค้าจะยังคงเปิดให้บริการปกติ โดยไม่มีผู้ดูแลผูกไว้</div>
                                        </div>
                                    </label>

                                    {/* List of eligible users */}
                                    {users.filter(u =>
                                        u.role !== 'SUPER_ADMIN' &&
                                        ((u.id && u.id.toLowerCase().includes(storeUserFilter.toLowerCase())) ||
                                        (u.username && u.username.toLowerCase().includes(storeUserFilter.toLowerCase())) ||
                                        (u.phoneNumber && u.phoneNumber.toLowerCase().includes(storeUserFilter.toLowerCase())) ||
                                        (u.firstName && u.firstName.toLowerCase().includes(storeUserFilter.toLowerCase())) ||
                                        (u.lastName && u.lastName.toLowerCase().includes(storeUserFilter.toLowerCase())))
                                    ).map(u => {
                                        const isCurrent = u.partnerId === targetStoreForAssign.id;
                                        return (
                                            <label
                                                key={u.id}
                                                className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition ${selectedStoreUserId === u.id ? 'border-[#64964E] bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="storeUser"
                                                    value={u.id}
                                                    checked={selectedStoreUserId === u.id}
                                                    onChange={() => setSelectedStoreUserId(u.id)}
                                                    className="accent-[#64964E]"
                                                />
                                                <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-xs shrink-0">
                                                    {(u.firstName || u.username || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5 flex-wrap">
                                                        <span>{u.firstName} {u.lastName}</span>
                                                        {isCurrent && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">ผู้ดูแลปัจจุบัน</span>}
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {u.username ? `@${u.username}` : ''} {u.phoneNumber ? `(${u.phoneNumber})` : ''} {u.role === 'ADMIN' ? '• Role: Admin' : ''}
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setShowStoreAssignModal(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition">ยกเลิก</button>
                            <button onClick={saveAssignUserToStore} disabled={saving} className="flex-1 py-3 rounded-xl bg-[#64964E] text-white font-bold hover:bg-[#527d40] transition disabled:opacity-50">
                                {saving ? 'กำลังบันทึก...' : 'ยืนยัน'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
