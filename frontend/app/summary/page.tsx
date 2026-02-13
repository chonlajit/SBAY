"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';

export default function SummaryPage() {
    const router = useRouter();
    const { sessionPoints, sessionHistory, wasteTypes, logout } = useSmartBin();

    const handleViewDashboard = () => {
        router.push('/dashboard');
    };

    const handleHome = () => {
        logout(); // Or just router.push('/') if we want to keep them logged in?
        // Usually "Home" from summary means "I'm done at the machine", so logout is safe.
        // But maybe they want to check dashboard.
        // Let's assume Logout for "Back to Home".
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-green-500 font-sans p-4 text-white">
            <h1 className="text-3xl font-bold mb-8">สรุปรายการ</h1>

            <div className="bg-white text-gray-800 rounded-3xl p-8 w-full max-w-md shadow-2xl text-center">
                <p className="text-gray-500 mb-2">คุณได้รับคะแนนสะสม</p>
                <div className="text-6xl font-bold text-green-600 mb-8">
                    +{sessionPoints}
                </div>

                <div className="text-left mb-8 border-t border-b py-4">
                    <h3 className="font-bold mb-2 text-gray-400 text-sm">รายละเอียด</h3>
                    {sessionHistory.length === 0 ? (
                        <p className="text-center text-gray-300">ไม่มีรายการ</p>
                    ) : (
                        <ul className="space-y-2">
                            {sessionHistory.map((tx, idx) => {
                                const typeLabel = wasteTypes.find(w => w.type === tx.wasteType)?.label || tx.wasteType;
                                return (
                                    <li key={idx} className="flex justify-between">
                                        <span>{typeLabel}</span>
                                        <span className="font-bold">+{tx.pointsEarned}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="space-y-3">
                    <button
                        onClick={handleViewDashboard}
                        className="w-full bg-green-500 text-white font-bold py-3 rounded-full hover:bg-green-600 transition shadow-lg"
                    >
                        เช็คยอดเงินคงเหลือ
                    </button>
                    <button
                        onClick={() => logout()}
                        className="w-full bg-gray-100 text-gray-500 font-bold py-3 rounded-full hover:bg-gray-200 transition"
                    >
                        กลับหน้าหลัก
                    </button>
                </div>
            </div>
        </div>
    );
}
