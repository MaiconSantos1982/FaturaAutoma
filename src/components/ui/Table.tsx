'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { Spinner } from './Spinner';
import { cn } from '@/lib/utils';

interface Column<T> {
    key: string;
    header: string;
    render?: (item: T) => React.ReactNode;
    className?: string;
}

interface TableProps<T> {
    columns: Column<T>[];
    data: T[];
    isLoading?: boolean;
    emptyMessage?: string;
    page?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    onRowClick?: (item: T) => void;
}

export function Table<T extends { id: string }>({
    columns,
    data,
    isLoading,
    emptyMessage = 'Nenhum item encontrado',
    page,
    totalPages,
    onPageChange,
    onRowClick,
}: TableProps<T>) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center py-12 text-gray-500">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={cn(
                                        'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                                        column.className
                                    )}
                                >
                                    {column.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((item) => (
                            <tr
                                key={item.id}
                                onClick={() => onRowClick?.(item)}
                                className={cn(
                                    'transition-colors',
                                    onRowClick && 'cursor-pointer hover:bg-gray-50'
                                )}
                            >
                                {columns.map((column) => (
                                    <td
                                        key={`${item.id}-${column.key}`}
                                        className={cn('px-6 py-4 whitespace-nowrap text-sm', column.className)}
                                    >
                                        {column.render
                                            ? column.render(item)
                                            : (item as Record<string, unknown>)[column.key] as React.ReactNode}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {page && totalPages && totalPages > 1 && onPageChange && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                        Página {page} de {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onPageChange(page - 1)}
                            disabled={page <= 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onPageChange(page + 1)}
                            disabled={page >= totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
