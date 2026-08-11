"use client";

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Bottle from './icons/Bottle';
import Can from './icons/Can';
import Carton from './icons/Carton';

const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const value = payload.value;

    return (
        <g transform={`translate(${x},${y + 6})`}>
            <foreignObject x={-20} y={0} width={40} height={40}>
                <div className="flex flex-col items-center justify-center w-full h-full">
                    {value === 'ขวดพลาสติก' && <Bottle className="w-8 h-8 object-contain" />}
                    {value === 'กระป๋องอลูมิเนียม' && <Can className="w-8 h-8 object-contain" />}
                    {value === 'กล่องเครื่องดื่ม' && <Carton className="w-8 h-8 object-contain" />}
                </div>
            </foreignObject>
        </g>
    );
};

export default function StatsDashboard() {
    const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year' | 'custom'>('week');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const timeframeLabels: Record<string, string> = {
        week: 'รายสัปดาห์',
        month: 'รายเดือน',
        year: 'รายปี',
        custom: 'กำหนดเอง',
    };

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
            { name: 'ขวดพลาสติก', count: stats.itemsByType['PLASTIC_BOTTLE'] || 0, color: '#D9D9D9' },
            { name: 'กระป๋องอลูมิเนียม', count: stats.itemsByType['ALUMINUM_CAN'] || 0, color: '#507B3D' },
            { name: 'กล่องเครื่องดื่ม', count: stats.itemsByType['BEVERAGE_CARTON'] || 0, color: '#2B8AB7' }
        ];
    };

    const chartData = formatDataForChart();

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] shadow-xl border border-green-50 px-8 pt-2 pb-4 xl:px-10 relative overflow-hidden">
            {/* Background blob */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-100/50 rounded-full blur-3xl -z-10 transform translate-x-1/3 -translate-y-1/3"></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-[#64964E] flex items-center gap-2">
                        <i className="fa-solid fa-chart-pie"></i> Statistics
                    </h2>
                    <p className="text-gray-500 text-sm">สถิติการรีไซเคิลของแพลตฟอร์ม</p>
                </div>

                <div className="flex flex-col items-start md:items-end gap-2 mt-4 md:mt-0 w-full md:w-auto relative z-30">
                    {/* Custom UI Dropdown Menu (Eliminates OS Native Select Gap Bite Glitch 100%) */}
                    <div className="relative w-full md:w-auto">
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="bg-[#64964E] hover:bg-[#578542] text-white rounded-xl px-4 py-2 text-sm font-bold shadow-sm flex items-center justify-between gap-3 w-full md:w-auto transition active:scale-95 cursor-pointer min-w-[130px]"
                        >
                            <span>{timeframeLabels[timeframe] || 'เลือกช่วงเวลา'}</span>
                            <i className={`fa-solid fa-chevron-down text-xs transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}></i>
                        </button>

                        {isDropdownOpen && (
                            <>
                                {/* Click outside backdrop */}
                                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />

                                {/* Custom Dropdown Popover List */}
                                <div className="absolute top-full right-0 mt-1.5 w-full md:w-[150px] bg-[#64964E] text-white rounded-xl shadow-xl border border-white/20 overflow-hidden py-1.5 z-50 animate-in fade-in duration-150">
                                    {Object.entries(timeframeLabels).map(([key, label]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => {
                                                setTimeframe(key as any);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-sm font-bold transition flex items-center justify-between ${timeframe === key
                                                ? 'bg-[#4e793c] text-white'
                                                : 'hover:bg-[#578542] text-white/90'
                                                }`}
                                        >
                                            <span>{label}</span>
                                            {timeframe === key && <i className="fa-solid fa-check text-xs"></i>}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {timeframe === 'custom' && (
                        <div className="flex flex-wrap items-center gap-2 text-xs w-full md:w-auto">
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="border border-green-200 rounded-md px-2 py-1 text-gray-700 flex-1 md:flex-none min-w-[100px]"
                            />
                            <span>-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="border border-green-200 rounded-md px-2 py-1 text-gray-700 flex-1 md:flex-none min-w-[100px]"
                            />
                            <button
                                onClick={handleCustomFilter}
                                className="bg-emerald-500 text-white px-3 py-1 rounded-md font-bold w-full md:w-auto mt-2 md:mt-0"
                            >
                                GO
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="h-[320px] flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Chart Section */}
                    <div className="flex flex-col h-[320px] w-full bg-white/50 rounded-2xl p-5 shadow-sm border border-green-50">
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="name" interval={0} tick={<CustomXAxisTick />} axisLine={false} tickLine={false} height={45} />
                                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: '#a2c5edff' }} contentStyle={{ borderRadius: '22px', border: 'none', boxShadow: '0 4px 4px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Icon Legend Badge Row */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100/80">
                            <div className="flex items-center justify-center gap-2 bg-white/80 rounded-xl py-1.5 px-2 shadow-xs">
                                <Bottle className="w-6 h-6 shrink-0" />
                                <span className="text-xs font-bold text-gray-700">{stats?.itemsByType['PLASTIC_BOTTLE'] || 0} ชิ้น</span>
                            </div>
                            <div className="flex items-center justify-center gap-2 bg-white/80 rounded-xl py-1.5 px-2 shadow-xs">
                                <Can className="w-6 h-6 shrink-0" />
                                <span className="text-xs font-bold text-gray-700">{stats?.itemsByType['ALUMINUM_CAN'] || 0} ชิ้น</span>
                            </div>
                            <div className="flex items-center justify-center gap-2 bg-white/80 rounded-xl py-1.5 px-2 shadow-xs">
                                <Carton className="w-6 h-6 shrink-0" />
                                <span className="text-xs font-bold text-gray-700">{stats?.itemsByType['BEVERAGE_CARTON'] || 0} ชิ้น</span>
                            </div>
                        </div>
                    </div>

                    {/* Summary Section */}
                    <div className="flex flex-col gap-4 justify-center">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-300 rounded-2xl p-4 shadow-md text-center flex flex-col items-center justify-center relative overflow-hidden">
                                <div className="absolute top-2 right-2 text-gray-700 text-4xl opacity-50"><i className="fa-solid fa-recycle"></i></div>
                                <span className="text-gray-700 font-bold text-sm mb-1 z-10">รีไซเคิลรวม</span>
                                <span className="text-3xl font-black text-gray-700 z-10">{stats?.totalItems.toLocaleString()} <span className="text-sm font-normal">ชิ้น</span></span>
                            </div>

                            <div className="bg-blue-300 rounded-2xl p-4 shadow-md text-center flex flex-col items-center justify-center relative overflow-hidden">
                                <div className="absolute top-2 right-2 text-gray-700 text-4xl opacity-50"><i className="fa-solid fa-weight-scale"></i></div>
                                <span className="text-gray-700 font-bold text-sm mb-1 z-10">น้ำหนักรวม</span>
                                <span className="text-3xl font-black text-gray-700 z-10">{stats?.totalWeightKg.toLocaleString()} <span className="text-sm font-normal">กก.</span></span>
                            </div>
                        </div>

                        <div className="bg-[#64964E] rounded-2xl p-5 shadow-md text-white relative overflow-hidden">
                            <div className="absolute -right-4 -bottom-4 text-white/20 text-6xl"><i className="fa-solid fa-leaf"></i></div>
                            <p className="font-medium text-sm md:text-base text-green-100 mb-1 border-b border-green-400/50 pb-2">ลดคาร์บอนไปทั้งหมด</p>
                            <div className="flex items-end gap-2 mt-3">
                                <span className="text-5xl md:text-[56px] leading-none font-black tracking-tight">{stats?.totalCarbonReductionKg.toLocaleString()}</span>
                                <span className="text-green-100 font-bold mb-1.5 md:mb-2 text-lg">kgCO2e</span>
                            </div>
                            <div className="mt-4 pt-3 border-t border-green-400/30 flex items-center justify-between">
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
