"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';

export default function AdminPage() {
    const router = useRouter();
    const { user, token, isInitialized, apiBase } = useSmartBin();
    const [summary, setSummary] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [devices, setDevices] = useState<any[]>([]);
    const [pendingRedemptions, setPendingRedemptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [partners, setPartners] = useState<any[]>([]);
    const [selectedUserForPartnerRole, setSelectedUserForPartnerRole] = useState<any | null>(null);
    const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");

    const fetchData = async () => {
        if (!token) return;

        try {
            const headers = { 'Authorization': `Bearer ${token}` };

            const [summaryRes, usersRes, alertsRes, redemptionsRes, devicesRes, partnersRes] = await Promise.all([
                fetch(`${apiBase}/admin/summary`, { headers }),
                fetch(`${apiBase}/admin/users`, { headers }),
                fetch(`${apiBase}/admin/alerts`, { headers }),
                fetch(`${apiBase}/admin/redemptions/pending`, { headers }),
                fetch(`${apiBase}/admin/devices`, { headers }),
                fetch(`${apiBase}/admin/partners`, { headers })
            ]);

            if (summaryRes.ok && usersRes.ok) {
                setSummary(await summaryRes.json());
                setUsers(await usersRes.json());
                if (alertsRes.ok) setAlerts(await alertsRes.json());
                if (redemptionsRes.ok) setPendingRedemptions(await redemptionsRes.json());
                if (devicesRes.ok) setDevices(await devicesRes.json());
                if (partnersRes && partnersRes.ok) setPartners(await partnersRes.json());
            } else {
                if (summaryRes.status === 403 || summaryRes.status === 401) {
                    setError("Access Denied: คุณไม่มีสิทธิ์เข้าถึงหน้าผู้ดูแลระบบ");
                }
            }
        } catch (e) {
            console.error("Failed to fetch admin data", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้? การกระทำนี้ไม่สามารถย้อนกลับได้")) return;
        if (!token) return;

        try {
            const res = await fetch(`${apiBase}/admin/user/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert("ลบผู้ใช้สำเร็จ");
                fetchData(); // Refresh list
            } else {
                alert("ไม่สามารถลบผู้ใช้ได้");
            }
        } catch (e) {
            console.error("Delete failed", e);
        }
    };

    const handleChangeRole = async (userId: string, newRole: string) => {
        if (newRole === 'PARTNER') {
            const u = users.find(x => x.id === userId);
            setSelectedUserForPartnerRole(u);
            setSelectedPartnerId(u?.partnerId || "");
            return;
        }

        if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการเปลี่ยนสิทธิ์ผู้ใช้นี้เป็น ${newRole}?`)) return;
        if (!token) return;

        try {
            const res = await fetch(`${apiBase}/admin/user/${userId}/role`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: newRole })
            });

            if (res.ok) {
                alert(`เปลี่ยนสิทธิ์เป็น ${newRole} สำเร็จ`);
                fetchData(); // Refresh list
            } else {
                alert("ไม่สามารถเปลี่ยนสิทธิ์ผู้ใช้ได้");
            }
        } catch (e) {
            console.error("Change role failed", e);
        }
    };

    const handleSavePartnerRole = async () => {
        if (!selectedUserForPartnerRole || !token) return;
        try {
            const res = await fetch(`${apiBase}/admin/user/${selectedUserForPartnerRole.id}/role`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: 'PARTNER', partnerId: selectedPartnerId })
            });

            if (res.ok) {
                alert(`เปลี่ยนสิทธิ์เป็น PARTNER สำเร็จ`);
                setSelectedUserForPartnerRole(null);
                fetchData(); // Refresh list
            } else {
                alert("ไม่สามารถเปลี่ยนสิทธิ์ผู้ใช้ได้");
            }
        } catch (e) {
            console.error("Change role failed", e);
        }
    };

    const handleApproveRedemption = async (redemptionId: string) => {
        if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการอนุมัติการแลกคะแนนนี้?")) return;
        if (!token) return;

        try {
            const res = await fetch(`${apiBase}/admin/redemptions/${redemptionId}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert("อนุมัติสำเร็จ!");
                fetchData(); // Refresh lists
            } else {
                alert("ไม่สามารถอนุมัติได้");
            }
        } catch (e) {
            console.error("Approve failed", e);
        }
    };

    const handleRejectRedemption = async (redemptionId: string) => {
        if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการปฏิเสธการแลกคะแนนนี้? (คะแนนจะถูกคืนให้ผู้ใช้)")) return;
        if (!token) return;

        try {
            const res = await fetch(`${apiBase}/admin/redemptions/${redemptionId}/reject`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert("ปฏิเสธการแลกคะแนนสำเร็จ ระบบได้คืนคะแนนให้ผู้ใช้แล้ว");
                fetchData(); // Refresh lists
            } else {
                alert("ไม่สามารถปฏิเสธได้");
            }
        } catch (e) {
            console.error("Reject failed", e);
        }
    };

    const handleResetSystem = async () => {
        if (!confirm("⚠️ คำเตือน: คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตข้อมูลระบบและแต้มทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้!")) return;
        
        try {
            const res = await fetch(`${apiBase}/admin/reset`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert("รีเซ็ตระบบสำเร็จ!");
                fetchData(); // Refresh list
            } else {
                alert("ไม่สามารถรีเซ็ตระบบได้");
            }
        } catch (e) {
            console.error("Reset failed", e);
            alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
        }
    };

    useEffect(() => {
        if (!isInitialized) return;
        
        if (!user || user.role !== 'ADMIN') {
            setError("Access Denied. คุณไม่ใช่ผู้ดูแลระบบ");
            setLoading(false);
            return;
        }

        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [user, token, isInitialized]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 font-sans pb-10 animate-pulse">
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 px-6 pt-8 pb-14 relative overflow-hidden">
                    <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between space-y-4 md:space-y-0">
                        <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-slate-600 rounded-xl"></div>
                                <div className="h-4 bg-slate-600 rounded w-40"></div>
                            </div>
                            <div className="h-8 bg-slate-600 rounded w-64"></div>
                        </div>
                        <div className="flex space-x-3">
                            <div className="w-32 h-11 bg-slate-600 rounded-xl"></div>
                            <div className="w-32 h-11 bg-slate-600 rounded-xl"></div>
                        </div>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto px-4 -mt-8 relative z-10 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white rounded-2xl shadow-lg p-5 border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
                                    <div className="w-10 h-10 bg-slate-100 rounded-full"></div>
                                </div>
                                <div className="h-6 bg-slate-200 rounded w-20 mb-2"></div>
                                <div className="h-4 bg-slate-100 rounded w-32"></div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6">
                        <div className="h-6 bg-slate-200 rounded w-48 mb-6"></div>
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-slate-100 rounded-2xl"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
                <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">⛔</span>
                    </div>
                    <h1 className="text-xl font-bold text-gray-800 mb-2">ปฏิเสธการเข้าถึง</h1>
                    <p className="text-gray-500 text-sm mb-6">{error}</p>
                    <button onClick={() => router.push('/')} className="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl hover:bg-slate-900 transition active:scale-95">
                        กลับสู่หน้าหลัก
                    </button>
                </div>
            </div>
        );
    }

    // Helper to get user's full name by ID
    const getUserData = (userId: string) => {
        return users.find(u => u.id === userId) || {};
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            {/* Admin Header */}
            <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white px-6 pt-8 pb-14 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl -ml-10 -mb-10" />
                
                <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between space-y-4 md:space-y-0">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-400/30">
                                <span className="text-xl">🛡️</span>
                            </div>
                            <span className="text-blue-300 font-bold tracking-wider text-sm uppercase">Admin Control Panel</span>
                        </div>
                        <h1 className="text-3xl font-black text-white">ระบบจัดการ <span className="text-blue-400">SBAY</span></h1>
                    </div>
                    <div className="flex space-x-3">
                        <button onClick={() => router.push('/admin/partners')} className="flex items-center space-x-2 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/40 text-violet-300 font-bold px-4 py-2.5 rounded-xl transition backdrop-blur-sm">
                            <span>🏪</span><span>ร้านพาร์ทเนอร์</span>
                        </button>
                        <button onClick={handleResetSystem} className="flex items-center space-x-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold px-4 py-2.5 rounded-xl transition backdrop-blur-sm">
                            <span>⚠️</span><span>รีเซ็ตระบบ</span>
                        </button>
                        <button onClick={() => router.push('/')} className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold px-4 py-2.5 rounded-xl transition backdrop-blur-sm">
                            <span>🏠</span><span>หน้าหลัก</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 -mt-8 relative z-10 space-y-6">
                
                {/* Stats Cards */}
                {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 flex flex-col">
                            <div className="text-slate-500 text-xs font-semibold mb-1 uppercase">ผู้ใช้งานทั้งหมด</div>
                            <div className="text-3xl font-black text-slate-800">{summary.totalUsers}</div>
                        </div>
                        <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 flex flex-col">
                            <div className="text-slate-500 text-xs font-semibold mb-1 uppercase">แต้มสะสมในระบบ</div>
                            <div className="text-3xl font-black text-blue-600">{summary.totalPoints}</div>
                        </div>
                        <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 flex flex-col">
                            <div className="text-slate-500 text-xs font-semibold mb-1 uppercase">ชั่วโมงจิตอาสา</div>
                            <div className="text-3xl font-black text-indigo-600">{summary.totalVolunteerHours}</div>
                        </div>
                        <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 flex flex-col">
                            <div className="text-slate-500 text-xs font-semibold mb-1 uppercase">หน่วยกิตกิจกรรม</div>
                            <div className="text-3xl font-black text-purple-600">{summary.totalActivityCredits}</div>
                        </div>
                    </div>
                )}

                {/* Bin Status Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col mt-8">
                    <div className="px-5 py-4 border-b border-blue-100 bg-blue-50/50 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <span className="text-lg">🗑️</span>
                            <h2 className="font-bold text-blue-800">สถานะตู้ขยะอัจฉริยะ (Smart Bins)</h2>
                        </div>
                        <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                            {devices.length} ตู้
                        </span>
                    </div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {devices.map(device => (
                            <div key={device.id} className={`rounded-xl border p-4 ${device.isFull ? 'border-red-300 bg-red-50/30' : 'border-slate-200 bg-white'} relative overflow-hidden`}>
                                {device.isFull && (
                                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                        เต็มแล้ว: {device.fullWasteType || 'ไม่ทราบประเภท'}
                                    </div>
                                )}
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="font-bold text-slate-800">{device.name || 'Unknown Device'}</div>
                                        <div className="text-xs text-slate-500">{device.location || 'Unknown Location'}</div>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-[10px] font-bold ${device.status === 'ONLINE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {device.status}
                                    </div>
                                </div>
                                
                                <div className="space-y-3 mt-4">
                                    {device.maxCapacities && Object.keys(device.maxCapacities).map(type => {
                                        const max = device.maxCapacities[type] || 100;
                                        const current = (device.wasteLevels && device.wasteLevels[type]) || 0;
                                        const percentage = Math.min(100, Math.max(0, (current / max) * 100));
                                        
                                        let barColor = "bg-blue-500";
                                        if (percentage > 80) barColor = "bg-red-500";
                                        else if (percentage > 50) barColor = "bg-orange-400";

                                        return (
                                            <div key={type}>
                                                <div className="flex justify-between text-[10px] font-bold mb-1">
                                                    <span className="text-slate-600">
                                                        {{
                                                            "CLEAR_BOTTLE": "ขวดพลาสติกใส",
                                                            "OPAQUE_BOTTLE": "ขวดพลาสติกขุ่น",
                                                            "GLASSES_BOTTLE": "ขวดแก้ว",
                                                            "STEEL_CAN": "กระป๋องเหล็ก",
                                                            "ALUMINUM_CAN": "กระป๋องอลูมิเนียม"
                                                        }[type] || type}
                                                    </span>
                                                    <span className="text-slate-500">{current.toFixed(1)} / {max.toFixed(1)}</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                    <div className={`${barColor} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {(!device.maxCapacities || Object.keys(device.maxCapacities).length === 0) && (
                                        <div className="text-xs text-slate-400 text-center py-2">ไม่มีข้อมูลความจุขยะ</div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {devices.length === 0 && (
                            <div className="col-span-full py-8 text-center text-slate-400 font-medium">
                                ไม่พบตู้ในระบบ
                            </div>
                        )}
                    </div>
                </div>



                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                    {/* Left Column: Waste Stats & Alerts */}
                    <div className="space-y-6">
                        {/* Waste Stats */}
                        {summary && summary.wasteStats && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50">
                                    <h2 className="font-bold text-slate-800">สถิติแยกตามประเภทขยะ</h2>
                                </div>
                                <div className="p-5 grid grid-cols-2 gap-3">
                                    {Object.entries(summary.wasteStats).map(([key, value]) => (
                                        <div key={key} className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col items-center text-center">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                                                {{
                                                    "CLEAR_BOTTLE": "ขวดพลาสติกใส",
                                                    "OPAQUE_BOTTLE": "ขวดพลาสติกขุ่น",
                                                    "GLASSES_BOTTLE": "ขวดแก้ว",
                                                    "STEEL_CAN": "กระป๋องเหล็ก",
                                                    "ALUMINUM_CAN": "กระป๋องอลูมิเนียม"
                                                }[key] || key.replace('_', ' ')}
                                            </div>
                                            <div className="text-xl font-black text-slate-700">{String(value)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* System Alerts */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[400px]">
                            <div className="px-5 py-4 border-b border-red-100 bg-red-50 flex items-center space-x-2">
                                <span className="text-lg">🚨</span>
                                <h2 className="font-bold text-red-700">การแจ้งเตือนระบบ (Alerts)</h2>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {alerts.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center">
                                        <span className="text-3xl mb-2">✅</span>
                                        <p className="text-slate-400 font-medium text-sm">ระบบทำงานปกติ ไม่มีแจ้งเตือน</p>
                                    </div>
                                ) : (
                                    alerts.map((alert: any) => (
                                        <div key={alert.id} className="bg-red-50/50 p-3 rounded-xl border border-red-100/50">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-red-700 text-xs px-2 py-0.5 bg-red-100 rounded-md">
                                                    {alert.type}
                                                </span>
                                                <span className="text-slate-400 text-[10px]">
                                                    {new Date(alert.timestamp).toLocaleTimeString('th-TH')}
                                                </span>
                                            </div>
                                            <p className="text-slate-700 text-sm font-medium leading-snug">{alert.message}</p>
                                            <p className="text-[10px] text-slate-500 mt-1.5">Machine: <span className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">{alert.machineId}</span></p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: User Table */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
                            <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                                <h2 className="font-bold text-slate-800">จัดการรายชื่อผู้ใช้ & สิทธิ์</h2>
                                <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                                    {users.length} คน
                                </span>
                            </div>
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0 border-b border-slate-100">
                                        <tr>
                                            <th className="px-5 py-3">ข้อมูลผู้ใช้</th>
                                            <th className="px-5 py-3 text-right">แต้มสะสม</th>
                                            <th className="px-5 py-3 text-center">สิทธิ์ (Role)</th>
                                            <th className="px-5 py-3 text-right">การจัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {users.map((u: any) => (
                                            <tr key={u.id} className="hover:bg-slate-50/80 transition group">
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                                                            {u.username?.charAt(0).toUpperCase() || u.firstName?.charAt(0) || '?'}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-700">
                                                                {u.username || `${u.title || ''} ${u.firstName || ''} ${u.lastName || ''}`.trim() || 'ไม่มีชื่อ'}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                                                <span>{u.phoneNumber}</span>
                                                                {u.email && <span className="opacity-60">• {u.email}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <span className="font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                                        {u.points}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    <select 
                                                        value={u.role || 'USER'}
                                                        onChange={(e) => handleChangeRole(u.id, e.target.value)}
                                                        className={`text-xs font-bold px-2 py-1 rounded-lg outline-none cursor-pointer border ${u.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : u.role === 'PARTNER' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                                                    >
                                                        <option value="USER">USER</option>
                                                        <option value="ADMIN">ADMIN</option>
                                                        <option value="PARTNER">PARTNER</option>
                                                    </select>
                                                    {u.role === 'PARTNER' && (() => {
                                                        const p = partners.find(x => x.id === u.partnerId);
                                                        return p ? (
                                                            <div className="text-[9px] text-violet-600 mt-1 font-semibold max-w-[100px] truncate mx-auto">ร้าน: {p.name}</div>
                                                        ) : (
                                                            <div className="text-[9px] text-orange-500 mt-1 font-semibold mx-auto">ยังไม่เลือกตู้/ร้าน</div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <button
                                                        onClick={() => handleDeleteUser(u.id)}
                                                        className="text-red-500 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 px-3 py-1 rounded-lg text-xs font-bold transition opacity-50 group-hover:opacity-100"
                                                    >
                                                        ลบ
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {users.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-5 py-12 text-center">
                                                    <span className="text-3xl mb-2 block">👥</span>
                                                    <div className="text-slate-400 font-medium">ไม่พบผู้ใช้งานในระบบ</div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* === Partner Assign Modal === */}
            {selectedUserForPartnerRole && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-6 shadow-2xl z-50">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="font-black text-lg text-slate-800">กำหนดร้านค้าพาร์ทเนอร์</h2>
                                <p className="text-xs text-slate-400 mt-0.5">{selectedUserForPartnerRole.title} {selectedUserForPartnerRole.firstName} {selectedUserForPartnerRole.lastName}</p>
                            </div>
                            <button onClick={() => setSelectedUserForPartnerRole(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                <i className="fa-solid fa-times text-slate-500"></i>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-2 block font-sans">เลือกร้านพาร์ทเนอร์ที่ต้องการผูก *</label>
                                {partners.length === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-4 font-sans">ยังไม่มีร้านค้าพาร์ทเนอร์ในระบบ กรุณาเพิ่มร้านในหน้า จัดการร้านพาร์ทเนอร์ ก่อน</p>
                                ) : (
                                    <div className="space-y-2 max-h-56 overflow-y-auto">
                                        {partners.map(p => (
                                            <label key={p.id} className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition ${selectedPartnerId === p.id ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                                <input type="radio" name="partner" value={p.id} checked={selectedPartnerId === p.id} onChange={() => setSelectedPartnerId(p.id)} className="accent-violet-600" />
                                                <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center overflow-hidden shrink-0">
                                                    {p.logoUrl ? <img src={p.logoUrl} alt="" className="w-full h-full object-cover" /> : <i className="fa-solid fa-store text-violet-500 text-sm"></i>}
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                                                    <div className="text-xs text-slate-400">{p.category}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setSelectedUserForPartnerRole(null)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition">ยกเลิก</button>
                            <button onClick={handleSavePartnerRole} disabled={!selectedPartnerId} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold hover:shadow-lg transition disabled:opacity-50">
                                บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
