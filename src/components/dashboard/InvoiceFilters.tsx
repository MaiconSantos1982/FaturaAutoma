'use client';

import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { InvoiceFilters } from '@/types';

interface InvoiceFiltersProps {
    onFiltersChange: (filters: InvoiceFilters) => void;
}

export function InvoiceFiltersComponent({ onFiltersChange }: InvoiceFiltersProps) {
    const [filters, setFilters] = useState<InvoiceFilters>({});
    const [isExpanded, setIsExpanded] = useState(false);

    const approvalStatusOptions = [
        { value: '', label: 'Todos os Status' },
        { value: 'pending', label: '⏳ Pendente' },
        { value: 'approved', label: '✅ Aprovada' },
        { value: 'rejected', label: '❌ Rejeitada' },
        { value: 'auto_approved', label: '🔄 Auto-aprovada' },
    ];

    const handleChange = (key: keyof InvoiceFilters, value: string) => {
        const newFilters = { ...filters, [key]: value || undefined };
        setFilters(newFilters);
        onFiltersChange(newFilters);
    };

    const clearFilters = () => {
        setFilters({});
        onFiltersChange({});
    };

    const hasActiveFilters = Object.values(filters).some(Boolean);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar fornecedor..."
                        value={filters.supplier || ''}
                        onChange={(e) => handleChange('supplier', e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Status Filter */}
                <Select
                    options={approvalStatusOptions}
                    value={filters.approval_status || ''}
                    onChange={(e) => handleChange('approval_status', e.target.value)}
                    className="w-full sm:w-48"
                />

                {/* Toggle more filters */}
                <Button
                    variant="secondary"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2"
                >
                    <Filter className="h-4 w-4" />
                    Filtros
                </Button>

                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        onClick={clearFilters}
                        className="flex items-center gap-2 text-gray-500"
                    >
                        <X className="h-4 w-4" />
                        Limpar
                    </Button>
                )}
            </div>

            {/* Extended Filters */}
            {isExpanded && (
                <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
                    <Input
                        type="date"
                        label="Data Inicial"
                        value={filters.startDate || ''}
                        onChange={(e) => handleChange('startDate', e.target.value)}
                    />
                    <Input
                        type="date"
                        label="Data Final"
                        value={filters.endDate || ''}
                        onChange={(e) => handleChange('endDate', e.target.value)}
                    />
                </div>
            )}
        </div>
    );
}
