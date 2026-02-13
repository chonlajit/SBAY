"use client";

import React, { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../../context/SmartBinContext';

export default function OperationPage({ params }: { params: Promise<{ machineId: string }> }) {
    // Next.js 15+ params is a Promise
    const { machineId } = use(params);
    const router = useRouter();
    const { user, sessionHistory, sessionPoints, wasteTypes, logout, simulateDrop, releaseMachine } = useSmartBin();

    // Protection Logic
    useEffect(() => {
        // If no user is logged in, redirect to login for this machine
        // We add a small delay to allow Context to restore session from localStorage if needed
        const timer = setTimeout(() => {
            if (!localStorage.getItem('sbay_user')) {
                router.push(`/login?mech_id=${machineId}`);
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [user, machineId, router]);

    const handleFinish = async () => {
        // Stop the camera (release machine binding in backend)
        await releaseMachine(machineId);
        // Go to Summary page
        router.push('/summary');
    };

    if (!user) return <div className="text-center p-20">Loading...</div>;

    return (
        <div className="flex flex-col min-h-screen bg-gray-100 font-sans relative text-black">
            {/* Header Bar */}
            <div className="bg-green-500 h-16 flex items-center justify-between px-4 shadow-md sticky top-0 z-10">
                <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-white rounded-full opacity-50"></div>
                    <div className="w-3 h-3 bg-white rounded-full opacity-50"></div>
                </div>
                <div className="text-white font-bold text-lg">Smart Bin ({machineId})</div>
                <div className="text-white text-2xl cursor-pointer" onClick={() => logout(machineId)}>✖</div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 flex flex-col items-center pb-40">
                <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 mt-4 text-gray-800">
                    สวัสดีคุณ {user.firstName}
                </h1>
                <p className="text-gray-500 mb-8">โปรดใส่ขวดน้ำที่ช่องใส่ขวด</p>

                <div className="w-full max-w-md">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800 flex justify-between">
                        <span>รายการที่หยอด</span>
                        <span className="text-green-600">{sessionPoints} แต้ม</span>
                    </h2>

                    <div className="bg-white border-4 border-green-400 rounded-3xl p-6 min-h-[300px] shadow-sm relative overflow-y-auto max-h-[50vh]">
                        {sessionHistory.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400 opacity-50 pointer-events-none">
                                รอรับขวด...
                            </div>
                        )}
                        <div className="space-y-3">
                            {sessionHistory.map((tx, idx) => {
                                const typeLabel = wasteTypes.find(w => w.type === tx.wasteType)?.label || tx.wasteType;
                                return (
                                    <div key={idx} className="flex justify-between items-center font-bold text-lg border-b border-gray-100 pb-2">
                                        <span className="text-gray-800 w-1/2 truncate">{typeLabel}</span>
                                        <span className="text-green-500 w-1/4 text-center">เสร็จสิ้น</span>
                                        <span className="text-green-600 w-1/4 text-right">+{tx.pointsEarned}p</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Finish Button */}
                <button
                    onClick={handleFinish}
                    className="mt-8 bg-green-500 hover:bg-green-600 text-white text-xl font-bold py-3 px-12 rounded-full shadow-lg transition transform active:scale-95"
                >
                    เสร็จสิ้น
                </button>
            </div>

            {/* Simulation Controls */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-4 shadow-2xl z-20 rounded-t-2xl">
                <p className="text-xs text-center text-gray-400 mb-2">Simulation Controls (Testing)</p>
                <div className="grid grid-cols-4 gap-2">
                    {wasteTypes.map(w => (
                        <button
                            key={w.type}
                            onClick={() => simulateDrop(w.type, machineId)}
                            className="bg-gray-100 hover:bg-green-100 border border-gray-300 rounded p-2 flex flex-col items-center justify-center transition active:scale-95"
                        >
                            <span className="text-xl">📥</span>
                            <span className="text-[10px] font-bold text-center leading-tight">{w.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
