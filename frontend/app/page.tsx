"use client";

import React from 'react';
import Link from 'next/link';
import { useSmartBin } from './context/SmartBinContext';

export default function Home() {
  const { machines, user, logout } = useSmartBin();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-500 font-sans p-4">
      {/* User Status Bar */}
      {user && (
        <div className="absolute top-4 right-4 flex items-center space-x-2 bg-white/20 backdrop-blur-sm p-2 rounded-full px-4 text-white">
          <span className="text-sm">สวัสดี, {user.firstName}</span>
          <div className="w-8 h-8 bg-white text-green-600 rounded-full flex items-center justify-center font-bold">
            {user.firstName.charAt(0)}
          </div>
        </div>
      )}
      <div className="flex flex-col items-center justify-center mt-14 mb-5 bg-green-600 border-4 border-white/20 rounded-2xl p-2 md:p-5 shadow-3xl text-center opacity-90 w-full max-w-4xl">
        <h1 className="text-5xl md:text-6xl font-bold text-green-600 shadow-xl py-2 px-[70px] md:px-[65px] bg-white rounded-xl mb-2">SBAY</h1>
        <p className="text-white text-lg md:text-xl opacity-90">Sorting Bottle with AI and Yield</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {machines.map((m) => (
          <Link
            key={m.id}
            href={`/login?mech_id=${m.id}`}
            className="bg-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition transform hover:-translate-y-2 flex flex-col items-center cursor-pointer active:scale-95"
          >
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4 text-4xl">
              ♻️
            </div>
            <h2 className="text-xl font-bold text-gray-800 text-center">{m.name}</h2>
            <span className="text-xs text-green-600 font-bold mt-2 bg-green-50 px-3 py-1 rounded-full">
              Status: Online
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-12 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 w-full md:w-auto px-4 md:px-0">
        {!user ? (
          <>
            <Link href="/register" className="bg-white text-green-600 font-bold py-3 px-8 rounded-full shadow-lg hover:bg-gray-50 transition text-center">
              ลงทะเบียนใหม่
            </Link>
            <Link href="/login" className="bg-transparent border-2 border-white text-white font-bold py-3 px-8 rounded-full hover:bg-white hover:text-green-600 transition text-center">
              เข้าสู่ระบบ / เช็คยอด
            </Link>
          </>
        ) : (
          <>
            {user.role === 'ADMIN' && (
              <Link href="/admin" className="bg-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-blue-600 transition border-3 text-center">
                Admin Dashboard
              </Link>
            )}
            <Link href="/dashboard" className="bg-white text-green-600 font-bold py-3 px-8 rounded-full shadow-lg hover:bg-gray-50 transition text-center">
              ดูยอดเงินคงเหลือ
            </Link>

            <button onClick={() => logout()} className="bg-transparent border-2 border-white/50 text-white/80 font-bold py-3 px-8 rounded-full hover:bg-white/10 transition">
              ออกจากระบบ
            </button>

          </>
        )}
      </div>

      <Link href="/admin/qr" className="mt-8 text-white/50 text-xs underline">
        [Admin] Generate QR Codes
      </Link>
    </div>
  );
}
