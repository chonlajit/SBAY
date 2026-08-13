"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
        return type.toUpperCase().trim();
    };

    const getSessionDateTime = (session: any) => {
        const dateObj = new Date(session.startTime || session.endTime);
        const dateStr = dateObj.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        return { dateStr, timeStr };
    };

    const toggleSession = (sessionId: string) => {
        setExpandedSessions((prev: Record<string, boolean>) => ({ ...prev, [sessionId]: !prev[sessionId] }));
    };

    const toggleDate = (date: string) => {
        setExpandedDates((prev: Record<string, boolean>) => ({ ...prev, [date]: !prev[date] }));
    };

    const downloadGroupReceipt = async (txGroup: any[]) => {
        if (!txGroup || txGroup.length === 0) return;
        const firstTx = txGroup[0];
        try {
            const receiptDiv = document.createElement('div');
            receiptDiv.style.position = 'absolute';
            receiptDiv.style.left = '-9999px';
            receiptDiv.style.top = '0';
            receiptDiv.style.width = '600px';
            receiptDiv.style.background = '#ffffff';
            receiptDiv.style.padding = '40px';
            receiptDiv.style.color = '#1f2937';
            receiptDiv.style.fontFamily = 'sans-serif';
            
            const tableRows = txGroup.map(tx => `
                <tr>
                    <td style="padding: 12px; border: 1px solid #e5e7eb;">${tx.rewardName || tx.details || 'แลกรางวัล'}</td>
                    <td style="padding: 12px; text-align: left; border: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">Ref: ${tx.referenceCode || tx.id || '-'}</td>
                    <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; color: #ef4444; font-weight: bold;">-${tx.pointsUsed || tx.cost || 0} P</td>
                </tr>
            `).join('');

            const totalPoints = txGroup.reduce((sum, tx) => sum + (tx.pointsUsed || tx.cost || 0), 0);

            receiptDiv.innerHTML = `
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #5BA1C2; padding-bottom: 20px;">
                    <h1 style="color: #5BA1C2; margin: 0; font-size: 28px;">ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ</h1>
                    <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">SmartBin Redemption System</p>
                </div>
                <div style="margin-bottom: 30px;">
                    <p style="margin: 5px 0;"><strong>วันที่:</strong> ${new Date(firstTx.timestamp).toLocaleString('th-TH')}</p>
                    <div style="margin: 15px 0; padding: 15px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <h3 style="margin: 0 0 10px 0; color: #475569; font-size: 16px;">ข้อมูลผู้รับรางวัล</h3>
                        <p style="margin: 5px 0; font-size: 14px;"><strong>ชื่อ-นามสกุล:</strong> ${firstTx.title || ''}${firstTx.firstName || user?.firstName} ${firstTx.lastName || user?.lastName}</p>
                        ${firstTx.studentId ? `<p style="margin: 5px 0; font-size: 14px;"><strong>รหัสนักศึกษา:</strong> ${firstTx.studentId}</p>` : ''}
                        ${(firstTx.faculty || firstTx.major) ? `<p style="margin: 5px 0; font-size: 14px;"><strong>คณะ/สาขา:</strong> ${firstTx.faculty || '-'} / ${firstTx.major || '-'}</p>` : ''}
                        ${firstTx.academicYear ? `<p style="margin: 5px 0; font-size: 14px;"><strong>ปีการศึกษา:</strong> ${firstTx.academicYear}</p>` : ''}
                        ${firstTx.phoneNumber ? `<p style="margin: 5px 0; font-size: 14px;"><strong>เบอร์โทร:</strong> ${firstTx.phoneNumber}</p>` : ''}
                        ${firstTx.email ? `<p style="margin: 5px 0; font-size: 14px;"><strong>อีเมล:</strong> ${firstTx.email}</p>` : ''}
                        ${firstTx.address ? `<p style="margin: 5px 0; font-size: 14px;"><strong>ที่อยู่:</strong> ${firstTx.address}</p>` : ''}
                    </div>
                    <p style="margin: 5px 0;"><strong>ประเภท:</strong> ${(firstTx.rewardType === 'VOLUNTEER' || (firstTx.details && firstTx.details.includes('จิตอาสา'))) ? 'จิตอาสา' : (firstTx.rewardType === 'ACTIVITY' || (firstTx.details && firstTx.details.includes('กิจกรรม'))) ? 'กิจกรรม' : firstTx.rewardType === 'DISCOUNT' ? 'ส่วนลด' : 'สินค้า'}</p>
                </div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">รายการแลกรางวัล</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">รหัสอ้างอิง</th>
                            <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">คะแนนที่ใช้</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
                <div style="text-align: right; font-size: 16px; margin-bottom: 30px; font-weight: bold;">
                    รวมคะแนนที่ใช้: <span style="color: #ef4444;">-${totalPoints} P</span>
                </div>
                <div style="text-align: center; margin-top: 40px; color: #9ca3af; font-size: 12px;">
                    <p>ขอบคุณที่ใช้บริการ SmartBin</p>
                    <p>เอกสารนี้สร้างขึ้นโดยระบบอัตโนมัติ</p>
                </div>
            `;
            document.body.appendChild(receiptDiv);

            const canvas = await html2canvas(receiptDiv, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`receipt_session_${firstTx.referenceCode || firstTx.id || 'SBAY'}.pdf`);
            
            document.body.removeChild(receiptDiv);
        } catch (error) {
            console.error('Error generating PDF', error);
            alert('เกิดข้อผิดพลาดในการสร้างใบเสร็จ PDF');
        }
    };

    const groupedRedemptions = useMemo(() => {
        const groups: Record<string, any[]> = {};
        redemptions.forEach(tx => {
            const sessionKey = new Date(tx.timestamp).toLocaleString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            const rewardName = tx.rewardName || tx.details || 'แลกรางวัล';
            const groupKey = `${sessionKey}_${rewardName}`;
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(tx);
        });
        const groupedArray = Object.values(groups).sort((a, b) => new Date(b[0].timestamp).getTime() - new Date(a[0].timestamp).getTime());
        return groupedArray;
    }, [redemptions]);

    const userId = user?.id;

    useEffect(() => {
        if (userId) {
            const fetchData = async () => {
                const cacheKey1 = `sbay_history_${userId}`;
                const cacheKey2 = `sbay_redemptions_${userId}`;
                
                try {
                    const cachedHistory = localStorage.getItem(cacheKey1);
                    const cachedRedemptions = localStorage.getItem(cacheKey2);
                    
                    if (cachedHistory) setHistory(JSON.parse(cachedHistory));
                    if (cachedRedemptions) setRedemptions(JSON.parse(cachedRedemptions));
                    
                    if (cachedHistory && cachedRedemptions) {
                        setLoading(false); // โหลดข้อมูลจาก Cache ทันทีไม่ต้องรอหมุน
                    }
                } catch (e) {
                    // Ignore JSON parse errors
                }

                try {
                    const [res1, res2] = await Promise.all([
                        fetch(`${apiBase}/sessions/history/${userId}`),
                        fetch(`${apiBase}/redemptions/user/${userId}`)
                    ]);
                    if (res1.ok) {
                        const data1 = await res1.json();
                        setHistory(data1);
                        localStorage.setItem(cacheKey1, JSON.stringify(data1));
                    }
                    if (res2.ok) {
                        const data2 = await res2.json();
                        setRedemptions(data2);
                        localStorage.setItem(cacheKey2, JSON.stringify(data2));
                    }
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
        if (latestSession && userId && (latestSession.userId === userId || latestSession.userId === user?.studentId)) {
            setHistory(prev => {
                if (prev.some((s: any) => s.id === latestSession.id)) {
                    return prev;
                }
                return [latestSession, ...prev];
            });
            refreshUser();
        }
    }, [latestSession]);

    const totalItems = useMemo(() => {
        return history.reduce((sum: number, s: any) => sum + (s.items ? s.items.length : 0), 0);
    }, [history]);

    const totalRecycleItems = history.reduce((sum: number, s: any) => sum + (s.items ? s.items.length : 0), 0);
    const totalRecyclePoints = history.reduce((sum: number, s: any) => sum + (s.pointsEarned || s.totalScore || (s.items ? s.items.reduce((acc: number, item: any) => acc + (item.points || item.score || 0), 0) : 0)), 0);
    const totalRedeemPoints = redemptions.reduce((sum: number, tx: any) => sum + (tx.pointsUsed || tx.cost || 0), 0);

    const wasteStats = useMemo(() => {
        let bottleCount = 0; let bottlePoints = 0;
        let canCount = 0; let canPoints = 0;
        let cartonCount = 0; let cartonPoints = 0;

        history.forEach(session => {
            if (!session.items) return;
            session.items.forEach((item: any) => {
                const w = wasteTypes.find((wt: any) => wt.id === item.wasteTypeId);
                const t = normalizeWasteType(w ? w.name : (item.wasteType || item.type));
                if (t.includes('BOTTLE') || t.includes('ขวด')) {
                    bottleCount++; bottlePoints += (item.points || item.score || 0);
                } else if (t.includes('CAN') || t.includes('กระป๋อง')) {
                    canCount++; canPoints += (item.points || item.score || 0);
                } else if (t.includes('CARTON') || t.includes('กล่อง')) {
                    cartonCount++; cartonPoints += (item.points || item.score || 0);
                }
            });
        });

        return { bottleCount, bottlePoints, canCount, canPoints, cartonCount, cartonPoints };
    }, [history, wasteTypes]);

    if (!isInitialized || loading || !user) {
        return (
            <div className="min-h-full px-2 sm:px-6 lg:px-8 py-4 md:py-2 lg:py-6 font-sans flex flex-col relative z-0 animate-pulse">
                <div className="fixed inset-0 -z-10 bg-cover bg-center md:bg-fixed" style={{ backgroundImage: "url('/images/bg-white.jpg')" }}></div>
                <div className="bg-white/30 backdrop-blur-md p-2 sm:p-4 lg:p-8 rounded-3xl lg:rounded-[3rem] shadow-2xl max-w-[1500px] mx-auto w-full border border-white/50 flex-1 flex flex-col relative overflow-visible">
                    <div className="max-w-[1440px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-stretch flex-1 relative z-10 lg:h-[550px] xl:h-[600px]">
                        <div className="absolute inset-0 rounded-2xl lg:rounded-[2.5rem] -z-10 shadow-xl border border-white/20 bg-gray-200 shadow-inner"></div>
                        
                        {/* LEFT COLUMN SKELETON */}
                        <div className="lg:col-span-7 bg-white/60 backdrop-blur-md rounded-2xl lg:rounded-[2rem] p-3 sm:p-6 space-y-3 md:space-y-5 flex flex-col justify-between relative z-20">
                            {/* Top Banner Skeleton */}
                            <div className="bg-gray-300 shadow-inner rounded-2xl lg:rounded-[2rem] p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4">
                                <div className="flex items-center space-x-3 sm:space-x-4">
                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-200 shadow-inner rounded-xl md:rounded-2xl"></div>
                                    <div className="w-32 md:w-48 h-8 bg-gray-200 shadow-inner rounded-lg"></div>
                                </div>
                                <div className="bg-white rounded-xl md:rounded-[1.4rem] px-3 py-2 md:px-5 md:py-3 w-full sm:w-40 h-20 shadow-inner"></div>
                            </div>
                            
                            {/* Tabs Skeleton */}
                            <div className="flex space-x-2 bg-gray-300 shadow-inner p-1.5 md:p-2 rounded-2xl">
                                <div className="flex-1 h-10 bg-gray-200 shadow-inner rounded-xl"></div>
                                <div className="flex-1 h-10 bg-gray-200 shadow-inner rounded-xl"></div>
                            </div>

                            {/* 4 Cards Skeleton */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 flex-1">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-inner border border-gray-100 flex flex-col justify-between">
                                        <div className="w-24 h-5 bg-gray-200 shadow-inner rounded mb-4 mx-auto"></div>
                                        <div className="flex justify-between items-end mt-auto">
                                            <div className="w-20 h-10 bg-gray-200 shadow-inner rounded"></div>
                                            <div className="w-24 h-4 bg-gray-200 shadow-inner rounded"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* RIGHT COLUMN SKELETON */}
                        <div className="lg:col-span-5 bg-white/80 backdrop-blur-md rounded-2xl lg:rounded-[2rem] p-3 sm:p-5 flex flex-col relative z-20 overflow-hidden shadow-inner border border-white/50">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-32 h-6 bg-gray-200 shadow-inner rounded"></div>
                                <div className="w-8 h-8 bg-gray-200 shadow-inner rounded-full"></div>
                            </div>
                            <div className="space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="h-14 bg-gray-200 shadow-inner rounded-xl"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const initialLetter = (user.username || user.firstName || user.email || 'U').charAt(0).toUpperCase();
    const displayName = user.username || (user.firstName ? `${user.title || ''}${user.firstName}` : user.email || 'Username');

    return (
        <div className="min-h-full px-2 sm:px-6 lg:px-8 py-4 md:py-2 lg:py-6 font-sans flex flex-col relative z-0">
            <div className="fixed inset-0 -z-10 bg-cover bg-center md:bg-fixed" style={{ backgroundImage: "url('/images/bg-white.jpg')" }}></div>
            <div className="bg-white/30 backdrop-blur-md p-2 sm:p-4 lg:p-8 rounded-3xl lg:rounded-[3rem] shadow-2xl max-w-[1500px] mx-auto w-full border border-white/50 flex-1 flex flex-col relative overflow-visible">
                <div className="max-w-[1440px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-stretch flex-1 relative z-10 lg:h-[550px] xl:h-[600px]">
                    {/* Unified Background for both columns */}
                    <div className={`absolute inset-0 rounded-2xl lg:rounded-[2.5rem] -z-10 shadow-xl border border-white/20 transition-colors duration-300 ${activeTab === 'recycle' ? 'bg-[#64964E]' : 'bg-[#5BA1C2]'}`}></div>

                    {/* ─── LEFT COLUMN: WHITE CONTAINER ─── */}
                    <div className="lg:col-span-7 bg-white/60 backdrop-blur-md rounded-2xl lg:rounded-[2rem] p-3 sm:p-6 space-y-3 md:space-y-5 flex flex-col justify-between relative z-20">

                        {/* Top Green Banner (User Profile & Points) */}
                        <div className="bg-[#64964E] rounded-2xl lg:rounded-[2rem] p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4 shadow-md">
                            {/* User Profile Badge (Dark Left Box) */}
                            <div className="text-white p-2 sm:p-3.5 flex items-center space-x-3 sm:space-x-4 min-w-[200px] ">
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-black text-white font-black text-4xl md:text-6xl rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow">
                                    {initialLetter}
                                </div>
                                <div className="min-w-0 pr-2">
                                    <h2 className="font-extrabold text-white text-xl md:text-4xl tracking-tight truncate">
                                        {displayName}
                                    </h2>
                                </div>
                            </div>

                            {/* Total Points Badge (White Right Box) */}
                            <div className="bg-white text-[#64964E] rounded-xl md:rounded-[1.4rem] px-3 py-2 md:px-5 md:py-3 flex flex-col items-center justify-center text-center shadow-md border-2 border-white w-full sm:w-auto min-w-[200px]">
                                <span className="text-[#64964E] font-extrabold text-sm sm:text-base">คะแนนทั้งหมด</span>
                                <div className="flex items-baseline space-x-1.5 mt-0.5">
                                    <span className="text-2xl md:text-4xl font-black text-gray-900">{user.points || 0}</span>
                                    <span className="text-sm md:text-xl font-bold text-[#64964E]">Point</span>
                                </div>
                                <span className="text-[10px] md:text-[11px] text-gray-500 font-semibold mt-0.5">
                                    จากทั้งหมด {history.length} รอบการทำงาน
                                </span>
                            </div>
                        </div>

                        {/* Mode Tabs & 4 Stat Cards */}
                        <div className="space-y-0 flex flex-col justify-start mt-4">
                            {/* Tab Switcher */}
                            <div className="flex items-end space-x-1 md:space-x-2 relative z-10 px-1 md:px-1">
                                {/* Tab 1: การรีไซเคิล */}
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('recycle')}
                                    className={`flex-1 py-2 md:py-3 px-2 sm:px-6 rounded-t-xl md:rounded-t-2xl text-center font-bold text-sm sm:text-lg transition shadow-sm ${activeTab === 'recycle'
                                        ? 'bg-[#64964E] text-white z-20'
                                        : 'bg-[#D7F5D2] hover:bg-[#b5e6ae] text-gray-900 z-10'
                                        }`}
                                >
                                    การรีไซเคิล
                                </button>

                                {/* Tab 2: การแลกรางวัล */}
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('redeem')}
                                    className={`flex-1 py-2 md:py-3 px-2 sm:px-6 rounded-t-xl md:rounded-t-2xl text-center font-bold text-sm sm:text-lg transition shadow-sm ${activeTab === 'redeem'
                                        ? 'bg-[#5BA1C2] text-white z-20'
                                        : 'bg-[#E0F2FE] hover:bg-[#BAE6FD] text-gray-900 z-10'
                                        }`}
                                >
                                    การแลกรางวัล
                                </button>
                            </div>

                            {/* 4 Stat Cards Container */}
                            <div className="pt-4">
                                {activeTab === 'recycle' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-3.5">
                                        <div className="bg-white border-2 border-[#64964E] rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm min-h-[90px] sm:min-h-[130px]">
                                            <h4 className="text-gray-900 font-extrabold text-sm sm:text-lg text-center">แลกทั้งหมด</h4>
                                            <div className="flex items-baseline justify-between mt-2">
                                                <span className="text-2xl sm:text-4xl font-black text-[#64964E]">
                                                    {totalRecycleItems} <span className="text-xs sm:text-sm font-bold">ชิ้น</span>
                                                </span>
                                                <span className="text-[#64964E] font-bold text-xs sm:text-base">
                                                    +{Number(totalRecyclePoints).toFixed(2).replace(/\.00$/, '')} แต้ม
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-white border-2 border-[#64964E] rounded-xl sm:rounded-2xl sm:rounded-tr-[2rem] p-3 sm:p-4 flex flex-col justify-between shadow-sm min-h-[90px] sm:min-h-[130px]">
                                            <h4 className="text-gray-900 font-extrabold text-sm sm:text-lg text-center">ขวดพลาสติก</h4>
                                            <div className="flex items-baseline justify-between mt-2">
                                                <span className="text-2xl sm:text-4xl font-black text-[#64964E]">
                                                    {wasteStats.bottleCount} <span className="text-xs sm:text-sm font-bold">ชิ้น</span>
                                                </span>
                                                <span className="text-[#64964E] font-bold text-xs sm:text-base">
                                                    +{Number(wasteStats.bottlePoints).toFixed(2).replace(/\.00$/, '')} แต้ม
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-white border-2 border-[#64964E] rounded-xl sm:rounded-2xl sm:rounded-bl-[2rem] p-3 sm:p-4 flex flex-col justify-between shadow-sm min-h-[90px] sm:min-h-[130px]">
                                            <h4 className="text-gray-900 font-extrabold text-sm sm:text-lg text-center">กระป๋องอลูมิเนียม</h4>
                                            <div className="flex items-baseline justify-between mt-2">
                                                <span className="text-2xl sm:text-4xl font-black text-[#64964E]">
                                                    {wasteStats.canCount} <span className="text-xs sm:text-sm font-bold">ชิ้น</span>
                                                </span>
                                                <span className="text-[#64964E] font-bold text-xs sm:text-base">
                                                    +{Number(wasteStats.canPoints).toFixed(2).replace(/\.00$/, '')} แต้ม
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-white border-2 border-[#64964E] rounded-xl sm:rounded-2xl sm:rounded-br-[2rem] p-3 sm:p-4 flex flex-col justify-between shadow-sm min-h-[90px] sm:min-h-[130px]">
                                            <h4 className="text-gray-900 font-extrabold text-sm sm:text-lg text-center">กล่องเครื่องดื่ม</h4>
                                            <div className="flex items-baseline justify-between mt-2">
                                                <span className="text-2xl sm:text-4xl font-black text-[#64964E]">
                                                    {wasteStats.cartonCount} <span className="text-xs sm:text-sm font-bold">ชิ้น</span>
                                                </span>
                                                <span className="text-[#64964E] font-bold text-xs sm:text-base">
                                                    +{Number(wasteStats.cartonPoints).toFixed(2).replace(/\.00$/, '')} แต้ม
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-3.5">
                                        <div className="bg-white border-2 border-[#5BA1C2] rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm min-h-[90px] sm:min-h-[130px]">
                                            <h4 className="text-gray-900 font-extrabold text-sm sm:text-lg text-center">แลกทั้งหมด</h4>
                                            <div className="flex items-baseline justify-between mt-2">
                                                <span className="text-2xl sm:text-4xl font-black text-gray-900">
                                                    {redemptions.length} <span className="text-xs sm:text-sm font-bold">รายการ</span>
                                                </span>
                                                <span className="text-[#5BA1C2] font-bold text-xs sm:text-base">
                                                    -{totalRedeemPoints} แต้ม
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-white border-2 border-[#5BA1C2] rounded-xl sm:rounded-2xl sm:rounded-tr-[2rem] p-3 sm:p-4 flex flex-col justify-between shadow-sm min-h-[90px] sm:min-h-[130px]">
                                            <h4 className="text-gray-900 font-extrabold text-sm sm:text-lg text-center">สินค้า</h4>
                                            <div className="flex items-baseline justify-between mt-2">
                                                <span className="text-2xl sm:text-4xl font-black text-gray-900">
                                                    {redemptions.filter(r => r.rewardType === 'PRODUCT' || r.type === 'GOODS' || r.rewardType === 'OTHER').length} <span className="text-xs sm:text-sm font-bold">รายการ</span>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-white border-2 border-[#5BA1C2] rounded-xl sm:rounded-2xl sm:rounded-bl-[2rem] p-3 sm:p-4 flex flex-col justify-between shadow-sm min-h-[90px] sm:min-h-[130px]">
                                            <h4 className="text-gray-900 font-extrabold text-sm sm:text-lg text-center">ส่วนลด</h4>
                                            <div className="flex items-baseline justify-between mt-2">
                                                <span className="text-2xl sm:text-4xl font-black text-gray-900">
                                                    {redemptions.filter(r => r.rewardType === 'DISCOUNT' || r.type === 'COUPON').length} <span className="text-xs sm:text-sm font-bold">รายการ</span>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-white border-2 border-[#5BA1C2] rounded-xl sm:rounded-2xl sm:rounded-br-[2rem] p-3 sm:p-4 flex flex-col justify-between shadow-sm min-h-[90px] sm:min-h-[130px]">
                                            <h4 className="text-gray-900 font-extrabold text-sm sm:text-lg text-center">หมวดหมู่สำหรับนักศึกษา</h4>
                                            <div className="flex items-baseline justify-between mt-2">
                                                <span className="text-2xl sm:text-4xl font-black text-gray-900">
                                                    {redemptions.filter(r => r.rewardType === 'ACTIVITY' || r.rewardType === 'VOLUNTEER' || r.type === 'VOUCHER').length} <span className="text-xs sm:text-sm font-bold">รายการ</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ─── RIGHT COLUMN ─── */}
                    <div className={`lg:col-span-5 relative z-10 lg:-ml-[80px]`}>
                        {/* Wrapper for absolute positioning on desktop to prevent grid stretching */}
                        <div className="lg:absolute lg:inset-0 text-gray-900 rounded-2xl lg:rounded-[2rem] lg:rounded-l-none pt-4 lg:p-6 lg:pl-[88px] flex flex-col h-[600px] lg:h-full w-full">
                            <div className="bg-white/70 backdrop-blur-md rounded-2xl lg:rounded-[2rem] overflow-hidden shadow-md border-2 border-white/40 flex flex-col flex-1 min-h-0 h-full relative z-20">
                            <div className={`px-4 py-3.5 text-center border-b border-white/30 transition-colors duration-300 shrink-0 ${activeTab === 'recycle'
                                ? 'bg-[#D7F5D2]/80 text-[#243d1b]'
                                : 'bg-[#BAE6FD]/80 text-[#5BA1C2]'
                                }`}>
                                <h3 className="font-black text-xl sm:text-2xl tracking-tight">
                                    {activeTab === 'recycle' ? 'ประวัติการรีไซเคิล' : 'ประวัติการแลกรางวัล'}
                                </h3>
                            </div>

                            <div className="p-3.5 sm:p-4 flex-1 space-y-3 pb-8 md:pb-4 overflow-y-auto min-h-0" style={{ scrollbarWidth: 'thin' }}>
                                {loading ? (
                                    <div className="py-12 flex flex-col items-center justify-center space-y-2">
                                        <svg className="animate-spin w-8 h-8 text-[#64964E]" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                        <span className="text-gray-400 text-xs font-semibold">กำลังโหลดข้อมูล...</span>
                                    </div>
                                ) : (activeTab === 'recycle' ? history.length === 0 : redemptions.length === 0) ? (
                                    <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
                                        <p className="text-gray-500 font-bold text-sm">ยังไม่มีรายการประวัติ</p>
                                    </div>
                                ) : activeTab === 'recycle' ? (
                                    history.map((session, idx) => {
                                        const sessionId = session.id || `session-${idx}`;
                                        const { dateStr, timeStr } = getSessionDateTime(session);
                                        const isExpanded = !!expandedSessions[sessionId];
                                        const sessionTotal = session.pointsEarned || session.totalScore || (session.items ? session.items.reduce((acc: number, item: any) => acc + (item.points || item.score || 0), 0) : 0);

                                        return (
                                            <div key={sessionId} className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50">
                                                <div
                                                    onClick={() => toggleSession(sessionId)}
                                                    className="flex justify-between items-center p-3 bg-white cursor-pointer hover:bg-gray-50 transition"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-800 text-sm">รายการวันที่ {dateStr} <span className="text-gray-500 font-medium ml-1">เวลา {timeStr}</span></span>
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        <span className="text-green-600 font-black text-sm">+{Number(sessionTotal).toFixed(2).replace(/\.00$/, '')} P</span>
                                                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                {isExpanded && session.items && (
                                                    <div className="p-3 bg-gray-50/50 space-y-2 border-t border-gray-100">
                                                        {(() => {
                                                            const groupedItems: Record<string, { count: number, points: number }> = {};
                                                            session.items.forEach((item: any) => {
                                                                const w = wasteTypes.find((wt: any) => wt.id === item.wasteTypeId);
                                                                let name = w ? w.name : (item.wasteType || item.type);
                                                                
                                                                const thMapping: Record<string, string> = {
                                                                    'PLASTIC_BOTTLE': 'ขวดพลาสติก',
                                                                    'ALUMINUM_CAN': 'กระป๋องอลูมิเนียม',
                                                                    'BEVERAGE_CARTON': 'กล่องเครื่องดื่ม'
                                                                };
                                                                if (name && thMapping[name.toUpperCase()]) {
                                                                    name = thMapping[name.toUpperCase()];
                                                                }
                                                                if (!name) name = 'อื่นๆ';

                                                                const pts = Number(item.points || item.score || 0);
                                                                if (!groupedItems[name]) {
                                                                    groupedItems[name] = { count: 0, points: 0 };
                                                                }
                                                                groupedItems[name].count += 1;
                                                                groupedItems[name].points += pts;
                                                            });

                                                            return Object.entries(groupedItems).map(([name, data], iIndex) => (
                                                                <div key={iIndex} className="flex justify-between items-center text-xs">
                                                                    <span className="text-gray-600 font-medium w-1/3">{name}</span>
                                                                    <span className="text-gray-500 w-1/3 text-center">{data.count.toLocaleString()} ชิ้น</span>
                                                                    <span className="text-green-600 font-bold w-1/3 text-right">รวม {data.points.toFixed(2).replace(/\.00$/, '')} P</span>
                                                                </div>
                                                            ));
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    groupedRedemptions.map((txGroup: any[], groupIdx: number) => {
                                        const firstTx = txGroup[0];
                                        const count = txGroup.length;
                                        const sessionKey = new Date(firstTx.timestamp).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                                        const rewardName = firstTx.rewardName || firstTx.details || 'แลกรางวัล';
                                        const totalPoints = txGroup.reduce((sum: number, tx: any) => sum + (tx.pointsUsed || tx.cost || 0), 0);
                                        const groupId = `redemption_group_${groupIdx}`;
                                        const isExpanded = !!expandedDates[groupId];
                                        return (
                                            <div key={groupId} className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50">
                                                <div
                                                    onClick={() => toggleDate(groupId)}
                                                    className="flex justify-between items-center p-3 bg-white cursor-pointer hover:bg-gray-50 transition"
                                                >
                                                    <div className="flex flex-col flex-1 pr-4">
                                                        <span className="font-bold text-gray-800 text-sm">{rewardName} <span className="text-blue-600 ml-1">x{count}</span></span>
                                                        <span className="text-gray-400 text-xs mt-0.5">รายการวันที่ {sessionKey}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-red-500 font-bold text-sm whitespace-nowrap">-{totalPoints} P</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                downloadGroupReceipt(txGroup);
                                                            }}
                                                            className="p-1.5 bg-[#5BA1C2] text-white rounded-md hover:bg-[#4a85a0] transition-colors flex items-center justify-center shrink-0 shadow-sm"
                                                            title="ดาวน์โหลดใบเสร็จ PDF รวม"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                        </button>
                                                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                {isExpanded && (
                                                    <div className="p-3 bg-gray-50/50 space-y-2 border-t border-gray-100">
                                                        {txGroup.map((tx: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-gray-100">
                                                                    <div className="flex flex-col w-2/3">
                                                                        <span className="text-gray-700 font-medium">รหัส: {tx.referenceCode || tx.id}</span>
                                                                        <span className="text-gray-400 mt-0.5">เวลา {new Date(tx.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                                                        {tx.status === 'REJECTED' && (
                                                                            <span className="text-red-500 mt-1 text-[10px] font-bold">
                                                                                ไม่อนุมัติ: {tx.rejectReason || 'ถูกปฏิเสธโดยร้านค้า'}
                                                                            </span>
                                                                        )}
                                                                        {tx.status === 'APPROVED' && (
                                                                            <span className="text-emerald-500 mt-1 text-[10px] font-bold">อนุมัติแล้ว</span>
                                                                        )}
                                                                        {tx.status === 'PENDING' && (
                                                                            <span className="text-orange-500 mt-1 text-[10px] font-bold">รอตรวจสอบ</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-3 w-1/3 justify-end">
                                                                        <span className="text-gray-600 font-bold text-right">
                                                                            {tx.status === 'REJECTED' ? <span className="text-gray-400 line-through">-{tx.pointsUsed || tx.cost || 0} P</span> : `-${tx.pointsUsed || tx.cost || 0} P`}
                                                                        </span>
                                                                    </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
}

