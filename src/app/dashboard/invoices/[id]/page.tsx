'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    FileText,
    Calendar,
    Building2,
    DollarSign,
    Clock,
    CheckCircle,
    XCircle,
    ExternalLink,
    MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { supabase } from '@/lib/supabase';
import { Invoice } from '@/types';
import {
    formatCurrency,
    formatDate,
    formatDateTime,
    getApprovalStatusEmoji,
    getApprovalStatusLabel,
    getDocumentTypeLabel,
    getStatusLabel,
} from '@/lib/utils';

export default function InvoiceDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [notes, setNotes] = useState('');
    const [isSavingNotes, setIsSavingNotes] = useState(false);

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                const { data, error: queryError } = await supabase
                    .from('invoices')
                    .select('*, approver:users!approver_id(*)')
                    .eq('id', params.id)
                    .single();

                if (queryError) throw queryError;

                setInvoice(data as Invoice);
                setNotes(data.approval_notes || '');
            } catch (err) {
                console.error('Error fetching invoice:', err);
                setError('Erro ao carregar fatura');
            } finally {
                setIsLoading(false);
            }
        };

        if (params.id) {
            fetchInvoice();
        }
    }, [params.id]);

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

    const handleSaveNotes = async () => {
        if (!invoice) return;

        setIsSavingNotes(true);
        try {
            const { error: updateError } = await supabase
                .from('invoices')
                .update({ approval_notes: notes })
                .eq('id', invoice.id);

            if (updateError) throw updateError;

            setInvoice({ ...invoice, approval_notes: notes });
            setIsNotesModalOpen(false);
        } catch (err) {
            console.error('Error saving notes:', err);
        } finally {
            setIsSavingNotes(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600 mb-4">{error || 'Fatura não encontrada'}</p>
                <Button variant="secondary" onClick={() => router.back()}>
                    Voltar
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900">
                            NF {invoice.invoice_number}
                            {invoice.invoice_series && ` - Série ${invoice.invoice_series}`}
                        </h1>
                        <Badge variant={getStatusVariant(invoice.approval_status)}>
                            {getApprovalStatusEmoji(invoice.approval_status)} {getApprovalStatusLabel(invoice.approval_status)}
                        </Badge>
                    </div>
                    <p className="text-gray-500">{invoice.supplier_name || 'Fornecedor não informado'}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setIsNotesModalOpen(true)}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Notas
                    </Button>
                    {invoice.original_file_url && (
                        <Button
                            variant="secondary"
                            onClick={() => window.open(invoice.original_file_url, '_blank')}
                        >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ver Arquivo
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Supplier Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-gray-400" />
                                Dados do Fornecedor
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <dt className="text-sm text-gray-500">Nome</dt>
                                    <dd className="font-medium text-gray-900">
                                        {invoice.supplier_name || '-'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-gray-500">CNPJ</dt>
                                    <dd className="font-medium text-gray-900">
                                        {invoice.supplier_cnpj || '-'}
                                    </dd>
                                </div>
                            </dl>
                        </CardContent>
                    </Card>

                    {/* Invoice Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-gray-400" />
                                Dados da Fatura
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <dt className="text-sm text-gray-500">Número da NF</dt>
                                    <dd className="font-medium text-gray-900">
                                        {invoice.invoice_number}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-gray-500">Série</dt>
                                    <dd className="font-medium text-gray-900">
                                        {invoice.invoice_series || '-'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-gray-500">Tipo de Arquivo</dt>
                                    <dd className="font-medium text-gray-900">
                                        {getDocumentTypeLabel(invoice.file_type || '')}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-gray-500">Valor Total</dt>
                                    <dd className="text-xl font-semibold text-gray-900">
                                        {formatCurrency(invoice.total_amount)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-gray-500">Data de Emissão</dt>
                                    <dd className="font-medium text-gray-900">
                                        {invoice.invoice_date ? formatDate(invoice.invoice_date) : '-'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-gray-500">Data de Vencimento</dt>
                                    <dd className="font-medium text-gray-900">
                                        {invoice.due_date ? formatDate(invoice.due_date) : '-'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-gray-500">Status Processamento</dt>
                                    <dd className="font-medium text-gray-900">
                                        {getStatusLabel(invoice.status)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-gray-500">Criado em</dt>
                                    <dd className="font-medium text-gray-900">
                                        {formatDateTime(invoice.created_at)}
                                    </dd>
                                </div>
                                {invoice.po_number && (
                                    <div>
                                        <dt className="text-sm text-gray-500">Pedido de Compra</dt>
                                        <dd className="font-medium text-gray-900">
                                            {invoice.po_number}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </CardContent>
                    </Card>

                    {/* Accounting Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-gray-400" />
                                Informações Contábeis
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <dt className="text-sm text-gray-500">Conta Débito</dt>
                                    <dd className="font-medium text-gray-900">
                                        {invoice.debit_account_code || '-'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-gray-500">Conta Crédito</dt>
                                    <dd className="font-medium text-gray-900">
                                        {invoice.credit_account_code || '-'}
                                    </dd>
                                </div>
                                {invoice.tax_amount && invoice.tax_amount > 0 && (
                                    <div>
                                        <dt className="text-sm text-gray-500">Impostos</dt>
                                        <dd className="font-medium text-gray-900">
                                            {formatCurrency(invoice.tax_amount)}
                                        </dd>
                                    </div>
                                )}
                                {invoice.discount_amount && invoice.discount_amount > 0 && (
                                    <div>
                                        <dt className="text-sm text-gray-500">Descontos</dt>
                                        <dd className="font-medium text-gray-900">
                                            {formatCurrency(invoice.discount_amount)}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </CardContent>
                    </Card>

                    {/* Description */}
                    {invoice.description && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5 text-gray-400" />
                                    Descrição
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-700 whitespace-pre-wrap">{invoice.description}</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Notes */}
                    {invoice.approval_notes && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5 text-gray-400" />
                                    Observações de Aprovação
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-700 whitespace-pre-wrap">{invoice.approval_notes}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar - Approval Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-gray-400" />
                                Linha do Tempo
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Created */}
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        <FileText className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Fatura criada</p>
                                        <p className="text-sm text-gray-500">
                                            {formatDateTime(invoice.created_at)}
                                        </p>
                                    </div>
                                </div>

                                {/* Approved */}
                                {invoice.approval_status === 'approved' && invoice.approved_at && (
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Aprovada</p>
                                            <p className="text-sm text-gray-500">
                                                {formatDateTime(invoice.approved_at)}
                                            </p>
                                            {invoice.approver && (
                                                <p className="text-sm text-gray-500">
                                                    por {invoice.approver.name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Auto-approved */}
                                {invoice.approval_status === 'auto_approved' && (
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Auto-aprovada</p>
                                            <p className="text-sm text-gray-500">
                                                Valor dentro do limite automático
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Rejected */}
                                {invoice.approval_status === 'rejected' && (
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                            <XCircle className="h-4 w-4 text-red-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Rejeitada</p>
                                            {invoice.approved_at && (
                                                <p className="text-sm text-gray-500">
                                                    {formatDateTime(invoice.approved_at)}
                                                </p>
                                            )}
                                            {invoice.approver && (
                                                <p className="text-sm text-gray-500">
                                                    por {invoice.approver.name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Pending */}
                                {invoice.approval_status === 'pending' && (
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                            <Clock className="h-4 w-4 text-yellow-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                Aguardando aprovação
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Variance Alert */}
                    {invoice.variance_detected && (
                        <Card className="border-yellow-200 bg-yellow-50">
                            <CardContent className="py-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-yellow-800">Variação Detectada</p>
                                        {invoice.variance_description && (
                                            <p className="text-sm text-yellow-700 mt-1">
                                                {invoice.variance_description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Notes Modal */}
            <Modal
                isOpen={isNotesModalOpen}
                onClose={() => setIsNotesModalOpen(false)}
                title="Adicionar Observações"
            >
                <div className="space-y-4">
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Digite suas observações..."
                    />
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setIsNotesModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveNotes} isLoading={isSavingNotes}>
                            Salvar
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function AlertCircle(props: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={props.className}
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    );
}
