"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';
import Logo from '../../components/icons/Logo';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const { user, logout, isInitialized } = useSmartBin();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const navItems = !isInitialized ? [
        { href: '#1', icon: <div className="w-5 h-5 bg-gray-300 rounded-full animate-pulse"></div>, label: <div className="w-12 h-2.5 bg-gray-300 rounded animate-pulse"></div> },
        { href: '#2', icon: <div className="w-5 h-5 bg-gray-300 rounded-full animate-pulse"></div>, label: <div className="w-12 h-2.5 bg-gray-300 rounded animate-pulse"></div> },
        { href: '#3', icon: <div className="w-5 h-5 bg-gray-300 rounded-full animate-pulse"></div>, label: <div className="w-12 h-2.5 bg-gray-300 rounded animate-pulse"></div> },
    ] : user ? [
        { href: '/', icon: <i className="fa-solid fa-house"></i>, label: 'หน้าหลัก' },
        { href: '/dashboard', icon: <i className="fa-solid fa-chart-column"></i>, label: 'สถิติและประวัติ' },
        { href: '/redeem', icon: <i className="fa-solid fa-gift"></i>, label: 'แลกของรางวัล' },
        { href: '/about', icon: <i className="fa-solid fa-circle-info"></i>, label: 'เกี่ยวกับเรา' },
        ...(user.role === 'PARTNER' ? [{ href: '/partner', icon: <i className="fa-solid fa-store"></i>, label: 'ร้านของฉัน' }] : []),
        ...(user.role === 'ADMIN' ? [{ href: '/admin', icon: <i className="fa-solid fa-user-gear"></i>, label: 'ผู้ดูแลระบบ (Admin)' }] : []),
    ] : [
        { href: '/', icon: <i className="fa-solid fa-house"></i>, label: 'หน้าหลัก' },
        { href: '/redeem', icon: <i className="fa-solid fa-store"></i>, label: 'ร้านค้า' },
        { href: '/about', icon: <i className="fa-solid fa-circle-info"></i>, label: 'เกี่ยวกับเรา' },
        { href: `/login?redirect=${pathname === '/login' || pathname === '/register' ? '/' : pathname}`, icon: <i className="fa-solid fa-right-to-bracket"></i>, label: 'เข้าสู่ระบบ' },
        { href: '/register', icon: <i className="fa-solid fa-user-plus"></i>, label: 'สมัครสมาชิก' },
    ];

    const isActive = (href: string) =>
        href === '/' ? pathname === '/' : pathname.startsWith(href);

    const isAuthPage = pathname === '/login' || pathname === '/register';

    if (isAuthPage) {
        return (
            <div className="min-h-screen h-screen w-full font-sans text-gray-900 overflow-y-auto lg:overflow-hidden flex flex-col">
                {children}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">

            {/* ─── Top Header ─── */}
            <header className="bg-[#64964E] shadow-xl h-16 flex items-center justify-between px-4 md:px-6 shrink-0 z-20 sticky top-0 relative">
                {/* Left side: Hamburger Button & Logo */}
                <div className="flex items-center space-x-3 md:space-x-4 z-10">
                    <div className={`items-center ${pathname !== '/' ? 'hidden md:flex' : 'flex'}`}>
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="flex flex-col justify-center items-center w-8 h-8 space-y-1.5 hover:opacity-80 transition group"
                            aria-label="Open menu"
                        >
                            <span className="w-6 h-0.5 bg-white rounded-full transition-all group-hover:w-7"></span>
                            <span className="w-6 h-0.5 bg-white rounded-full"></span>
                            <span className="w-6 h-0.5 bg-white rounded-full transition-all group-hover:w-5"></span>
                        </button>
                    </div>
                    
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition"
                    >
                        <div className="w-9 h-9 md:w-10 md:h-10 bg-white flex items-center justify-center p-1.5 shadow-sm rounded-full shrink-0">
                            <Logo color="#64964E" className="w-full h-full object-contain" />
                        </div>
                    </button>
                </div>

                {/* Right side: user chip or guest */}
                <div className="flex items-center space-x-2 z-10">
                    {!isInitialized ? (
                        <div className="w-32 h-10 bg-gray-300 rounded-full animate-pulse"></div>
                    ) : user ? (
                        <div className="flex items-center bg-gray-300 rounded-full h-8 md:h-10 pr-1 pl-3 md:pl-4 shadow-inner">
                            <span className="text-[#64964E] font-bold text-xs md:text-sm mr-2 md:mr-4">{user.points} pt</span>
                            <button
                                onClick={() => setDrawerOpen(true)}
                                className="w-6 h-6 md:w-8 md:h-8 bg-black rounded-full flex items-center justify-center font-bold text-white shadow-sm hover:bg-white hover:text-black transition text-xs md:text-base"
                                title="Mini user card"
                            >
                                {user.profileImageUrl ? (
                                    <img src={user.profileImageUrl} alt="profile" className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    (user.username || user.firstName || user.email || '?').charAt(0).toUpperCase()
                                )}
                            </button>
                        </div>
                    ) : (
                        <Link
                            href={`/login?redirect=${pathname === '/login' || pathname === '/register' ? '/' : pathname}`}
                            className="bg-gray-300 text-gray-700 font-bold text-xs md:text-sm px-4 md:px-6 py-1.5 md:py-2 rounded-full shadow-sm hover:bg-gray-200 transition active:scale-95"
                        >
                            เข้าสู่ระบบ
                        </Link>
                    )}
                </div>
            </header>

            {/* ─── Sidebar Drawer (hamburger menu — works on ALL pages) ─── */}
            {sidebarOpen && (
                <div className="relative z-[150]">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[140] transition-opacity animate-in fade-in duration-200"
                        onClick={() => setSidebarOpen(false)}
                    />
                    {/* Sidebar Panel */}
                    <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white text-white flex flex-col shadow-2xl z-[150] animate-in slide-in-from-left duration-200">
                        {/* Sidebar Header */}
                        <div className="h-16 flex items-center justify-between px-5 bg-[#64964E] shrink-0">
                            <div className="flex items-center space-x-3">
                                <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center p-1.5 shadow">
                                    <Logo color="#64964E" className="w-full h-full object-contain" />
                                </div>
                                <span className="font-bold text-white text-lg">SBAY-Platform</span>
                            </div>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="text-white/80 hover:text-white transition text-xl w-8 h-8 flex items-center justify-center"
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        {/* Nav Items */}
                        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                            {navItems.map((item) => {
                                const active = isActive(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`flex items-center space-x-3 px-5 py-3.5 rounded-xl transition font-medium ${active
                                            ? 'bg-[#64964E] text-white shadow-sm'
                                            : 'text-[#64964E] hover:bg-[#64964E]/60 hover:text-white'
                                            }`}
                                    >
                                        <span className="text-xl w-6 text-center">{item.icon}</span>
                                        <span className="text-base">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </aside>
                </div>
            )}

            {/* ─── User Profile Drawer (slide from top-right) ─── */}
            {drawerOpen && user && (
                <div className="relative z-[150]">
                    <div
                        className="fixed inset-0 bg-black/40 z-[140] backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
                        onClick={() => setDrawerOpen(false)}
                    />
                    <div className="fixed top-16 right-4 z-[150] bg-white rounded-2xl shadow-2xl w-80 border border-gray-100 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                        {/* Profile header */}
                        <div className="bg-[#64964E] p-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center font-black text-white text-xl shadow">
                                    {user.profileImageUrl ? (
                                        <img src={user.profileImageUrl} alt="profile" className="w-full h-full object-cover rounded-xl" />
                                    ) : (
                                        (user.username || user.firstName || user.email || '?').charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm leading-tight">
                                        {user.username || user.firstName || user.email || 'ผู้ใช้งาน'}
                                    </p>
                                    <p className="text-green-100 text-xs mt-0.5">{user.email}</p>
                                </div>
                            </div>
                            <div className="mt-3 bg-gray-200 rounded-xl px-3 py-2 flex items-center justify-between">
                                <span className="text-black text-xs">แต้มสะสม</span>
                                <span className="text-[#64964E] font-black text-base">{user.points} pt</span>
                            </div>
                        </div>

                        {/* Menu */}
                        <div className="p-2">
                            {[
                                { href: '/profile', icon: <i className="fa-solid fa-user-edit text-black"></i>, label: 'แก้ไขโปรไฟล์' },
                                { href: '/dashboard', icon: <i className="fa-solid fa-chart-bar text-black"></i>, label: 'สถิติและแต้มสะสม' },
                                { href: '/redeem', icon: <i className="fa-solid fa-gift text-black"></i>, label: 'แลกของรางวัล' },
                                ...(user.role === 'PARTNER' ? [{ href: '/partner', icon: <i className="fa-solid fa-store text-black"></i>, label: 'จัดการหน้าร้าน' }] : []),
                                ...(user.role === 'ADMIN' ? [{ href: '/admin', icon: <i className="fa-solid fa-tools text-black"></i>, label: 'Admin Dashboard' }] : []),
                            ].map(item => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setDrawerOpen(false)}
                                    className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-[#64964E] transition text-gray-700"
                                >
                                    <span>{item.icon}</span>
                                    <span className="font-medium text-sm">{item.label}</span>
                                </Link>
                            ))}
                        </div>

                        <div className="border-t border-gray-100 p-3">
                            <button
                                onClick={() => { setDrawerOpen(false); logout(); }}
                                className="w-full hover:text-white hover:bg-red-400 text-red-600 font-bold py-2.5 rounded-xl transition flex items-center justify-center space-x-2 text-sm"
                            >
                                <span>ออกจากระบบ</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className={`flex-1 ${pathname === '/login' || pathname === '/register' ? 'overflow-hidden flex flex-col' : pathname === '/dashboard' ? 'overflow-y-auto flex flex-col' : 'overflow-y-auto'} ${pathname !== '/' && pathname !== '/login' && pathname !== '/register' ? 'pb-16 md:pb-0' : ''}`}>
                {children}
            </main>

            {/* Mobile Bottom Nav (non-home, non-auth pages) */}
            {pathname !== '/' && pathname !== '/login' && pathname !== '/register' && (
                <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 safe-area-inset-bottom">
                    <div className="flex items-center justify-around h-16 px-2">
                        {navItems.map((item) => {
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-all active:scale-90 ${active ? 'text-[#64964E]' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <span className={`text-2xl transition-transform ${active ? 'scale-110' : ''}`}>
                                        {item.icon}
                                    </span>
                                    {active && (
                                        <div className="absolute bottom-0 w-8 h-0.5 bg-[#64964E] rounded-full" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            )}


        </div>
    );
}
