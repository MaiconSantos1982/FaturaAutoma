'use client';

import React from 'react';
import { TrendingUp, Clock, XCircle, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { DashboardMetrics } from '@/types';

interface MetricCardsProps {
    metrics: DashboardMetrics;
    isLoading?: boolean;
}

export function MetricCards({ metrics, isLoading }: MetricCardsProps) {
    const cards = [
        {
            label: 'Processadas',
            value: metrics.processed.toString(),
            icon: TrendingUp,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
        },
        {
            label: 'Pendentes',
            value: metrics.pending.toString(),
            icon: Clock,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50',
        },
        {
            label: 'Rejeitadas',
            value: metrics.rejected.toString(),
            icon: XCircle,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
        },
        {
            label: 'Valor Total',
            value: formatCurrency(metrics.totalAmount),
            icon: DollarSign,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => (
                <Card key={card.label}>
                    <CardContent className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${card.bgColor}`}>
                            <card.icon className={`h-6 w-6 ${card.color}`} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">{card.label}</p>
                            {isLoading ? (
                                <div className="h-7 w-20 bg-gray-200 rounded animate-pulse" />
                            ) : (
                                <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
