"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { useRouter } from 'next/navigation';

// Types
export interface User {
    id: string;
    phoneNumber: string;
    title?: string;
    firstName: string;
    lastName: string;
    email?: string;
    studentId: string;
    faculty?: string;
    major?: string;
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
    latestSession: any;
    wasteTypes: WasteType[];
    // OTP: Email Login
    sendOtp: (email: string) => Promise<{ success: boolean; message?: string }>;
    login: (email: string, otp: string, machineId: string) => Promise<{ success: boolean; message?: string }>;
    // OTP: Phone Login
    sendPhoneOtp: (phone: string) => Promise<{ success: boolean; message?: string }>;
    loginWithPhone: (phone: string, otp: string, machineId: string) => Promise<{ success: boolean; message?: string }>;
    // Password Login
    loginWithPassword: (identifier: string, password: string, machineId: string) => Promise<{ success: boolean; message?: string }>;
    // Google Login
    loginWithGoogle: (accessToken: string, machineId: string) => Promise<{ success: boolean; message?: string; email?: string }>;
    // Register: Manual (Email OTP)
    sendRegisterOtp: (email: string) => Promise<{ success: boolean; message?: string }>;
    register: (form: any) => Promise<{ success: boolean; message?: string }>;
    // Register: Google
    registerWithGoogle: (accessToken: string, extraInfo: any) => Promise<{ success: boolean; message?: string; email?: string }>;
    logout: (machineId?: string) => void;
    releaseMachine: (machineId: string) => Promise<void>;
    wsConnected: boolean;
    token: string | null;
    apiBase: string;
    isInitialized: boolean;
    refreshUser: () => Promise<void>;
}

const SmartBinContext = createContext<SmartBinContextType | null>(null);

export const WASTE_TYPES = [
    { type: 'CLEAR_BOTTLE', label: 'ขวดพลาสติกใส', points: 1 },
    { type: 'OPAQUE_BOTTLE', label: 'ขวดพลาสติกขุ่น', points: 2 },
    { type: 'GLASSES_BOTTLE', label: 'ขวดแก้ว', points: 5 },
    { type: 'STEEL_CAN', label: 'กระป๋องเหล็ก', points: 2 },
    { type: 'ALUMINUM_CAN', label: 'กระป๋องอลูมิเนียม', points: 3 },
];

export function SmartBinProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [sessionPoints, setSessionPoints] = useState(0);
    const [sessionHistory, setSessionHistory] = useState<any[]>([]);
    const [latestSession, setLatestSession] = useState<any>(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [apiBase, setApiBase] = useState('http://localhost:8070/api');
    const [wsBase, setWsBase] = useState('');
    const wsBaseRef = useRef('');
    const [isInitialized, setIsInitialized] = useState(false);

    const clientRef = useRef<Client | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            const port = window.location.port;
            const protocol = window.location.protocol;
            const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
            let currentApiBase = '';
            let currentWsBase = '';
            
            if (port === '3000') {
                currentApiBase = `http://${hostname}:8070/api`;
                currentWsBase = `ws://${hostname}:8070/ws-native`;
            } else {
                const portStr = port ? `:${port}` : '';
                currentApiBase = `${protocol}//${hostname}${portStr}/api`;
                currentWsBase = `${wsProtocol}//${hostname}${portStr}/ws-native`;
            }
            
            setApiBase(currentApiBase);
            setWsBase(currentWsBase);
            wsBaseRef.current = currentWsBase;

            const savedUser = localStorage.getItem('sbay_user');
            const savedToken = localStorage.getItem('sbay_token');
            if (savedUser && savedToken) {
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);
                setToken(savedToken);
                
                // Fetch fresh user data from backend
                fetch(`${currentApiBase}/user/${parsedUser.id}`)
                    .then(res => res.ok ? res.json() : null)
                    .then(freshUser => {
                        if (freshUser && !freshUser.error) {
                            setUser(freshUser);
                            localStorage.setItem('sbay_user', JSON.stringify(freshUser));
                        }
                    })
                    .catch(e => console.error(e));
                
                // Keep WS connected for global user updates
                setTimeout(() => {
                    connectWebSocket(parsedUser.id, 'background', currentWsBase);
                }, 500);
            }
            setIsInitialized(true);
        }
    }, []);

    const connectWebSocket = (userId: string, machineId: string, customWsUrl?: string) => {
        if (clientRef.current && clientRef.current.active) {
            clientRef.current.publish({ destination: `/app/login/${machineId}`, body: userId });
            return;
        }
        
        const wsUrl = customWsUrl || wsBaseRef.current || wsBase;
        if (!wsUrl) return;

        const client = new Client({
            brokerURL: wsUrl,
            reconnectDelay: 5000,
            onConnect: () => {
                setWsConnected(true);
                
                // Global subscriptions for user
                client.subscribe(`/topic/sessions`, (msg) => {
                    if (msg.body) {
                        const sessionData = JSON.parse(msg.body);
                        if (sessionData.userId === userId) {
                            setLatestSession(sessionData);
                        }
                    }
                });
                client.subscribe(`/topic/user/${userId}`, (msg) => {
                    if (msg.body) {
                        const updatedUser = JSON.parse(msg.body);
                        setUser(updatedUser);
                        localStorage.setItem('sbay_user', JSON.stringify(updatedUser));
                    }
                });

                // Machine-specific subscriptions
                if (machineId) {
                    client.publish({ destination: `/app/login/${machineId}`, body: userId });
                    client.subscribe(`/topic/machine/${machineId}`, (msg) => {
                        if (msg.body) {
                            const tx = JSON.parse(msg.body);
                            setSessionPoints(prev => prev + tx.pointsEarned);
                            setSessionHistory(prev => [tx, ...prev]);
                        }
                    });
                }
            },
            onStompError: (frame) => console.error('WS Error:', frame.headers['message']),
            onWebSocketClose: () => setWsConnected(false),
        });
        client.activate();
        clientRef.current = client;
    };

    const saveSession = (userData: User, tokenData: string, machineId: string) => {
        setUser(userData);
        setToken(tokenData);
        localStorage.setItem('sbay_user', JSON.stringify(userData));
        localStorage.setItem('sbay_token', tokenData);
        setSessionPoints(0);
        setSessionHistory([]);
        connectWebSocket(userData.id, machineId);
    };

    // Email OTP
    const sendOtp = async (email: string) => {
        try {
            const res = await fetch(`${apiBase}/auth/otp/send`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            return data.error ? { success: false, message: data.error } : { success: true, message: data.message };
        } catch (e: any) { return { success: false, message: `Network Error: ${e.message}` }; }
    };

    const login = async (email: string, otp: string, machineId: string) => {
        try {
            const res = await fetch(`${apiBase}/auth/otp/verify`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, machineId })
            });
            const data = await res.json();
            if (data.error) return { success: false, message: data.error };
            if (data.user && data.token) { saveSession(data.user, data.token, machineId); return { success: true }; }
            return { success: false, message: 'Invalid server response' };
        } catch (e: any) { return { success: false, message: `Network Error: ${e.message}` }; }
    };

    // Phone OTP
    const sendPhoneOtp = async (phone: string) => {
        try {
            const res = await fetch(`${apiBase}/auth/otp/send-phone`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: phone })
            });
            const data = await res.json();
            return data.error ? { success: false, message: data.error } : { success: true, message: data.message };
        } catch (e: any) { return { success: false, message: `Network Error: ${e.message}` }; }
    };

    const loginWithPhone = async (phone: string, otp: string, machineId: string) => {
        try {
            const res = await fetch(`${apiBase}/auth/otp/verify-phone`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: phone, otp, machineId })
            });
            const data = await res.json();
            if (data.error) return { success: false, message: data.error };
            if (data.user && data.token) { saveSession(data.user, data.token, machineId); return { success: true }; }
            return { success: false, message: 'Invalid server response' };
        } catch (e: any) { return { success: false, message: `Network Error: ${e.message}` }; }
    };

    // Password Login
    const loginWithPassword = async (identifier: string, password: string, machineId: string) => {
        try {
            const res = await fetch(`${apiBase}/auth/login-password`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password, machineId })
            });
            const data = await res.json();
            if (data.error) return { success: false, message: data.error };
            if (data.user && data.token) { saveSession(data.user, data.token, machineId); return { success: true }; }
            return { success: false, message: 'Invalid server response' };
        } catch (e: any) { return { success: false, message: `Network Error: ${e.message}` }; }
    };

    // Google Login
    const loginWithGoogle = async (accessToken: string, machineId: string) => {
        try {
            const res = await fetch(`${apiBase}/auth/google`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: accessToken, machineId })
            });
            const data = await res.json();
            if (data.error) return { success: false, message: data.error, email: data.email };
            if (data.user && data.token) { saveSession(data.user, data.token, machineId); return { success: true }; }
            return { success: false, message: 'Invalid server response' };
        } catch (e: any) { return { success: false, message: `Network Error: ${e.message}` }; }
    };

    // Register: Email OTP
    const sendRegisterOtp = async (email: string) => {
        try {
            const res = await fetch(`${apiBase}/auth/otp/send-register`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            return data.error ? { success: false, message: data.error } : { success: true, message: data.message };
        } catch (e: any) { return { success: false, message: `Network Error: ${e.message}` }; }
    };

    const register = async (form: any): Promise<{ success: boolean; message?: string }> => {
        try {
            const res = await fetch(`${apiBase}/auth/register`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, machineId: 'default-machine' })
            });
            const data = await res.json();
            if (data.error) return { success: false, message: data.error };
            if (data.user && data.token) {
                setUser(data.user); setToken(data.token);
                localStorage.setItem('sbay_user', JSON.stringify(data.user));
                localStorage.setItem('sbay_token', data.token);
                setSessionPoints(0); setSessionHistory([]);
                return { success: true };
            }
            return { success: false, message: 'เกิดข้อผิดพลาด' };
        } catch (e: any) { return { success: false, message: `Network Error: ${e.message}` }; }
    };

    // Register: Google
    const registerWithGoogle = async (accessToken: string, extraInfo: any): Promise<{ success: boolean; message?: string; email?: string }> => {
        try {
            const res = await fetch(`${apiBase}/auth/register-google`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: accessToken, ...extraInfo, machineId: 'default-machine' })
            });
            const data = await res.json();
            if (data.error) return { success: false, message: data.error, email: data.email };
            if (data.user && data.token) {
                setUser(data.user); setToken(data.token);
                localStorage.setItem('sbay_user', JSON.stringify(data.user));
                localStorage.setItem('sbay_token', data.token);
                setSessionPoints(0); setSessionHistory([]);
                return { success: true };
            }
            return { success: false, message: 'เกิดข้อผิดพลาด' };
        } catch (e: any) { return { success: false, message: `Network Error: ${e.message}` }; }
    };

    const releaseMachine = async (machineId: string) => {
        try {
            await fetch(`${apiBase}/auth/logout`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ machineId })
            });
        } catch (e) { console.error('Release Machine Error', e); }
    };

    const logout = (machineId = 'default') => {
        if (user) {
            fetch(`${apiBase}/auth/logout`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ machineId })
            }).catch(console.error);
        }
        if (clientRef.current) { clientRef.current.deactivate(); clientRef.current = null; }
        setUser(null); setToken(null); setSessionPoints(0); setSessionHistory([]);
        localStorage.removeItem('sbay_user'); localStorage.removeItem('sbay_token');
        router.push('/');
    };

    const refreshUser = async () => {
        if (!user) return;
        try {
            const res = await fetch(`${apiBase}/user/${user.id}`);
            if (res.ok) {
                const freshUser = await res.json();
                if (freshUser && !freshUser.error) {
                    setUser(freshUser);
                    localStorage.setItem('sbay_user', JSON.stringify(freshUser));
                }
            }
        } catch (e) {
            console.error("Error refreshing user", e);
        }
    };

    return (
        <SmartBinContext.Provider value={{
            user, sessionPoints, sessionHistory, latestSession, wasteTypes: WASTE_TYPES,
            sendOtp, login,
            sendPhoneOtp, loginWithPhone,
            loginWithPassword,
            loginWithGoogle,
            sendRegisterOtp, register,
            registerWithGoogle,
            logout, releaseMachine,
            wsConnected, token, apiBase, isInitialized,
            refreshUser
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
