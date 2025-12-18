'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Trash2 } from 'lucide-react';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Invoice } from '@/types';
import { formatCurrency, formatDate, getApprovalStatusEmoji, getApprovalStatusLabel, formatCNPJ } from '@/lib/utils';
import { DeleteInvoiceModal } from './DeleteInvoiceModal';

interface InvoiceTableProps {
    invoices: Invoice[];
    isLoading?: boolean;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onDelete?: (invoiceId: string) => void;
    showDeleteButton?: boolean;
}

export function InvoiceTable({
    invoices,
    isLoading,
    page,
    totalPages,
    onPageChange,
    onDelete,
    showDeleteButton = true,
}: InvoiceTableProps) {
    const router = useRouter();
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

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

    const handleDeleteClick = (e: React.MouseEvent, invoice: Invoice) => {
        e.stopPropagation();
        setInvoiceToDelete(invoice);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async (reason: string) => {
        if (!invoiceToDelete) return;

        const token = localStorage.getItem('fatura_user_token') || '';

        const response = await fetch(`/api/invoices/${invoiceToDelete.id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ reason }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro ao excluir fatura');
        }

        // Callback to refresh list
        if (onDelete) {
            onDelete(invoiceToDelete.id);
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
                        <p className="text-xs text-gray-500">{formatCNPJ(invoice.supplier_cnpj)}</p>
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
                <div className="flex items-center gap-1 justify-end">
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
                    {showDeleteButton && (
                        <button
                            onClick={(e) => handleDeleteClick(e, invoice)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir fatura"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
            ),
            className: 'text-right',
        },
    ];

    return (
        <>
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

            <DeleteInvoiceModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setInvoiceToDelete(null);
                }}
                invoice={invoiceToDelete}
                onConfirm={handleDeleteConfirm}
            />
        </>
    );
}
