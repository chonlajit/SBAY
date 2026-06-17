"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const { user, logout, isInitialized } = useSmartBin();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const navItems = !isInitialized ? [
        { href: '#1', icon: <div className="w-5 h-5 bg-gray-300 rounded-full animate-pulse"></div>, label: <div className="w-12 h-2.5 bg-gray-300 rounded animate-pulse"></div> },
        { href: '#2', icon: <div className="w-5 h-5 bg-gray-300 rounded-full animate-pulse"></div>, label: <div className="w-12 h-2.5 bg-gray-300 rounded animate-pulse"></div> },
        { href: '#3', icon: <div className="w-5 h-5 bg-gray-300 rounded-full animate-pulse"></div>, label: <div className="w-12 h-2.5 bg-gray-300 rounded animate-pulse"></div> },
    ] : user ? [
        { href: '/', icon: <i className="fa-solid fa-house"></i>, label: 'หน้าหลัก' },
        { href: '/dashboard', icon: <i className="fa-solid fa-chart-column"></i>, label: 'สถิติ' },
        { href: '/redeem', icon: <i className="fa-solid fa-right-left"></i>, label: 'แลกรางวัล' },
        ...(user.role === 'ADMIN' ? [{ href: '/admin', icon: <i className="fa-solid fa-user-gear"></i>, label: 'Admin' }] : []),
    ] : [
        { href: '/', icon: <i className="fa-solid fa-house"></i>, label: 'หน้าหลัก' },
        { href: '/login', icon: <i className="fa-solid fa-key"></i>, label: 'เข้าสู่ระบบ' },
        { href: '/register', icon: <i className="fa-solid fa-pen-to-square"></i>, label: 'สมัครสมาชิก' },
    ];

    const isActive = (href: string) =>
        href === '/' ? pathname === '/' : pathname.startsWith(href);

    return (
        <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">

            {/* ─── Top Header ─── */}
            <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 shrink-0 z-20 border-b border-gray-100">
                {/* Brand */}
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center space-x-2"
                >
                    <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                        <span className="text-lg">♻️</span>
                    </div>
                    <span className="font-black text-green-700 text-xl tracking-wider">SBAY</span>
                </button>

                {/* Right side: user chip or guest */}
                <div className="flex items-center space-x-2">
                    {!isInitialized ? (
                        <div className="flex items-center space-x-2">
                            <div className="hidden sm:block w-20 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                            <div className="flex items-center space-x-2 bg-gray-50 border border-gray-100 rounded-full pl-2 pr-3 py-1.5 animate-pulse">
                                <div className="w-7 h-7 bg-gray-200 rounded-full"></div>
                                <div className="hidden sm:block w-16 h-3 bg-gray-200 rounded"></div>
                                <div className="w-3.5 h-3.5 bg-gray-200 rounded-full"></div>
                            </div>
                        </div>
                    ) : user ? (
                        <>
                            {/* Points badge */}
                            <div className="hidden sm:flex items-center space-x-1.5 bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-full">
                                <span className="text-yellow-500 text-xs">⭐</span>
                                <span className="font-bold text-yellow-700 text-sm">{user.points} point</span>
                            </div>
                            {/* Avatar + Drawer trigger */}
                            <button
                                onClick={() => setDrawerOpen(true)}
                                className="flex items-center space-x-2 bg-green-50 border border-green-100 rounded-full pl-2 pr-3 py-1.5 active:scale-95 transition"
                            >
                                <div className="w-7 h-7 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                    {user.firstName.charAt(0)}
                                </div>
                                <span className="text-gray-800 font-semibold text-sm hidden sm:inline">
                                    {user.firstName}
                                </span>
                                <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </>
                    ) : (
                        <Link
                            href="/login"
                            className="bg-green-500 text-white font-semibold text-sm px-4 py-2 rounded-full shadow-sm hover:bg-green-600 transition active:scale-95"
                        >
                            เข้าสู่ระบบ
                        </Link>
                    )}
                </div>
            </header>

            {/* ─── User Profile Drawer (slide from top) ─── */}
            {drawerOpen && user && (
                <>
                    <div
                        className="fixed inset-0 bg-black/40 z-30 backdrop-blur-sm"
                        onClick={() => setDrawerOpen(false)}
                    />
                    <div className="fixed top-16 right-4 z-40 bg-white rounded-2xl shadow-2xl w-80 border border-gray-100 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                        {/* Profile header */}
                        <div className="bg-gradient-to-r from-green-600 to-emerald-500 p-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-black text-green-600 text-xl shadow">
                                    {user.firstName.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm leading-tight">
                                        {user.title} {user.firstName} {user.lastName}
                                    </p>
                                    <p className="text-green-100 text-xs mt-0.5">{user.email}</p>
                                </div>
                            </div>
                            <div className="mt-3 bg-white/20 rounded-xl px-3 py-2 flex items-center justify-between">
                                <span className="text-white text-xs">แต้มสะสม</span>
                                <span className="text-yellow-300 font-black text-base">{user.points} pt</span>
                            </div>
                        </div>

                        {/* Menu */}
                        <div className="p-2">
                            {[
                                { href: '/dashboard', icon: <i className="fa-solid fa-chart-bar text-green-500"></i>, label: 'สถิติและแต้มสะสม' },
                                { href: '/redeem', icon: <i className="fa-solid fa-gift text-yellow-500"></i>, label: 'แลกของรางวัล' },
                                ...(user.role === 'ADMIN' ? [{ href: '/admin', icon: <i className="fa-solid fa-tools text-red-500"></i>, label: 'Admin Dashboard' }] : []),
                            ].map(item => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setDrawerOpen(false)}
                                    className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition text-gray-700"
                                >
                                    <span>{item.icon}</span>
                                    <span className="font-medium text-sm">{item.label}</span>
                                </Link>
                            ))}
                        </div>

                        <div className="border-t border-gray-100 p-3">
                            <button
                                onClick={() => { setDrawerOpen(false); logout(); }}
                                className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 rounded-xl transition flex items-center justify-center space-x-2 text-sm"
                            >
                                <span>🚪</span>
                                <span>ออกจากระบบ</span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* ─── Page Content ─── */}
            <main className="flex-1 overflow-y-scroll pb-16 md:pb-0 md:pl-72">
                {children}
            </main>

            {/* ─── Bottom Navigation (Mobile) ─── */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 safe-area-inset-bottom">
                <div className="flex items-center justify-around h-16 px-2">
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-all active:scale-90 ${active ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                <span className={`text-xl transition-transform ${active ? 'scale-110' : ''}`}>
                                    {item.icon}
                                </span>
                                <span className={`text-xs font-medium leading-none ${active ? 'font-bold' : ''}`}>
                                    {item.label}
                                </span>
                                {active && (
                                    <div className="absolute bottom-0 w-8 h-0.5 bg-green-500 rounded-full" />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* ─── Desktop Sidebar (md+) ─── */}
            <aside className="hidden md:flex md:fixed md:left-0 md:top-16 md:bottom-0 md:w-72 bg-green-700 text-white flex-col shadow-xl z-10">
                <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center space-x-3 px-5 py-3.5 rounded-xl transition font-medium ${active
                                    ? 'bg-green-600 text-white shadow-sm'
                                    : 'text-green-100 hover:bg-green-600/60 hover:text-white'
                                    }`}
                            >
                                <span className="text-xl w-6 text-center">{item.icon}</span>
                                <span className="text-base">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {user && (
                    <div className="p-4 border-t border-green-600">
                        <button
                            onClick={() => logout()}
                            className="w-full bg-red-500 hover:bg-red-400 text-white font-bold py-3 px-4 rounded-xl transition shadow-md flex items-center justify-center space-x-2"
                        >
                            <i className="fa-solid fa-right-from-bracket text-white"></i>
                            <span className="text-white text-base">ออกจากระบบ</span>
                        </button>
                    </div>
                )}
            </aside>
        </div>
    );
}
