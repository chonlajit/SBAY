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
                hour: '2-digit',
                minute: '2-digit',
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
                    const port = window.location.port;
                    const isProxied = !port || port === '80' || port === '443';
                    const apiBase = `http://${hostname}${isProxied ? '' : ':8070'}/api`;

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
            <div className="bg-gradient-to-r from-green-700 to-green-500  md:p-8 p-5 pb-12 shadow-lg text-white relative mb-10">
                <button onClick={() => router.push('/')} className="absolute top-4 left-4 text-white/80 hover:text-white md:top-8 md:left-8">
                    ← หน้าหลัก
                </button>
                <div >
                    <span className='flex'>
                        <h2 className="ml-4 mt-8 mb-14 md:mb-[30px] text-2xl font-bold text-center">{user.title} {user.firstName} {user.lastName} </h2>
                        <div className="opacity-80 absolute right-[215px] top-[100px] md:top-10 md:right-20 text-[14px]">
                            <dt>รหัสนักศึกษา: {user.studentId}</dt>
                            <dt>เบอร์โทรศัพท์: {user.phoneNumber}</dt>
                            <dt>อีเมล: {user.email}</dt>
                        </div>
                    </span>
                </div>
            </div>


            <div className='bg-gray-100 rounded-t-[2rem] md:rounded-[3rem] m-5 p-5 pb-20'>
                {/* Statistics Summary */}
                <div className="max-w-md md:max-w-6xl mx-auto mb-8">
                    <h3 className="font-bold text-green-800 mb-4 ml-2 md:text-xl">สถิติการรีไซเคิล</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                        <div className=" bg-green-500  rounded-2xl p-4 shadow-lg border-white border-3 ">
                            <p className="text-white text-m text-center pb-2">คะแนนสะสม</p>
                            <div className='bg-white rounded-xl p-1'>
                                <div className="text-2xl md:text-4xl font-bold text-green-500 text-center">{user.points} <span className="text-sm md:text-2xl font-bold text-yellow-500">Point</span></div>
                            </div>
                        </div>
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
                                    <div className="text-2xl font-bold text-yellow-500">{typeStats.count} <span className="text-xs font-normal text-gray-400">ชิ้น</span></div>
                                    <div className="text-green-500 text-xs font-bold">+{typeStats.points} Point</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* History List */}
                <div className="max-w-md md:max-w-6xl mx-auto md:px-7 px-3 bg-white rounded-3xl pb-5 shadow-lg">
                    <h3 className="font-bold text-green-800 mb-4 ml-2 pt-5 md:text-xl">ประวัติการทำรายการล่าสุด</h3>
                    {loading ? (
                        <div className="text-center py-10 text-gray-400">Loading history...</div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(groupedHistory).map(([date, transactions]) => {
                                const totalPoints = transactions.reduce((sum: number, tx: any) => sum + tx.pointsEarned, 0);
                                return (
                                    <div key={date} className="space-y-2">
                                        <button
                                            onClick={() => toggleDate(date)}
                                            className="flex items-center justify-between text-sm text-gray-500 font-bold hover:text-green-600 transition-colors bg-green-500 rounded-xl p-1.5 md:p-2 w-full"
                                        >
                                            <div className="flex items-center space-x-2 md:space-x-4">
                                                <span className="bg-white text-green-600 rounded-3xl px-4 py-1 text-xs md:text-sm">{expandedDates[date] ? 'SHOW' : 'HIDE'}</span>
                                                <span className="text-white md:text-lg">{date}</span>
                                                <span className="font-normal opacity-70 text-white md:text-lg hidden sm:inline">({transactions.length} รายการ)</span>
                                            </div>
                                            <span className="text-white font-bold bg-green-600 px-3 py-1 rounded-xl mr-1 whitespace-nowrap">
                                                +{totalPoints} Point
                                            </span>
                                        </button>
                                        <div className="text-xs mt-1"></div>

                                        {expandedDates[date] && (
                                            <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                                                {transactions.map((tx: any, idx: number) => {
                                                    const typeLabel = wasteTypes.find(w => w.type === tx.wasteType)?.label || tx.wasteType;
                                                    const time = new Date(tx.timestamp).toLocaleString('th-TH', {
                                                        year: '2-digit', month: 'short', day: 'numeric',
                                                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                                                    });
                                                    return (
                                                        <div key={idx} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">
                                                                    ♻️
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-gray-800">{typeLabel}</p>
                                                                    <p className="text-xs text-gray-400 mt-1">🕒 {time}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-green-600 font-bold">+{tx.pointsEarned}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {history.length === 0 && (
                                <div className="text-center text-gray-400 py-4">ไม่มีประวัติการทำรายการ</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
