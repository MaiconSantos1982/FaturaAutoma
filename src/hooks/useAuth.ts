'use client';

import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

export function useAuthHook() {
    return useAuth();
}

export function useRequireAuth(allowedRoles?: UserRole[]) {
    const { user, isLoading, isAuthenticated, checkRole } = useAuth();

    const hasAccess = !allowedRoles || (isAuthenticated && checkRole(allowedRoles));

    return {
        user,
        isLoading,
        isAuthenticated,
        hasAccess,
    };
}
