"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';

export default function DashboardPage() {
    const router = useRouter();
    const { user, wasteTypes, logout } = useSmartBin();
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

    const groupedHistory = useMemo(() => {
        const groups: Record<string, any[]> = {};
        history.forEach(tx => {
            const date = new Date(tx.timestamp).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
            if (!groups[date]) groups[date] = [];
            groups[date].push(tx);
        });
        return groups;
    }, [history]);

    const toggleDate = (date: string) => {
        setExpandedDates(prev => ({
            ...prev,
            [date]: !prev[date]
        }));
    };

    // We can fetch history here locally since it's just for viewing
    useEffect(() => {
        if (user) {
            // Re-fetch full history
            const fetchHistory = async () => {
                // In a real app, move this fetch to Context or a shared utility
                try {
                    // We need API Base from context? 
                    // Or just hardcode since we know it runs in browser
                    const hostname = window.location.hostname;
                    const apiBase = `http://${hostname}:8080/api`;

                    const res = await fetch(`${apiBase}/transactions/user/${user.id}`);
                    if (res.ok) {
                        const data = await res.json();
                        setHistory(data);
                    }
                } catch (e) {
                    console.error("History fetch error", e);
                } finally {
                    setLoading(false);
                }
            };
            fetchHistory();
        } else {
            // Redirect if not logged in
            router.push('/');
        }
    }, [user, router]);

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-20 text-black">
            {/* Profile Header */}
            <div className="bg-green-600 rounded-b-[1rem] p-8 pb-12 shadow-lg text-white relative">
                <button onClick={() => router.push('/')} className="absolute top-4 left-4 text-white/80 hover:text-white">
                    ← หน้าหลัก
                </button>
                <div className="flex flex-col items-center mt-4">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-3xl shadow-inner mb-4">
                        👤
                    </div>
                    <h2 className="text-2xl font-bold">{user.firstName} {user.lastName}</h2>
                    <p className="opacity-80">{user.phoneNumber}</p>

                    <div className="mt-8 bg-white/10 backdrop-blur-md rounded-2xl p-6 w-full max-w-sm text-center border border-white/20">
                        <p className="text-green-100 text-sm mb-1">คะแนนสะสม</p>
                        <div className="text-5xl font-bold">{user.points} <span className="text-xl font-normal">Point</span></div>
                    </div>
                </div>
            </div>

            {/* Menu Grid */}
            <div className="max-w-md mx-auto px-6 -mt-8 relative z-10 mb-8">
                <div className="bg-white rounded-2xl shadow-lg p-4 flex justify-around">
                    <button onClick={() => router.push('/redeem')} className="flex flex-col items-center p-2 hover:bg-green-50 rounded-xl transition w-full">
                        <span className="text-xl mb-1">🎁</span>
                        <span className="text-xs font-bold text-gray-600">แลกของรางวัล</span>
                    </button>

                    {user.role === 'ADMIN' && (
                        <>
                            <div className="w-px bg-gray-200 mx-2"></div>
                            <button onClick={() => router.push('/admin')} className="flex flex-col items-center p-2 hover:bg-blue-50 rounded-xl transition w-full">
                                <span className="text-xl mb-1">📊</span>
                                <span className="text-xs font-bold text-blue-600">Admin Dash</span>
                            </button>
                        </>
                    )}

                    <div className="w-px bg-gray-200 mx-2"></div>
                    <button onClick={() => logout()} className="flex flex-col items-center p-2 hover:bg-red-50 rounded-xl transition w-full">
                        <span className="text-xl mb-1">🚪</span>
                        <span className="text-xs font-bold text-red-500">ออกจากระบบ</span>
                    </button>
                </div>
            </div>

            {/* Statistics Summary */}
            <div className="max-w-md mx-auto px-6 mb-8">
                <h3 className="font-bold text-gray-800 mb-4 ml-2">สถิติการรีไซเคิล</h3>
                <div className="grid grid-cols-2 gap-3">
                    {wasteTypes.map((type) => {
                        const typeStats = history
                            .filter(h => h.wasteType === type.type)
                            .reduce((acc, curr) => ({
                                count: acc.count + 1,
                                points: acc.points + curr.pointsEarned
                            }), { count: 0, points: 0 });

                        return (
                            <div key={type.type} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                                <div className="text-gray-500 text-sm mb-1">{type.label}</div>
                                <div className="text-2xl font-bold text-gray-800">{typeStats.count} <span className="text-xs font-normal text-gray-400">ชิ้น</span></div>
                                <div className="text-green-500 text-xs font-bold">+{typeStats.points} แต้ม</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* History List */}
            <div className="max-w-md mx-auto px-6">
                <h3 className="font-bold text-gray-800 mb-4 ml-2">ประวัติการทำรายการล่าสุด</h3>
                {loading ? (
                    <div className="text-center py-10 text-gray-400">Loading history...</div>
                ) : (
                    <div className="space-y-4">
                        {Object.entries(groupedHistory).map(([date, transactions]) => (
                            <div key={date} className="space-y-2">
                                <button
                                    onClick={() => toggleDate(date)}
                                    className="flex items-center space-x-2 text-sm text-gray-500 font-bold ml-1 hover:text-green-600 transition-colors"
                                >
                                    <span>{expandedDates[date] ? 'Show :' : 'Hide :'}</span>
                                    <span>{date}</span>
                                    <span className="font-normal opacity-70">({transactions.length} รายการ)</span>

                                </button>
                                <div className="text-xs mt-1">____________________________________________________________________________</div>

                                {expandedDates[date] && (
                                    <div className="space-y-3">
                                        {transactions.map((tx: any, idx: number) => {
                                            const typeLabel = wasteTypes.find(w => w.type === tx.wasteType)?.label || tx.wasteType;
                                            const time = new Date(tx.timestamp).toLocaleTimeString('th-TH', {
                                                hour: '2-digit', minute: '2-digit'
                                            });
                                            return (
                                                <div key={idx} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">
                                                            ♻️
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-800">{typeLabel}</p>
                                                            <p className="text-xs text-gray-400">{time}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-green-600 font-bold">+{tx.pointsEarned}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                        {history.length === 0 && (
                            <div className="text-center text-gray-400 py-4">ไม่มีประวัติการทำรายการ</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
