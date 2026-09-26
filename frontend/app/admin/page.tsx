"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';
import { getImageUrl } from '../utils/image';
import { Client } from '@stomp/stompjs';

const WASTE_COMPARTMENTS = [
    { key: 'PLASTIC_BOTTLE', label: 'ขวดพลาสติก', icon: 'fa-solid fa-bottle-water', barColor: 'from-[#64964E] to-emerald-500' },
    { key: 'ALUMINUM_CAN', label: 'กระป๋องอลูมิเนียม', icon: 'fa-solid fa-cube', barColor: 'from-[#527d40] to-[#64964E]' },
    { key: 'BEVERAGE_CARTON', label: 'กล่องเครื่องดื่ม', icon: 'fa-solid fa-box-archive', barColor: 'from-amber-500 to-amber-600' },
];

const getWasteLabel = (type?: string | null) => {
    if (!type) return '';
    switch (type.toUpperCase()) {
        case 'PLASTIC_BOTTLE': return 'ขวดพลาสติก';
        case 'ALUMINUM_CAN': return 'กระป๋องอลูมิเนียม';
        case 'BEVERAGE_CARTON': return 'กล่องเครื่องดื่ม';
        default: return type;
    }
};

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
    const [apiError, setApiError] = useState<string | null>(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [partners, setPartners] = useState<any[]>([]);
    const [selectedUserForPartnerRole, setSelectedUserForPartnerRole] = useState<any | null>(null);
    const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
    const [resettingDeviceId, setResettingDeviceId] = useState<string | null>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [auditFilter, setAuditFilter] = useState<string>("ALL");
    const [auditLoading, setAuditLoading] = useState<boolean>(false);
    const [revertingId, setRevertingId] = useState<string | null>(null);

    const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.email === 'sbay.smartcompany@gmail.com';

    const handleRevertAuditLog = async (logId: string, actionName: string) => {
        if (!confirm(`คุณต้องการคืนค่า (Rollback) รายการ "${actionName}" นี้ใช่หรือไม่?`)) return;
        if (!token) return;

        setRevertingId(logId);
        try {
            const res = await fetch(`${apiBase}/admin/audit-logs/${logId}/revert`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message || "คืนค่าข้อมูลสำเร็จ");
                await fetchData();
            } else {
                alert(data.message || data.error || "ไม่สามารถคืนค่าข้อมูลได้");
            }
        } catch (e: any) {
            alert(`เกิดข้อผิดพลาด: ${e.message}`);
        } finally {
            setRevertingId(null);
        }
    };

    const handleResetDevice = async (deviceId: string) => {
        if (!confirm(`คุณต้องการรีเซ็ตระดับขยะของตู้ ${deviceId} เป็น 0 หรือไม่?`)) return;
        if (!token) return;
        setResettingDeviceId(deviceId);
        try {
            const res = await fetch(`${apiBase}/admin/devices/${deviceId}/reset`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                await fetchData();
            } else {
                alert("ไม่สามารถรีเซ็ตตู้ได้");
            }
        } catch (e) {
            console.error("Reset device failed", e);
        } finally {
            setResettingDeviceId(null);
        }
    };

    const fetchData = async () => {
        if (!token) return;

        try {
            setApiError(null);
            const headers = { 'Authorization': `Bearer ${token}` };

            const reqs: Promise<any>[] = [
                fetch(`${apiBase}/admin/summary`, { headers }),
                fetch(`${apiBase}/admin/users`, { headers }),
                fetch(`${apiBase}/admin/alerts`, { headers }),
                fetch(`${apiBase}/admin/redemptions/pending`, { headers }),
                fetch(`${apiBase}/admin/devices`, { headers }),
                fetch(`${apiBase}/admin/partners`, { headers })
            ];
            if (isSuperAdmin) {
                reqs.push(fetch(`${apiBase}/admin/audit-logs`, { headers }));
            }

            const results = await Promise.all(reqs);
            const [summaryRes, usersRes, alertsRes, redemptionsRes, devicesRes, partnersRes] = results;
            const auditLogsRes = isSuperAdmin && results.length > 6 ? results[6] : null;

            if (summaryRes.ok && usersRes.ok) {
                setSummary(await summaryRes.json());
                setUsers(await usersRes.json());
                if (alertsRes.ok) setAlerts(await alertsRes.json());
                if (redemptionsRes.ok) setPendingRedemptions(await redemptionsRes.json());
                if (devicesRes.ok) setDevices(await devicesRes.json());
                if (partnersRes && partnersRes.ok) setPartners(await partnersRes.json());
                if (auditLogsRes && auditLogsRes.ok) setAuditLogs(await auditLogsRes.json());
            } else {
                if (summaryRes.status === 403 || summaryRes.status === 401) {
                    setError("Access Denied: คุณไม่มีสิทธิ์เข้าถึงหน้าผู้ดูแลระบบ หรือเซสชันหมดอายุ");
                } else {
                    setApiError(`ไม่สามารถดึงข้อมูลได้ (HTTP ${summaryRes.status})`);
                }
            }
        } catch (e: any) {
            console.error("Failed to fetch admin data", e);
            setApiError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ Backend ได้ กรุณาตรวจสอบสถานะการทำงานของระบบ");
        } finally {
            setLoading(false);
        }
    };

    const fetchAuditLogs = async () => {
        if (!token || !isSuperAdmin) return;
        setAuditLoading(true);
        try {
            const res = await fetch(`${apiBase}/admin/audit-logs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setAuditLogs(await res.json());
            }
        } catch (e) {
            console.error("Failed to fetch audit logs", e);
        } finally {
            setAuditLoading(false);
        }
    };

    const filteredAuditLogs = React.useMemo(() => {
        if (!auditLogs) return [];
        if (auditFilter === 'ALL') return auditLogs;
        if (auditFilter === 'REDEMPTION') {
            return auditLogs.filter(l => l.action === 'REDEMPTION_APPROVE' || l.action === 'REDEMPTION_REJECT');
        }
        return auditLogs.filter(l => l.action === auditFilter);
    }, [auditLogs, auditFilter]);

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

    useEffect(() => {
        if (!isInitialized) return;
        
        const isAdminUser = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.email === 'sbay.smartcompany@gmail.com');
        if (!isAdminUser) {
            setError("Access Denied. คุณไม่มีสิทธิ์เข้าถึงหน้าผู้ดูแลระบบ");
            setLoading(false);
            return;
        }

        fetchData();
        const interval = setInterval(fetchData, 10000);

        // STOMP WebSocket for real-time device updates
        let client: Client | null = null;
        if (typeof window !== 'undefined') {
            try {
                const hostname = window.location.hostname;
                const port = window.location.port;
                const protocol = window.location.protocol;
                const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
                let wsUrl = '';
                if (port === '3000') {
                    wsUrl = `ws://${hostname}:8070/ws-native`;
                } else {
                    const portStr = port ? `:${port}` : '';
                    wsUrl = `${wsProtocol}//${hostname}${portStr}/ws-native`;
                }

                client = new Client({
                    brokerURL: wsUrl,
                    reconnectDelay: 5000,
                    onConnect: () => {
                        setWsConnected(true);
                        setApiError(null);
                        client?.subscribe('/topic/devices', (msg) => {
                            if (msg.body) {
                                try {
                                    const update = JSON.parse(msg.body);
                                    setDevices(prev => prev.map(d => {
                                        if (d.id === update.machineId) {
                                            return {
                                                ...d,
                                                fillLevel: update.fillLevel !== undefined ? update.fillLevel : d.fillLevel,
                                                wasteLevels: update.wasteLevels !== undefined ? update.wasteLevels : d.wasteLevels,
                                                maxCapacities: update.maxCapacities !== undefined ? update.maxCapacities : d.maxCapacities,
                                                isFull: update.isFull !== undefined ? update.isFull : d.isFull,
                                                fullWasteType: update.fullWasteType !== undefined ? update.fullWasteType : d.fullWasteType,
                                                lastFillLevelUpdate: update.timestamp || d.lastFillLevelUpdate,
                                                status: update.status || 'ONLINE'
                                            };
                                        }
                                        return d;
                                    }));
                                } catch (err) {
                                    console.error('Error parsing device WS update', err);
                                }
                            }
                        });
                    },
                    onWebSocketClose: () => {
                        setWsConnected(false);
                    },
                    onStompError: (frame) => {
                        console.error('Admin WS Error:', frame.headers['message']);
                        setWsConnected(false);
                    },
                });
                client.activate();
            } catch (e) {
                console.error("Failed to initialize admin WS client", e);
            }
        }

        return () => {
            clearInterval(interval);
            if (client) {
                client.deactivate();
            }
        };
    }, [user, token, isInitialized]);

    if (loading) {
        return (
            <div className="min-h-screen font-sans pb-10 animate-pulse" style={{ backgroundImage: "url('/images/bg_loginregis.jpg')", backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
                <div className="bg-[#64964E]/80 backdrop-blur-md px-6 pt-8 pb-14 relative overflow-hidden border-b border-white/20">
                    <div className="max-w-7xl xl:max-w-[95%] mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between space-y-4 md:space-y-0">
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
                <div className="max-w-7xl xl:max-w-[95%] mx-auto px-4 -mt-8 relative z-10 space-y-6">
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
            <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundImage: "url('/images/bg_loginregis.jpg')", backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
                <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl text-red-600">
                        <i className="fa-solid fa-ban"></i>
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
        <div className="min-h-screen font-sans pb-10" style={{ backgroundImage: "url('/images/bg_loginregis.jpg')", backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
            {/* Admin Header */}
            <div className="bg-[#64964E]/85 backdrop-blur-md text-white px-6 pt-8 pb-14 relative overflow-hidden border-b border-white/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -ml-20 -mb-20" />
                
                <div className="max-w-7xl xl:max-w-[95%] mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between space-y-4 md:space-y-0">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isSuperAdmin ? 'bg-amber-500/20 border-amber-400/30 text-amber-300' : 'bg-white/20 border-white/30 text-white'}`}>
                                <i className={isSuperAdmin ? 'fa-solid fa-crown text-base' : 'fa-solid fa-shield-halved text-base'}></i>
                            </div>
                            <span className={`font-bold tracking-wider text-sm uppercase ${isSuperAdmin ? 'text-amber-300' : 'text-white/90'}`}>
                                {isSuperAdmin ? 'Super Admin Control Panel (สิทธิ์สูงสุด)' : 'Admin Control Panel'}
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-white">
                            ระบบจัดการ{isSuperAdmin ? 'สูงสุด ' : ' '}<span className={isSuperAdmin ? 'text-amber-300' : 'text-emerald-100'}>SBAY</span>
                        </h1>
                    </div>
                    <div className="flex space-x-3">
                        {isSuperAdmin && (
                            <button onClick={() => {
                                document.getElementById('audit-log-section')?.scrollIntoView({ behavior: 'smooth' });
                            }} className="flex items-center space-x-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 font-bold px-4 py-2.5 rounded-xl transition backdrop-blur-sm">
                                <i className="fa-solid fa-clock-rotate-left"></i><span>Audit Log ({auditLogs.length})</span>
                            </button>
                        )}
                        <button onClick={() => router.push('/admin/partners')} className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-4 py-2.5 rounded-xl transition backdrop-blur-sm">
                            <i className="fa-solid fa-store"></i><span>ร้านพาร์ทเนอร์</span>
                        </button>
                        <button onClick={() => router.push('/')} className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold px-4 py-2.5 rounded-xl transition backdrop-blur-sm">
                            <i className="fa-solid fa-house"></i><span>หน้าหลัก</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl xl:max-w-[95%] mx-auto px-4 -mt-8 relative z-10 space-y-6">
                
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
                            <div className="text-slate-500 text-xs font-semibold mb-1 uppercase">แต้มทั้งหมดที่แลกไปทั้งระบบ</div>
                            <div className="text-3xl font-black text-indigo-600">{summary.totalPointsRedeemed || 0}</div>
                        </div>
                        <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 flex flex-col">
                            <div className="text-slate-500 text-xs font-semibold mb-1 uppercase">แลกไปกี่ครั้ง</div>
                            <div className="text-3xl font-black text-purple-600">{summary.totalRedemptions || 0}</div>
                        </div>
                    </div>
                )}

                {/* Bin Status Section */}
                {(() => {
                    const offlineCount = devices.filter(d => d.status === 'OFFLINE').length;
                    const fullCount = devices.filter(d => d.isFull || Number(d.fillLevel) >= 95).length;
                    const onlineCount = devices.filter(d => d.status === 'ONLINE').length;
                    const problemDevices = devices.filter(d => d.status === 'OFFLINE' || d.isFull || Number(d.fillLevel) >= 95);

                    return (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col mt-8">
                            {/* Section Header */}
                            <div className="px-5 py-4 border-b border-[#64964E]/20 bg-[#64964E]/10 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#64964E]/15 text-[#527d40] flex items-center justify-center text-lg">
                                        <i className="fa-solid fa-trash-can"></i>
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-800 text-lg">สถานะตู้ขยะอัจฉริยะ (Smart Bins)</h2>
                                        <p className="text-[11px] text-slate-500">ระดับความเต็มแยกตามชนิดขยะ และการแจ้งเตือนปัญหาการทำงาน</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center flex-wrap gap-2 text-xs">
                                    {/* Real-time Connection Status Indicator */}
                                    <div className={`px-2.5 py-1 rounded-full font-bold border flex items-center space-x-1.5 shadow-2xs ${
                                        wsConnected 
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                            : 'bg-amber-50 text-amber-700 border-amber-300'
                                    }`}>
                                        <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                                        <span>{wsConnected ? 'Real-time: ออนไลน์' : 'Real-time: กำลังต่อใหม่...'}</span>
                                    </div>

                                    {/* Counter Badges */}
                                    <span className="font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                                        {devices.length} ตู้
                                    </span>
                                    {onlineCount > 0 && (
                                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 shadow-2xs flex items-center gap-1.5">
                                            <i className="fa-solid fa-circle text-emerald-500 text-[8px]"></i> ออนไลน์ {onlineCount}
                                        </span>
                                    )}
                                    {offlineCount > 0 && (
                                        <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 shadow-2xs flex items-center gap-1.5">
                                            <i className="fa-solid fa-triangle-exclamation text-amber-600 text-xs"></i> ออฟไลน์ {offlineCount}
                                        </span>
                                    )}
                                    {fullCount > 0 && (
                                        <span className="font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-md border border-red-200 shadow-2xs flex items-center gap-1.5">
                                            <i className="fa-solid fa-bell text-red-600 text-xs"></i> เต็มแล้ว {fullCount}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Alert Banners: Web or System Issues */}
                            {apiError && (
                                <div className="mx-5 mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-red-800 text-xs shadow-xs">
                                    <div className="flex items-center space-x-2.5">
                                        <i className="fa-solid fa-circle-exclamation text-base text-red-600 shrink-0"></i>
                                        <div>
                                            <span className="font-bold">ระบบเว็ปไซต์ขัดข้อง: </span>
                                            <span>{apiError}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => fetchData()} 
                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition shrink-0 ml-2"
                                    >
                                        ลองใหม่
                                    </button>
                                </div>
                            )}

                            {!wsConnected && (
                                <div className="mx-5 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-2 text-amber-800 text-xs shadow-xs">
                                    <i className="fa-solid fa-bolt text-amber-500 text-base animate-pulse shrink-0"></i>
                                    <div>
                                        <span className="font-bold">สัญญาณ Real-time หลุดการเชื่อมต่อ: </span>
                                        <span>ข้อมูลความเต็มอาจไม่อัปเดตสดอัตโนมัติ (กำลังพยายามเชื่อมต่อใหม่อัตโนมัติ...)</span>
                                    </div>
                                </div>
                            )}

                            {/* Alert Banner: Machine Issues Summary */}
                            {problemDevices.length > 0 && (
                                <div className="mx-5 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-rose-800 text-xs shadow-xs">
                                    <i className="fa-solid fa-triangle-exclamation text-rose-600 text-base shrink-0"></i>
                                    <div className="flex-1">
                                        <span className="font-bold">แจ้งเตือนเครื่องมีปัญหา ({problemDevices.length} ตู้): </span>
                                        <ul className="mt-1 list-disc list-inside space-y-0.5 text-[11px] text-rose-700">
                                            {problemDevices.map(d => (
                                                <li key={d.id}>
                                                    ตู้ <strong>{d.id} ({d.name || 'Smart Bin'})</strong>: {d.status === 'OFFLINE' ? 'เครื่องออฟไลน์ (ขาดการติดต่อ)' : ''}{d.status === 'OFFLINE' && (d.isFull || Number(d.fillLevel) >= 95) ? ' และ ' : ''}{d.isFull || Number(d.fillLevel) >= 95 ? `ขยะเต็มถัง${d.fullWasteType ? ` (ช่อง${getWasteLabel(d.fullWasteType)})` : ''}` : ''}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {/* Devices Grid */}
                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {devices.map(device => {
                                    const rawLevel = Number(device.fillLevel);
                                    const fillLevel = isNaN(rawLevel) ? 0 : Math.min(100, Math.max(0, Math.round(rawLevel)));
                                    const isOffline = device.status === 'OFFLINE';
                                    const isFullBin = device.isFull || fillLevel >= 95;

                                    let statusLabel = "ปกติ";
                                    let statusColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
                                    let barColor = "from-emerald-500 to-teal-500";

                                    if (isOffline) {
                                        if (isFullBin) {
                                            statusLabel = "เต็ม (ก่อนออฟไลน์)";
                                            statusColor = "text-amber-800 bg-amber-100/80 border-amber-300";
                                            barColor = "from-amber-400 to-rose-400";
                                        } else {
                                            statusLabel = "ออฟไลน์";
                                            statusColor = "text-slate-600 bg-slate-100 border-slate-200";
                                            barColor = "from-slate-300 to-slate-400";
                                        }
                                    } else if (isFullBin) {
                                        statusLabel = "เต็มแล้ว";
                                        statusColor = "text-red-700 bg-red-50 border-red-200";
                                        barColor = "from-red-500 to-rose-600";
                                    } else if (fillLevel >= 80) {
                                        statusLabel = "ใกล้เต็ม";
                                        statusColor = "text-amber-700 bg-amber-50 border-amber-200";
                                        barColor = "from-amber-400 to-orange-500";
                                    }

                                    const updateTimeStr = (() => {
                                        const timeVal = device.lastFillLevelUpdate || device.lastHeartbeat;
                                        if (!timeVal) return 'ยังไม่มีข้อมูล';
                                        try {
                                            const d = new Date(timeVal);
                                            if (isNaN(d.getTime())) return 'ยังไม่มีข้อมูล';
                                            return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' น.';
                                        } catch {
                                            return 'ยังไม่มีข้อมูล';
                                        }
                                    })();

                                    const fullWasteLabel = device.fullWasteType ? getWasteLabel(device.fullWasteType) : '';

                                    return (
                                        <div 
                                            key={device.id} 
                                            className={`rounded-2xl border p-5 transition-all shadow-sm ${
                                                isFullBin && !isOffline
                                                    ? 'border-red-300 bg-red-50/20 ring-1 ring-red-200' 
                                                    : isOffline 
                                                    ? 'border-amber-200 bg-amber-50/15' 
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                            } relative overflow-hidden flex flex-col justify-between`}
                                        >
                                            {isFullBin && !isOffline && (
                                                <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-bl-xl shadow-sm z-10 flex items-center gap-1">
                                                    <i className="fa-solid fa-triangle-exclamation"></i>
                                                    <span>เต็มแล้ว ({fillLevel}%)</span>
                                                </div>
                                            )}

                                            <div>
                                                {/* Header: Machine ID & Online Status */}
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                                                                {device.id}
                                                            </span>
                                                            <span className="font-bold text-slate-800 text-base">{device.name || 'Smart Bin'}</span>
                                                        </div>
                                                        <div className="text-xs text-slate-500 mt-1 flex items-center space-x-1.5">
                                                            <i className="fa-solid fa-location-dot text-slate-400 text-xs"></i>
                                                            <span>{device.location || 'ไม่ระบุสถานที่'}</span>
                                                        </div>
                                                    </div>
                                                    <div className={`px-2 py-1 rounded-full text-[10px] font-bold border ${
                                                        !isOffline
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                            : 'bg-slate-100 text-slate-500 border-slate-200'
                                                    }`}>
                                                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${
                                                            !isOffline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                                        }`}></span>
                                                        {device.status || 'OFFLINE'}
                                                    </div>
                                                </div>

                                                {/* Machine Issue Alert: Offline */}
                                                {isOffline && (
                                                    <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2 text-amber-900 text-xs">
                                                        <i className="fa-solid fa-triangle-exclamation text-amber-600 text-sm shrink-0 mt-0.5"></i>
                                                        <div>
                                                            <div className="font-bold">เครื่องออฟไลน์ (OFFLINE)</div>
                                                            <div className="text-[11px] text-amber-700 mt-0.5">
                                                                ขาดการติดต่อจากตู้ขยะ • ข้อมูลความเต็มด้านล่างเป็นข้อมูลประวัติก่อนตัดสัญญาณ (ไม่สามารถตรวจวัดแบบเรียลไทม์ได้)
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Machine Issue Alert: Full (Online) */}
                                                {!isOffline && isFullBin && (
                                                    <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-red-900 text-xs">
                                                        <i className="fa-solid fa-circle-exclamation text-rose-600 text-sm shrink-0 mt-0.5"></i>
                                                        <div>
                                                            <div className="font-bold">ขยะเต็มถัง!</div>
                                                            <div className="text-[11px] text-red-700 mt-0.5">
                                                                {fullWasteLabel 
                                                                    ? `ช่อง ${fullWasteLabel} เต็มแล้ว กรุณานำขยะออก` 
                                                                    : 'ความจุของถังขยะเต็มแล้ว กรุณาเปิดตู้เพื่อนำขยะไปเท'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Fill Level Section */}
                                                <div className="mt-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                                    {/* Overall Fill Level */}
                                                    <div className="flex justify-between items-end mb-2">
                                                        <div>
                                                            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">ระดับความเต็มภาพรวม</div>
                                                            <div className="text-3xl font-black text-slate-800 tracking-tight">
                                                                {fillLevel}<span className="text-lg font-bold text-slate-500 ml-0.5">%</span>
                                                            </div>
                                                        </div>
                                                        <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${statusColor}`}>
                                                            สถานะ: {statusLabel}
                                                        </div>
                                                    </div>

                                                    {/* Overall Progress Bar */}
                                                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner p-0.5 mb-3.5">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${barColor} ${isOffline ? 'opacity-70' : ''}`} 
                                                            style={{ width: `${fillLevel}%` }}
                                                        ></div>
                                                    </div>

                                                    {/* Compartments Breakdown: แยกตามชนิดขยะ */}
                                                    <div className="pt-3 border-t border-slate-200/70 space-y-2">
                                                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                                            <span>ระดับความเต็มแยกเป็นชนิด</span>
                                                            <span className="text-[10px] text-slate-400 font-normal">3 ช่องทิ้ง</span>
                                                        </div>

                                                        {WASTE_COMPARTMENTS.map(comp => {
                                                            const rawCompLevel = device.wasteLevels?.[comp.key];
                                                            const maxCap = device.maxCapacities?.[comp.key] || 100;
                                                            let compPct = 0;
                                                            if (typeof rawCompLevel === 'number') {
                                                                if (rawCompLevel > maxCap && maxCap <= 100) {
                                                                    // Guard: raw distance in mm (empty bin distance ~800-900mm)
                                                                    if (rawCompLevel >= 700) {
                                                                        compPct = Math.max(0, Math.min(100, Math.round(((1000 - rawCompLevel) / 1000) * 100)));
                                                                    } else {
                                                                        compPct = Math.min(100, Math.max(0, Math.round((rawCompLevel / 1000) * 100)));
                                                                    }
                                                                } else {
                                                                    compPct = Math.min(100, Math.max(0, Math.round((rawCompLevel / maxCap) * 100)));
                                                                }
                                                            } else if (fillLevel > 0 && !device.wasteLevels) {
                                                                compPct = fillLevel; // Fallback if single sensor
                                                            }

                                                            let compStatus = "ปกติ";
                                                            let compBadgeColor = "bg-emerald-50 text-emerald-800 border-emerald-200";
                                                            let compBarColor = comp.barColor;
                                                            if (compPct >= 95) {
                                                                compStatus = isOffline ? "เต็ม (ก่อนออฟไลน์)" : "เต็มแล้ว";
                                                                compBadgeColor = isOffline ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-red-50 text-red-800 border-red-200 font-black";
                                                                compBarColor = isOffline ? "from-amber-400 to-rose-400" : "from-red-500 to-rose-600";
                                                            } else if (compPct >= 80) {
                                                                compStatus = isOffline ? "ใกล้เต็ม (ก่อนออฟไลน์)" : "ใกล้เต็ม";
                                                                compBadgeColor = "bg-amber-50 text-amber-800 border-amber-200";
                                                                compBarColor = "from-amber-400 to-orange-500";
                                                            }

                                                            return (
                                                                <div key={comp.key} className="bg-white rounded-lg p-2.5 border border-slate-200/70 shadow-2xs">
                                                                    <div className="flex items-center justify-between text-xs mb-1.5">
                                                                        <div className="flex items-center space-x-1.5 text-slate-700 font-medium">
                                                                            <i className={`${comp.icon} text-xs text-[#64964E]`}></i>
                                                                            <span className="font-semibold text-[11px]">{comp.label}</span>
                                                                        </div>
                                                                        <div className="flex items-center space-x-1.5">
                                                                            <span className="font-mono font-bold text-slate-800 text-xs">{compPct}%</span>
                                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${compBadgeColor}`}>
                                                                                {compStatus}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                                                                        <div 
                                                                            className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${compBarColor}`}
                                                                            style={{ width: `${compPct}%` }}
                                                                        ></div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Footer: Last Update info & Reset Button */}
                                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                                    <i className="fa-regular fa-clock text-slate-400"></i>
                                                    <span>อัปเดตล่าสุด:</span>
                                                    <span className="font-medium text-slate-600 font-mono ml-0.5">{updateTimeStr}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleResetDevice(device.id)}
                                                    disabled={resettingDeviceId === device.id}
                                                    className="text-[11px] font-medium text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 px-2.5 py-1 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                                                    title="รีเซ็ตระดับขยะในตู้เป็น 0%"
                                                >
                                                    <i className={`fa-solid fa-rotate-right ${resettingDeviceId === device.id ? 'animate-spin' : ''}`}></i>
                                                    <span>{resettingDeviceId === device.id ? 'กำลังรีเซ็ต...' : 'รีเซ็ตถัง'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {devices.length === 0 && (
                                    <div className="col-span-full py-8 text-center text-slate-400 font-medium">
                                        ไม่พบตู้ในระบบ
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}



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
                                    {["PLASTIC_BOTTLE", "ALUMINUM_CAN", "BEVERAGE_CARTON"].map((key) => (
                                        <div key={key} className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col items-center text-center">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                                                {{
                                                    "PLASTIC_BOTTLE": "ขวดพลาสติก",
                                                    "ALUMINUM_CAN": "กระป๋องอลูมิเนียม",
                                                    "BEVERAGE_CARTON": "กล่องเครื่องดื่ม"
                                                }[key] || key}
                                            </div>
                                            <div className="text-xl font-black text-slate-700">{summary.wasteStats[key] || 0}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* System Alerts */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[400px]">
                            <div className="px-5 py-4 border-b border-red-100 bg-red-50 flex items-center space-x-2">
                                <i className="fa-solid fa-bell text-red-600"></i>
                                <h2 className="font-bold text-red-700">การแจ้งเตือนระบบ (Alerts)</h2>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {alerts.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center">
                                        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-2">
                                            <i className="fa-solid fa-circle-check"></i>
                                        </div>
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
                                                        <div className="w-8 h-8 rounded-full bg-[#64964E]/10 flex items-center justify-center text-[#527d40] font-bold text-xs shrink-0">
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
                                                    <span className="font-black text-[#527d40] bg-[#64964E]/10 px-2 py-1 rounded-lg">
                                                        {u.points}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    {!isSuperAdmin && (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') ? (
                                                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 inline-block">
                                                            {u.role === 'SUPER_ADMIN' ? (
                                                                <span className="inline-flex items-center gap-1"><i className="fa-solid fa-crown text-amber-500"></i> SUPER ADMIN</span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1"><i className="fa-solid fa-shield-halved text-[#64964E]"></i> ADMIN</span>
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <select 
                                                            value={u.role || 'USER'}
                                                            onChange={(e) => handleChangeRole(u.id, e.target.value)}
                                                            className={`text-xs font-bold px-2 py-1 rounded-lg outline-none cursor-pointer border ${
                                                                u.role === 'SUPER_ADMIN' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                u.role === 'ADMIN' ? 'bg-[#64964E]/10 text-[#527d40] border-[#64964E]/30' :
                                                                u.role === 'PARTNER' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                                'bg-slate-50 text-slate-600 border-slate-200'
                                                            }`}
                                                        >
                                                            <option value="USER">USER</option>
                                                            {isSuperAdmin && <option value="ADMIN">ADMIN</option>}
                                                            {isSuperAdmin && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}
                                                            <option value="PARTNER">PARTNER</option>
                                                        </select>
                                                    )}
                                                    {u.role === 'PARTNER' && (() => {
                                                        const p = partners.find(x => x.id === u.partnerId);
                                                        return p ? (
                                                            <div className="text-[9px] text-purple-600 mt-1 font-semibold max-w-[100px] truncate mx-auto">ร้าน: {p.name}</div>
                                                        ) : (
                                                            <div className="text-[9px] text-orange-500 mt-1 font-semibold mx-auto">ยังไม่เลือกตู้/ร้าน</div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    {u.email === 'sbay.smartcompany@gmail.com' ? (
                                                        <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded border border-amber-200 inline-flex items-center gap-1">
                                                            <i className="fa-solid fa-crown text-amber-500"></i> เจ้าของระบบ
                                                        </span>
                                                    ) : u.id === user?.id ? (
                                                        <span className="text-[10px] text-slate-400 font-medium">บัญชีคุณ</span>
                                                    ) : (!isSuperAdmin && (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN')) ? (
                                                        <span className="text-[10px] text-slate-400 font-medium">Admin สงวนสิทธิ์</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleDeleteUser(u.id)}
                                                            className="text-red-500 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 px-3 py-1 rounded-lg text-xs font-bold transition opacity-50 group-hover:opacity-100"
                                                        >
                                                            ลบ
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {users.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-5 py-12 text-center">
                                                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2 text-xl">
                                                        <i className="fa-solid fa-users"></i>
                                                    </div>
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

                {/* === Security & Audit Log Section (Super Admin Only) === */}
                {isSuperAdmin ? (
                    <div id="audit-log-section" className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
                            <div>
                                <div className="flex items-center space-x-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-base">
                                        <i className="fa-solid fa-clock-rotate-left"></i>
                                    </div>
                                    <h2 className="text-lg font-black tracking-wide text-white">บันทึกประวัติความปลอดภัย & กิจกรรม (Super Admin Audit Log)</h2>
                                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        Super Admin Privileges
                                    </span>
                                </div>
                                <p className="text-xs text-slate-300 mt-1">
                                    บันทึกทุกการเข้าสู่ระบบของ Admin และการเปลี่ยนแปลงข้อมูลสำคัญ พร้อมระบบ <span className="text-amber-300 font-bold">คืนค่าสถานะ (Undo / Rollback)</span> เมื่อพบความผิดปกติ
                                </p>
                            </div>
                            
                            <div className="flex items-center space-x-2 shrink-0">
                                <button
                                    onClick={fetchAuditLogs}
                                    disabled={auditLoading}
                                    className="flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 disabled:opacity-50"
                                >
                                    <i className={`fa-solid fa-rotate-right ${auditLoading ? "animate-spin" : ""}`}></i>
                                    <span>{auditLoading ? "กำลังโหลด..." : "รีเฟรช"}</span>
                                </button>
                            </div>
                        </div>

                        {/* Filter Bar */}
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
                            <span className="font-bold text-slate-500 mr-2 shrink-0">ตัวกรอง:</span>
                            {[
                                { key: 'ALL', label: 'ทั้งหมด', icon: 'fa-solid fa-list' },
                                { key: 'ADMIN_LOGIN', label: 'ล็อกอิน Admin', icon: 'fa-solid fa-key' },
                                { key: 'ROLE_CHANGE', label: 'เปลี่ยนสิทธิ์', icon: 'fa-solid fa-user-gear' },
                                { key: 'USER_DELETE', label: 'ลบผู้ใช้', icon: 'fa-solid fa-user-xmark' },
                                { key: 'DEVICE_RESET', label: 'รีเซ็ตตู้', icon: 'fa-solid fa-rotate-right' },
                                { key: 'ACTION_REVERT', label: 'การคืนค่า', icon: 'fa-solid fa-clock-rotate-left' },
                                { key: 'REDEMPTION', label: 'อนุมัติ/ปฏิเสธแลกแต้ม', icon: 'fa-solid fa-gift' }
                            ].map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setAuditFilter(f.key)}
                                    className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                                        auditFilter === f.key
                                            ? 'bg-slate-800 text-white shadow-sm'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <i className={`${f.icon} text-xs`}></i>
                                    <span>{f.label}</span>
                                </button>
                            ))}
                            <span className="ml-auto text-xs text-slate-400 font-medium shrink-0">
                                พบ {filteredAuditLogs.length} รายการ
                            </span>
                        </div>

                        {/* Audit Logs Table */}
                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                            <table className="w-full text-left text-xs whitespace-nowrap">
                                <thead className="bg-slate-100/80 text-slate-600 font-bold sticky top-0 border-b border-slate-200 z-10">
                                    <tr>
                                        <th className="px-5 py-3">วันและเวลา</th>
                                        <th className="px-5 py-3">ประเภทกิจกรรม</th>
                                        <th className="px-5 py-3">ผู้ดำเนินการ (Admin)</th>
                                        <th className="px-5 py-3">เป้าหมาย & รายละเอียด</th>
                                        <th className="px-5 py-3">IP Address</th>
                                        <th className="px-5 py-3">เบราว์เซอร์ / อุปกรณ์</th>
                                        <th className="px-5 py-3 text-center">กู้คืน / คืนค่า</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-sans">
                                    {filteredAuditLogs.map((log: any) => {
                                        const actionConfig: Record<string, { label: string; badge: string; icon: string }> = {
                                            ADMIN_LOGIN: { label: 'Admin Login', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'fa-solid fa-key' },
                                            ROLE_CHANGE: { label: 'เปลี่ยนสิทธิ์ Role', badge: 'bg-slate-100 text-slate-800 border-slate-300', icon: 'fa-solid fa-user-gear' },
                                            USER_DELETE: { label: 'ลบผู้ใช้', badge: 'bg-rose-50 text-rose-700 border-rose-200', icon: 'fa-solid fa-user-xmark' },
                                            DEVICE_RESET: { label: 'รีเซ็ตระดับขยะ', badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'fa-solid fa-rotate-right' },
                                            ACTION_REVERT: { label: 'คืนค่าข้อมูล', badge: 'bg-[#64964E]/10 text-[#527d40] border-[#64964E]/30', icon: 'fa-solid fa-clock-rotate-left' },
                                            REDEMPTION_APPROVE: { label: 'อนุมัติการแลกของ', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'fa-solid fa-check' },
                                            REDEMPTION_REJECT: { label: 'ปฏิเสธการแลกของ', badge: 'bg-slate-100 text-slate-700 border-slate-300', icon: 'fa-solid fa-xmark' },
                                        };
                                        const conf = actionConfig[log.action] || { label: log.action, badge: 'bg-slate-100 text-slate-700 border-slate-200', icon: 'fa-solid fa-bolt' };
                                        const dateStr = log.createdAt ? new Date(log.createdAt).toLocaleString('th-TH', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit'
                                        }) : '-';

                                        return (
                                            <tr key={log.id} className="hover:bg-slate-50/80 transition">
                                                <td className="px-5 py-3 text-slate-500 font-medium">
                                                    {dateStr}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold border text-[11px] ${conf.badge}`}>
                                                        <i className={`${conf.icon} text-[10px]`}></i>
                                                        <span>{conf.label}</span>
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="font-bold text-slate-800">{log.actorName || 'Admin'}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono">{log.actorEmail || '-'}</div>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="text-slate-700 max-w-xs md:max-w-md truncate font-medium">
                                                        {log.details || '-'}
                                                    </div>
                                                    {log.targetType && log.targetType !== 'AUTH' && (
                                                        <span className="text-[10px] text-slate-400">
                                                            Target: <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">{log.targetType}:{log.targetId}</span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                                                        {log.ipAddress || '0.0.0.0'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-slate-500 max-w-[180px] truncate" title={log.userAgent || ''}>
                                                    {log.userAgent ? (
                                                        log.userAgent.includes('Mobile') ? <span className="inline-flex items-center gap-1.5"><i className="fa-solid fa-mobile-screen text-slate-400"></i> Mobile</span> :
                                                        log.userAgent.includes('Macintosh') ? <span className="inline-flex items-center gap-1.5"><i className="fa-brands fa-apple text-slate-400"></i> Mac</span> :
                                                        log.userAgent.includes('Windows') ? <span className="inline-flex items-center gap-1.5"><i className="fa-brands fa-windows text-slate-400"></i> Windows</span> :
                                                        log.userAgent.includes('Linux') ? <span className="inline-flex items-center gap-1.5"><i className="fa-brands fa-linux text-slate-400"></i> Linux</span> :
                                                        <span className="inline-flex items-center gap-1.5"><i className="fa-solid fa-globe text-slate-400"></i> Web</span>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    {log.reverted ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                                                            <i className="fa-solid fa-circle-check text-emerald-600"></i>
                                                            <span>คืนค่าแล้ว</span>
                                                        </span>
                                                    ) : (log.action === 'ROLE_CHANGE' || log.action === 'USER_DELETE' || log.action === 'DEVICE_RESET') ? (
                                                        <button
                                                            onClick={() => handleRevertAuditLog(log.id, conf.label)}
                                                            disabled={revertingId === log.id}
                                                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg transition active:scale-95 disabled:opacity-50"
                                                            title="คืนค่าข้อมูลกลับสู่สถานะเดิมก่อนกิจกรรมนี้"
                                                        >
                                                            <i className={revertingId === log.id ? "fa-solid fa-spinner animate-spin" : "fa-solid fa-rotate-left"}></i>
                                                            <span>{revertingId === log.id ? 'กำลังคืนค่า...' : 'คืนค่า (Undo)'}</span>
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {filteredAuditLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                                                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2 text-xl">
                                                    <i className="fa-solid fa-clipboard-list"></i>
                                                </div>
                                                <div>ยังไม่มีบันทึก Audit Log ในหมวดหมู่นี้</div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between text-slate-600 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-[#64964E]/15 text-[#527d40] flex items-center justify-center text-xl shrink-0">
                                <i className="fa-solid fa-shield-halved"></i>
                            </div>
                            <div>
                                <div className="font-bold text-sm text-slate-800">สิทธิ์การทำงานระดับผู้ดูแลระบบ (Admin)</div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                    คุณมีสิทธิ์จัดการร้านพาร์ทเนอร์ ตรวจสอบผู้ใช้งาน และดูสถานะเครื่อง Smart Bin แบบเรียลไทม์ (บันทึก Audit Log และการคืนค่าระบบสงวนสิทธิ์เฉพาะ Super Admin)
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
                                                    {p.logoUrl ? <img src={getImageUrl(p.logoUrl)} alt="" className="w-full h-full object-cover" /> : <i className="fa-solid fa-store text-violet-500 text-sm"></i>}
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
