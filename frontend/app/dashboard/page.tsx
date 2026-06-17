"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';

export default function DashboardPage() {
    const router = useRouter();
    const { user, wasteTypes, apiBase, isInitialized, latestSession, refreshUser } = useSmartBin();
    const [history, setHistory] = useState<any[]>([]);
    const [redemptions, setRedemptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
    const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
    const [activeTab, setActiveTab] = useState<'recycle' | 'redeem'>('recycle');

    const normalizeWasteType = (type: string): string => {
        if (!type) return '';
        const t = type.toLowerCase().trim();
        if (t.includes('clear') || t === 'plastic_clear') return 'CLEAR_BOTTLE';
        if (t.includes('opaque') || t === 'plastic_opaque' || t.includes('cloudy')) return 'OPAQUE_BOTTLE';
        if (t.includes('glass') || t === 'glasses_bottle') return 'GLASSES_BOTTLE';
        if (t.includes('steel')) return 'STEEL_CAN';
        if (t.includes('aluminum')) return 'ALUMINUM_CAN';
        return type; // Fallback
    };

    const getSessionDateTime = (session: any) => {
        const dateObj = new Date(session.startTime || session.endTime);
        const dateStr = dateObj.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        return `${dateStr} เวลา ${timeStr} น.`;
    };

    const toggleSession = (sessionId: string) => {
        setExpandedSessions((prev: Record<string, boolean>) => ({ ...prev, [sessionId]: !prev[sessionId] }));
    };

    const toggleDate = (date: string) => {
        setExpandedDates((prev: Record<string, boolean>) => ({ ...prev, [date]: !prev[date] }));
    };

    const groupedRedemptions = useMemo(() => {
        const groups: Record<string, any[]> = {};
        redemptions.forEach(tx => {
            const date = new Date(tx.timestamp).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
            if (!groups[date]) groups[date] = [];
            groups[date].push(tx);
        });
        return groups;
    }, [redemptions]);

    const userId = user?.id;

    useEffect(() => {
        if (userId) {
            const fetchData = async () => {
                try {
                    const [res1, res2] = await Promise.all([
                        fetch(`${apiBase}/sessions/history/${userId}`),
                        fetch(`${apiBase}/redemptions/user/${userId}`)
                    ]);
                    if (res1.ok) setHistory(await res1.json());
                    if (res2.ok) setRedemptions(await res2.json());
                    await refreshUser();
                } catch (e) {
                    console.error("Fetch error", e);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        } else if (isInitialized) {
            router.push('/login');
        }
    }, [userId, isInitialized, router, apiBase]);

    useEffect(() => {
        if (latestSession) {
            setHistory((prev: any[]) => {
                if (prev.some((s: any) => s.id === latestSession.id || (s.startTime === latestSession.startTime && s.deviceId === latestSession.deviceId))) {
                    return prev;
                }
                return [latestSession, ...prev];
            });
            refreshUser();
        }
    }, [latestSession]);

    if (!isInitialized || !user) {
        return (
            <div className="min-h-full bg-gray-50 pb-6 animate-pulse">
                {/* Profile Header Skeleton */}
                <div className="bg-gradient-to-br from-gray-300 to-gray-200 px-5 pt-6 pb-10 relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full" />
                    <div className="relative max-w-lg md:max-w-4xl mx-auto">
                        <div className="flex items-center space-x-4">
                            <div className="w-14 h-14 bg-gray-100 rounded-2xl"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-gray-100 rounded w-20"></div>
                                <div className="h-5 bg-gray-100 rounded w-48"></div>
                                <div className="h-3 bg-gray-100 rounded w-32"></div>
                            </div>
                        </div>
                        {/* Fake faculty/studentId block */}
                        <div className="mt-4 bg-white/10 rounded-xl p-3 border border-white/10 space-y-1.5 h-16"></div>
                    </div>
                </div>

                <div className="max-w-lg md:max-w-4xl mx-auto px-4 md:px-8 -mt-6 space-y-4 relative z-10">
                    <div className="bg-white rounded-3xl shadow-xl p-5 border border-gray-100">
                        <div className="flex justify-between items-center mb-3">
                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                            <div className="h-5 bg-gray-200 rounded w-16"></div>
                        </div>
                        <div className="h-12 bg-gray-200 rounded w-24 mt-2"></div>
                    </div>
                    
                    <div className="flex bg-gray-200 p-1 rounded-xl mb-4 h-11 mt-6"></div>
                    
                    <div className="space-y-3">
                        <div className="h-24 bg-white rounded-3xl border border-gray-100"></div>
                        <div className="h-24 bg-white rounded-3xl border border-gray-100"></div>
                    </div>
                </div>
            </div>
        );
    }

    const totalItems = useMemo(() => {
        return history.reduce((sum: number, s: any) => sum + (s.items ? s.items.length : 0), 0);
    }, [history]);

    return (
        <div className="min-h-full bg-gray-50 pb-6">

            {/* Profile Header */}
            <div className="bg-gradient-to-br from-green-700 to-emerald-500 px-5 pt-6 pb-10 relative overflow-hidden">
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full" />

                <div className="relative max-w-lg md:max-w-4xl mx-auto">
                    <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-green-700 text-2xl shadow-lg">
                            {user.firstName.charAt(0)}
                        </div>
                        <div>
                            <p className="text-green-200 text-xs font-medium">โปรไฟล์ของฉัน</p>
                            <h2 className="text-white font-bold text-xl leading-tight">
                                {user.title} {user.firstName} {user.lastName}
                            </h2>
                            {user.email && (
                                <p className="text-green-200 text-xs mt-0.5 truncate max-w-[200px]">{user.email}</p>
                            )}
                        </div>
                    </div>

                    {(user.studentId || user.faculty || user.major) && (
                        <div className="mt-4 bg-white/10 rounded-xl p-3 border border-white/10 space-y-1.5 backdrop-blur-sm">
                            {user.studentId && (
                                <p className="text-green-50 text-xs flex items-center">
                                    <i className="fa-solid fa-id-card w-4 opacity-70"></i>
                                    <span className="opacity-80 mr-1">รหัสนักศึกษา:</span> <span className="font-medium">{user.studentId}</span>
                                </p>
                            )}
                            {user.faculty && (
                                <p className="text-green-50 text-xs flex items-center">
                                    <i className="fa-solid fa-building-columns w-4 opacity-70"></i>
                                    <span className="opacity-80 mr-1">คณะ:</span> <span className="font-medium truncate">{user.faculty}</span>
                                </p>
                            )}
                            {user.major && (
                                <p className="text-green-50 text-xs flex items-center">
                                    <i className="fa-solid fa-graduation-cap w-4 opacity-70"></i>
                                    <span className="opacity-80 mr-1">สาขา:</span> <span className="font-medium truncate">{user.major}</span>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="max-w-lg md:max-w-4xl mx-auto px-4 md:px-8 -mt-6 space-y-4 relative z-10">
                {/* Points Hero Card */}
                <div className="bg-white rounded-3xl shadow-xl p-5 border border-green-100">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-500 text-sm font-medium">ขยะที่รีไซเคิลแล้ว</span>
                        <span className="bg-green-100 text-green-600 text-xs font-bold px-2 py-0.5 rounded-full">{totalItems} ชิ้น</span>
                    </div>
                    <div className="flex items-end justify-between">
                        <div className="flex items-end space-x-2">
                            <span className="text-5xl font-black text-green-600">{user.points}</span>
                            <span className="text-yellow-500 font-bold text-xl pb-1">แต้มสะสม</span>
                        </div>
                        <div className="text-right text-xs text-gray-400">
                            จากทั้งหมด {history.length} รอบการทำงาน
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-200 p-1 rounded-xl mb-4 mt-6">
                    <button
                        onClick={() => setActiveTab('recycle')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'recycle' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <i className="fa-solid fa-recycle mr-1.5"></i> การรีไซเคิล
                    </button>
                    <button
                        onClick={() => setActiveTab('redeem')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'redeem' ? 'bg-white text-yellow-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <i className="fa-solid fa-gift mr-1.5"></i> การแลกรางวัล
                    </button>
                </div>

                {/* Waste Type Stats */}
                {activeTab === 'recycle' && (
                    <div className="mb-4">
                        <h3 className="font-bold text-gray-700 mb-3 text-sm px-1">สถิติตามประเภทขยะ</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {wasteTypes.map((type) => {
                                let count = 0;
                                let points = 0;

                                history.forEach((session: any) => {
                                    if (session.items) {
                                        session.items.forEach((item: any) => {
                                            if (normalizeWasteType(item.type) === type.type) {
                                                count += 1;
                                                points += item.score ? Math.round(item.score) : 0;
                                            }
                                        });
                                    }
                                });

                                return (
                                    <div key={type.type} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                        <p className="text-gray-500 text-xs mb-1 truncate">{type.label}</p>
                                        <div className="flex items-baseline space-x-1">
                                            <span className="text-2xl font-black text-gray-800">{count}</span>
                                            <span className="text-gray-400 text-xs">ชิ้น</span>
                                        </div>
                                        <div className="bg-green-50 text-green-600 text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-1">
                                            +{points} แต้ม
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Redemption Stats */}
                {activeTab === 'redeem' && (
                    <div className="mb-4">
                        <h3 className="font-bold text-gray-700 mb-3 text-sm px-1">สถิติการแลกรางวัล</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                <p className="text-gray-500 text-xs mb-1">แต้มที่ใช้ไปแล้ว</p>
                                <div className="flex items-baseline space-x-1">
                                    <span className="text-2xl font-black text-gray-800">
                                        {redemptions.reduce((sum, r) => sum + r.cost, 0)}
                                    </span>
                                    <span className="text-gray-400 text-xs">แต้ม</span>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                <p className="text-gray-500 text-xs mb-1">จำนวนครั้งที่แลก</p>
                                <div className="flex items-baseline space-x-1">
                                    <span className="text-2xl font-black text-gray-800">{redemptions.length}</span>
                                    <span className="text-gray-400 text-xs">ครั้ง</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* History List */}
                <div>
                    <h3 className="font-bold text-gray-700 mb-3 text-sm px-1">
                        {activeTab === 'recycle' ? 'ประวัติการรีไซเคิล' : 'ประวัติการแลกรางวัล'}
                    </h3>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        {loading ? (
                            <div className="py-12 flex flex-col items-center space-y-2">
                                <svg className="animate-spin w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                <span className="text-gray-400 text-sm">กำลังโหลด...</span>
                            </div>
                        ) : (activeTab === 'recycle' ? history.length === 0 : redemptions.length === 0) ? (
                            <div className="py-12 text-center">
                                <i className="fa-solid fa-inbox text-gray-400 text-5xl mb-3"></i>
                                <p className="text-gray-500 font-medium">ยังไม่มีประวัติการทำรายการ</p>
                                <p className="text-gray-400 text-sm mt-1">
                                    {activeTab === 'recycle' ? 'นำขยะไปใส่ตู้ Smart Bin เพื่อเริ่มสะสมแต้ม' : 'สะสมแต้มแล้วนำมาแลกรางวัลได้เลย'}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {activeTab === 'recycle' ? (
                                    history.map((session: any, idx: number) => {
                                        const sessionId = session.id || `session-${idx}`;
                                        const dateStr = getSessionDateTime(session);
                                        const expanded = expandedSessions[sessionId] === true;
                                        const totalPoints = Math.round(session.totalScore || 0);
                                        const itemsCount = session.items ? session.items.length : 0;

                                        return (
                                            <div key={sessionId}>
                                                <button
                                                    onClick={() => toggleSession(sessionId)}
                                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <svg
                                                            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
                                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                                                        </svg>
                                                        <span className="font-semibold text-gray-700 text-sm">{dateStr}</span>
                                                        <span className="text-gray-400 text-xs">({itemsCount} รายการ)</span>
                                                    </div>
                                                    <span className="font-bold text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                                                        +{totalPoints} แต้ม
                                                    </span>
                                                </button>

                                                {expanded && (
                                                    <div className="divide-y divide-gray-50 bg-gray-50/50">
                                                        {session.items && session.items.map((item: any, itemIdx: number) => {
                                                            const typeForLabel = normalizeWasteType(item.type);
                                                            const typeLabel = wasteTypes.find(w => w.type === typeForLabel)?.label || item.type;
                                                            const itemTime = item.timestamp 
                                                                ? new Date(item.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                                                                : '';

                                                            return (
                                                                <div key={itemIdx} className="flex items-center justify-between px-5 py-3">
                                                                    <div className="flex items-center space-x-3">
                                                                        <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center text-base">
                                                                            <i className="fa-solid fa-recycle text-green-600"></i>
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-semibold text-gray-800 text-sm">
                                                                                {typeLabel} {item.size ? `(${item.size === 'SMALL' ? 'เล็ก' : item.size === 'MEDIUM' ? 'กลาง' : 'ใหญ่'})` : ''}
                                                                            </p>
                                                                            <p className="text-gray-400 text-xs">
                                                                                {item.ml ? `${item.ml} ml` : ''} {item.weight ? `• ${item.weight} กรัม` : ''} {itemTime ? `• ${itemTime} น.` : ''}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-green-600 font-black text-sm">+{item.score ? Math.round(item.score) : 0}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    Object.entries(groupedRedemptions).map(([date, rawItems]) => {
                                        const items = rawItems as any[];
                                        const totalCost = items.reduce((sum: number, tx: any) => sum + tx.cost, 0);
                                        const expanded = expandedDates[date] === true;
                                        return (
                                            <div key={date}>
                                                <button
                                                    onClick={() => toggleDate(date)}
                                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <svg
                                                            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
                                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                                                        </svg>
                                                        <span className="font-semibold text-gray-700 text-sm">{date}</span>
                                                        <span className="text-gray-400 text-xs">({items.length} รายการ)</span>
                                                    </div>
                                                    <span className="font-bold text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-600">
                                                        -{totalCost} แต้ม
                                                    </span>
                                                </button>

                                                {expanded && (
                                                    <div className="divide-y divide-gray-50 bg-gray-50/50">
                                                        {items.map((tx: any, idx: number) => {
                                                            const time = new Date(tx.timestamp).toLocaleTimeString('th-TH', {
                                                                hour: '2-digit', minute: '2-digit'
                                                            });
                                                            const isPending = tx.status === 'PENDING';
                                                            const isApproved = tx.status === 'APPROVED';

                                                            return (
                                                                <div key={idx} className="flex items-center justify-between px-5 py-3">
                                                                    <div className="flex items-center space-x-3">
                                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${tx.rewardType === 'VOLUNTEER' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                                                            <i className={`fa-solid ${tx.rewardType === 'VOLUNTEER' ? 'fa-handshake-angle' : 'fa-graduation-cap'}`}></i>
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-semibold text-gray-800 text-sm">{tx.details}</p>
                                                                            <p className="text-gray-400 text-xs flex items-center space-x-1">
                                                                                <span>{time} น.</span>
                                                                                <span>•</span>
                                                                                <span className={`font-semibold ${isPending ? 'text-yellow-500' : isApproved ? 'text-green-500' : 'text-red-500'}`}>
                                                                                    {isPending ? 'รออนุมัติ' : isApproved ? 'อนุมัติแล้ว' : 'ถูกปฏิเสธ'}
                                                                                </span>
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-red-500 font-black text-sm">-{tx.cost}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
