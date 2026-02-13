"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSmartBin } from '../context/SmartBinContext';

export default function RegisterPage() {
    const router = useRouter();
    const { register } = useSmartBin();

    // We default to BIN-001 for registration if not specified, or handle it via context
    // Ideally user comes here from Home, so we might want ?mech_id here too.
    // simpler: just register to BIN-001 or no machine binding initially?
    // Requirement says: Bind to machine on register.
    // Let's assume passed in query or default.
    const machineId = 'BIN-001';

    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        studentId: '',
        phoneNumber: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        if (!form.phoneNumber || !form.firstName) return;

        const success = await register(form, machineId);
        if (success) {
            router.push(`/operation/${machineId}`);
        } else {
            alert('Registration Failed');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-green-500 font-sans p-4">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-md">
                <div className="bg-green-600 p-6 text-center">
                    <h2 className="text-2xl font-bold text-white">ลงทะเบียนสมาชิก</h2>
                    <p className="text-green-100 text-sm">กรอกข้อมูลเพื่อสะสมแต้ม</p>
                </div>

                <div className="p-8 space-y-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">เบอร์โทรศัพท์</label>
                        <input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} className="w-full bg-gray-100 rounded-lg p-3 text-gray-800" placeholder="0XX-XXX-XXXX" />
                    </div>
                    <div className="flex space-x-2">
                        <div className="flex-1">
                            <label className="block text-gray-700 text-sm font-bold mb-2">ชื่อ</label>
                            <input name="firstName" value={form.firstName} onChange={handleChange} className="w-full bg-gray-100 rounded-lg p-3 text-gray-800" placeholder="ชื่อจริง" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-gray-700 text-sm font-bold mb-2">นามสกุล</label>
                            <input name="lastName" value={form.lastName} onChange={handleChange} className="w-full bg-gray-100 rounded-lg p-3 text-gray-800" placeholder="นามสกุล" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">รหัสนักศึกษา (ถ้ามี)</label>
                        <input name="studentId" value={form.studentId} onChange={handleChange} className="w-full bg-gray-100 rounded-lg p-3 text-gray-800" placeholder="เช่น 64XXXXXX" />
                    </div>

                    <div className="flex space-x-4 pt-4">
                        <button onClick={() => router.back()} className="flex-1 bg-gray-200 text-gray-600 font-bold py-3 rounded-full hover:bg-gray-300 transition">
                            กลับ
                        </button>
                        <button onClick={handleSubmit} className="flex-1 bg-green-500 text-white font-bold py-3 rounded-full hover:bg-green-600 transition shadow-lg">
                            ลงทะเบียน
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
