"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';

export default function AdminPage() {
    const router = useRouter();
    const { user, token } = useSmartBin();
    const [summary, setSummary] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchData = async () => {
        if (!token) return;

        try {
            const hostname = window.location.hostname;
            const apiBase = `http://${hostname}:8080/api`;

            const headers = { 'Authorization': `Bearer ${token}` };

            const [summaryRes, usersRes, alertsRes] = await Promise.all([
                fetch(`${apiBase}/admin/summary`, { headers }),
                fetch(`${apiBase}/admin/users`, { headers }),
                fetch(`${apiBase}/admin/alerts`, { headers })
            ]);

            if (summaryRes.ok && usersRes.ok) {
                setSummary(await summaryRes.json());
                setUsers(await usersRes.json());
                if (alertsRes.ok) setAlerts(await alertsRes.json());
            } else {
                if (summaryRes.status === 403 || summaryRes.status === 401) {
                    setError("Access Denied: Admin Role Required");
                }
            }
        } catch (e) {
            console.error("Failed to fetch admin data", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
        if (!token) return;

        try {
            const hostname = window.location.hostname;
            const res = await fetch(`http://${hostname}:8080/api/admin/user/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert("User deleted successfully");
                fetchData(); // Refresh list
            } else {
                alert("Failed to delete user");
            }
        } catch (e) {
            console.error("Delete failed", e);
        }
    };

    useEffect(() => {
        if (!user || user.role !== 'ADMIN') {
            setError("Access Denied. You are not an Admin.");
            setLoading(false);
            return;
        }

        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [user, token]);

    if (loading) return <div className="p-10 text-center">Loading Admin Dashboard...</div>;

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">{error}</h1>
                    <button onClick={() => router.push('/')} className="bg-blue-600 text-white px-6 py-2 rounded-full">
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 font-sans text-black p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
                <button onClick={() => router.push('/')} className="bg-gray-200 px-4 py-2 rounded text-sm">
                    Back to Home
                </button>
            </div>

            {/* Stats Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <div className="text-gray-500 text-sm">Total Users</div>
                        <div className="text-2xl font-bold">{summary.totalUsers}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-green-200">
                        <div className="text-green-600 text-sm">Total Points</div>
                        <div className="text-2xl font-bold text-green-700">{summary.totalPoints}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-200">
                        <div className="text-blue-600 text-sm">Total Volunteer Hours</div>
                        <div className="text-2xl font-bold text-blue-700">{summary.totalVolunteerHours}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-200">
                        <div className="text-orange-600 text-sm">Total Activity Credits</div>
                        <div className="text-2xl font-bold text-orange-700">{summary.totalActivityCredits}</div>
                    </div>
                </div>
            )}

            {/* Total Items Banner */}
            {summary && (
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-6 mb-8 text-white flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold opacity-90">Total Items Recycled</h2>
                        <p className="text-sm opacity-75">All time collection across all machines</p>
                    </div>
                    <div className="text-4xl font-bold">{summary.totalRecycledItems || 0} <span className="text-lg font-normal opacity-80">items</span></div>
                </div>
            )}

            {/* Waste Stats */}
            {summary && summary.wasteStats && (
                <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
                    <h2 className="text-lg font-bold mb-4 text-gray-700">Waste Collection Stats</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(summary.wasteStats).map(([key, value]) => (
                            <div key={key} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                                <div className="text-xs text-gray-500 uppercase">{key.replace('_', ' ')}</div>
                                <div className="text-xl font-bold text-gray-800">{String(value)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* System Alerts */}
            <div className="bg-white rounded-xl shadow-sm mb-8 overflow-hidden">
                <div className="p-4 border-b bg-red-50 flex items-center space-x-2">
                    <span className="text-xl">🚨</span>
                    <h2 className="text-lg font-bold text-red-700">System Alerts</h2>
                </div>
                <div className="max-h-60 overflow-y-auto p-4">
                    {alerts.length === 0 ? (
                        <p className="text-gray-400 text-center">No alerts found</p>
                    ) : (
                        <div className="space-y-3">
                            {alerts.map((alert: any) => (
                                <div key={alert.id} className="flex items-start bg-red-50 p-3 rounded-lg border border-red-100">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-bold text-red-800 text-sm">[{alert.type}]</span>
                                            <span className="text-gray-600 text-xs">{new Date(alert.timestamp).toLocaleString()}</span>
                                        </div>
                                        <p className="text-red-900 mt-1 text-sm font-medium">{alert.message}</p>
                                        <p className="text-xs text-gray-500 mt-1">Machine: {alert.machineId}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* User Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-700">All Users</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                            <tr>
                                <th className="p-3">Phone</th>
                                <th className="p-3">Name</th>
                                <th className="p-3 text-right">Points</th>
                                <th className="p-3 text-right">Vol. Hours</th>
                                <th className="p-3 text-right">Act. Credits</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {users.map((u: any) => (
                                <tr key={u.id} className="hover:bg-gray-50">
                                    <td className="p-3 font-medium">{u.phoneNumber}</td>
                                    <td className="p-3">{u.firstName} {u.lastName}</td>
                                    <td className="p-3 text-right text-green-600 font-bold">{u.points}</td>
                                    <td className="p-3 text-right">{u.volunteerHours || 0}</td>
                                    <td className="p-3 text-right">{u.activityCredits || 0}</td>
                                    <td className="p-3 text-right">
                                        <button
                                            onClick={() => handleDeleteUser(u.id)}
                                            className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1 rounded text-xs font-bold transition"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-4 text-center text-gray-500">No users found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
