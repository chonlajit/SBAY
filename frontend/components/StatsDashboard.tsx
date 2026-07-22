"use client";

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function StatsDashboard() {
    const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year' | 'custom'>('week');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async (start?: string, end?: string) => {
        setLoading(true);
        try {
            let url = 'http://localhost:8070/api/stats'; // Fallback
            if (typeof window !== 'undefined') {
                const hostname = window.location.hostname;
                const port = window.location.port;
                const protocol = window.location.protocol;
                const portStr = port === '3000' ? ':8070' : (port ? `:${port}` : '');
                url = `${protocol}//${hostname}${portStr}/api/stats`;
            }

            const params = new URLSearchParams();
            if (start && end) {
                params.append('startDate', start + 'T00:00:00');
                params.append('endDate', end + 'T23:59:59');
            }
            
            const res = await fetch(`${url}?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const load = () => {
            const now = new Date();
            let start = new Date();
            
            if (timeframe === 'week') {
                start.setDate(now.getDate() - 7);
            } else if (timeframe === 'month') {
                start.setMonth(now.getMonth() - 1);
            } else if (timeframe === 'year') {
                start.setFullYear(now.getFullYear() - 1);
            }

            if (timeframe !== 'custom') {
                const startStr = start.toISOString().split('T')[0];
                const endStr = now.toISOString().split('T')[0];
                setStartDate(startStr);
                setEndDate(endStr);
                fetchStats(startStr, endStr);
            }
        };

        load(); // initial load
        const interval = setInterval(() => {
            if (timeframe !== 'custom') {
                load();
            } else if (startDate && endDate) {
                fetchStats(startDate, endDate);
            }
        }, 60000); // 1 minute auto refresh

        return () => clearInterval(interval);
    }, [timeframe, startDate, endDate]);

    const handleCustomFilter = () => {
        if (startDate && endDate) {
            fetchStats(startDate, endDate);
        }
    };

    const formatDataForChart = () => {
        if (!stats) return [];
        return [
            { name: 'ขวดพลาสติก', count: stats.itemsByType['PLASTIC_BOTTLE'] || 0, color: '#88B04B' },
            { name: 'กระป๋องอลูมิเนียม', count: stats.itemsByType['ALUMINUM_CAN'] || 0, color: '#9FA8DA' },
            { name: 'กล่องเครื่องดื่ม', count: stats.itemsByType['BEVERAGE_CARTON'] || 0, color: '#D4E157' }
        ];
    };

    const chartData = formatDataForChart();

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-green-50 p-6 mb-8 relative overflow-hidden">
            {/* Background blob */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-100/50 rounded-full blur-3xl -z-10 transform translate-x-1/3 -translate-y-1/3"></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-emerald-600 flex items-center gap-2">
                        <i className="fa-solid fa-chart-pie"></i> Statistics
                    </h2>
                    <p className="text-gray-500 text-sm">สถิติการรีไซเคิลของแพลตฟอร์ม</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <select 
                        value={timeframe} 
                        onChange={(e) => setTimeframe(e.target.value as any)}
                        className="bg-green-100 text-green-800 border-none rounded-full px-4 py-2 text-sm font-bold shadow-sm focus:ring-2 focus:ring-green-400 outline-none"
                    >
                        <option value="week">รายสัปดาห์</option>
                        <option value="month">รายเดือน</option>
                        <option value="year">รายปี</option>
                        <option value="custom">กำหนดเอง</option>
                    </select>

                    {timeframe === 'custom' && (
                        <div className="flex items-center gap-2 text-xs">
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)}
                                className="border border-green-200 rounded-md px-2 py-1 text-gray-700"
                            />
                            <span>-</span>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)}
                                className="border border-green-200 rounded-md px-2 py-1 text-gray-700"
                            />
                            <button 
                                onClick={handleCustomFilter}
                                className="bg-emerald-500 text-white px-3 py-1 rounded-md font-bold"
                            >
                                GO
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Chart Section */}
                    <div className="h-64 w-full bg-white/50 rounded-2xl p-4 shadow-sm border border-green-50">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f0fdf4' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Summary Section */}
                    <div className="flex flex-col gap-4 justify-center">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 shadow-sm border border-blue-200 text-center flex flex-col items-center justify-center relative overflow-hidden">
                                <div className="absolute top-2 right-2 text-blue-200 text-4xl opacity-50"><i className="fa-solid fa-recycle"></i></div>
                                <span className="text-blue-800 font-bold text-sm mb-1 z-10">รีไซเคิลรวม</span>
                                <span className="text-3xl font-black text-blue-600 z-10">{stats?.totalItems.toLocaleString()} <span className="text-sm font-normal">ชิ้น</span></span>
                            </div>
                            
                            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-4 shadow-sm border border-indigo-200 text-center flex flex-col items-center justify-center relative overflow-hidden">
                                <div className="absolute top-2 right-2 text-indigo-200 text-4xl opacity-50"><i className="fa-solid fa-weight-scale"></i></div>
                                <span className="text-indigo-800 font-bold text-sm mb-1 z-10">น้ำหนักรวม</span>
                                <span className="text-3xl font-black text-indigo-600 z-10">{stats?.totalWeightKg.toLocaleString()} <span className="text-sm font-normal">กก.</span></span>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 shadow-md text-white relative overflow-hidden">
                            <div className="absolute -right-4 -bottom-4 text-white/20 text-6xl"><i className="fa-solid fa-leaf"></i></div>
                            <p className="font-medium text-sm text-green-100 mb-1 border-b border-green-400/50 pb-1">ลดคาร์บอนไปทั้งหมด</p>
                            <div className="flex items-end gap-2 mt-2">
                                <span className="text-4xl font-black tracking-tight">{stats?.totalCarbonReductionKg.toLocaleString()}</span>
                                <span className="text-green-100 font-bold mb-1">kgCO2e</span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-green-400/30 flex items-center justify-between">
                                <span className="text-xs text-green-100">หรือเทียบเท่า</span>
                                <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
                                    <span className="font-black text-sm">{stats?.carbonCredits.toFixed(3)}</span>
                                    <span className="text-xs font-bold">Carbon Credit</span>
                                    <i className="fa-solid fa-certificate text-yellow-300 ml-1"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
