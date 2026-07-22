"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';

interface PartnerReward {
    id: string;
    name: string;
    description: string;
    pointCost: number;
    rewardType: string;
    category?: string;
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

const REWARD_CATEGORY_COLORS: Record<string, string> = {
    'สินค้า': 'bg-blue-50 text-blue-600 border border-blue-100',
    'ส่วนลดร้านค้า': 'bg-orange-50 text-orange-600 border border-orange-100',
    'สำหรับนักศึกษา': 'bg-emerald-50 text-emerald-600 border border-emerald-100',
};

const REWARD_CATEGORY_ICONS: Record<string, string> = {
    'สินค้า': 'fa-box',
    'ส่วนลดร้านค้า': 'fa-tag',
    'สำหรับนักศึกษา': 'fa-graduation-cap',
};

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

export default function RedeemPage() {
    const router = useRouter();
    const { user, token, apiBase, isInitialized } = useSmartBin();
    const [loading, setLoading] = useState(false);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [partnersLoading, setPartnersLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'student' | 'partners'>('student');
    const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
    const [selectedPartnerId, setSelectedPartnerId] = useState<string>('ทั้งหมด');
    const [partnerSearch, setPartnerSearch] = useState<string>('');

    useEffect(() => {
        if (!user && isInitialized) {
            router.push('/login');
        }
    }, [user, isInitialized, router]);

    useEffect(() => {
        if (apiBase) {
            fetchPartners();
        }
    }, [apiBase]);

    const fetchPartners = async () => {
        setPartnersLoading(true);
        try {
            const res = await fetch(`${apiBase}/partners`);
            if (res.ok) {
                const data = await res.json();
                setPartners(data);
            }
        } catch (e) {
            console.error('Failed to fetch partners:', e);
        } finally {
            setPartnersLoading(false);
        }
    };

    if (!isInitialized || !user) {
        return (
            <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20 animate-pulse">
                <div className="sticky top-0 z-20 bg-slate-50 shadow-sm border-b border-slate-200 pb-4">
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100">
                        <div>
                            <div className="h-5 bg-slate-200 rounded w-32 mb-1.5"></div>
                            <div className="h-3 bg-slate-200 rounded w-24"></div>
                        </div>
                        <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                    </div>
                </div>
            </div>
        );
    }

    const handlePartnerRedeem = async (partner: Partner, reward: PartnerReward) => {
        if (user.points < reward.pointCost) return;
        if (!confirm(`ยืนยันการแลก "${reward.name}" จาก ${partner.name} ใช้ ${reward.pointCost} แต้ม?`)) return;

        setLoading(true);
        try {
            const res = await fetch(`${apiBase}/redeem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    userId: user.id,
                    rewardType: 'PARTNER',
                    cost: reward.pointCost,
                    value: 1,
                    details: `${partner.name} - ${reward.name}`,
                    partnerId: partner.id,
                    partnerRewardId: reward.id
                })
            });
            if (res.ok) {
                alert(`แลกสำเร็จ! กรุณารอแอดมินอนุมัติและรับของรางวัลที่ร้าน "${partner.name}"`);
                router.push('/');
            } else {
                alert("เกิดข้อผิดพลาดในการแลกรางวัล");
            }
        } catch (e) {
            alert("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
        } finally {
            setLoading(false);
        }
    };

    const rewardTypeBadge: Record<string, { label: string; color: string }> = {
        DISCOUNT: { label: 'ส่วนลด', color: 'bg-blue-100 text-blue-700' },
        FREEBIE: { label: 'ของแถม', color: 'bg-pink-100 text-pink-700' },
        VOUCHER: { label: 'คูปอง', color: 'bg-orange-100 text-orange-700' },
        OTHER: { label: 'อื่นๆ', color: 'bg-gray-100 text-gray-600' },
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
            {/* Header & Points (Sticky) */}
            <div className="sticky top-0 z-20 bg-slate-50 shadow-sm border-b border-slate-200 pb-4">
                <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-slate-100">
                    <div>
                        <h1 className="font-black text-lg text-slate-800">แลกคะแนนสะสม</h1>
                        <div className="text-sm text-slate-500 mt-0.5">แต้มของคุณ: <span className="font-black text-emerald-600">{user.points}</span> แต้ม</div>
                    </div>
                    <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 shadow-sm">
                        <i className="fa-solid fa-gift text-emerald-500"></i>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex mx-4 mt-3 bg-slate-100 rounded-2xl p-1 gap-1">
                    <button
                        onClick={() => setActiveTab('student')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${activeTab === 'student' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}
                    >
                        <i className="fa-solid fa-graduation-cap mr-1.5"></i>สำหรับนักศึกษา
                    </button>
                    <button
                        onClick={() => setActiveTab('partners')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${activeTab === 'partners' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}
                    >
                        <i className="fa-solid fa-store mr-1.5"></i>ร้านพาร์ทเนอร์
                        {partners.filter(p => p.category !== 'ร้านสำหรับนักศึกษา' && p.rewards?.some(r => r.active && r.category !== 'สำหรับนักศึกษา')).length > 0 && <span className="ml-1 bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full">{partners.filter(p => p.category !== 'ร้านสำหรับนักศึกษา' && p.rewards?.some(r => r.active && r.category !== 'สำหรับนักศึกษา')).length}</span>}
                    </button>
                </div>

                {/* Sub-filter for Partner tab */}
                {activeTab === 'partners' && (
                    <div className="px-4 mt-2 space-y-2">
                        {/* Search box */}
                        <div className="relative">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                            <input
                                type="text"
                                value={partnerSearch}
                                onChange={e => setPartnerSearch(e.target.value)}
                                placeholder="ค้นหาชื่อร้าน..."
                                className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition"
                            />
                        </div>
                        {/* Store chips */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            <button
                                onClick={() => setSelectedPartnerId('ทั้งหมด')}
                                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                    selectedPartnerId === 'ทั้งหมด'
                                        ? 'bg-emerald-500 text-white shadow-sm'
                                        : 'bg-white border border-slate-200 text-slate-500 hover:border-emerald-300'
                                }`}
                            >
                                ทั้งหมด
                            </button>
                            {partners
                                .filter(p => p.category !== 'ร้านสำหรับนักศึกษา' && p.rewards?.some(r => r.active && r.category !== 'สำหรับนักศึกษา'))
                                .map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedPartnerId(p.id)}
                                        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                            selectedPartnerId === p.id
                                                ? 'bg-emerald-500 text-white shadow-sm'
                                                : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300'
                                        }`}
                                    >
                                        {p.logoUrl && <img src={p.logoUrl} alt="" className="w-4 h-4 rounded-full object-cover" />}
                                        {p.name}
                                    </button>
                                ))
                            }
                        </div>
                        {/* Category sub-filter */}
                        <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5 text-xs">
                            {['ทั้งหมด', 'สินค้า', 'ส่วนลดร้านค้า'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`flex-1 py-1.5 rounded-lg font-bold transition ${selectedCategory === cat ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 max-w-md md:max-w-3xl mx-auto pt-4">

                {/* === Tab: สำหรับนักศึกษา === */}
                {activeTab === 'student' && (
                    <div className="space-y-5">
                        {partnersLoading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                            </div>
                        ) : (() => {
                            const studentPartners = partners.filter(partner =>
                                (partner.category === 'ร้านสำหรับนักศึกษา' && partner.rewards?.some(r => r.active)) ||
                                partner.rewards?.some(r => r.active && r.category === 'สำหรับนักศึกษา')
                            );
                            if (studentPartners.length === 0) {
                                return (
                                    <div className="text-center py-16 text-slate-400 bg-white border border-slate-100 rounded-3xl shadow-sm">
                                        <i className="fa-solid fa-graduation-cap text-4xl mb-3 block opacity-30 text-slate-300"></i>
                                        <p className="font-bold text-slate-500 text-sm">ยังไม่มีรางวัลสำหรับนักศึกษา</p>
                                        <p className="text-slate-400 text-xs mt-1">ติดตามอัปเดตใหม่ๆ เร็วๆ นี้!</p>
                                    </div>
                                );
                            }
                            return studentPartners.map(partner => {
                                const activeRewards = partner.rewards?.filter(r => r.active && (partner.category === 'ร้านสำหรับนักศึกษา' || r.category === 'สำหรับนักศึกษา')) || [];
                                return (
                                    <div key={partner.id} className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition">
                                        <div className="flex items-center gap-3 p-5 border-b border-slate-50 bg-emerald-50/30">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center overflow-hidden shrink-0 border border-emerald-200">
                                                {partner.logoUrl
                                                    ? <img src={partner.logoUrl} alt={partner.name} className="w-full h-full object-cover" />
                                                    : <i className="fa-solid fa-graduation-cap text-emerald-500 text-2xl"></i>
                                                }
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-black text-slate-800 text-lg leading-tight">{partner.name}</h3>
                                                <p className="text-slate-500 text-xs mt-0.5">{partner.description}</p>
                                                <span className="inline-block mt-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">สำหรับนักศึกษา</span>
                                            </div>
                                        </div>
                                        <div className="divide-y divide-slate-50">
                                            {activeRewards.map(reward => {
                                                const canAfford = user.points >= reward.pointCost;
                                                const outOfStock = reward.stock === 0;
                                                const badge = rewardTypeBadge[reward.rewardType] || rewardTypeBadge['OTHER'];
                                                const rewardCat = reward.category || 'สินค้า';
                                                const catColor = REWARD_CATEGORY_COLORS[rewardCat] || 'bg-slate-100 text-slate-500 border border-slate-200';
                                                return (
                                                    <div key={reward.id} className={`flex items-center gap-4 p-4 ${!canAfford || outOfStock ? 'opacity-60' : ''}`}>
                                                        {reward.imageUrl
                                                            ? <img src={reward.imageUrl} alt={reward.name} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-100" />
                                                            : <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center shrink-0">
                                                                <i className="fa-solid fa-graduation-cap text-emerald-500 text-xl"></i>
                                                              </div>
                                                        }
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-bold text-slate-800 text-sm">{reward.name}</span>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${badge.color}`}>{badge.label}</span>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${catColor}`}>
                                                                    <i className={`fa-solid ${REWARD_CATEGORY_ICONS[rewardCat]} text-[8px]`}></i>
                                                                    {rewardCat}
                                                                </span>
                                                            </div>
                                                            {reward.description && <p className="text-slate-400 text-xs mt-0.5">{reward.description}</p>}
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="font-black text-emerald-600 text-sm">{reward.pointCost.toLocaleString()} แต้ม</span>
                                                                {reward.stock > 0 && <span className="text-xs text-orange-500 font-medium">เหลือ {reward.stock} ชิ้น</span>}
                                                                {outOfStock && <span className="text-xs text-red-400 font-bold">หมดแล้ว</span>}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handlePartnerRedeem(partner, reward)}
                                                            disabled={!canAfford || outOfStock || loading}
                                                            className={`shrink-0 px-4 py-2.5 rounded-xl font-bold text-xs transition active:scale-95 ${canAfford && !outOfStock ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-md' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                                        >
                                                            {outOfStock ? 'หมด' : !canAfford ? 'แต้มไม่พอ' : 'แลก'}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                )}

                {/* === Tab: Partner Rewards === */}
                {activeTab === 'partners' && (
                    <div className="space-y-5">
                        {partnersLoading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                            </div>
                        ) : (
                            (() => {
                                const filteredPartners = partners.filter(partner => {
                                    if (partner.category === 'ร้านสำหรับนักศึกษา') return false;
                                    // Filter by selected store chip
                                    if (selectedPartnerId !== 'ทั้งหมด' && partner.id !== selectedPartnerId) return false;
                                    // Filter by search text
                                    if (partnerSearch && !partner.name.toLowerCase().includes(partnerSearch.toLowerCase())) return false;
                                    const activeRewards = partner.rewards?.filter(r => {
                                        if (!r.active) return false;
                                        if (r.category === 'สำหรับนักศึกษา') return false;
                                        const cat = r.category || 'สินค้า';
                                        return selectedCategory === 'ทั้งหมด' || cat === selectedCategory;
                                    }) || [];
                                    return activeRewards.length > 0;
                                });

                                if (filteredPartners.length === 0) {
                                    return (
                                        <div className="text-center py-12 text-slate-400 bg-white border border-slate-100 rounded-3xl shadow-sm">
                                            <i className="fa-solid fa-gift text-4xl mb-3 block opacity-30 animate-pulse text-slate-300"></i>
                                            <p className="font-bold text-slate-500 text-sm">ไม่มีของรางวัลที่ตรงกับหมวดหมู่นี้</p>
                                            <p className="text-slate-400 text-xs mt-1">ลองเปลี่ยนหมวดหมู่ หรือติดตามอัปเดตใหม่ๆ เร็วๆ นี้!</p>
                                        </div>
                                    );
                                }

                                return filteredPartners.map(partner => {
                                    const activeRewards = partner.rewards?.filter(r => {
                                        if (!r.active) return false;
                                        if (r.category === 'สำหรับนักศึกษา') return false;
                                        const cat = r.category || 'สินค้า';
                                        return selectedCategory === 'ทั้งหมด' || cat === selectedCategory;
                                    }) || [];

                                    return (
                                        <div key={partner.id} className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition">
                                            {/* Partner Header */}
                                            <div className="flex items-center gap-3 p-5 border-b border-slate-50 bg-slate-50/30">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                                                    {partner.logoUrl
                                                        ? <img src={partner.logoUrl} alt={partner.name} className="w-full h-full object-cover" />
                                                        : <i className="fa-solid fa-store text-slate-400 text-2xl"></i>
                                                    }
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-black text-slate-800 text-lg leading-tight">{partner.name}</h3>
                                                    <p className="text-slate-500 text-xs mt-0.5">{partner.description}</p>
                                                    <span className="inline-block mt-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{partner.category}</span>
                                                </div>
                                            </div>

                                            {/* Rewards List */}
                                            <div className="divide-y divide-slate-50">
                                                {activeRewards.map(reward => {
                                                    const canAfford = user.points >= reward.pointCost;
                                                    const outOfStock = reward.stock === 0;
                                                    const badge = rewardTypeBadge[reward.rewardType] || rewardTypeBadge['OTHER'];
                                                    const rewardCat = reward.category || 'สินค้า';
                                                    const catColor = REWARD_CATEGORY_COLORS[rewardCat] || 'bg-slate-100 text-slate-500 border border-slate-200';
                                                    return (
                                                        <div key={reward.id} className={`flex items-center gap-4 p-4 ${!canAfford || outOfStock ? 'opacity-60' : ''}`}>
                                                            {reward.imageUrl
                                                                ? <img src={reward.imageUrl} alt={reward.name} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-100" />
                                                                : <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center shrink-0">
                                                                    <i className="fa-solid fa-gift text-emerald-500 text-xl"></i>
                                                                  </div>
                                                            }
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-bold text-slate-800 text-sm truncate">{reward.name}</span>
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${badge.color}`}>{badge.label}</span>
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${catColor}`}>
                                                                        <i className={`fa-solid ${REWARD_CATEGORY_ICONS[rewardCat]} text-[8px]`}></i>
                                                                        {rewardCat}
                                                                    </span>
                                                                </div>
                                                                {reward.description && <p className="text-slate-400 text-xs mt-0.5 truncate">{reward.description}</p>}
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="font-black text-emerald-600 text-sm">{reward.pointCost.toLocaleString()} แต้ม</span>
                                                                    {reward.stock > 0 && <span className="text-xs text-orange-500 font-medium">เหลือ {reward.stock} ชิ้น</span>}
                                                                    {outOfStock && <span className="text-xs text-red-400 font-bold">หมดแล้ว</span>}
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handlePartnerRedeem(partner, reward)}
                                                                disabled={!canAfford || outOfStock || loading}
                                                                className={`shrink-0 px-4 py-2.5 rounded-xl font-bold text-xs transition active:scale-95 ${canAfford && !outOfStock ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-md' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                                            >
                                                                {outOfStock ? 'หมด' : !canAfford ? 'แต้มไม่พอ' : 'แลก'}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                });
                            })()
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
