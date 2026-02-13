"use client";

import React, { useState, useEffect } from 'react';
import QRCode from "react-qr-code";

const MACHINES = [
    { id: 'BIN-001', name: 'Machine 1 (Front)' },
    { id: 'BIN-002', name: 'Machine 2 (Back)' },
    { id: 'BIN-003', name: 'Machine 3 (Cafeteria)' },
];

export default function QRParamsPage() {
    const [baseUrl, setBaseUrl] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setBaseUrl(window.location.protocol + "//" + window.location.hostname + ":" + window.location.port);
        }
    }, []);

    return (
        <div className="min-h-screen bg-green-100 p-8">
            <h1 className="text-3xl font-bold text-center mb-8 text-black">Machine QR Codes</h1>

            <div className="max-w-md mx-auto mb-8 bg-white p-4 rounded shadow">
                <label className="block text-sm font-bold mb-2 text-black">Base URL (Local Network IP):</label>
                <input
                    className="w-full border p-2 rounded text-gray-500"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="e.g. http://192.168.1.56:3000"
                />
                <p className="text-xs text-gray-500 mt-2">
                    Tip: Use your computer's LAN IP address so mobiles can connect.
                    (http://192.168.1.56:3000)
                </p>
            </div>

            <div className="bg-green-50 p-6 rounded-2xl shadow-lg border-2 border-green-200 mb-12 flex flex-col items-center">
                <h2 className="text-2xl font-bold mb-2 text-green-800">🌱 New User Registration</h2>
                <p className="text-gray-600 mb-6">Scan to register a new account</p>
                <div className="bg-white p-4 border-2 border-green-500 rounded-xl">
                    <QRCode
                        value={`${baseUrl}/register`}
                        size={200}
                    />
                </div>
                <p className="mt-4 text-sm font-bold text-green-700">
                    {`${baseUrl}/register`}
                </p>
            </div>

            <h2 className="text-xl font-bold mb-4 text-black border-b pb-2">Login for Specific Machines</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {MACHINES.map(m => (
                    <div key={m.id} className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center">
                        <h2 className="text-xl font-bold mb-2 text-black">{m.name}</h2>
                        <p className="text-gray-500 mb-4 text-sm">{m.id}</p>
                        <div className="bg-white p-2 border rounded">
                            <QRCode
                                value={`${baseUrl}/login?mech_id=${m.id}`}
                                size={150}
                            />
                        </div>
                        <p className="mt-4 text-xs break-all text-center text-gray-400">
                            {`${baseUrl}/login?mech_id=${m.id}`}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
