'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useRealtimeInvoices(onUpdate: () => void) {
    const { company } = useAuth();

    useEffect(() => {
        if (!company?.id) return;

        const channel = supabase
            .channel('invoices-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'invoices',
                    filter: `company_id=eq.${company.id}`,
                },
                () => {
                    onUpdate();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [company?.id, onUpdate]);
}

export function useRealtimeNotifications(onNotification: () => void) {
    const { user } = useAuth();

    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    onNotification();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, onNotification]);
}
