"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSmartBin } from './context/SmartBinContext';
import StatsDashboard from '../components/StatsDashboard';
import Info1 from '../components/icons/Info1';
import Logo from '../components/icons/Logo';

export default function Home() {
    const { user, isInitialized } = useSmartBin();
    const router = useRouter();

    return (
        <div className="relative overflow-x-hidden bg-white">

            {/* ===== TOP SECTION ===== */}
            {/*
                Two-column layout:
                - Left (gray, col-span-5): normal height, rounded-bl-[2.5rem]
                - Right (green, col-span-7): taller — extends down overlapping middle section, rounded-bl-[2.5rem]
            */}
            <div id="top-section" className="flex flex-col lg:flex-row relative z-0 bg-white">
                {/* ─── Left Column Wrapper ─── */}
                <div className="w-full lg:w-5/12 shrink-0 flex flex-col min-h-[calc(100vh-4rem)] lg:min-h-0 justify-between relative z-10">
                    
                    {/* Gap filler for the right edge gaps */}
                    <div 
                        className="hidden lg:block absolute right-0 top-0 bottom-0 w-1/2 bg-cover bg-center z-0"
                        style={{ backgroundImage: "url('/images/bg_loginregis.jpg')" }}
                    >
                        <div className="absolute inset-0 bg-[#64964E]/30 backdrop-blur-md"></div>
                    </div>

                    {/* Hero section (Opaque with its own background image to completely hide the gap filler) */}
                    <div 
                        className="flex flex-col px-4 md:px-8 xl:px-10 pt-10 md:pt-14 pb-[20px] md:pb-[30px] rounded-[2.5rem] rounded-tl-none flex-1 justify-between relative overflow-hidden bg-cover bg-center z-10"
                        style={{ backgroundImage: "url('/images/bg_loginregis.jpg')" }}
                    >
                        {/* Dual-Layer Inner Shadow Overlay over Background Image */}
                        <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(0,0,0,0.25),inset_0_12px_24px_rgba(0,0,0,0.5)] pointer-events-none rounded-[2.5rem] rounded-tl-none z-0"></div>

                        <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-2 relative z-10">
                            <h2 className="text-6xl md:text-[5.5rem] font-black text-white tracking-tight shrink-0 drop-shadow-md">Hi.</h2>
                            {!isInitialized ? (
                                /* Skeleton User Card */
                                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow p-4 border border-white/50 animate-pulse w-fit">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-gray-200 rounded-2xl"></div>
                                        <div className="h-5 bg-gray-200 rounded w-28"></div>
                                    </div>
                                </div>
                            ) : user ? (
                                /* User Card */
                                <div className="bg-[#64964E] rounded-[32px] shadow-md px-4 py-2.5 md:px-5 md:py-3 border border-white/40 w-fit inline-flex items-center backdrop-blur-sm">
                                    <div className="flex items-center space-x-3 md:space-x-4">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-black rounded-2xl flex items-center justify-center text-white text-2xl md:text-3xl font-bold shadow-sm shrink-0">
                                            {(user.username || user.firstName || user.email || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 pr-2">
                                            <h3 className="font-bold text-white text-lg md:text-3xl leading-tight truncate">
                                                {user.username || user.firstName || user.email || 'ผู้ใช้งาน'}
                                            </h3>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="pt-1 md:pt-2 relative z-10">
                            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[4rem] xl:text-[4.5rem] leading-[1.02] font-black tracking-tight drop-shadow-md">
                                <span className="block text-white text-[1em]">WELCOME TO</span>
                                <span className="text-white font-bold">SBAY- Platform</span>
                            </h1>
                        </div>

                        <div className="pt-[10px] md:pt-[24px] flex flex-col items-center text-center mb-[10px] md:mb-[10px] relative z-10">
                            <p className="text-white text-base sm:text-lg md:text-lg xl:text-xl font-bold leading-relaxed drop-shadow">
                                ระบบรีไซเคิลอัจฉริยะ สะสมแต้มทุกครั้งที่คุณรีไซเคิล<br />
                                "เพื่อสิ่งแวดล้อมที่ดีกว่า"
                            </p>
                        </div>

                        <div className="flex justify-end relative z-10 ">
                            <Link href="/about" className="text-black text-sm md:text-base font-bold px-6 py-2 md:px-8 md:py-2.5 bg-[#64964E] hover:bg-[#548041] rounded-full transition shadow-lg border border-white/30">
                                about us.
                            </Link>
                        </div>
                    </div>

                    {/* White section (Feature tab) — top-right rounded curve against green background */}
                    <div className="relative z-10">
                        <div id="features-section" className="flex w-full bg-white rounded-tr-[2.5rem] rounded-br-none flex-col justify-center px-4 md:px-8 xl:px-10 pt-8 md:pt-10 pb-4 md:pb-5 relative shrink-0 z-10">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const isMobile = window.innerWidth < 1024;
                                    const targetId = isMobile ? 'mobile-back-button' : 'action-buttons-section';
                                    const el = document.getElementById(targetId);
                                    if (el) {
                                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }}
                                className="w-full bg-[#64964E] hover:bg-[#5c8c47] active:scale-[0.99] transition rounded-full relative z-30 flex items-center justify-center px-6 md:px-8 py-3 md:py-4 shadow-[0_25px_30px_-15px_rgba(0,0,0,0.25),0_10px_15px_-5px_rgba(0,0,0,0.4)] cursor-pointer"
                            >
                                <span className="text-lg md:text-2xl xl:text-3xl font-bold text-white pointer-events-none">Features</span>
                                <i className="fa-solid fa-caret-down text-xl md:text-3xl text-white absolute right-6 md:right-8 pointer-events-none"></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ─── Right Column (glass panel) ─── */}
                <div 
                    className="w-full lg:w-7/12 shrink-0 bg-cover bg-center flex flex-col justify-between px-4 md:px-8 lg:pl-10 xl:pl-12 pr-4 md:pr-8 xl:pr-10 pt-4 md:pt-6 pb-4 md:pb-5 rounded-bl-[2.5rem] relative z-10 lg:mb-[-0px]"
                    style={{ backgroundImage: "url('/images/bg_loginregis.jpg')" }}
                >
                    <div className="absolute inset-0 bg-[#64964E]/30 backdrop-blur-md rounded-bl-[2.5rem] z-0"></div>
                    <div className="w-full rounded-[2.5rem] shadow-[0_15px_10px_-10px_rgba(0,0,0,0.1)] relative z-10">
                        <StatsDashboard />
                    </div>

                    {/* Sponsors */}
                    <div className="flex justify-end space-x-4 pt-1 pr-2 pb-0.5 relative z-10">
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-white/40 backdrop-blur-sm rounded-lg shadow-sm border border-white/50 flex items-center justify-center text-white text-xs"></div>
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-white/40 backdrop-blur-sm rounded-lg shadow-sm border border-white/50 flex flex-col items-center justify-center text-white">
                            <span className="text-[10px] mt-1 font-semibold text-gray-700/80">(sponsor)</span>
                        </div>
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-white/40 backdrop-blur-sm rounded-lg shadow-sm border border-white/50 flex items-center justify-center text-white text-xs"></div>
                    </div>

                    {/* Statistics Tab — Button to scroll back up to Top Section (Mobile & Desktop) */}
                    <div className="pt-1.5 w-full flex justify-center relative z-10">
                        <button
                            id="mobile-back-button"
                            onClick={() => {
                                document.getElementById('top-section')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="w-full bg-white/80 hover:bg-white active:scale-[0.99] backdrop-blur-md transition rounded-full relative flex items-center justify-center px-6 md:px-8 py-3 md:py-4 shadow-[0_15px_25px_-10px_rgba(0,0,0,0.15)] border border-white/60 cursor-pointer mt-8 md:mt-10 scroll-mt-4"
                        >
                            <span className="text-lg md:text-2xl xl:text-3xl font-bold text-[#64964E]">Back</span>
                            <i className="fa-solid fa-caret-up text-xl md:text-3xl text-[#64964E] absolute right-6 md:right-8"></i>
                        </button>
                    </div>
                </div>

            </div>{/* end top section flex row */}

            {/* Middle Section (Actions) */}
            <div id="action-buttons-section" className="relative bg-white overflow-hidden scroll-mt-16 lg:scroll-mt-[115px]">
                <div className="px-4 md:px-8 xl:px-10 pt-6 md:pt-20 pb-16 md:pb-24">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
                        {/* Left Column: Action Buttons (70%) */}
                        <div className="w-full lg:w-[70%] space-y-5 md:space-y-6">
                            {!isInitialized ? (
                                <div className="space-y-4 md:space-y-6 animate-pulse">
                                    <div className="flex flex-col md:flex-row items-center md:items-center justify-center md:justify-start">
                                        <div className="h-[100px] md:h-[160px] w-full max-w-[530px] md:w-[530px] bg-gray-300 rounded-2xl shrink-0"></div>
                                        <div className="mt-3 md:mt-0 md:ml-10 lg:ml-12 w-full md:w-1/3">
                                            <div className="h-8 bg-gray-300 rounded-md w-3/4 mb-4"></div>
                                            <div className="h-4 bg-gray-300 rounded-md w-1/2 mb-3"></div>
                                            <div className="h-4 bg-gray-300 rounded-md w-1/2 mb-3"></div>
                                            <div className="h-4 bg-gray-300 rounded-md w-1/2"></div>
                                        </div>
                                        <div className="h-[100px] md:h-[120px] w-full max-w-[530px] md:w-[530px] bg-gray-300 rounded-2xl shrink-0"></div>
                                        <div className="mt-3 md:mt-0 md:ml-10 lg:ml-12 w-full md:w-1/3">
                                            <div className="h-8 bg-gray-300 rounded-md w-3/4 mb-4"></div>
                                            <div className="h-4 bg-gray-300 rounded-md w-1/2 mb-3"></div>
                                            <div className="h-4 bg-gray-300 rounded-md w-1/2 mb-3"></div>
                                            <div className="h-4 bg-gray-300 rounded-md w-1/2"></div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:flex-row items-center md:items-center justify-center md:justify-start">
                                        <div className="h-[100px] md:h-[120px] w-full max-w-[530px] md:w-[530px] bg-gray-300 rounded-2xl shrink-0"></div>
                                        <div className="mt-3 md:mt-0 md:ml-10 lg:ml-12 w-full md:w-1/3">
                                            <div className="h-8 bg-gray-300 rounded-md w-3/4 mb-4"></div>
                                            <div className="h-4 bg-gray-300 rounded-md w-1/2 mb-3"></div>
                                            <div className="h-4 bg-gray-300 rounded-md w-1/2"></div>
                                        </div>
                                    </div>
                                </div>
                            ) : user ? (
                                /* Logged In: Dashboard & Redeem Buttons */
                                <div className="space-y-12 md:space-y-16 flex flex-col items-center md:items-start">
                                    <Link href="/dashboard" className="flex flex-col md:flex-row items-center md:items-center justify-center md:justify-start w-full max-w-[530px] md:max-w-none">
                                        <div className="group bg-gray-200 text-[#64964E] hover:text-black hover:bg-[#64964E] hover:ring-4 hover:ring-black hover:-translate-y-1 transition px-4 py-3 md:px-10 md:py-8 rounded-2xl w-full max-w-[530px] md:w-[530px] flex justify-between items-center shadow-xl shrink-0">
                                            <span className="text-xl md:text-5xl font-bold my-auto leading-none flex-1 text-center md:text-left md:group-hover:text-[50px]">สถิติของคุณ</span>
                                            <div className="w-12 h-12 md:w-[96px] md:h-[96px] bg-[#64964E] rounded-xl flex items-center justify-center text-white group-hover:bg-white group-hover:text-[#64964E] transition shrink-0">
                                                <i className="fa-solid fa-chart-column text-2xl md:text-5xl"></i>
                                            </div>
                                        </div>
                                        <div className="mt-3 md:mt-0 md:ml-8 lg:ml-10 text-gray-700 font-medium text-left w-full md:w-auto px-4 md:px-0">
                                            <p className="font-bold text-lg md:text-2xl lg:text-3xl text-[#64964E]">ดูสถิติและประวัติของคุณ</p>
                                            <p className="font-light text-sm md:text-lg lg:text-xl md:ml-6 mt-1 md:mt-2">• คะแนนสะสมของคุณ</p>
                                            <p className="font-light text-sm md:text-lg lg:text-xl md:ml-6 mt-1 md:mt-2">• จำนวนขยะสะสมของคุณ</p>
                                            <p className="font-light text-sm md:text-lg lg:text-xl md:ml-6 mt-1 md:mt-2">• ประวัติการรีไซเคิลและการแลก</p>
                                        </div>
                                    </Link>

                                    <Link href="/redeem" className="flex flex-col md:flex-row items-center md:items-center justify-center md:justify-start w-full max-w-[530px] md:max-w-none">
                                        <div className="group bg-gray-200 text-[#64964E] hover:text-black hover:bg-[#64964E] hover:ring-4 hover:ring-black hover:-translate-y-1 transition px-4 py-3 md:px-10 md:py-8 rounded-2xl w-full max-w-[530px] md:w-[530px] flex justify-between items-center shadow-md shrink-0">
                                            <span className="text-xl md:text-5xl font-bold my-auto leading-none flex-1 text-center md:text-left md:group-hover:text-[45px]">แลกของรางวัล</span>
                                            <div className="w-12 h-12 md:w-[96px] md:h-[96px] bg-[#64964E] rounded-xl flex items-center justify-center text-white group-hover:bg-white group-hover:text-[#64964E] transition shrink-0">
                                                <i className="fa-solid fa-gift text-2xl md:text-5xl"></i>
                                            </div>
                                        </div>
                                        <div className="mt-3 md:mt-0 md:ml-8 lg:ml-10 text-gray-700 font-medium text-left w-full md:w-auto px-4 md:px-0">
                                            <p className="font-bold text-lg md:text-2xl lg:text-3xl text-[#64964E]">ใช้แต้มสะสมแลกสิทธิพิเศษ</p>
                                            <p className="font-light text-sm md:text-lg lg:text-xl md:ml-6 mt-1 md:mt-2">• ของรางวัลพิเศษ</p>
                                            <p className="font-light text-sm md:text-lg lg:text-xl md:ml-6 mt-1 md:mt-2">• ส่วนลดร้านค้า</p>
                                            <p className="font-light text-sm md:text-lg lg:text-xl md:ml-6 mt-1 md:mt-2">• หน่วยกิตกิจกรรมต่างๆ</p>
                                        </div>
                                    </Link>
                                </div>
                            ) : (
                                /* Guest Features */
                                <div className="space-y-11 md:space-y-14 flex flex-col items-center md:items-start">
                                    <Link href="/login?redirect=/" className="flex flex-col md:flex-row items-center md:items-center justify-center md:justify-start w-full max-w-[530px] md:max-w-none">
                                        <div className="group bg-black text-white hover:text-black hover:bg-[#64964E] hover:ring-4 hover:ring-black hover:-translate-y-1 transition px-4 py-3 md:px-10 md:py-8 rounded-2xl w-full max-w-[530px] md:w-[530px] flex justify-between items-center shadow-md shrink-0">
                                            <span className="text-xl md:text-5xl font-bold my-auto leading-none flex-1 text-center md:text-left md:group-hover:text-[55px]">เข้าสู่ระบบ</span>
                                            <div className="w-12 h-12 md:w-[96px] md:h-[96px] bg-[#64964E] rounded-xl flex items-center justify-center text-white group-hover:bg-white group-hover:text-[#64964E] transition shrink-0">
                                                <i className="fa-solid fa-right-to-bracket text-2xl md:text-5xl"></i>
                                            </div>
                                        </div>
                                        <div className="mt-3 md:mt-0 md:ml-8 lg:ml-10 text-gray-700 text-base md:text-xl lg:text-2xl font-medium leading-relaxed text-left px-4 md:px-0">
                                            ดูสถิติและประวัติของคุณ <br className="hidden md:block" />
                                            แลกแต้มสะสมเป็นของรางวัล
                                        </div>
                                    </Link>

                                    <div className="flex flex-col md:flex-row items-center md:items-center justify-center md:justify-start w-full max-w-[530px] md:max-w-none">
                                        <div className="group bg-white text-gray-700 hover:-translate-y-1 transition px-4 py-3 md:px-10 md:py-8 rounded-2xl w-full max-w-[530px] md:w-[530px] flex justify-between items-center border-2 border-gray-200 border-dashed shrink-0">
                                            <span className="text-xl md:text-5xl font-bold text-gray-400 my-auto leading-none flex-1 text-center md:text-left">ยังไม่มีบัญชี?</span>
                                            <Link href="/register" className="w-12 h-12 md:w-[96px] md:h-[96px] bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:bg-[#64964E] hover:text-white transition cursor-pointer">
                                                <i className="fa-solid fa-user-plus text-2xl md:text-5xl"></i>
                                            </Link>
                                        </div>
                                        <div className="mt-3 md:mt-0 md:ml-8 lg:ml-10 text-gray-500 text-lg md:text-xl lg:text-2xl font-medium leading-relaxed text-left px-4 md:px-0">
                                            สมัครสมาชิกใหม่ฟรี <br className="hidden md:block" />
                                            รับแต้มสะสมทันที ทุกครั้งที่คุณช่วยเรารีไซเคิล
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Info1 SVG Illustration (30%) */}
                        <div className="hidden lg:flex shrink-0 w-120 lg:w-[30%] justify-center items-center pointer-events-none select-none pl-2">
                            <Info1 secondaryColor="#64964E" primaryColor="#5BA1C2" className="w-full h-auto max-w-sm" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section (Interactive Image Slideshow) */}
            {(() => {
                const slides = [
                    {
                        id: 1,
                        title: 'ขั้นตอนที่ 1: สมัครสมาชิก',
                        description: 'สมัครสมาชิกบนแพลตฟอร์ม SBAY Smart Recycling เพื่อเริ่มสะสมคะแนน',
                        image: '/images/Howto1.jpg'
                    },
                    {
                        id: 2,
                        title: 'ขั้นตอนที่ 2: กรอกเบอร์โทรที่ตู้',
                        description: 'ไปที่ตู้รีไซเคิลอัจฉริยะ SBAY แล้วกรอกเบอร์โทรศัพท์ของคุณที่หน้าจอเพื่อยืนยันตัวตน',
                        image: '/images/Howto2.jpg'
                    },
                    {
                        id: 3,
                        title: 'ขั้นตอนที่ 3: เริ่มหยอดขวด',
                        description: 'หยอดขวดพลาสติก กระป๋อง หรือกล่องเครื่องดื่มลงช่องรับขยะ แล้วรับแต้มสะสมเข้าบัญชีทันที',
                        image: '/images/Howto3.jpg'
                    }
                ];

                const [currentSlide, setCurrentSlide] = React.useState(0);

                const nextSlide = () => {
                    setCurrentSlide((prev) => (prev + 1) % slides.length);
                };

                const prevSlide = () => {
                    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
                };

                return (
                    <div className="w-full relative h-[450px] md:h-[550px] lg:h-[620px] flex items-center justify-center overflow-hidden group" style={{ backgroundImage: "url('/images/bg-white.jpg')" }}>
                        {/* Slide Content */}
                        {slides.map((slide, index) => (
                            <div
                                key={slide.id}
                                className={`absolute inset-0 transition-opacity duration-700 ease-in-out flex flex-col items-center justify-center p-4 md:p-8 ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                                    }`}
                            >
                                {/* Full Crisp Image (No dark mask, 100% unblocked) */}
                                <div className="w-full h-full flex items-center justify-center pb-16 md:pb-20">
                                    <img
                                        src={slide.image}
                                        alt={slide.title}
                                        onError={(e) => {
                                            (e.target as HTMLElement).style.display = 'none';
                                        }}
                                        className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
                                    />
                                </div>

                                {/* Floating Bottom Caption Bar (Does not block the image) */}
                                <div className="absolute bottom-12 md:bottom-14 left-4 right-4 md:left-auto md:right-auto z-20 text-center">
                                    <div className="bg-black/85 backdrop-blur-md border border-white/10 px-5 py-3 md:px-8 md:py-3.5 rounded-2xl shadow-2xl max-w-2xl mx-auto">
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            <span className="bg-[#64964E] text-white text-[11px] md:text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0">
                                                #{index + 1}
                                            </span>
                                            <h3 className="text-sm md:text-lg lg:text-xl font-bold text-white">
                                                {slide.title}
                                            </h3>
                                        </div>
                                        <p className="text-gray-300 text-xs md:text-sm font-normal">
                                            {slide.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Navigation Arrow Left */}
                        <div className="absolute inset-y-0 left-2 md:left-8 flex items-center z-30">
                            <button
                                onClick={prevSlide}
                                className="text-gray-300 hover:text-white bg-black/40 hover:bg-black/70 p-3 md:p-4 rounded-full transition transform hover:scale-110 active:scale-95 shadow-lg backdrop-blur-sm cursor-pointer"
                                aria-label="Previous Slide"
                            >
                                <i className="fa-solid fa-chevron-left text-2xl md:text-4xl"></i>
                            </button>
                        </div>

                        {/* Navigation Arrow Right */}
                        <div className="absolute inset-y-0 right-2 md:left-auto md:right-8 flex items-center z-30">
                            <button
                                onClick={nextSlide}
                                className="text-gray-300 hover:text-white bg-black/40 hover:bg-black/70 p-3 md:p-4 rounded-full transition transform hover:scale-110 active:scale-95 shadow-lg backdrop-blur-sm cursor-pointer"
                                aria-label="Next Slide"
                            >
                                <i className="fa-solid fa-chevron-right text-2xl md:text-4xl"></i>
                            </button>
                        </div>

                        {/* Dot Indicators */}
                        <div className="absolute bottom-5 md:bottom-8 left-0 right-0 flex justify-center space-x-3 z-30">
                            {slides.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentSlide(index)}
                                    className={`h-3 rounded-full transition-all duration-300 cursor-pointer ${index === currentSlide ? 'w-8 bg-[#64964E]' : 'w-3 bg-gray-500 hover:bg-gray-400'
                                        }`}
                                    aria-label={`Go to slide ${index + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* Footer */}
            <footer className="bg-black text-gray-500 py-8 text-center text-sm w-full border-t border-gray-800">
                <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="flex items-center gap-2 font-bold text-[#64964E] text-lg">
                        <Logo color="#64964E" className="w-6 h-6" /> SBAY
                    </div>
                    <p>&copy; {new Date().getFullYear()} SBAY Smart Recycling Platform. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
