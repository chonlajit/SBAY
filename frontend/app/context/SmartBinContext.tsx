"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { useRouter } from 'next/navigation';

// Types
export interface User {
    id: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    studentId: string;
    points: number;
    volunteerHours?: number;
    activityCredits?: number;
    role?: string;
}

export interface WasteType {
    type: string;
    label: string;
    points: number;
}

interface SmartBinContextType {
    user: User | null;
    sessionPoints: number;
    sessionHistory: any[];
    machines: { id: string, name: string }[];
    wasteTypes: WasteType[];
    login: (phone: string, machineId: string) => Promise<{ success: boolean; message?: string }>;
    register: (form: any, machineId: string) => Promise<boolean>;
    logout: (machineId?: string) => void;
    releaseMachine: (machineId: string) => Promise<void>;
    simulateDrop: (type: string, machineId: string) => Promise<void>;
    wsConnected: boolean;
    token: string | null;
}

const SmartBinContext = createContext<SmartBinContextType | null>(null);

export const MACHINES = [
    { id: 'BIN-001', name: 'Machine 1 (Front)' },
    { id: 'BIN-002', name: 'Machine 2 (Back)' },
    { id: 'BIN-003', name: 'Machine 3 (Cafeteria)' },
];

export const WASTE_TYPES = [
    { type: 'CLEAR_BOTTLE', label: 'ขวดใส', points: 1 },
    { type: 'OPAQUE_BOTTLE', label: 'ขวดขุ่น', points: 2 },
    { type: 'STEEL_CAN', label: 'กระป๋องเหล็ก', points: 2 },
    { type: 'ALUMINUM_CAN', label: 'กระป๋องอลูมิเนียม', points: 3 },
];

export function SmartBinProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [sessionPoints, setSessionPoints] = useState(0);
    const [sessionHistory, setSessionHistory] = useState<any[]>([]);
    const [wsConnected, setWsConnected] = useState(false);

    // Config
    const [apiBase, setApiBase] = useState('http://localhost:8080/api');
    const [wsBase, setWsBase] = useState('ws://localhost:8080/ws-native');

    const clientRef = useRef<Client | null>(null);
    const router = useRouter();

    // 1. Init Config & Load Session
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            setApiBase(`http://${hostname}:8080/api`);
            setWsBase(`ws://${hostname}:8080/ws-native`);

            // Restore session
            const savedUser = localStorage.getItem('sbay_user');
            const savedToken = localStorage.getItem('sbay_token');
            if (savedUser && savedToken) {
                setUser(JSON.parse(savedUser));
                setToken(savedToken);
            }
        }
    }, []);

    // 2. WebSocket Connection Logic (Auto-connect if user exists)
    // We need to know the CURRENT machine ID to login effectively on refresh.
    // For now, we will rely on the page passing the machine ID or URL params.
    // BUT, the context itself doesn't know the machine ID unless we store it.
    // Let's create a specific "connect" function that pages call.

    const connectWebSocket = (userId: string, machineId: string) => {
        if (clientRef.current && clientRef.current.active) {
            // If already connected, just ensure we send the login signal again (for refresh safety)
            clientRef.current.publish({
                destination: `/app/login/${machineId}`,
                body: userId
            });
            return;
        }

        const client = new Client({
            brokerURL: wsBase,
            reconnectDelay: 5000,
            onConnect: () => {
                console.log('WS Connected');
                setWsConnected(true);

                // Notify backend of Login
                client.publish({
                    destination: `/app/login/${machineId}`,
                    body: userId
                });

                // Listen for Machine Updates (Current Session)
                client.subscribe(`/topic/machine/${machineId}`, (msg) => {
                    if (msg.body) {
                        const tx = JSON.parse(msg.body);
                        setSessionPoints(prev => prev + tx.pointsEarned);
                        setSessionHistory(prev => [tx, ...prev]);
                    }
                });

                // Listen for User Updates (Total Points)
                client.subscribe(`/topic/user/${userId}`, (msg) => {
                    if (msg.body) {
                        const updatedUser = JSON.parse(msg.body);
                        setUser(updatedUser);
                        // Update LocalStorage to keep points in sync
                        localStorage.setItem('sbay_user', JSON.stringify(updatedUser));
                    }
                });
            },
            onStompError: (frame) => {
                console.error('WS Error:', frame.headers['message']);
            },
            onWebSocketClose: () => {
                setWsConnected(false);
            }
        });

        client.activate();
        clientRef.current = client;
    };

    const login = async (phoneNumber: string, machineId: string): Promise<{ success: boolean; message?: string }> => {
        try {
            const res = await fetch(`${apiBase}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber, machineId })
            });

            if (!res.ok) {
                // Try to get error text
                try {
                    const errData = await res.json();
                    return { success: false, message: errData.error || 'Login Server Error' };
                } catch {
                    return { success: false, message: `Server Error: ${res.status}` };
                }
            }

            const data = await res.json();

            if (data.error) {
                return { success: false, message: data.error };
            }

            if (data.user && data.token) {
                setUser(data.user);
                setToken(data.token);
                localStorage.setItem('sbay_user', JSON.stringify(data.user));
                localStorage.setItem('sbay_token', data.token);

                // Clear previous session data
                setSessionPoints(0);
                setSessionHistory([]);

                // Connect WS
                connectWebSocket(data.user.id, machineId);
                return { success: true };
            }
            return { success: false, message: 'Invalid server response' };
        } catch (e: any) {
            console.error("Login IO Error", e);
            return { success: false, message: `Network Error: ${e.message}` };
        }
    };

    const register = async (form: any, machineId: string): Promise<boolean> => {
        try {
            const res = await fetch(`${apiBase}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, machineId })
            });

            if (res.ok) {
                const { user: newUser, token: newToken } = await res.json();
                setUser(newUser);
                setToken(newToken);
                localStorage.setItem('sbay_user', JSON.stringify(newUser));
                localStorage.setItem('sbay_token', newToken);

                setSessionPoints(0);
                setSessionHistory([]);
                connectWebSocket(newUser.id, machineId);
                return true;
            }
            return false;
        } catch (e) {
            console.error("Register Error", e);
            return false;
        }
    };

    const releaseMachine = async (machineId: string) => {
        console.log("Releasing machine...", machineId);
        try {
            await fetch(`${apiBase}/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ machineId })
            });
        } catch (e) {
            console.error("Release Machine Error", e);
        }
    };

    const logout = (machineId = 'default') => {
        if (user) {
            // Notify backend
            fetch(`${apiBase}/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ machineId })
            }).catch(console.error);
        }

        if (clientRef.current) {
            clientRef.current.deactivate();
            clientRef.current = null;
        }

        setUser(null);
        setToken(null);
        setSessionPoints(0);
        setSessionHistory([]);
        localStorage.removeItem('sbay_user');
        localStorage.removeItem('sbay_token');

        // Redirect to Home
        router.push('/');
    };

    const simulateDrop = async (type: string, machineId: string) => {
        await fetch(`${apiBase}/machine/recycle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, machineId })
        });
    };

    // Auto-reconnect if we are on a machine page and have a user
    // This helper is exposed so the Page can call it with the machine ID from the URL
    // We attach it to the context 'login' effectively does this, but for refreshing:
    const ensureConnection = (machineId: string) => {
        if (user && (!clientRef.current || !clientRef.current.active)) {
            connectWebSocket(user.id, machineId);
        }
    };

    return (
        <SmartBinContext.Provider value={{
            user,
            sessionPoints,
            sessionHistory,
            machines: MACHINES,
            wasteTypes: WASTE_TYPES,
            login,
            register,
            logout,
            releaseMachine,
            simulateDrop,
            wsConnected,
            token
        }}>
            {children}
        </SmartBinContext.Provider>
    );
}

export const useSmartBin = () => {
    const context = useContext(SmartBinContext);
    if (!context) throw new Error("useSmartBin must be used within SmartBinProvider");
    return context;
};
