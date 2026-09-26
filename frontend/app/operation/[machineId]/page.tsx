"use client";

import React, { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../../context/SmartBinContext';

export default function OperationPage({ params }: { params: Promise<{ machineId: string }> }) {
    const { machineId } = use(params);
    const router = useRouter();
    const { user, sessionHistory, sessionPoints, wasteTypes, logout, releaseMachine, wsConnected } = useSmartBin();

    // Protection: redirect to login if no user
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!localStorage.getItem('sbay_user')) {
                router.push(`/login?mech_id=${machineId}`);
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [user, machineId, router]);

    const handleFinish = async () => {
        await releaseMachine(machineId);
        router.push('/summary');
    };

    if (!user) return (
        <div className="min-h-screen flex items-center justify-center bg-green-50">
            <div className="flex flex-col items-center space-y-3">
                <svg className="animate-spin w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                <span className="text-gray-500 font-medium">กำลังโหลด...</span>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-b from-green-50 to-white font-sans text-gray-900">

            {/* Header */}
            <div className="bg-gradient-to-r from-[#527d40] to-[#64964E] px-4 py-4 flex items-center justify-between shadow-md sticky top-0 z-10">
                <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white text-base">
                        <i className="fa-solid fa-recycle"></i>
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm leading-tight">Smart Bin</p>
                        <p className="text-green-100 text-xs">{machineId}</p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    {/* WS Status */}
                    <div className={`flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                        wsConnected ? 'bg-white/20 text-white' : 'bg-red-400/30 text-red-100'
                    }`}>
                        <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-300 animate-pulse' : 'bg-red-300'}`}/>
                        <span>{wsConnected ? 'Online' : 'Offline'}</span>
                    </div>

                    <button
                        onClick={() => logout(machineId)}
                        className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition"
                    >
                        ออก
                    </button>
                </div>
            </div>

            {/* Main */}
            <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-5">

                {/* Greeting */}
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800">สวัสดี คุณ{user.firstName}!</h1>
                    <p className="text-gray-500 text-sm mt-1">โปรดนำขยะใส่ที่ช่องรับของตู้ Smart Bin</p>
                </div>

                {/* Points this session */}
                <div className="bg-gradient-to-r from-[#527d40] to-[#64964E] rounded-3xl p-5 text-white text-center shadow-lg">
                    <p className="text-emerald-100 text-sm font-medium mb-1">แต้มที่ได้รับในเซสชันนี้</p>
                    <div className="flex items-end justify-center space-x-1">
                        <span className="text-5xl font-black">{sessionPoints}</span>
                        <span className="text-amber-300 font-bold text-xl mb-1">pt</span>
                    </div>
                </div>

                {/* Session History */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50">
                        <h2 className="font-bold text-gray-800 text-sm">รายการที่หยอด</h2>
                    </div>

                    {sessionHistory.length === 0 ? (
                        <div className="py-10 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-[#64964E]/10 text-[#64964E] flex items-center justify-center mx-auto mb-3 text-2xl">
                                <i className="fa-solid fa-inbox"></i>
                            </div>
                            <p className="text-gray-400 text-sm font-medium">รอรับขวด / กระป๋อง...</p>
                            <p className="text-gray-400/80 text-xs mt-1">ระบบจะบันทึกอัตโนมัติเมื่อตรวจจับขยะ</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                            {sessionHistory.map((tx, idx) => {
                                const typeLabel = wasteTypes.find(w => w.type === tx.wasteType)?.label || tx.wasteType;
                                const time = new Date(tx.timestamp).toLocaleTimeString('th-TH', {
                                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                                });
                                return (
                                    <div key={idx} className="flex items-center justify-between px-4 py-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-9 h-9 bg-[#64964E]/10 rounded-xl flex items-center justify-center text-base text-[#64964E]">
                                                <i className="fa-solid fa-recycle"></i>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800 text-sm">{typeLabel}</p>
                                                <p className="text-gray-400 text-xs">{time} น.</p>
                                            </div>
                                        </div>
                                        <span className="text-[#527d40] font-black">+{tx.pointsEarned} pt</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Finish Button */}
                <button
                    onClick={handleFinish}
                    className="w-full bg-[#64964E] hover:bg-[#527d40] text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-900/20 transition active:scale-95 text-base flex items-center justify-center gap-2"
                >
                    <i className="fa-solid fa-check"></i>
                    <span>เสร็จสิ้น — ปิดเซสชัน</span>
                </button>
            </div>
        </div>
    );
}
