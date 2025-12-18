'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { User, Company, AuthState } from '@/types';

interface AuthContextType extends AuthState {
    signIn: (email: string, password: string) => Promise<{ error?: string }>;
    signOut: () => Promise<void>;
    checkRole: (allowedRoles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple password check (in production, use proper hashing)
const verifyPassword = (inputPassword: string, storedPassword: string) => {
    // For demo purposes, we'll use a simple check
    // In production, you should use bcrypt or similar
    return inputPassword === storedPassword;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [state, setState] = useState<AuthState>({
        user: null,
        company: null,
        isLoading: true,
        isAuthenticated: false,
    });

    const fetchUserData = useCallback(async (userId: string) => {
        try {
            // Fetch user with company data
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*, company:companies(*)')
                .eq('id', userId)
                .eq('is_active', true)
                .single();

            if (userError) throw userError;

            setState({
                user: userData as User,
                company: userData.company as Company,
                isLoading: false,
                isAuthenticated: true,
            });

            return true;
        } catch (error) {
            console.error('Error fetching user data:', error);
            setState({
                user: null,
                company: null,
                isLoading: false,
                isAuthenticated: false,
            });
            return false;
        }
    }, []);

    useEffect(() => {
        if (!isSupabaseConfigured()) {
            setState(prev => ({ ...prev, isLoading: false }));
            return;
        }

        // Check for stored session
        const storedUserId = localStorage.getItem('fatura_user_id');
        if (storedUserId) {
            fetchUserData(storedUserId);
        } else {
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, [fetchUserData]);

    const signIn = async (email: string, password: string) => {
        try {
            setState(prev => ({ ...prev, isLoading: true }));

            // Find user by email
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*, company:companies(*)')
                .eq('email', email.toLowerCase())
                .eq('is_active', true)
                .single();

            if (userError || !userData) {
                setState(prev => ({ ...prev, isLoading: false }));
                return { error: 'Email ou senha inválidos' };
            }

            // For demo purposes, we accept any password for existing users
            // In production, implement proper password verification with Supabase Auth

            // Store user session
            localStorage.setItem('fatura_user_id', userData.id);
            localStorage.setItem('fatura_user_token', btoa(JSON.stringify({
                userId: userData.id,
                email: userData.email,
                exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
            })));

            setState({
                user: userData as User,
                company: userData.company as Company,
                isLoading: false,
                isAuthenticated: true,
            });

            router.push('/dashboard');
            return {};
        } catch (error) {
            console.error('Sign in error:', error);
            setState(prev => ({ ...prev, isLoading: false }));
            return { error: 'Erro ao fazer login. Tente novamente.' };
        }
    };

    const signOut = async () => {
        localStorage.removeItem('fatura_user_id');
        localStorage.removeItem('fatura_user_token');
        setState({
            user: null,
            company: null,
            isLoading: false,
            isAuthenticated: false,
        });
        router.push('/login');
    };

    const checkRole = (allowedRoles: string[]) => {
        if (!state.user) return false;
        return allowedRoles.includes(state.user.role);
    };

    return (
        <AuthContext.Provider value={{ ...state, signIn, signOut, checkRole }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
