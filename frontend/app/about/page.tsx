"use client";

import React from 'react';
import Link from 'next/link';
import Logo from '../../components/icons/Logo';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
            {/* Hero Banner */}
            <section className="bg-[#64964E] text-white py-12 md:py-20 px-4 md:px-8 text-center relative overflow-hidden shadow-md">
                <div className="max-w-4xl mx-auto relative z-10">
                    <div className="w-20 h-20 md:w-28 md:h-28 bg-white rounded-full flex items-center justify-center mx-auto mb-6 p-4 shadow-lg">
                        <Logo color="#64964E" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
                        ABOUT SBAY-Platform
                    </h1>
                    <p className="text-lg md:text-2xl font-medium opacity-90 max-w-2xl mx-auto leading-relaxed">
                        ระบบรีไซเคิลอัจฉริยะ เพื่อการจัดการขยะที่ยั่งยืนและสร้างคุณค่าให้สังคม
                    </p>
                </div>
                {/* Decorative Circles */}
                <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-white/10 rounded-full blur-xl pointer-events-none" />
                <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-xl pointer-events-none" />
            </section>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 md:px-8 py-12 space-y-12">
                {/* Mission Section */}
                <section className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-[#64964E]/10 text-[#64964E] rounded-2xl flex items-center justify-center text-4xl md:text-5xl shrink-0">
                        <i className="fa-solid fa-leaf"></i>
                    </div>
                    <div className="space-y-3 text-center md:text-left">
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                            วิสัยทัศน์และภารกิจของเรา (Our Vision & Mission)
                        </h2>
                        <p className="text-gray-600 text-base md:text-lg leading-relaxed">
                            SBAY Platform มุ่งมั่นที่จะสร้างสังคมคาร์บอนต่ำ โดยเปลี่ยนขยะรีไซเคิลให้กลายเป็นคุณค่าและแต้มสะสม ผ่านตู้รีไซเคิลอัจฉริยะอัตโนมัติ เพื่อกระตุ้นให้ทุกคนร่วมใจกันแยกขยะอย่างยั่งยืน
                        </p>
                    </div>
                </section>

                {/* Grid Features */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center space-y-4 hover:-translate-y-1 transition duration-300">
                        <div className="w-16 h-16 bg-[#5BA1C2]/10 text-[#5BA1C2] rounded-2xl flex items-center justify-center text-3xl mx-auto">
                            <i className="fa-solid fa-[#5BA1C2] fa-recycle"></i>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">1. หยดขวดรีไซเคิล</h3>
                        <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                            นำขวดพลาสติกมาหยอดที่ตู้ SBAY Kiosk อัจฉริยะ ระบบจะคำนวณและประมวลผลอัตโนมัติ
                        </p>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center space-y-4 hover:-translate-y-1 transition duration-300">
                        <div className="w-16 h-16 bg-[#64964E]/10 text-[#64964E] rounded-2xl flex items-center justify-center text-3xl mx-auto">
                            <i className="fa-solid fa-coins"></i>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">2. สะสมแต้มทันที</h3>
                        <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                            รับแต้มสะสมเข้าบัญชีของคุณทันทีเมื่อหยอดขวดสำเร็จ สามารถตรวจสอบสถิติได้แบบ Real-time
                        </p>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center space-y-4 hover:-translate-y-1 transition duration-300">
                        <div className="w-16 h-16 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center text-3xl mx-auto">
                            <i className="fa-solid fa-gift"></i>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">3. แลกสิทธิพิเศษ</h3>
                        <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                            นำแต้มสะสมไปแลกของรางวัล ส่วนลดร้านค้า หรือหน่วยกิตกิจกรรมทางสังคมได้มากมาย
                        </p>
                    </div>
                </section>

                {/* Back to Home Action */}
                <div className="text-center pt-8">
                    <Link
                        href="/"
                        className="inline-flex items-center space-x-3 bg-[#64964E] text-white font-bold text-lg md:text-xl px-8 py-4 rounded-full shadow-lg hover:bg-[#5c8c47] active:scale-95 transition"
                    >
                        <i className="fa-solid fa-house"></i>
                        <span>กลับสู่หน้าหลัก (Back to Home)</span>
                    </Link>
                </div>
            </main>
        </div>
    );
}
