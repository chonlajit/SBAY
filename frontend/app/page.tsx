"use client";

import React from 'react';
import Link from 'next/link';
import { useSmartBin } from './context/SmartBinContext';

export default function Home() {
  const { machines } = useSmartBin();

  return (
    <div className="p-6 md:p-10 min-h-full">
      <div className="mb-8 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">ยินดีต้อนรับสู่ SBAY</h2>
        <p className="text-gray-500 mt-2">เลือกตู้ Smart Bin ที่คุณต้องการเข้าใช้งานหรือจำลองการหยอดขยะ</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {machines.map((m) => (
          <Link
            key={m.id}
            href={`/login?mech_id=${m.id}`}
            className="bg-white rounded-3xl p-6 shadow-md hover:shadow-xl transition transform hover:-translate-y-1 flex flex-col items-center cursor-pointer border border-gray-100 group"
          >
            <div className="w-20 h-20 bg-green-50 group-hover:bg-green-100 rounded-full flex items-center justify-center mb-4 text-4xl transition">
              ♻️
            </div>
            <h3 className="text-lg font-bold text-gray-800 text-center">{m.name}</h3>
            <div className="mt-3 bg-green-100 text-green-600 text-xs font-bold px-3 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              พร้อมใช้งาน
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
