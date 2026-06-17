"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';

export default function RedeemPage() {
    const router = useRouter();
    const { user, token, apiBase, isInitialized } = useSmartBin();
    const [hours, setHours] = useState(1);
    const [category, setCategory] = useState("ด้านวิชาการ");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user && isInitialized) {
            router.push('/login');
        }
    }, [user, isInitialized, router]);

    if (!isInitialized || !user) {
        return (
            <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20 animate-pulse">
                <div className="sticky top-0 z-20 bg-slate-50 shadow-sm border-b border-slate-200 pb-4">
                    <div className="bg-gradient-to-br from-gray-300 to-gray-200 p-6 flex flex-col rounded-b-3xl shadow-lg shadow-gray-200/50">
                        <div className="mb-4 space-y-2">
                            <div className="h-6 bg-gray-100/50 rounded w-40"></div>
                            <div className="h-3 bg-gray-100/50 rounded w-48"></div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-xl flex items-center justify-between border border-slate-100 relative overflow-hidden">
                            <div className="relative z-9 space-y-2">
                                <div className="h-4 bg-gray-100 rounded w-24"></div>
                                <div className="h-8 bg-gray-100 rounded w-32"></div>
                            </div>
                            <div className="w-14 h-14 bg-gray-100 rounded-2xl"></div>
                        </div>
                    </div>
                </div>
                <div className="p-6 max-w-md md:max-w-3xl mx-auto pt-6 space-y-6">
                    <div className="bg-white border-2 border-slate-100 rounded-3xl p-6">
                        <div className="flex items-start">
                            <div className="w-14 h-14 bg-gray-100 rounded-2xl mr-4 shrink-0"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-5 bg-gray-100 rounded w-40"></div>
                                <div className="h-4 bg-gray-100 rounded w-24"></div>
                            </div>
                        </div>
                        <div className="h-10 bg-gray-100 rounded w-full mt-4"></div>
                    </div>
                    <div className="bg-white border-2 border-slate-100 rounded-3xl p-6">
                        <div className="flex items-start">
                            <div className="w-14 h-14 bg-gray-100 rounded-2xl mr-4 shrink-0"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-5 bg-gray-100 rounded w-40"></div>
                                <div className="h-4 bg-gray-100 rounded w-24"></div>
                            </div>
                        </div>
                        <div className="h-10 bg-gray-100 rounded w-full mt-4"></div>
                    </div>
                </div>
            </div>
        );
    }

    const ACTIVITY_CATEGORIES = [
        "ด้านวิชาการ",
        "ด้านกีฬา",
        "ด้านบำเพ็ญประโยชน์",
        "ด้านศิลปวัฒนธรรม",
        "ด้านนันทนาการ"
    ];

    const REWARDS = [
        {
            id: 1,
            name: "ชั่วโมงจิตอาสา",
            icon: <i className="fa-solid fa-handshake-angle text-gradient-to-bl from-red-600 to-blue-700 "></i>,
            type: "VOLUNTEER",
            baseCost: 100,
            getValue: () => hours,
            getCost: () => 100 * hours,
            getDetails: () => `${hours} ชั่วโมง`
        },
        {
            id: 2,
            name: "หน่วยกิตกิจกรรม",
            icon: <i className="fa-solid fa-graduation-cap"></i>,
            type: "ACTIVITY",
            baseCost: 500,
            getValue: () => 1,
            getCost: () => 500,
            getDetails: () => category
        },
    ];

    const handleRedeem = async (reward: any) => {
        const cost = reward.getCost();
        const value = reward.getValue();
        const details = reward.getDetails();

        if (user.points < cost) return;
        if (!confirm(`ยืนยันการแลกคะแนนเพื่อขออนุมัติ "${reward.name} (${details})" ใช้ ${cost} แต้ม?`)) return;

        setLoading(true);
        try {
            const res = await fetch(`${apiBase}/redeem`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: user.id,
                    rewardType: reward.type,
                    cost: cost,
                    value: value,
                    details: details
                })
            });

            if (res.ok) {
                alert("ส่งคำขอแลกคะแนนเรียบร้อยแล้ว กรุณารอแอดมินอนุมัติครับ");
                router.push('/');
            } else {
                alert("เกิดข้อผิดพลาดในการแลกรางวัล");
            }
        } catch (e) {
            console.error(e);
            alert("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
            {/* Header & Points (Sticky) */}
            <div className="sticky top-0 z-20 bg-slate-50 shadow-sm border-b border-slate-200 pb-4">
                <div className="bg-gradient-to-br from-emerald-600 to-teal-500 p-6 flex flex-col text-white rounded-b-3xl shadow-lg shadow-teal-500/20">
                    <div className="mb-4">
                        <h1 className="font-bold text-xl tracking-tight">แลกคะแนนสะสม</h1>
                        <p className="text-teal-100 text-xs mt-0.5">ส่งคำขอแลกชั่วโมงและหน่วยกิต</p>
                    </div>

                    {/* Points Balance */}
                    <div className="bg-white p-5 rounded-2xl shadow-xl text-slate-800 flex items-center justify-between border border-slate-100 relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                        <div className="relative z-9">
                            <div className="text-slate-500 text-sm font-medium mb-1">แต้มสะสมของคุณ</div>
                            <div className="font-black text-4xl text-emerald-600 tracking-tight">{user.points} <span className="text-lg text-emerald-400 font-bold">แต้ม</span></div>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center text-3xl shadow-inner relative z-9 border border-emerald-200">
                            <i className="fa-solid fa-coins text-yellow-400"></i>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 max-w-md md:max-w-3xl mx-auto pt-6">

                <div className="space-y-6">
                    {REWARDS.map(r => {
                        const currentCost = r.getCost();
                        const canAfford = user.points >= currentCost;

                        return (
                            <div key={r.id} className={`bg-white border-2 rounded-3xl p-6 transition duration-300 relative overflow-hidden ${canAfford ? 'border-emerald-100 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-100' : 'border-slate-100 opacity-80 grayscale-[20%]'}`}>
                                <div className="flex items-start">
                                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl mr-4 shrink-0 shadow-sm border border-slate-100">
                                        {r.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg text-slate-800">{r.name}</h3>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-2 py-1 rounded-lg">ใช้ {currentCost} แต้ม</span>
                                            {r.type === 'VOLUNTEER' && <span className="text-xs text-slate-400 font-medium">(100 แต้ม/ชม.)</span>}
                                        </div>

                                        {/* Specific Controls */}
                                        <div className="mt-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            {r.type === 'VOLUNTEER' && (
                                                <div className="flex items-center justify-between">
                                                    <label className="text-sm font-bold text-slate-600">จำนวนชั่วโมงที่ต้องการ</label>
                                                    <div className="flex items-center space-x-3 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                                                        <button
                                                            onClick={() => setHours(Math.max(1, hours - 1))}
                                                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition"
                                                        >-</button>
                                                        <span className="w-6 text-center font-black text-emerald-600">{hours}</span>
                                                        <button
                                                            onClick={() => setHours(Math.min(100, hours + 1))}
                                                            className="w-8 h-8 rounded-lg bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center text-emerald-700 font-bold transition"
                                                        >+</button>
                                                    </div>
                                                </div>
                                            )}

                                            {r.type === 'ACTIVITY' && (
                                                <div className="flex flex-col space-y-2">
                                                    <label className="text-sm font-bold text-slate-600">เลือกด้านกิจกรรม</label>
                                                    <select
                                                        value={category}
                                                        onChange={(e) => setCategory(e.target.value)}
                                                        className="w-full bg-white border border-slate-200 text-slate-700 font-medium rounded-xl px-4 py-3 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition shadow-sm appearance-none"
                                                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                                                    >
                                                        {ACTIVITY_CATEGORIES.map(cat => (
                                                            <option key={cat} value={cat}>{cat}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => handleRedeem(r)}
                                            disabled={!canAfford || loading}
                                            className={`w-full mt-4 py-3.5 rounded-xl font-bold text-sm transition active:scale-[0.98] ${canAfford
                                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-500/30'
                                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                }`}
                                        >
                                            {loading ? 'กำลังดำเนินการ...' : (canAfford ? 'ขออนุมัติแลกคะแนน' : 'คะแนนไม่เพียงพอ')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
