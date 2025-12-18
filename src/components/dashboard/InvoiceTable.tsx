'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Invoice } from '@/types';
import { formatCurrency, formatDate, getApprovalStatusEmoji, getApprovalStatusLabel } from '@/lib/utils';

interface InvoiceTableProps {
    invoices: Invoice[];
    isLoading?: boolean;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function InvoiceTable({
    invoices,
    isLoading,
    page,
    totalPages,
    onPageChange,
}: InvoiceTableProps) {
    const router = useRouter();

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'approved':
            case 'auto_approved':
                return 'success';
            case 'pending':
                return 'warning';
            case 'rejected':
                return 'danger';
            default:
                return 'default';
        }
    };

    const columns = [
        {
            key: 'invoice_number',
            header: 'NF',
            render: (invoice: Invoice) => (
                <span className="font-medium text-gray-900">
                    {invoice.invoice_number || '-'}
                </span>
            ),
        },
        {
            key: 'supplier_name',
            header: 'Fornecedor',
            render: (invoice: Invoice) => (
                <div>
                    <p className="font-medium text-gray-900">{invoice.supplier_name || 'Não informado'}</p>
                    {invoice.supplier_cnpj && (
                        <p className="text-xs text-gray-500">{invoice.supplier_cnpj}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'total_amount',
            header: 'Valor',
            render: (invoice: Invoice) => (
                <span className="font-medium text-gray-900">
                    {formatCurrency(invoice.total_amount)}
                </span>
            ),
        },
        {
            key: 'due_date',
            header: 'Vencimento',
            render: (invoice: Invoice) => (
                <span className="text-gray-600">
                    {invoice.due_date ? formatDate(invoice.due_date) : '-'}
                </span>
            ),
        },
        {
            key: 'approval_status',
            header: 'Status',
            render: (invoice: Invoice) => (
                <Badge variant={getStatusVariant(invoice.approval_status)}>
                    {getApprovalStatusEmoji(invoice.approval_status)} {getApprovalStatusLabel(invoice.approval_status)}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: 'Ações',
            render: (invoice: Invoice) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/invoices/${invoice.id}`);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Ver detalhes"
                >
                    <Eye className="h-4 w-4" />
                </button>
            ),
            className: 'text-right',
        },
    ];

    return (
        <Table
            columns={columns}
            data={invoices}
            isLoading={isLoading}
            emptyMessage="Nenhuma fatura encontrada"
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            onRowClick={(invoice) => router.push(`/dashboard/invoices/${invoice.id}`)}
        />
    );
}
