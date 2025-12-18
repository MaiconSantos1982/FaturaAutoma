'use client';

import React, { useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MetricCards } from '@/components/dashboard/MetricCards';
import { InvoiceTable } from '@/components/dashboard/InvoiceTable';
import { InvoiceFiltersComponent } from '@/components/dashboard/InvoiceFilters';
import { useInvoices } from '@/hooks/useInvoices';
import { useRealtimeInvoices } from '@/hooks/useRealtime';

export default function DashboardPage() {
    const router = useRouter();
    const {
        invoices,
        metrics,
        isLoading,
        error,
        page,
        totalPages,
        setPage,
        setFilters,
        refetch,
    } = useInvoices();

    // Enable real-time updates
    useRealtimeInvoices(useCallback(() => {
        refetch();
    }, [refetch]));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-500">Gerencie suas faturas e aprovações</p>
                </div>
                <Button onClick={() => router.push('/dashboard/upload')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Fatura
                </Button>
            </div>

            {/* Metrics */}
            <MetricCards metrics={metrics} isLoading={isLoading} />

            {/* Recent Invoices */}
            <Card>
                <CardHeader>
                    <CardTitle>Faturas Recentes</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <InvoiceFiltersComponent onFiltersChange={setFilters} />
                    </div>

                    {error ? (
                        <div className="p-6 text-center text-red-600">{error}</div>
                    ) : (
                        <InvoiceTable
                            invoices={invoices}
                            isLoading={isLoading}
                            page={page}
                            totalPages={totalPages}
                            onPageChange={setPage}
                            onDelete={() => refetch()}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
