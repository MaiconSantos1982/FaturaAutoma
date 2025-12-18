'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingApprovals } from '@/hooks/useInvoices';
import { Invoice } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ApprovalsPage() {
    const { user, company, checkRole } = useAuth();
    const { invoices, isLoading, error, refetch } = usePendingApprovals();
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [debitAccount, setDebitAccount] = useState('');
    const [approvalNotes, setApprovalNotes] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Check if user has approval permissions
    if (!checkRole(['super_admin', 'master'])) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
            </div>
        );
    }

    const handleApprove = async () => {
        if (!selectedInvoice || !user) return;

        setIsSubmitting(true);
        try {
            const { error: updateError } = await supabase
                .from('invoices')
                .update({
                    approval_status: 'approved',
                    approver_id: user.id,
                    approved_at: new Date().toISOString(),
                    debit_account_code: debitAccount || company?.default_debit_account,
                    approval_notes: approvalNotes || selectedInvoice.approval_notes,
                })
                .eq('id', selectedInvoice.id);

            if (updateError) throw updateError;

            // Check if approver is different from assigned
            const isAssignedApprover = !selectedInvoice.assigned_approver_id || selectedInvoice.assigned_approver_id === user.id;

            // Log audit with approver comparison
            await supabase.from('audit_log').insert({
                company_id: company?.id,
                user_id: user.id,
                invoice_id: selectedInvoice.id,
                action: 'approve_invoice',
                old_values: {
                    approval_status: selectedInvoice.approval_status,
                    assigned_approver_id: selectedInvoice.assigned_approver_id,
                },
                new_values: {
                    approval_status: 'approved',
                    approver_id: user.id,
                    approver_name: user.name,
                    is_assigned_approver: isAssignedApprover,
                    assigned_approver_id: selectedInvoice.assigned_approver_id,
                    approval_note: !isAssignedApprover
                        ? `Aprovação realizada por ${user.name} (não era o aprovador designado)`
                        : null,
                },
            });

            setSuccessMessage('Fatura aprovada com sucesso!');
            setIsApproveModalOpen(false);
            setSelectedInvoice(null);
            setDebitAccount('');
            setApprovalNotes('');
            refetch();

            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error approving invoice:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!selectedInvoice || !user || !rejectionReason) return;

        setIsSubmitting(true);
        try {
            const { error: updateError } = await supabase
                .from('invoices')
                .update({
                    approval_status: 'rejected',
                    approver_id: user.id,
                    approved_at: new Date().toISOString(),
                    approval_notes: rejectionReason,
                })
                .eq('id', selectedInvoice.id);

            if (updateError) throw updateError;

            // Check if approver is different from assigned
            const isAssignedApprover = !selectedInvoice.assigned_approver_id || selectedInvoice.assigned_approver_id === user.id;

            // Log audit with approver comparison
            await supabase.from('audit_log').insert({
                company_id: company?.id,
                user_id: user.id,
                invoice_id: selectedInvoice.id,
                action: 'reject_invoice',
                old_values: {
                    approval_status: selectedInvoice.approval_status,
                    assigned_approver_id: selectedInvoice.assigned_approver_id,
                },
                new_values: {
                    approval_status: 'rejected',
                    reason: rejectionReason,
                    approver_id: user.id,
                    approver_name: user.name,
                    is_assigned_approver: isAssignedApprover,
                    assigned_approver_id: selectedInvoice.assigned_approver_id,
                    approval_note: !isAssignedApprover
                        ? `Rejeição realizada por ${user.name} (não era o aprovador designado)`
                        : null,
                },
            });

            setSuccessMessage('Fatura rejeitada.');
            setIsRejectModalOpen(false);
            setSelectedInvoice(null);
            setRejectionReason('');
            refetch();

            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error rejecting invoice:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openApproveModal = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setDebitAccount(company?.default_debit_account || '');
        setIsApproveModalOpen(true);
    };

    const openRejectModal = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setIsRejectModalOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Aprovações Pendentes</h1>
                <p className="text-gray-500">Revise e aprove ou rejeite as faturas</p>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    {successMessage}
                </div>
            )}

            {error ? (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
            ) : invoices.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <p className="text-gray-600">Nenhuma fatura pendente de aprovação!</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {invoices.map((invoice) => (
                        <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="font-semibold text-gray-900">{invoice.supplier_name || 'Fornecedor não informado'}</p>
                                        <p className="text-sm text-gray-500">NF: {invoice.invoice_number}</p>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <DollarSign className="h-4 w-4" />
                                        <span className="font-semibold text-lg text-gray-900">
                                            {formatCurrency(invoice.total_amount)}
                                        </span>
                                    </div>
                                    {invoice.due_date && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Calendar className="h-4 w-4" />
                                            <span className="text-sm">Vence em {formatDate(invoice.due_date)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => openApproveModal(invoice)}
                                    >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Aprovar
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="danger"
                                        className="flex-1"
                                        onClick={() => openRejectModal(invoice)}
                                    >
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Rejeitar
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Approve Modal */}
            <Modal
                isOpen={isApproveModalOpen}
                onClose={() => setIsApproveModalOpen(false)}
                title="Aprovar Fatura"
            >
                {selectedInvoice && (
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="font-medium">{selectedInvoice.supplier_name}</p>
                            <p className="text-sm text-gray-500">NF: {selectedInvoice.invoice_number}</p>
                            <p className="text-lg font-semibold text-blue-600 mt-1">
                                {formatCurrency(selectedInvoice.total_amount)}
                            </p>
                        </div>

                        {/* Warning when not assigned approver */}
                        {selectedInvoice.assigned_approver_id && selectedInvoice.assigned_approver_id !== user?.id && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    <strong>⚠️ Atenção:</strong> Você não é o aprovador designado para esta fatura.
                                    O responsável é <strong>{selectedInvoice.assigned_approver?.name || 'outro usuário'}</strong>.
                                </p>
                            </div>
                        )}

                        <Input
                            label="Conta Débito"
                            placeholder="Ex: 4.1.01.01"
                            value={debitAccount}
                            onChange={(e) => setDebitAccount(e.target.value)}
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {selectedInvoice.assigned_approver_id && selectedInvoice.assigned_approver_id !== user?.id
                                    ? 'Motivo da Aprovação *'
                                    : 'Observações'}
                            </label>
                            <textarea
                                value={approvalNotes}
                                onChange={(e) => setApprovalNotes(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder={selectedInvoice.assigned_approver_id && selectedInvoice.assigned_approver_id !== user?.id
                                    ? "Informe o motivo pelo qual você está aprovando esta fatura..."
                                    : "Observações opcionais..."}
                            />
                            {selectedInvoice.assigned_approver_id && selectedInvoice.assigned_approver_id !== user?.id && !approvalNotes && (
                                <p className="mt-1 text-xs text-red-500">
                                    Motivo obrigatório ao aprovar como substituto
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="secondary" onClick={() => setIsApproveModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleApprove}
                                isLoading={isSubmitting}
                                disabled={
                                    !!(selectedInvoice.assigned_approver_id &&
                                        selectedInvoice.assigned_approver_id !== user?.id &&
                                        !approvalNotes.trim())
                                }
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirmar Aprovação
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Reject Modal */}
            <Modal
                isOpen={isRejectModalOpen}
                onClose={() => setIsRejectModalOpen(false)}
                title="Rejeitar Fatura"
            >
                {selectedInvoice && (
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="font-medium">{selectedInvoice.supplier_name}</p>
                            <p className="text-sm text-gray-500">NF: {selectedInvoice.invoice_number}</p>
                            <p className="text-lg font-semibold text-blue-600 mt-1">
                                {formatCurrency(selectedInvoice.total_amount)}
                            </p>
                        </div>

                        {/* Warning when not assigned approver */}
                        {selectedInvoice.assigned_approver_id && selectedInvoice.assigned_approver_id !== user?.id && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    <strong>⚠️ Atenção:</strong> Você não é o aprovador designado para esta fatura.
                                    O responsável é <strong>{selectedInvoice.assigned_approver?.name || 'outro usuário'}</strong>.
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Motivo da Rejeição *
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                placeholder="Informe o motivo da rejeição..."
                                required
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="secondary" onClick={() => setIsRejectModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleReject}
                                isLoading={isSubmitting}
                                disabled={!rejectionReason}
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Confirmar Rejeição
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
