'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Invoice, InvoiceFilters, DashboardMetrics } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface UseInvoicesResult {
    invoices: Invoice[];
    metrics: DashboardMetrics;
    isLoading: boolean;
    error: string | null;
    page: number;
    totalPages: number;
    setPage: (page: number) => void;
    setFilters: (filters: InvoiceFilters) => void;
    refetch: () => void;
}

const ITEMS_PER_PAGE = 10;

export function useInvoices(initialFilters?: InvoiceFilters): UseInvoicesResult {
    const { company } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [metrics, setMetrics] = useState<DashboardMetrics>({
        processed: 0,
        pending: 0,
        rejected: 0,
        totalAmount: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [filters, setFilters] = useState<InvoiceFilters>(initialFilters || {});

    const fetchInvoices = useCallback(async () => {
        if (!company?.id) return;

        setIsLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('invoices')
                .select('*, approver:users!approver_id(*)', { count: 'exact' })
                .eq('company_id', company.id)
                .order('created_at', { ascending: false });

            // Apply filters
            if (filters.approval_status) {
                query = query.eq('approval_status', filters.approval_status);
            }
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.startDate) {
                query = query.gte('created_at', filters.startDate);
            }
            if (filters.endDate) {
                query = query.lte('created_at', filters.endDate);
            }
            if (filters.supplier) {
                query = query.ilike('supplier_name', `%${filters.supplier}%`);
            }

            // Pagination
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;
            query = query.range(from, to);

            const { data, error: queryError, count } = await query;

            if (queryError) throw queryError;

            setInvoices(data as Invoice[]);
            setTotalCount(count || 0);
        } catch (err) {
            console.error('Error fetching invoices:', err);
            setError('Erro ao carregar faturas');
        } finally {
            setIsLoading(false);
        }
    }, [company?.id, page, filters]);

    const fetchMetrics = useCallback(async () => {
        if (!company?.id) return;

        try {
            // Fetch metrics
            const { data: allInvoices, error: metricsError } = await supabase
                .from('invoices')
                .select('approval_status, total_amount')
                .eq('company_id', company.id);

            if (metricsError) throw metricsError;

            const newMetrics: DashboardMetrics = {
                processed: 0,
                pending: 0,
                rejected: 0,
                totalAmount: 0,
            };

            allInvoices?.forEach((invoice) => {
                if (invoice.approval_status === 'approved' || invoice.approval_status === 'auto_approved') {
                    newMetrics.processed++;
                    newMetrics.totalAmount += Number(invoice.total_amount) || 0;
                } else if (invoice.approval_status === 'pending') {
                    newMetrics.pending++;
                } else if (invoice.approval_status === 'rejected') {
                    newMetrics.rejected++;
                }
            });

            setMetrics(newMetrics);
        } catch (err) {
            console.error('Error fetching metrics:', err);
        }
    }, [company?.id]);

    useEffect(() => {
        fetchInvoices();
        fetchMetrics();
    }, [fetchInvoices, fetchMetrics]);

    const refetch = useCallback(() => {
        fetchInvoices();
        fetchMetrics();
    }, [fetchInvoices, fetchMetrics]);

    return {
        invoices,
        metrics,
        isLoading,
        error,
        page,
        totalPages: Math.ceil(totalCount / ITEMS_PER_PAGE),
        setPage,
        setFilters,
        refetch,
    };
}

export function usePendingApprovals() {
    const { company, user } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPendingApprovals = useCallback(async () => {
        if (!company?.id || !user?.id) return;

        setIsLoading(true);
        setError(null);

        try {
            const { data, error: queryError } = await supabase
                .from('invoices')
                .select('*')
                .eq('company_id', company.id)
                .eq('approval_status', 'pending')
                .order('due_date', { ascending: true });

            if (queryError) throw queryError;

            setInvoices(data as Invoice[]);
        } catch (err) {
            console.error('Error fetching pending approvals:', err);
            setError('Erro ao carregar aprovações pendentes');
        } finally {
            setIsLoading(false);
        }
    }, [company?.id, user?.id]);

    useEffect(() => {
        fetchPendingApprovals();
    }, [fetchPendingApprovals]);

    return {
        invoices,
        isLoading,
        error,
        refetch: fetchPendingApprovals,
    };
}
