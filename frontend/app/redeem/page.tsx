"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';

export default function RedeemPage() {
    const router = useRouter();
    const { user } = useSmartBin();

    if (!user) return null;

    const REWARDS = [
        { id: 1, name: "ชั่วโมงจิตอาสา (3 ชม.)", cost: 300, icon: "🤝", type: "VOLUNTEER", value: 3 },
        { id: 2, name: "หน่วยกิตกิจกรรม (1 หน่วย)", cost: 500, icon: "🎓", type: "ACTIVITY", value: 1 },
    ];

    const handleRedeem = async (reward: any) => {
        if (user.points < reward.cost) return;
        if (!confirm(`ยืนยันการแลก "${reward.name}"?`)) return;

        try {
            const hostname = window.location.hostname;
            const apiBase = `http://${hostname}:8080/api`;

            const res = await fetch(`${apiBase}/redeem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    rewardType: reward.type,
                    cost: reward.cost,
                    value: reward.value
                })
            });

            if (res.ok) {
                alert("แลกของรางวัลสำเร็จ!");
            } else {
                alert("เกิดข้อผิดพลาดในการแลกรางวัล");
            }
        } catch (e) {
            console.error(e);
            alert("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
        }
    };

    return (
        <div className="min-h-screen bg-white font-sans text-black">
            <div className="bg-green-600 p-4 sticky top-0 flex items-center text-white shadow-md z-10">
                <button onClick={() => router.back()} className="mr-4 text-2xl">←</button>
                <h1 className="font-bold text-lg">แลกของรางวัล</h1>
            </div>

            <div className="p-6 pb-20">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className="bg-green-50 p-3 rounded-xl border border-green-100 text-center">
                        <div className="text-green-800 text-xs mb-1">แต้มสะสม</div>
                        <div className="font-bold text-lg text-green-700">{user.points}</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                        <div className="text-blue-800 text-xs mb-1">จิตอาสา (ชม.)</div>
                        <div className="font-bold text-lg text-blue-700">{user.volunteerHours || 0}</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-center">
                        <div className="text-orange-800 text-xs mb-1">กิจกรรม (หน่วย)</div>
                        <div className="font-bold text-lg text-orange-700">{user.activityCredits || 0}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {REWARDS.map(r => (
                        <div key={r.id} className="border rounded-xl p-4 flex items-center hover:shadow-md transition">
                            <div className="text-4xl mr-4">{r.icon}</div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800">{r.name}</h3>
                                <p className="text-sm text-gray-500">ใช้ {r.cost} แต้ม</p>
                            </div>
                            <button
                                onClick={() => handleRedeem(r)}
                                disabled={user.points < r.cost}
                                className={`px-4 py-2 rounded-full font-bold text-sm ${user.points >= r.cost
                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                    : 'bg-gray-200 text-gray-400'
                                    }`}
                            >
                                แลก
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
