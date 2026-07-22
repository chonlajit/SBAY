"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSmartBin } from './context/SmartBinContext';
import StatsDashboard from '../components/StatsDashboard';

export default function Home() {
    const { user, isInitialized } = useSmartBin();
    const router = useRouter();

    return (
        <div className="min-h-full bg-gradient-to-b from-green-50 to-white">

            {/* Hero Section */}
            <div className="bg-gradient-to-r from-green-700 via-emerald-500 to-teal-600 text-white px-6 pt-6 pb-12 relative overflow-hidden">
                {/* Background decorative circles */}
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-lg" />

                <div className="relative max-w-lg md:max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        {/* Main Logo */}
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                                <span className="text-2xl">♻️</span>
                            </div>
                            <div>
                                <h1 className="text-2xl font-black tracking-wide">SBAY</h1>
                                <p className="text-green-200 text-xs">SBAY Platform</p>
                            </div>
                        </div>

                        {/* Branch & Sponsor Logos (Right Side) */}
                        <div className="flex items-center space-x-2">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/30 text-[10px] font-bold text-center leading-tight shadow-sm cursor-pointer hover:bg-white/30 transition">
                                Branch<br />Logo
                            </div>
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/30 text-[10px] font-bold text-center leading-tight shadow-sm cursor-pointer hover:bg-white/30 transition">
                                Sponsor<br />Logo
                            </div>
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold leading-tight mt-4 mb-2">
                        ยินดีต้อนรับสู่<br />
                        <span className="text-yellow-300">SBAY Platform</span>
                    </h2>
                    <p className="text-green-100 text-sm leading-relaxed">
                        ระบบรีไซเคิลอัจฉริยะ สะสมแต้มทุกครั้งที่คุณรีไซเคิล
                        เพื่อสิ่งแวดล้อมที่ดีกว่า
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-lg md:max-w-4xl mx-auto px-4 md:px-8 -mt-6 pb-8 space-y-4 relative z-10">

                {/* Global Stats Dashboard */}
                <StatsDashboard />

                {!isInitialized ? (
                    <div className="space-y-4">
                        {/* Skeleton User Card */}
                        <div className="bg-white rounded-3xl shadow-xl p-5 border border-gray-100 animate-pulse">
                            <div className="flex items-center space-x-4">
                                <div className="w-14 h-14 bg-gray-200 rounded-2xl"></div>
                                <div className="flex-1 space-y-2.5">
                                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                                    <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                </div>
                            </div>
                        </div>
                        {/* Skeleton Quick Actions */}
                        <div className="grid grid-cols-2 gap-3 animate-pulse">
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center">
                                <div className="w-12 h-12 bg-gray-200 rounded-xl mb-3"></div>
                                <div className="h-4 bg-gray-200 rounded w-16 mb-1.5"></div>
                                <div className="h-3 bg-gray-200 rounded w-20"></div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center">
                                <div className="w-12 h-12 bg-gray-200 rounded-xl mb-3"></div>
                                <div className="h-4 bg-gray-200 rounded w-16 mb-1.5"></div>
                                <div className="h-3 bg-gray-200 rounded w-20"></div>
                            </div>
                        </div>
                    </div>
                ) : user ? (
                    /* Logged-in state */
                    <>
                        {/* User Card */}
                        <div className="bg-white rounded-3xl shadow-xl p-5 border border-green-100">
                            <div className="flex items-center space-x-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md">
                                    {(user.firstName || user.username || user.email || '?').charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 font-medium flex items-center space-x-1">
                                        <span>สวัสดี</span>
                                        <i className="fa-solid fa-hand text-yellow-500 animate-wave"></i>
                                    </p>
                                    <h3 className="font-bold text-gray-800 text-lg leading-tight">
                                        {user.firstName ? `${user.title || ''} ${user.firstName} ${user.lastName || ''}` : (user.username || user.email || 'ผู้ใช้งาน')}
                                    </h3>
                                    <div className="flex items-center space-x-1 mt-0.5">
                                        <span className="text-yellow-500 font-black text-base">{user.points}</span>
                                        <span className="text-gray-400 text-xs font-medium">แต้มสะสม</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 gap-4">
                            <Link
                                href="/dashboard"
                                className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 flex flex-col items-center text-center active:scale-95 transition hover:shadow-lg"
                            >
                                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-3 text-green-600 text-2xl">
                                    <i className="fa-solid fa-chart-column"></i>
                                </div>
                                <span className="font-bold text-gray-800 text-sm">สถิติ & แต้ม</span>
                                <span className="text-gray-400 text-xs mt-0.5">ดูประวัติการรีไซเคิล</span>
                            </Link>
                            <Link
                                href="/redeem"
                                className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 flex flex-col items-center text-center active:scale-95 transition hover:shadow-lg"
                            >
                                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-3 text-yellow-600 text-2xl">
                                    <i className="fa-solid fa-right-left"></i>
                                </div>
                                <span className="font-bold text-gray-800 text-sm">แลกของรางวัล</span>
                                <span className="text-gray-400 text-xs mt-0.5">ใช้แต้มที่สะสม</span>
                            </Link>
                        </div>

                        {/* Info Banner */}
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 text-white flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-info"></i>
                            </div>
                            <div>
                                <p className="font-bold text-sm">วิธีรีไซเคิล</p>
                                <p className="text-green-100 text-xs leading-relaxed mt-0.5">
                                    นำขยะไปใส่ตู้ Smart Bin ระบบจะตรวจสอบและบันทึกแต้มให้อัตโนมัติ
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Guest state */
                    <>
                        {/* CTA Card */}
                        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-green-100">
                            <div className="p-6">
                                <h3 className="font-bold text-gray-800 text-xl mb-1">เริ่มต้นรีไซเคิล</h3>
                                <p className="text-gray-500 text-sm mb-5">เข้าสู่ระบบเพื่อสะสมแต้มจากการรีไซเคิล</p>

                                <Link
                                    href="/login"
                                    className="block w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3.5 rounded-xl text-center hover:from-green-600 hover:to-emerald-700 transition shadow-md active:scale-95 mb-3"
                                >
                                    เข้าสู่ระบบ
                                </Link>
                                <Link
                                    href="/register"
                                    className="block w-full bg-gray-100 text-gray-700 font-bold py-3.5 rounded-xl text-center hover:bg-gray-200 transition active:scale-95"
                                >
                                    ลงทะเบียนสมาชิก
                                </Link>
                            </div>
                        </div>

                        {/* Features */}
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { icon: <i className="fa-solid fa-recycle text-green-400"></i>, label: 'รีไซเคิล', sub: 'สะดวกสบาย' },
                                { icon: <i className="fa-solid fa-star text-yellow-400"></i>, label: 'สะสมแต้ม', sub: 'ง่ายดาย' },
                                { icon: <i className="fa-solid fa-gift text-red-400"></i>, label: 'แลกของรางวัล', sub: 'มากมาย' },
                            ].map((f, i) => (
                                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center text-center">
                                    <span className="text-2xl mb-1">{f.icon}</span>
                                    <span className="font-bold text-gray-800 text-xs">{f.label}</span>
                                    <span className="text-gray-400 text-xs">{f.sub}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
