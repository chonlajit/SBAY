"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
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

const GENERAL_REWARD_TABS = ['ทั้งหมด', 'สินค้า', 'ส่วนลด'] as const;
const STUDENT_REWARD_TABS = ['ทั้งหมด', 'หน่วยกิตกิจกรรม', 'ชั่วโมงจิตอาสา'] as const;

const GENERAL_TAB_TO_CATEGORY: Record<string, string | null> = {
    'ทั้งหมด': null,
    'สินค้า': 'สินค้า',
    'ส่วนลด': 'ส่วนลดร้านค้า',
};
const STUDENT_TAB_TO_REWARD_TYPE: Record<string, string | null> = {
    'ทั้งหมด': null,
    'หน่วยกิตกิจกรรม': 'ACTIVITY',
    'ชั่วโมงจิตอาสา': 'VOLUNTEER',
};

const BG_STYLE: React.CSSProperties = {
    backgroundImage: "url('/images/bg-white.jpg')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
};

export default function RedeemPage() {
    const router = useRouter();
    const { user, token, apiBase, isInitialized } = useSmartBin();

    const [loading, setLoading] = useState(false);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [partnersLoading, setPartnersLoading] = useState(true);
    const [redemptionCounts, setRedemptionCounts] = useState<Record<string, number>>({});

    const [mode, setMode] = useState<'general' | 'student'>('general');
    const [searchText, setSearchText] = useState('');
    const [selectedRewardTab, setSelectedRewardTab] = useState<string>('ทั้งหมด');
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);
    const ignoreScroll = useRef(false);
    const [selectedPopup, setSelectedPopup] = useState<{partner: Partner, reward: PartnerReward} | null>(null);
    const [redeemIntent, setRedeemIntent] = useState<{partner: Partner, reward: PartnerReward, qty: number} | null>(null);
    const [redeemFormData, setRedeemFormData] = useState<any>({});

    useEffect(() => {
        const handleScroll = (e: Event) => {
            if (ignoreScroll.current) return;
            const target = e.target as HTMLElement;
            const currentScrollY = target.scrollTop;
            if (currentScrollY > lastScrollY.current + 10 && currentScrollY > 50) {
                // Scrolling down
                setIsHeaderVisible(false);
                lastScrollY.current = currentScrollY;
            } else if (currentScrollY < lastScrollY.current) {
                lastScrollY.current = currentScrollY;
            }
        };

        const mainEl = document.querySelector('main');
        if (mainEl) {
            mainEl.addEventListener('scroll', handleScroll, { passive: true });
            return () => mainEl.removeEventListener('scroll', handleScroll);
        }
    }, []);

    useEffect(() => {
        setSelectedRewardTab('ทั้งหมด');
        setSearchText('');
    }, [mode]);

    useEffect(() => {
        if (apiBase) {
            fetchPartners();
            fetchRedemptionCounts();
        }
    }, [apiBase]);

    const fetchPartners = async () => {
        setPartnersLoading(true);
        try {
            const res = await fetch(`${apiBase}/partners`);
            if (res.ok) setPartners(await res.json());
        } catch (e) {
            console.error('Failed to fetch partners:', e);
        } finally {
            setPartnersLoading(false);
        }
    };

    const fetchRedemptionCounts = async () => {
        try {
            const res = await fetch(`${apiBase}/partners/redemption-counts`);
            if (res.ok) setRedemptionCounts(await res.json());
        } catch (_) { /* silent */ }
    };

    const setQty = (rewardId: string, val: number) =>
        setQuantities(q => ({ ...q, [rewardId]: Math.max(1, val) }));

    const handlePartnerRedeem = (partner: Partner, reward: PartnerReward, qty: number) => {
        if (!user) { router.push('/login'); return; }
        const totalCost = reward.pointCost * qty;
        if (user.points < totalCost) return;
        setRedeemIntent({ partner, reward, qty });
        setRedeemFormData({
            title: user.title || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            studentId: user.studentId || '',
            faculty: user.faculty || '',
            major: user.major || '',
            academicYear: user.academicYear || '',
            address: user.address || '',
            age: user.age ? String(user.age) : '',
            email: user.email || '',
            phoneNumber: user.phoneNumber || ''
        });
    };

    const confirmRedemption = async () => {
        if (!redeemIntent || !user) return;
        const { partner, reward, qty } = redeemIntent;
        
        // Calculate actual required fields
        const isStudentReward = reward.category === 'สำหรับนักศึกษา' || reward.rewardType === 'ACTIVITY' || reward.rewardType === 'VOLUNTEER' || partner.category === 'ร้านสำหรับนักศึกษา';
        const baseRequired = reward.requiredFields || [];
        const actualRequiredFields = Array.from(new Set([
            ...baseRequired,
            ...(isStudentReward ? ['NAME', 'STUDENT_ID', 'FACULTY', 'MAJOR', 'ACADEMIC_YEAR'] : [])
        ]));

        // Validate required fields
        if (actualRequiredFields.length > 0) {
            for (const field of actualRequiredFields) {
                let isValid = true;
                if (field === 'NAME' && (!redeemFormData.firstName || !redeemFormData.lastName)) isValid = false;
                else if (field === 'ADDRESS' && !redeemFormData.address) isValid = false;
                else if (field === 'AGE' && !redeemFormData.age) isValid = false;
                else if (field === 'PHONE' && !redeemFormData.phoneNumber) isValid = false;
                else if (field === 'EMAIL' && !redeemFormData.email) isValid = false;
                else if (field === 'STUDENT_ID' && !redeemFormData.studentId) isValid = false;
                else if (field === 'FACULTY' && !redeemFormData.faculty) isValid = false;
                else if (field === 'MAJOR' && !redeemFormData.major) isValid = false;
                else if (field === 'ACADEMIC_YEAR' && !redeemFormData.academicYear) isValid = false;

                if (!isValid) {
                    alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
                    return;
                }
            }
        }

        const filteredFormData: any = {};
        // Always send name
        filteredFormData.title = redeemFormData.title || user.title;
        filteredFormData.firstName = redeemFormData.firstName || user.firstName;
        filteredFormData.lastName = redeemFormData.lastName || user.lastName;

        if (actualRequiredFields.includes('ADDRESS')) filteredFormData.address = redeemFormData.address;
        if (actualRequiredFields.includes('AGE')) filteredFormData.age = redeemFormData.age ? parseInt(redeemFormData.age) : null;
        if (actualRequiredFields.includes('PHONE')) filteredFormData.phoneNumber = redeemFormData.phoneNumber;
        if (actualRequiredFields.includes('EMAIL')) filteredFormData.email = redeemFormData.email;
        if (actualRequiredFields.includes('STUDENT_ID')) filteredFormData.studentId = redeemFormData.studentId;
        if (actualRequiredFields.includes('FACULTY')) filteredFormData.faculty = redeemFormData.faculty;
        if (actualRequiredFields.includes('MAJOR')) filteredFormData.major = redeemFormData.major;
        if (actualRequiredFields.includes('ACADEMIC_YEAR')) filteredFormData.academicYear = redeemFormData.academicYear;

        const totalCost = reward.pointCost * qty;
        
        setLoading(true);
        try {
            const res = await fetch(`${apiBase}/redeem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    userId: user.id, username: user.username, rewardType: 'PARTNER', cost: totalCost, value: qty,
                    details: `${partner.name} - ${reward.name} x${qty}`,
                    partnerId: partner.id, partnerRewardId: reward.id,
                    ...filteredFormData
                })
            });
            if (res.ok) { alert(`แลกสำเร็จ! กรุณารอแอดมินอนุมัติ`); setRedeemIntent(null); setSelectedPopup(null); }
            else alert('เกิดข้อผิดพลาดในการแลกรางวัล');
        } catch (_) { alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้'); }
        finally { setLoading(false); }
    };

    const filteredPartners = useMemo(() => {
        let list = partners.filter(p => p.active);
        if (mode === 'general') {
            list = list.filter(p => p.category !== 'ร้านสำหรับนักศึกษา');
            if (searchText.trim()) {
                const q = searchText.toLowerCase();
                list = list.filter(p => p.name.toLowerCase().includes(q));
            }
            const catFilter = GENERAL_TAB_TO_CATEGORY[selectedRewardTab];
            list = list.filter(p =>
                (p.rewards ?? []).some(r => r.active && r.category !== 'สำหรับนักศึกษา' && (catFilter === null || (r.category || 'สินค้า') === catFilter))
            );
            list = [...list].sort((a, b) => (redemptionCounts[b.id] ?? 0) - (redemptionCounts[a.id] ?? 0));
        } else {
            list = list.filter(p => p.category === 'ร้านสำหรับนักศึกษา' || (p.rewards ?? []).some(r => r.active && r.category === 'สำหรับนักศึกษา'));
            if (searchText.trim()) {
                const q = searchText.toLowerCase();
                list = list.filter(p => p.name.toLowerCase().includes(q));
            }
            const rtFilter = STUDENT_TAB_TO_REWARD_TYPE[selectedRewardTab];
            list = list.filter(p =>
                (p.rewards ?? []).some(r => r.active && (rtFilter === null || r.rewardType === rtFilter))
            );
        }
        return list;
    }, [partners, mode, searchText, selectedRewardTab, redemptionCounts]);

    const getFilteredRewards = (partner: Partner): PartnerReward[] => {
        if (mode === 'general') {
            const catFilter = GENERAL_TAB_TO_CATEGORY[selectedRewardTab];
            return (partner.rewards ?? []).filter(r =>
                r.active && r.category !== 'สำหรับนักศึกษา' && (catFilter === null || (r.category || 'สินค้า') === catFilter)
            );
        }
        const rtFilter = STUDENT_TAB_TO_REWARD_TYPE[selectedRewardTab];
        return (partner.rewards ?? []).filter(r => r.active && (rtFilter === null || r.rewardType === rtFilter));
    };

    const currentRewardTabs: string[] = mode === 'general' ? [...GENERAL_REWARD_TABS] : [...STUDENT_REWARD_TABS];

    const activeRedeemRequiredFields = useMemo(() => {
        if (!redeemIntent) return [];
        const { partner, reward } = redeemIntent;
        const isStudentReward = reward.category === 'สำหรับนักศึกษา' || reward.rewardType === 'ACTIVITY' || reward.rewardType === 'VOLUNTEER' || partner.category === 'ร้านสำหรับนักศึกษา';
        const baseRequired = reward.requiredFields || [];
        return Array.from(new Set([
            ...baseRequired,
            ...(isStudentReward ? ['NAME', 'STUDENT_ID', 'FACULTY', 'MAJOR'] : [])
        ]));
    }, [redeemIntent]);

    if (!isInitialized) {
        return (
            <div className="min-h-screen animate-pulse" style={BG_STYLE}>
                <div className="absolute inset-0 bg-[#64964E]/40 pointer-events-none backdrop-blur-sm" />
            </div>
        );
    }

    return (
        <div className="min-h-screen font-sans text-slate-800 pb-24 relative" style={BG_STYLE}>

            {/* ── Top Header Area (Dropdown Panel & Toggle Button) ── */}
            <div className="sticky top-0 z-[100] w-full">

                {/* Dropdown Panel */}
                <div className={`w-full transition-all duration-700 ease-in-out origin-top border-b border-white/30 backdrop-blur-2xl bg-[#64964E]/40 rounded-b-[3rem] ${isHeaderVisible ? 'max-h-[1000px] opacity-100 overflow-visible shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] pointer-events-auto' : 'max-h-0 opacity-0 overflow-hidden pointer-events-none'}`}>
                    <div className="max-w-7xl mx-auto px-4 pt-4 pb-4 md:pt-6 md:pb-6">
                        <div className="flex flex-col lg:flex-row items-stretch justify-between gap-2 md:gap-4 xl:gap-8">

                            {/* Left: Points */}
                            <div className="w-full lg:w-64 rounded-[1.5rem] overflow-hidden shadow-2xl shrink-0 flex flex-col self-stretch bg-white">
                                {user ? (
                                    <>
                                        <div className="bg-[#64964E] text-white text-center py-2 text-sm font-bold tracking-wide">
                                            คะแนนสะสมทั้งหมด
                                        </div>
                                        <div className="text-center py-3 md:py-4 text-[#64964E] font-black text-2xl md:text-3xl flex-1 flex items-center justify-center gap-2">
                                            {user.points?.toLocaleString() || 0} <span className="text-lg md:text-xl font-bold">แต้ม</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-stretch p-2">
                                        <button
                                            onClick={() => router.push('/login')}
                                            className="w-full flex-1 bg-[#64964E] text-white rounded-[1.2rem] text-lg font-bold hover:bg-[#527d40] transition shadow-md flex items-center justify-center"
                                        >
                                            เข้าสู่ระบบเพื่อแลกรางวัล
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Center: Search & Tabs */}
                            <div className="flex-1 w-full flex flex-col justify-between self-stretch max-w-2xl mx-auto">
                                {/* Search */}
                                <div className="relative shadow-lg rounded-full">
                                    <input
                                        type="text"
                                        value={searchText}
                                        onChange={e => setSearchText(e.target.value)}
                                        placeholder="ค้นหาชื่อร้าน"
                                        className="w-full bg-white/90 backdrop-blur rounded-full pl-6 pr-12 py-1.5 md:py-2.5 text-slate-800 text-sm md:text-base focus:outline-none placeholder-gray-400"
                                    />
                                    <button className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square bg-[#64964E] text-white rounded-full flex items-center justify-center hover:bg-[#527d40] transition">
                                        <i className="fa-solid fa-magnifying-glass text-sm" />
                                    </button>
                                </div>

                                {/* Reward Tabs */}
                                <div className="mt-1 md:mt-2">
                                    <div className="text-white text-base md:text-lg font-bold mb-1 flex items-center gap-2 drop-shadow-md">
                                        ประเภทของรางวัล <span className="text-[10px] md:text-xs text-white/90 font-normal drop-shadow mt-1">(คลิกข้างล่างเพื่อเลือกประเภทของรางวัล)</span>
                                    </div>
                                    <div className="relative flex bg-white/70 backdrop-blur-md rounded-[2rem] p-1 border border-white/50 shadow-xl overflow-hidden mt-1">
                                        <div className="absolute inset-1 flex pointer-events-none">
                                            <div
                                                className="bg-[#527d40] rounded-[1.8rem] shadow-md transition-transform duration-300 ease-out"
                                                style={{
                                                    width: `${100 / currentRewardTabs.length}%`,
                                                    transform: `translateX(${currentRewardTabs.indexOf(selectedRewardTab) * 100}%)`
                                                }}
                                            />
                                        </div>
                                        {currentRewardTabs.map(tab => (
                                            <button
                                                key={tab}
                                                onClick={() => setSelectedRewardTab(tab)}
                                                className={`relative z-10 flex-1 py-1 md:py-1.5 text-sm md:text-base font-bold rounded-[1.8rem] transition-colors duration-300 ${selectedRewardTab === tab
                                                    ? 'text-white'
                                                    : 'text-slate-700 hover:bg-white/30'
                                                    }`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Partner Tabs */}
                            <div className="w-full lg:w-72 shrink-0 flex flex-col justify-between self-stretch">
                                <div className="text-white text-base md:text-lg font-black mb-1 flex items-center gap-2 drop-shadow-md">
                                    ประเภทร้าน <span className="text-[10px] md:text-xs text-white/90 font-normal drop-shadow mt-1.5">(คลิกข้างล่างเพื่อเปลี่ยน)</span>
                                </div>
                                <div className="relative flex flex-1 bg-white/70 backdrop-blur-md rounded-[2rem] p-1 border border-white/50 shadow-xl overflow-hidden mt-1">
                                    {/* Animated Slider Background */}
                                    <div
                                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#64964E] rounded-[1.8rem] shadow-md transition-all duration-300 ease-out ${mode === 'student' ? 'left-1' : 'left-1/2'}`}
                                    />
                                    <button
                                        onClick={() => setMode('student')}
                                        className={`relative z-10 flex-1 flex items-center justify-center text-xs md:text-sm font-bold py-1 md:py-0 rounded-[1.8rem] transition-colors duration-300 ${mode === 'student' ? 'text-white' : 'text-slate-700 hover:bg-white/30'}`}
                                    >
                                        สำหรับนักศึกษา
                                    </button>
                                    <button
                                        onClick={() => setMode('general')}
                                        className={`relative z-10 flex-1 flex items-center justify-center text-xs md:text-sm font-bold py-1 md:py-0 rounded-[1.8rem] transition-colors duration-300 ${mode === 'general' ? 'text-white' : 'text-slate-700 hover:bg-white/30'}`}
                                    >
                                        สำหรับผู้ใช้ทั่วไป
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Round Toggle Button (Right Side) */}
                <button
                    onClick={() => {
                        ignoreScroll.current = true;
                        setIsHeaderVisible(v => !v);
                        setTimeout(() => ignoreScroll.current = false, 800);
                    }}
                    className={`fixed bottom-24 right-4 md:absolute md:bottom-auto md:right-6 md:top-full md:mt-4 z-50 bg-[#64964E] md:bg-white/20 backdrop-blur-xl border border-white/30 md:hover:bg-white/30 text-white w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xl md:shadow-xl ${!isHeaderVisible ? 'shadow-[0_0_20px_rgba(100,150,78,0.5)] md:shadow-[0_0_20px_rgba(0,0,0,0.3)] animate-bounce' : ''}`}
                    title={isHeaderVisible ? "ซ่อนแถบเครื่องมือ" : "แสดงแถบเครื่องมือ"}
                >
                    <i className={`fa-solid ${isHeaderVisible ? 'fa-chevron-up' : 'fa-chevron-down'} text-xl`} />
                </button>
            </div>

            {/* ── Main Content Area ── */}
            <div className="relative z-10 pt-10 max-w-7xl mx-auto px-4">

                {/* ── Partner Cards ── */}
                <div className="space-y-6">
                    {partnersLoading && (
                        <div className="space-y-6 animate-pulse">
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="flex flex-col relative w-full mb-10">
                                    {/* Partner Header Skeleton */}
                                    <div className="flex bg-gray-200 rounded-t-xl overflow-hidden h-[90px] border border-white/50 relative z-20">
                                        <div className="w-[120px] bg-gray-300 p-3 flex flex-col items-center justify-center border-r border-white/50">
                                            <div className="w-12 h-12 bg-gray-200 rounded-full mb-1"></div>
                                        </div>
                                        <div className="flex-1 p-4 flex flex-col justify-center">
                                            <div className="w-48 h-6 bg-gray-300 rounded mb-2"></div>
                                            <div className="w-full max-w-sm h-3 bg-gray-300 rounded"></div>
                                        </div>
                                    </div>
                                    
                                    {/* Rewards Grid Skeleton */}
                                    <div className="bg-white/40 backdrop-blur-sm p-4 md:p-6 rounded-br-xl relative z-20 border border-white/50">
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                                            {[...Array(3)].map((_, j) => (
                                                <div key={j} className="bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col h-full">
                                                    <div className="bg-gray-200 h-24 flex items-center justify-center">
                                                        <div className="w-12 h-12 bg-gray-300 rounded"></div>
                                                    </div>
                                                    <div className="p-3 bg-gray-50 flex-1 flex flex-col">
                                                        <div className="w-32 h-5 bg-gray-200 rounded mb-2"></div>
                                                        <div className="w-full h-3 bg-gray-200 rounded mb-1"></div>
                                                        <div className="w-2/3 h-3 bg-gray-200 rounded"></div>
                                                    </div>
                                                    <div className="bg-gray-200 p-3 flex justify-between">
                                                        <div className="w-20 h-6 bg-gray-300 rounded"></div>
                                                        <div className="w-24 h-8 bg-gray-300 rounded"></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Footer Strip Skeleton */}
                                    <div className="bg-gray-300 h-[70px] border border-white/50 relative z-10 rounded-bl-xl rounded-br-[60px]" />
                                </div>
                            ))}
                        </div>
                    )}

                    {!partnersLoading && filteredPartners.length === 0 && (
                        <div className="text-center py-16 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-xl">
                            <p className="font-bold text-white text-xl">ไม่พบร้านค้าที่ตรงกับเงื่อนไข</p>
                        </div>
                    )}

                    {!partnersLoading && filteredPartners.map(partner => (
                        <PartnerCard
                            key={partner.id}
                            partner={partner}
                            rewards={getFilteredRewards(partner)}
                            userPoints={user?.points ?? -1}
                            quantities={quantities}
                            onSetQty={setQty}
                            onRedeem={handlePartnerRedeem}
                            loading={loading}
                            onShowReward={setSelectedPopup}
                        />
                    ))}
                </div>

            </div>

            {/* Reward Detail Modal */}
            {selectedPopup && (() => {
                const { partner, reward } = selectedPopup;
                const qty = quantities[reward.id] ?? 1;
                return (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedPopup(null)} />
                    <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl relative z-10 w-full max-w-lg md:max-w-4xl h-[90vh] md:h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Top header: User Points */}
                        <div className="bg-[#64964E] text-white p-4 flex items-center justify-between shrink-0">
                            <div className="font-bold text-sm md:text-base">
                                คะแนนของคุณ: <span className="text-lg md:text-xl font-black ml-1">{user?.points?.toLocaleString() || 0}</span> แต้ม
                            </div>
                            <button onClick={() => setSelectedPopup(null)} className="w-8 h-8 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="flex flex-col md:flex-row flex-1 min-h-0">
                            {/* Image */}
                            <div className="w-full md:w-1/2 h-64 md:h-full bg-gray-100 flex items-center justify-center shrink-0 border-b md:border-b-0 md:border-r border-gray-200">
                                {reward.imageUrl ? (
                                    <img src={reward.imageUrl} alt={reward.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-gray-400 font-bold text-xl">ไม่มีรูปภาพ</div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-6 bg-white overflow-y-auto flex-1 flex flex-col">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xs font-bold bg-[#64964E]/10 text-[#527d40] px-3 py-1 rounded-full border border-[#64964E]/20">
                                        {reward.category || 'สินค้า'}
                                    </span>
                                    {reward.stock !== -1 && (
                                        <span className="text-xs font-bold bg-orange-100 text-orange-600 px-3 py-1 rounded-full">
                                            เหลือ {reward.stock} ชิ้น
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 mb-2 leading-tight">{reward.name}</h3>
                                <p className="text-sm font-bold text-[#527d40] mb-4">ร้าน: {partner.name}</p>
                                
                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex-1">
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{reward.description || 'ไม่มีคำอธิบาย'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Bottom controls */}
                        <div className="bg-[#e6e8e6] p-4 flex flex-col md:flex-row items-center justify-between border-t border-gray-300 shrink-0 gap-4">
                            <div className="flex items-center justify-between w-full md:w-auto">
                                <div>
                                    <div className="text-xs text-gray-500 font-bold mb-0.5">แต้มที่ใช้ทั้งหมด</div>
                                    <div className="text-slate-700 font-medium text-3xl leading-none flex items-baseline gap-1">
                                        {(reward.pointCost * qty).toLocaleString()} <span className="text-base font-normal text-slate-600">คะแนน</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-stretch gap-3 w-full md:w-auto">
                                <div className="flex items-center gap-2">
                                    <div className="flex flex-col bg-[#527d40] rounded border border-[#3e5e30] overflow-hidden w-8 h-12 shadow-sm">
                                        <button
                                            onClick={() => setQty(reward.id, qty + 1)}
                                            disabled={reward.stock !== -1 && qty >= reward.stock}
                                            className="flex-1 text-white text-xs flex items-center justify-center hover:bg-white/20 transition disabled:opacity-50"
                                        >+</button>
                                        <div className="h-px bg-white/30" />
                                        <button
                                            onClick={() => setQty(reward.id, qty - 1)}
                                            disabled={qty <= 1}
                                            className="flex-1 text-white text-xs flex items-center justify-center hover:bg-white/20 transition disabled:opacity-50"
                                        >-</button>
                                    </div>
                                    <div className="bg-white text-slate-800 font-black text-xl w-12 h-12 flex items-center justify-center rounded shadow-sm">
                                        {qty}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handlePartnerRedeem(partner, reward, qty)}
                                    disabled={(user?.points ?? -1) >= 0 && (user?.points ?? -1) < reward.pointCost * qty || reward.stock === 0 || loading}
                                    className="flex-1 md:flex-none bg-[#64964E] hover:bg-[#527d40] text-white rounded-xl px-8 font-bold text-lg shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    แลกรางวัล
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                );
            })()}

            {/* Redeem Confirm Modal */}
            {redeemIntent && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRedeemIntent(null)} />
                    <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl relative z-10 w-full max-w-lg animate-in zoom-in-95 duration-200">
                        <div className="bg-[#64964E] text-white p-5 flex items-center justify-between">
                            <h2 className="font-black text-lg">ยืนยันการแลกรางวัล</h2>
                            <button onClick={() => setRedeemIntent(null)} className="w-8 h-8 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-times"></i>
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-center font-bold text-slate-800 text-xl mb-2">{redeemIntent.reward.name}</p>
                            <p className="text-center text-slate-500 mb-6">จำนวน {redeemIntent.qty} ชิ้น ใช้ {redeemIntent.reward.pointCost * redeemIntent.qty} แต้ม</p>
                            
                            {(activeRedeemRequiredFields && activeRedeemRequiredFields.length > 0) && (
                                <div className="space-y-4 mb-6">
                                    <div className="text-sm font-bold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                        <i className="fa-solid fa-circle-info mr-2"></i>
                                        ร้านค้าต้องการข้อมูลเพิ่มเติมสำหรับการแลกรางวัลนี้ (ข้อมูลเริ่มต้นดึงมาจากโปรไฟล์ของคุณ)
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto px-1 pb-1">
                                        {activeRedeemRequiredFields.includes('NAME') && (
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <label className="text-xs font-bold text-slate-500 block mb-1">ชื่อ</label>
                                                    <input value={redeemFormData.firstName} onChange={e => setRedeemFormData({...redeemFormData, firstName: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-green-400 focus:ring-2 focus:ring-green-100" />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-xs font-bold text-slate-500 block mb-1">นามสกุล</label>
                                                    <input value={redeemFormData.lastName} onChange={e => setRedeemFormData({...redeemFormData, lastName: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-green-400 focus:ring-2 focus:ring-green-100" />
                                                </div>
                                            </div>
                                        )}
                                        {activeRedeemRequiredFields.includes('ADDRESS') && (
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 block mb-1">ที่อยู่</label>
                                                <textarea value={redeemFormData.address} onChange={e => setRedeemFormData({...redeemFormData, address: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-green-400 focus:ring-2 focus:ring-green-100 resize-none" rows={2} />
                                            </div>
                                        )}
                                        {activeRedeemRequiredFields.includes('AGE') && (
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 block mb-1">อายุ (ปี)</label>
                                                <input type="number" value={redeemFormData.age} onChange={e => setRedeemFormData({...redeemFormData, age: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-green-400 focus:ring-2 focus:ring-green-100" />
                                            </div>
                                        )}
                                        {activeRedeemRequiredFields.includes('PHONE') && (
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 block mb-1">เบอร์โทรศัพท์</label>
                                                <input type="tel" value={redeemFormData.phoneNumber} onChange={e => setRedeemFormData({...redeemFormData, phoneNumber: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-green-400 focus:ring-2 focus:ring-green-100" />
                                            </div>
                                        )}
                                        {activeRedeemRequiredFields.includes('EMAIL') && (
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 block mb-1">อีเมล</label>
                                                <input type="email" value={redeemFormData.email} onChange={e => setRedeemFormData({...redeemFormData, email: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-green-400 focus:ring-2 focus:ring-green-100" />
                                            </div>
                                        )}
                                        {activeRedeemRequiredFields.includes('STUDENT_ID') && (
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 block mb-1">รหัสนักศึกษา</label>
                                                <input value={redeemFormData.studentId} onChange={e => setRedeemFormData({...redeemFormData, studentId: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-green-400 focus:ring-2 focus:ring-green-100" />
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            {activeRedeemRequiredFields.includes('FACULTY') && (
                                                <div className="flex-1">
                                                    <label className="text-xs font-bold text-slate-500 block mb-1">คณะ</label>
                                                    <input value={redeemFormData.faculty} onChange={e => setRedeemFormData({...redeemFormData, faculty: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-green-400 focus:ring-2 focus:ring-green-100" />
                                                </div>
                                            )}
                                            {activeRedeemRequiredFields.includes('MAJOR') && (
                                                <div className="flex-1">
                                                    <label className="text-xs font-bold text-slate-500 block mb-1">สาขา</label>
                                                    <input value={redeemFormData.major} onChange={e => setRedeemFormData({...redeemFormData, major: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-green-400 focus:ring-2 focus:ring-green-100" />
                                                </div>
                                            )}
                                        </div>
                                        {activeRedeemRequiredFields.includes('ACADEMIC_YEAR') && (
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 block mb-1">ปีการศึกษา</label>
                                                <input value={redeemFormData.academicYear || ''} onChange={e => setRedeemFormData({...redeemFormData, academicYear: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-green-400 focus:ring-2 focus:ring-green-100" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button onClick={() => setRedeemIntent(null)} className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition">ยกเลิก</button>
                                <button onClick={confirmRedemption} disabled={loading} className="flex-1 py-3 rounded-xl bg-[#64964E] text-white font-bold hover:bg-[#527d40] shadow-md transition disabled:opacity-50">
                                    {loading ? 'กำลังดำเนินการ...' : 'ยืนยันการแลก'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── PartnerCard ──────────────────────────────────────────────────────────────
interface PartnerCardProps {
    partner: Partner;
    rewards: PartnerReward[];
    userPoints: number;
    quantities: Record<string, number>;
    onSetQty: (id: string, val: number) => void;
    onRedeem: (partner: Partner, reward: PartnerReward, qty: number) => void;
    loading: boolean;
    onShowReward: (popup: {partner: Partner, reward: PartnerReward}) => void;
}

function PartnerCard({ partner, rewards, userPoints, quantities, onSetQty, onRedeem, loading, onShowReward }: PartnerCardProps) {
    const [expanded, setExpanded] = useState(true);

    return (
        <div className="flex flex-col relative">
            {/* Header */}
            <div
                className={`bg-[#527d40] text-white border border-white/20 ${expanded ? 'rounded-xl rounded-tl-[60px] ' : 'rounded-t-xl rounded-tl-[60px]'} px-4 md:px-6 py-3 flex items-center justify-between cursor-pointer shadow-lg z-10 relative transition-all`}
                onClick={() => setExpanded(e => !e)}
            >
                <div className="flex-1 min-w-0 flex items-center gap-3 md:gap-4 pr-2">
                    <div className="w-[40px] h-[40px] md:w-[50px] md:h-[50px] bg-white rounded-full flex flex-col items-center justify-center text-[#527d40] font-black text-[9px] leading-tight shadow-md overflow-hidden shrink-0">
                        {partner.logoUrl ? (
                            <img src={partner.logoUrl} alt={partner.name} className="w-full h-full object-cover" />
                        ) : (
                            <>profile<br />shop</>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5 md:gap-1">
                        <h2 className="text-xl md:text-2xl font-black tracking-wide drop-shadow-sm break-words">
                            {partner.name}
                        </h2>
                        {partner.description && (
                            <div className="text-[11px] md:text-sm font-normal opacity-90 tracking-normal drop-shadow-sm break-words leading-snug">คำอธิบายร้าน : {partner.description}</div>
                        )}
                        <div className="text-[10px] md:text-sm font-normal opacity-80 drop-shadow-sm break-words">หมวดหมู่ร้าน : {partner.category}</div>
                    </div>
                </div>
                <i className={`fa-solid fa-caret-down text-2xl md:text-3xl text-white drop-shadow-sm transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
            </div>

            {/* Body */}
            {expanded && (
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-inner relative z-0 my-3 mx-1 border border-white/20">
                    {rewards.length === 0 ? (
                        <p className="text-white text-center py-4 font-bold text-lg drop-shadow">ไม่มีของรางวัลในร้านนี้</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {rewards.map(reward => {
                                const qty = quantities[reward.id] ?? 1;
                                const isDiscount = reward.rewardType === 'DISCOUNT' || reward.category === 'ส่วนลดร้านค้า';
                                const tagLabel = isDiscount ? 'ส่วนลด' : (reward.rewardType === 'ACTIVITY' ? 'กิจกรรม' : 'สินค้า');

                                return (
                                    <div key={reward.id} className="border border-white/40 bg-white/10 backdrop-blur-sm rounded-3xl p-4 flex flex-col shadow-lg">
                                        {/* Floating type text inside wrapper */}
                                        <div className="text-white font-bold text-xl mb-3 drop-shadow-md">{tagLabel}</div>

                                        <div className="rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-white/20">
                                            {/* Card Top: Image + Info */}
                                            <div className="flex h-[130px] cursor-pointer hover:opacity-90 transition-opacity" onClick={() => onShowReward({partner, reward})}>
                                                {/* Image Box */}
                                                <div className="w-[150px] bg-white flex items-center justify-center text-slate-800 font-bold text-lg shrink-0 overflow-hidden">
                                                    {reward.imageUrl ? (
                                                        <img src={reward.imageUrl} alt={reward.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        `รูป${tagLabel}`
                                                    )}
                                                </div>
                                                {/* Info Text Box */}
                                                <div className="flex-1 bg-[#527d40] text-white p-3 flex flex-col justify-between overflow-hidden border-l border-white/20">
                                                    <div>
                                                        <div className="font-bold text-sm mb-1 truncate">{reward.name}</div>

                                                        {reward.description ? (
                                                            <>
                                                                <div className="text-[10px] opacity-80 border-b border-white/30 pb-0.5 mb-1">คำอธิบาย</div>
                                                                <div className="text-[11px] leading-tight mb-1 truncate">{reward.description}</div>
                                                            </>
                                                        ) : (
                                                            <div className="text-[11px] leading-tight border-b border-white/30 pb-1 mb-1 opacity-60">ไม่มีคำอธิบาย</div>
                                                        )}
                                                    </div>
                                                    {reward.stock !== -1 && (
                                                        <div className="text-xs font-bold self-start mt-auto bg-white/20 px-2 py-0.5 rounded-full">
                                                            เหลือ {reward.stock} ชิ้น
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Card Bottom: Points + Qty Controls */}
                                            <div className="bg-[#e6e8e6] p-3 flex items-center justify-between border-t border-white/50">
                                                <div>
                                                    <div className="text-[10px] text-gray-500 font-bold mb-0.5">แต้มที่ใช้</div>
                                                    <div className="text-slate-700 font-medium text-2xl leading-none flex items-baseline gap-1">
                                                        {(reward.pointCost * qty).toLocaleString()} <span className="text-sm font-normal text-slate-600">คะแนน</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-stretch gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex flex-col bg-[#527d40] rounded border border-[#3e5e30] overflow-hidden w-6 h-10 shadow-sm">
                                                            <button
                                                                onClick={() => onSetQty(reward.id, qty + 1)}
                                                                disabled={reward.stock !== -1 && qty >= reward.stock}
                                                                className="flex-1 text-white text-[10px] flex items-center justify-center hover:bg-white/20 transition disabled:opacity-50"
                                                            >+</button>
                                                            <div className="h-px bg-white/30" />
                                                            <button
                                                                onClick={() => onSetQty(reward.id, qty - 1)}
                                                                disabled={qty <= 1}
                                                                className="flex-1 text-white text-[10px] flex items-center justify-center hover:bg-white/20 transition disabled:opacity-50"
                                                            >-</button>
                                                        </div>
                                                        <div className="bg-white text-slate-800 font-black text-lg w-10 h-10 flex items-center justify-center rounded shadow-sm">
                                                            {qty}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => onRedeem(partner, reward, qty)}
                                                        disabled={userPoints >= 0 && userPoints < reward.pointCost * qty || reward.stock === 0 || loading}
                                                        className="bg-[#64964E] hover:bg-[#527d40] text-white rounded-lg px-5 font-bold text-base shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed ml-1"
                                                    >
                                                        แลก
                                                    </button>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Footer Strip */}
            <div className={`bg-[#527d40] h-[70px] border border-white/20 shadow-lg relative z-10 transition-all ${expanded ? 'rounded-xl rounded-br-[60px]' : 'rounded-bl-xl border-t-0 rounded-br-[60px]'}`} />
        </div>
    );
}
