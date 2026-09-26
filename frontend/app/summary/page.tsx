"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';

export default function SummaryPage() {
    const router = useRouter();
    const { sessionPoints, sessionHistory, wasteTypes, logout } = useSmartBin();

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#527d40] via-[#64964E] to-emerald-600 flex flex-col items-center justify-center p-4">

            {/* Confetti / Trophy Badge */}
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-4xl text-white mb-4 shadow-xl border border-white/30 animate-bounce">
                <i className="fa-solid fa-award"></i>
            </div>

            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-[#527d40] to-[#64964E] px-6 py-6 text-center">
                    <h1 className="text-2xl font-bold text-white">สรุปรายการ</h1>
                    <p className="text-emerald-100 text-sm mt-1 flex items-center justify-center gap-1.5">
                        <span>ขอบคุณที่ช่วยรักษ์สิ่งแวดล้อม</span>
                        <i className="fa-solid fa-leaf text-emerald-200"></i>
                    </p>
                </div>

                {/* Points */}
                <div className="px-6 py-6 text-center border-b border-gray-100">
                    <p className="text-gray-500 text-sm mb-1 font-medium">คุณได้รับแต้มสะสม</p>
                    <div className="flex items-end justify-center space-x-2">
                        <span className="text-6xl font-black text-[#64964E]">+{sessionPoints}</span>
                        <span className="text-amber-500 font-bold text-2xl mb-1">pt</span>
                    </div>
                </div>

                {/* Session Detail */}
                <div className="px-6 py-4">
                    <h3 className="font-bold text-gray-700 text-sm mb-3">รายละเอียด</h3>
                    {sessionHistory.length === 0 ? (
                        <p className="text-center text-gray-400 py-3 text-sm font-medium">ไม่มีรายการ</p>
                    ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {sessionHistory.map((tx, idx) => {
                                const typeLabel = wasteTypes.find(w => w.type === tx.wasteType)?.label || tx.wasteType;
                                return (
                                    <div key={idx} className="flex items-center justify-between bg-[#64964E]/10 rounded-xl px-4 py-2.5 border border-[#64964E]/15">
                                        <div className="flex items-center space-x-2">
                                            <i className="fa-solid fa-recycle text-[#64964E]"></i>
                                            <span className="text-gray-700 text-sm font-semibold">{typeLabel}</span>
                                        </div>
                                        <span className="text-[#527d40] font-bold text-sm">+{tx.pointsEarned} pt</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 space-y-3">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="w-full bg-[#64964E] hover:bg-[#527d40] text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-green-900/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                        <i className="fa-solid fa-chart-simple"></i>
                        <span>ดูสถิติของฉัน</span>
                    </button>
                    <button
                        onClick={() => logout()}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition active:scale-95 flex items-center justify-center gap-2"
                    >
                        <i className="fa-solid fa-house text-gray-500"></i>
                        <span>กลับหน้าหลัก</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
