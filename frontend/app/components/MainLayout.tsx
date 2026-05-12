"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useSmartBin();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Auto-open sidebar on larger screens
  useEffect(() => {
    if (window.innerWidth >= 768) {
      setSidebarOpen(true);
    }
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-sans text-black">
      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full'} 
          fixed md:relative z-30 h-full bg-green-700 text-white flex flex-col shadow-xl transition-all duration-300 ease-in-out overflow-hidden shrink-0 whitespace-nowrap`}
      >
        <div className="p-4 border-b border-green-600 flex justify-between items-center h-16">
          <h1 className="text-2xl font-bold tracking-widest bg-white text-green-700 py-1 rounded-xl shadow-inner px-[78px]">SBAY</h1>

          <button className="md:hidden text-white font-bold text-xl" onClick={() => setSidebarOpen(false)}><i className="fa-solid fa-circle-xmark text-white"></i></button>
        </div>

        <nav className="flex-1 p-4 flex flex-col space-y-2 overflow-y-auto">
          <Link href="/" className={`px-4 py-3 rounded-xl transition ${pathname === '/' ? 'bg-green-600 font-bold text-white shadow-sm' : 'font-medium text-green-100 hover:bg-green-600 hover:text-white'}`}>
            <i className="fa-solid fa-house-chimney"></i>
            &nbsp;&nbsp; หน้าหลัก
          </Link>

          {user ? (
            <>
              <Link href="/dashboard" className={`px-4 py-3 rounded-xl transition ${pathname === '/dashboard' ? 'bg-green-600 font-bold text-white shadow-sm' : 'font-medium text-green-100 hover:bg-green-600 hover:text-white'}`}><i className="fa-solid fa-chart-simple"></i>
                &nbsp;&nbsp; สถิติและยอดคะแนนสะสม
              </Link>
              <Link href="/redeem" className={`px-4 py-3 rounded-xl transition ${pathname === '/redeem' ? 'bg-green-600 font-bold text-white shadow-sm' : 'font-medium text-green-100 hover:bg-green-600 hover:text-white'}`}><i className="fa-solid fa-right-left"></i>
                &nbsp;&nbsp; แลกของรางวัล
              </Link>
              {user.role === 'ADMIN' && (
                <Link href="/admin" className={`px-4 py-3 rounded-xl transition ${pathname.startsWith('/admin') ? 'bg-blue-600 font-bold text-white shadow-sm' : 'font-medium text-blue-200 hover:bg-blue-600 hover:text-white'}`}><i className="fa-solid fa-user-tie"></i>
                  &nbsp;&nbsp; Admin Dashboard
                </Link>
              )}
            </>
          ) : (
            <>
              <Link href="/login" className={`px-4 py-3 rounded-xl transition ${pathname === '/login' ? 'bg-green-600 font-bold text-white shadow-sm' : 'font-medium text-green-100 hover:bg-green-600 hover:text-white'}`}>
                <i className="fa-solid fa-right-to-bracket"></i>
                &nbsp;&nbsp; เข้าสู่ระบบ
              </Link>
              <Link href="/register" className={`px-4 py-3 rounded-xl transition ${pathname === '/register' ? 'bg-green-600 font-bold text-white shadow-sm' : 'font-medium text-green-100 hover:bg-green-600 hover:text-white'}`}>
                <i className="fa-solid fa-user-plus"></i>
                &nbsp;&nbsp; ลงทะเบียน
              </Link>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-green-600">
          {user ? (
            <button
              onClick={() => logout()}
              className="ml-2 w-full bg-red-500 hover:bg-red-400 text-white font-bold py-2.5  px-2 rounded-xl transition shadow-md text-sm"
            >
              <i className="fa-solid fa-right-from-bracket"></i> ออกจากระบบ
            </button>
          ) : (
            <div className="text-center text-xs opacity-70">SBAY Platform</div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
        {/* Topbar */}
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-4 z-10 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-600 focus:outline-none p-2 rounded-lg hover:bg-gray-100 flex items-center space-x-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            <span className="font-bold text-sm hidden md:inline">Menu</span>
          </button>

          {/* Mini Profile Top Right */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-100 cursor-pointer hover:bg-green-100 transition">
                <div className=" sm:block text-sm text-right">
                  <div className="font-bold text-gray-800">{user.firstName} {user.lastName}</div>
                  <div className="text-green-600 font-bold text-xs">{user.points} pt</div>
                </div>
                <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                  {user.firstName.charAt(0)}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 bg-gray-100 px-4 py-1.5 rounded-full font-bold">Guest</div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}
