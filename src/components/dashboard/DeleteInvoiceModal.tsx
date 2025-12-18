'use client';

import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Invoice } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface DeleteInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice | null;
    onConfirm: (reason: string) => Promise<void>;
}

export function DeleteInvoiceModal({
    isOpen,
    onClose,
    invoice,
    onConfirm,
}: DeleteInvoiceModalProps) {
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleClose = () => {
        setReason('');
        setError('');
        onClose();
    };

    const handleConfirm = async () => {
        if (reason.trim().length < 5) {
            setError('O motivo deve ter pelo menos 5 caracteres');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await onConfirm(reason.trim());
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao excluir fatura');
        } finally {
            setIsLoading(false);
        }
    };

    if (!invoice) return null;

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="">
            <div className="text-center">
                {/* Warning Icon */}
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Excluir Fatura
                </h3>

                {/* Invoice Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <span className="text-gray-500">Número:</span>{' '}
                            <span className="font-medium">{invoice.invoice_number || '-'}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Valor:</span>{' '}
                            <span className="font-medium text-green-600">
                                {formatCurrency(invoice.total_amount)}
                            </span>
                        </div>
                        <div className="col-span-2">
                            <span className="text-gray-500">Fornecedor:</span>{' '}
                            <span className="font-medium">{invoice.supplier_name || 'Não informado'}</span>
                        </div>
                    </div>
                </div>

                {/* Warning Message */}
                <p className="text-gray-600 mb-4">
                    Esta ação moverá a fatura para a lixeira. Ela poderá ser visualizada no histórico de exclusões.
                </p>

                {/* Reason Input */}
                <div className="text-left mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Motivo da exclusão <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Informe o motivo da exclusão desta fatura..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none transition-colors"
                        rows={3}
                        maxLength={500}
                    />
                    <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500">Mínimo 5 caracteres</span>
                        <span className="text-xs text-gray-500">{reason.length}/500</span>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleClose}
                        disabled={isLoading}
                        className="flex-1"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        isLoading={isLoading}
                        disabled={reason.trim().length < 5}
                        className="flex-1 !bg-red-600 hover:!bg-red-700"
                    >
                        Confirmar Exclusão
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
