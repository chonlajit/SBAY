"use client"
import React, { useEffect, useState, useCallback } from 'react';
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
    name: '', description: '', pointCost: 100, rewardType: 'DISCOUNT', category: 'สินค้า', imageUrl: '', active: true, stock: -1
};

export default function PartnerProductsPage() {
    const router = useRouter();
    const { apiBase, token, user, isInitialized } = useSmartBin();
    const [partner, setPartner] = useState<Partner | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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

    useEffect(() => {
        if (user && (user.role === 'PARTNER' || user.role === 'ADMIN')) {
            fetchMyPartner();
        }
    }, [user, fetchMyPartner]);

    // === Reward CRUD ===
    const openAddReward = () => {
        setEditingReward(null);
        setRewardForm({ ...emptyReward });
        setShowRewardModal(true);
    };
    const openEditReward = (reward: PartnerReward) => {
        setEditingReward(reward);
        setRewardForm({
            name: reward.name, description: reward.description, pointCost: reward.pointCost,
            rewardType: reward.rewardType, category: reward.category || 'สินค้า',
            imageUrl: reward.imageUrl || '', active: reward.active, stock: reward.stock
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
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 text-white p-6 rounded-b-3xl shadow-lg shadow-purple-200">
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push('/')} className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition">
                            <i className="fa-solid fa-arrow-left text-sm"></i>
                        </button>
                        <div>
                            <h1 className="font-black text-xl">ร้านของฉัน</h1>
                            <p className="text-purple-200 text-xs">จัดการร้านค้าและของรางวัล</p>
                        </div>
                    </div>
                    <button onClick={openAddReward} className="flex items-center gap-2 bg-white text-purple-600 font-bold text-sm px-4 py-2.5 rounded-xl shadow-md hover:bg-purple-50 transition active:scale-95">
                        <i className="fa-solid fa-plus"></i> เพิ่มรางวัล
                    </button>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
                {loading ? (
                    <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div></div>
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
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center overflow-hidden shrink-0 border border-purple-200">
                                    {partner.logoUrl
                                        ? <img src={partner.logoUrl} alt="" className="w-full h-full object-cover" />
                                        : <i className="fa-solid fa-store text-purple-400 text-2xl"></i>
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
                                    <span className="inline-block mt-1 text-xs bg-purple-50 text-purple-600 font-medium px-2 py-0.5 rounded-full">{partner.category}</span>
                                </div>
                                <button onClick={openStoreEdit} className="w-10 h-10 rounded-xl bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition shrink-0">
                                    <i className="fa-solid fa-pen text-blue-500 text-sm"></i>
                                </button>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center">
                                <div className="text-2xl font-black text-purple-600">{rewards.length}</div>
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

                        {/* Rewards List */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-purple-50/30 flex items-center justify-between">
                                <h3 className="font-black text-slate-800 text-sm">รายการของรางวัล</h3>
                                <button onClick={openAddReward} className="flex items-center gap-1.5 bg-purple-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl hover:bg-purple-600 transition">
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
                                            <div className="flex gap-1.5 shrink-0">
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
                                <input value={rewardForm.name} onChange={e => setRewardForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100" placeholder="เช่น ส่วนลด 10%" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">คำอธิบาย</label>
                                <textarea value={rewardForm.description} onChange={e => setRewardForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 resize-none" placeholder="รายละเอียดเพิ่มเติม" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">คะแนนที่ใช้แลก *</label>
                                    <input type="number" value={rewardForm.pointCost} onChange={e => setRewardForm(f => ({ ...f, pointCost: parseInt(e.target.value) || 0 }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">จำนวน (-1 = ไม่จำกัด)</label>
                                    <input type="number" value={rewardForm.stock} onChange={e => setRewardForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">ประเภทรางวัล</label>
                                    <select value={rewardForm.rewardType} onChange={e => setRewardForm(f => ({ ...f, rewardType: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 bg-white">
                                        {REWARD_TYPES.map(t => <option key={t} value={t}>{REWARD_TYPE_LABELS[t]}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">หมวดหมู่</label>
                                    <select value={rewardForm.category} onChange={e => setRewardForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 bg-white">
                                        {REWARD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">URL รูปภาพ</label>
                                <input value={rewardForm.imageUrl} onChange={e => setRewardForm(f => ({ ...f, imageUrl: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400" placeholder="https://..." />
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className={`w-10 h-6 rounded-full transition ${rewardForm.active ? 'bg-purple-500' : 'bg-slate-300'} relative`} onClick={() => setRewardForm(f => ({ ...f, active: !f.active }))}>
                                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${rewardForm.active ? 'translate-x-4' : ''}`}></div>
                                </div>
                                <span className="text-sm font-medium text-slate-700">เปิดให้แสดงในหน้าแลกคะแนน</span>
                            </label>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setShowRewardModal(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition">ยกเลิก</button>
                            <button onClick={saveReward} disabled={saving || !rewardForm.name} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold hover:shadow-lg transition disabled:opacity-50">
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
                                <input value={storeForm.name} onChange={e => setStoreForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">คำอธิบาย</label>
                                <textarea value={storeForm.description} onChange={e => setStoreForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 resize-none" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">URL โลโก้</label>
                                <input value={storeForm.logoUrl} onChange={e => setStoreForm(f => ({ ...f, logoUrl: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400" placeholder="https://..." />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setShowStoreModal(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition">ยกเลิก</button>
                            <button onClick={saveStoreInfo} disabled={saving || !storeForm.name} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold hover:shadow-lg transition disabled:opacity-50">
                                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
