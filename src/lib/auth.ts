import { NextRequest, NextResponse } from 'next/server';
import { supabase } from './supabase';
import { User, Company } from '@/types';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: string;
    company_id: string;
    department?: string;
    company?: Company;
}

export interface AuthResult {
    user: AuthUser | null;
    error: string | null;
}

// Verify JWT token and extract user info
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
    try {
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return { user: null, error: 'Token não fornecido' };
        }

        const token = authHeader.split(' ')[1];

        // Decode the token (our custom token from login)
        try {
            const decoded = JSON.parse(atob(token));

            // Check expiration
            if (decoded.exp && Date.now() > decoded.exp) {
                return { user: null, error: 'Token expirado' };
            }

            // Fetch user from database
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*, company:companies(*)')
                .eq('id', decoded.userId)
                .eq('is_active', true)
                .single();

            if (userError || !userData) {
                return { user: null, error: 'Usuário não encontrado' };
            }

            const user: AuthUser = {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                role: userData.role,
                company_id: userData.company_id,
                department: userData.department,
                company: userData.company,
            };

            return { user, error: null };
        } catch (e) {
            return { user: null, error: 'Token inválido' };
        }
    } catch (error) {
        console.error('Auth error:', error);
        return { user: null, error: 'Erro de autenticação' };
    }
}

// Check if user has required role
export function hasRole(user: AuthUser, roles: string[]): boolean {
    return roles.includes(user.role);
}

// Verify resource belongs to user's company
export async function verifyCompanyAccess(
    user: AuthUser,
    resourceCompanyId: string
): Promise<boolean> {
    return user.company_id === resourceCompanyId;
}
