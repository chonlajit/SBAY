"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { useRouter } from 'next/navigation';
import { isTokenExpired, getTokenRemainingTime } from '../utils/jwt';

// Types
export interface User {
    id: string;
    phoneNumber: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    studentId?: string;
    faculty?: string;
    major?: string;
    academicYear?: string;
    address?: string;
    age?: number;
    profileImageUrl?: string;
    points: number;
    role?: string;
}

export interface WasteType {
    type?: string;
    label?: string;
    points?: number;
    [key: string]: any;
}

interface SmartBinContextType {
    user: User | null;
    sessionPoints: number;
    sessionHistory: any[];
    latestSession: any;
    wasteTypes: WasteType[];
    // OTP: Email Login
    sendOtp: (email: string) => Promise<{ success: boolean; message?: string }>;
    login: (email: string, otp: string, machineId: string, rememberMe?: boolean) => Promise<{ success: boolean; message?: string }>;
    // OTP: Phone Login
    sendPhoneOtp: (phone: string) => Promise<{ success: boolean; message?: string }>;
    loginWithPhone: (phone: string, otp: string, machineId: string, rememberMe?: boolean) => Promise<{ success: boolean; message?: string }>;
    // Password Login
    loginWithPassword: (identifier: string, password: string, machineId: string, rememberMe?: boolean) => Promise<{ success: boolean; message?: string }>;
    // Google Login
    loginWithGoogle: (accessToken: string, machineId: string, rememberMe?: boolean) => Promise<{ success: boolean; message?: string; email?: string }>;
    // Register: Manual (Email OTP)
    sendRegisterOtp: (email: string) => Promise<{ success: boolean; message?: string }>;
    sendForgotOtp: (email: string) => Promise<{ success: boolean; message?: string }>;
    register: (form: any) => Promise<{ success: boolean; message?: string }>;
    // Register: Google
    registerWithGoogle: (accessToken: string, extraInfo: any) => Promise<{ success: boolean; message?: string; email?: string }>;
    // Forgot Password
    sendForgotPasswordOtp: (identifier: string) => Promise<{ success: boolean; message?: string }>;
    resetPassword: (identifier: string, otp: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
    logout: (machineId?: string) => void;
    releaseMachine: (machineId: string) => Promise<void>;
    wsConnected: boolean;
    token: string | null;
    apiBase: string;
    isInitialized: boolean;
    refreshUser: () => Promise<void>;
}

const SmartBinContext = createContext<SmartBinContextType | null>(null);

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
    const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);

    const clientRef = useRef<Client | null>(null);
    const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();

    const scheduleAutoLogout = (jwtToken: string) => {
        if (logoutTimerRef.current) {
            clearTimeout(logoutTimerRef.current);
            logoutTimerRef.current = null;
        }
        const remainingMs = getTokenRemainingTime(jwtToken);
        if (remainingMs <= 0) {
            console.warn("Session expired. Automatically logging out.");
            logout();
            return;
        }

        // JavaScript setTimeout max safe delay is 2,147,483,647 ms (~24.8 days).
        // Larger values (like 30 days = 2,592,000,000 ms) overflow 32-bit int and execute immediately (1ms)!
        // We cap each setTimeout step to at most 12 hours (43,200,000 ms), and recheck iteratively.
        const SAFE_MAX_DELAY = 12 * 60 * 60 * 1000; // 12 hours
        const delay = Math.min(remainingMs, SAFE_MAX_DELAY);

        logoutTimerRef.current = setTimeout(() => {
            if (isTokenExpired(jwtToken)) {
                console.warn("Session expired. Automatically logging out.");
                logout();
            } else {
                scheduleAutoLogout(jwtToken);
            }
        }, delay);
    };

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

            // Fetch dynamic waste types
            fetch(`${currentApiBase}/wastetypes`)
                .then(res => res.ok ? res.json() : [])
                .then(data => setWasteTypes(data))
                .catch(e => console.error("Error fetching waste types:", e));

            // Check sessionStorage first (session-only), then localStorage (remembered device)
            let savedUser = sessionStorage.getItem('sbay_user');
            let savedToken = sessionStorage.getItem('sbay_token');
            let isSessionStorage = true;
            if (!savedUser || !savedToken) {
                savedUser = localStorage.getItem('sbay_user');
                savedToken = localStorage.getItem('sbay_token');
                isSessionStorage = false;
            }

            if (savedUser && savedToken) {
                if (isTokenExpired(savedToken)) {
                    console.warn("Saved token has expired. Clearing session.");
                    localStorage.removeItem('sbay_user');
                    localStorage.removeItem('sbay_token');
                    sessionStorage.removeItem('sbay_user');
                    sessionStorage.removeItem('sbay_token');
                    setUser(null);
                    setToken(null);
                } else {
                    const parsedUser = JSON.parse(savedUser);
                    setUser(parsedUser);
                    setToken(savedToken);
                    scheduleAutoLogout(savedToken);
                    
                    // Fetch fresh user data from backend
                    fetch(`${currentApiBase}/user/${parsedUser.id}`)
                        .then(res => {
                            if (res.status === 401 || res.status === 403 || res.status === 404) {
                                throw new Error("Invalid session");
                            }
                            return res.ok ? res.json() : null;
                        })
                        .then(freshUser => {
                            if (freshUser && !freshUser.error) {
                                setUser(freshUser);
                                if (isSessionStorage) {
                                    sessionStorage.setItem('sbay_user', JSON.stringify(freshUser));
                                } else {
                                    localStorage.setItem('sbay_user', JSON.stringify(freshUser));
                                }
                            }
                        })
                        .catch(e => {
                            console.error(e);
                            if (e.message === "Invalid session") {
                                logout();
                            }
                        });
                    
                    // Keep WS connected for global user updates
                    setTimeout(() => {
                        connectWebSocket(parsedUser.id, 'background', currentWsBase);
                    }, 500);
                }
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

    const saveSession = (userData: User, tokenData: string, machineId: string, rememberMe: boolean = true) => {
        setUser(userData);
        setToken(tokenData);
        if (rememberMe) {
            localStorage.setItem('sbay_user', JSON.stringify(userData));
            localStorage.setItem('sbay_token', tokenData);
            sessionStorage.removeItem('sbay_user');
            sessionStorage.removeItem('sbay_token');
        } else {
            sessionStorage.setItem('sbay_user', JSON.stringify(userData));
            sessionStorage.setItem('sbay_token', tokenData);
            localStorage.removeItem('sbay_user');
            localStorage.removeItem('sbay_token');
        }
        setSessionPoints(0);
        setSessionHistory([]);
        scheduleAutoLogout(tokenData);
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

    const login = async (email: string, otp: string, machineId: string, rememberMe: boolean = true) => {
        try {
            const res = await fetch(`${apiBase}/auth/otp/verify`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, machineId, rememberMe })
            });
            const data = await res.json();
            if (data.error) return { success: false, message: data.error };
            if (data.user && data.token) { saveSession(data.user, data.token, machineId, rememberMe); return { success: true }; }
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

    const loginWithPhone = async (phone: string, otp: string, machineId: string, rememberMe: boolean = true) => {
        try {
            const res = await fetch(`${apiBase}/auth/otp/verify-phone`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: phone, otp, machineId, rememberMe })
            });
            const data = await res.json();
            if (data.error) return { success: false, message: data.error };
            if (data.user && data.token) { saveSession(data.user, data.token, machineId, rememberMe); return { success: true }; }
            return { success: false, message: 'Invalid server response' };
        } catch (e: any) { return { success: false, message: `Network Error: ${e.message}` }; }
    };

    // Password Login
    const loginWithPassword = async (identifier: string, password: string, machineId: string, rememberMe: boolean = true) => {
        try {
            const res = await fetch(`${apiBase}/auth/login-password`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password, machineId, rememberMe })
            });
            const data = await res.json();
            if (data.error) return { success: false, message: data.error };
            if (data.user && data.token) { saveSession(data.user, data.token, machineId, rememberMe); return { success: true }; }
            return { success: false, message: 'Invalid server response' };
        } catch (e: any) { return { success: false, message: `Network Error: ${e.message}` }; }
    };

    // Google Login
    const loginWithGoogle = async (accessToken: string, machineId: string, rememberMe: boolean = true) => {
        try {
            const res = await fetch(`${apiBase}/auth/google`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: accessToken, machineId, rememberMe })
            });
            const data = await res.json();
            if (data.error) return { success: false, message: data.error, email: data.email };
            if (data.user && data.token) { saveSession(data.user, data.token, machineId, rememberMe); return { success: true }; }
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

    // Forgot Password: Email OTP (checks if email exists in database first)
    const sendForgotOtp = async (email: string) => {
        try {
            const res = await fetch(`${apiBase}/auth/otp/send`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase() })
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
                saveSession(data.user, data.token, 'default-machine');
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
                saveSession(data.user, data.token, 'default-machine');
                return { success: true };
            }
            return { success: false, message: 'เกิดข้อผิดพลาด' };
        } catch (e: any) { return { success: false, message: `Network Error: ${e.message}` }; }
    };

    // Forgot Password
    const sendForgotPasswordOtp = async (identifier: string) => {
        try {
            const res = await fetch(`${apiBase}/auth/forgot-password`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier })
            });
            const data = await res.json();
            return data.error ? { success: false, message: data.error } : { success: true, message: data.message };
        } catch (e: any) { return { success: false, message: `Network Error: ${e.message}` }; }
    };

    const resetPassword = async (identifier: string, otp: string, newPassword: string) => {
        try {
            const res = await fetch(`${apiBase}/auth/reset-password`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, otp, newPassword })
            });
            const data = await res.json();
            return data.error ? { success: false, message: data.error } : { success: true, message: data.message };
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
        if (logoutTimerRef.current) {
            clearTimeout(logoutTimerRef.current);
            logoutTimerRef.current = null;
        }
        if (user) {
            fetch(`${apiBase}/auth/logout`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ machineId })
            }).catch(console.error);
        }
        if (clientRef.current) { clientRef.current.deactivate(); clientRef.current = null; }
        setUser(null); setToken(null); setSessionPoints(0); setSessionHistory([]);
        localStorage.removeItem('sbay_user'); localStorage.removeItem('sbay_token');
        sessionStorage.removeItem('sbay_user'); sessionStorage.removeItem('sbay_token');
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
            user, sessionPoints, sessionHistory, latestSession, wasteTypes: wasteTypes,
            sendOtp, login,
            sendPhoneOtp, loginWithPhone,
            loginWithPassword, loginWithGoogle,
            sendRegisterOtp, sendForgotOtp, register,
            registerWithGoogle,
            sendForgotPasswordOtp,
            resetPassword,
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
