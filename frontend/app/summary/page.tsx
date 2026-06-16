"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';

export default function SummaryPage() {
    const router = useRouter();
    const { sessionPoints, sessionHistory, wasteTypes, logout } = useSmartBin();

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-600 via-emerald-500 to-teal-400 flex flex-col items-center justify-center p-4">

            {/* Confetti-like decoration */}
            <div className="text-6xl mb-4 animate-bounce">🎉</div>

            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-6 text-center">
                    <h1 className="text-2xl font-bold text-white">สรุปรายการ</h1>
                    <p className="text-green-100 text-sm mt-1">ขอบคุณที่ช่วยรักษ์สิ่งแวดล้อม 🌿</p>
                </div>

                {/* Points */}
                <div className="px-6 py-6 text-center border-b border-gray-100">
                    <p className="text-gray-500 text-sm mb-1">คุณได้รับแต้มสะสม</p>
                    <div className="flex items-end justify-center space-x-2">
                        <span className="text-6xl font-black text-green-600">+{sessionPoints}</span>
                        <span className="text-yellow-500 font-bold text-2xl mb-1">pt</span>
                    </div>
                </div>

                {/* Session Detail */}
                <div className="px-6 py-4">
                    <h3 className="font-bold text-gray-600 text-sm mb-3">รายละเอียด</h3>
                    {sessionHistory.length === 0 ? (
                        <p className="text-center text-gray-400 py-3 text-sm">ไม่มีรายการ</p>
                    ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {sessionHistory.map((tx, idx) => {
                                const typeLabel = wasteTypes.find(w => w.type === tx.wasteType)?.label || tx.wasteType;
                                return (
                                    <div key={idx} className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-2.5">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-base">♻️</span>
                                            <span className="text-gray-700 text-sm font-medium">{typeLabel}</span>
                                        </div>
                                        <span className="text-green-600 font-bold text-sm">+{tx.pointsEarned} pt</span>
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
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3.5 rounded-xl hover:from-green-600 hover:to-emerald-700 transition shadow-lg active:scale-95"
                    >
                        📊 ดูสถิติของฉัน
                    </button>
                    <button
                        onClick={() => logout()}
                        className="w-full bg-gray-100 text-gray-600 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition active:scale-95"
                    >
                        🏠 กลับหน้าหลัก
                    </button>
                </div>
            </div>
        </div>
    );
}
