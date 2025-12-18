'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { formatCNPJ, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';

interface InvoiceFormData {
    invoice_number: string;
    supplier_name: string;
    supplier_cnpj: string;
    total_amount: string;
    invoice_date: string;
    due_date: string;
    description: string;
}

export default function UploadPage() {
    const router = useRouter();
    const { user, company } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showProcessingModal, setShowProcessingModal] = useState(false);
    const [processingStatus, setProcessingStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [processingMessage, setProcessingMessage] = useState('');

    // Optional manual data (if user wants to help OCR)
    const [formData, setFormData] = useState<InvoiceFormData>({
        invoice_number: '',
        supplier_name: '',
        supplier_cnpj: '',
        total_amount: '',
        invoice_date: '',
        due_date: '',
        description: '',
    });

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            setFile(droppedFile);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const handleInputChange = (field: keyof InvoiceFormData, value: string) => {
        // Apply masks for specific fields
        let formattedValue = value;

        if (field === 'supplier_cnpj') {
            formattedValue = formatCNPJ(value);
        } else if (field === 'total_amount') {
            formattedValue = formatCurrencyInput(value);
        }

        setFormData(prev => ({ ...prev, [field]: formattedValue }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!file) {
            alert('Por favor, selecione um arquivo.');
            return;
        }

        // Show processing modal
        setShowProcessingModal(true);
        setProcessingStatus('processing');
        setProcessingMessage('Enviando arquivo e iniciando processamento...');

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('file', file);
            if (company?.id) formDataToSend.append('company_id', company.id);
            if (user?.id) formDataToSend.append('user_id', user.id);

            // Add optional invoice fields if filled
            if (formData.invoice_number) formDataToSend.append('invoice_number', formData.invoice_number);
            if (formData.supplier_name) formDataToSend.append('supplier_name', formData.supplier_name);
            if (formData.supplier_cnpj) formDataToSend.append('supplier_cnpj', formData.supplier_cnpj);
            if (formData.total_amount) {
                // Parse currency to number before sending
                const amount = parseCurrencyInput(formData.total_amount);
                formDataToSend.append('total_amount', amount.toString());
            }
            if (formData.invoice_date) formDataToSend.append('invoice_date', formData.invoice_date);
            if (formData.due_date) formDataToSend.append('due_date', formData.due_date);
            if (formData.description) formDataToSend.append('description', formData.description);

            // Call Backend API
            const response = await fetch('/api/invoices/upload-file', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('fatura_user_token') || ''}`
                },
                body: formDataToSend,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || result.message || 'Erro ao enviar arquivo');
            }

            // Success
            setProcessingStatus('success');
            setProcessingMessage(result.message || 'Arquivo enviado com sucesso!');

            // Redirect after 3 seconds
            setTimeout(() => {
                router.push('/dashboard');
            }, 3000);

        } catch (err) {
            console.error('Error uploading file:', err);
            setProcessingStatus('error');
            setProcessingMessage(
                err instanceof Error
                    ? `Erro: ${err.message}`
                    : 'Erro ao processar envio. Tente novamente.'
            );
        }
    };

    const closeModal = () => {
        setShowProcessingModal(false);
        if (processingStatus === 'error') {
            setProcessingStatus('processing');
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Nova Fatura</h1>
                <p className="text-gray-500">Faça o upload e preencha dados adicionais (opcionais)</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Upload Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Upload do Documento</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                                ? 'border-blue-500 bg-blue-50'
                                : file
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                        >
                            {file ? (
                                <div className="flex items-center justify-center gap-3">
                                    <FileText className="h-8 w-8 text-green-600" />
                                    <div className="text-left">
                                        <p className="font-medium text-gray-900">{file.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFile(null)}
                                        className="ml-4 p-1 hover:bg-gray-200 rounded"
                                    >
                                        <X className="h-5 w-5 text-gray-500" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600 mb-2">
                                        Arraste e solte o arquivo aqui, ou{' '}
                                        <label className="text-blue-600 cursor-pointer hover:underline">
                                            clique para selecionar
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".pdf,.xml,.png,.jpg,.jpeg"
                                                onChange={handleFileSelect}
                                            />
                                        </label>
                                    </p>
                                    <p className="text-sm text-gray-500">PDF, XML, PNG ou JPG</p>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Optional Invoice Data */}
                <Card>
                    <CardHeader>
                        <CardTitle>Dados da Fatura (Opcional)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                            <strong>Dica:</strong> Todos os campos abaixo são opcionais. O sistema extrairá os dados automaticamente.
                            Preencha apenas se desejar complementar ou corrigir informações.
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="Número da NF"
                                placeholder="Ex: 12345"
                                value={formData.invoice_number}
                                onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                            />
                            <Input
                                label="Nome do Fornecedor"
                                placeholder="Nome do fornecedor"
                                value={formData.supplier_name}
                                onChange={(e) => handleInputChange('supplier_name', e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="CNPJ do Fornecedor"
                                placeholder="00.000.000/0000-00"
                                value={formData.supplier_cnpj}
                                onChange={(e) => handleInputChange('supplier_cnpj', e.target.value)}
                            />
                            <Input
                                label="Valor Total"
                                placeholder="R$ 0,00"
                                value={formData.total_amount}
                                onChange={(e) => handleInputChange('total_amount', e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                type="date"
                                label="Data de Emissão"
                                value={formData.invoice_date}
                                onChange={(e) => handleInputChange('invoice_date', e.target.value)}
                            />
                            <Input
                                type="date"
                                label="Data de Vencimento"
                                value={formData.due_date}
                                onChange={(e) => handleInputChange('due_date', e.target.value)}
                            />
                        </div>

                        <Input
                            label="Descrição"
                            placeholder="Observações ou descrição"
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                        />
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-3">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => router.back()}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={!file}>
                        Confirmar Envio
                    </Button>
                </div>
            </form>

            {/* Processing Modal */}
            <Modal
                isOpen={showProcessingModal}
                onClose={processingStatus !== 'processing' ? closeModal : () => { }}
                title={
                    processingStatus === 'processing'
                        ? 'Enviando...'
                        : processingStatus === 'success'
                            ? 'Sucesso!'
                            : 'Erro'
                }
            >
                <div className="text-center py-6">
                    {processingStatus === 'processing' && (
                        <>
                            <Spinner size="lg" className="mx-auto mb-4" />
                            <p className="text-gray-600">{processingMessage}</p>
                        </>
                    )}

                    {processingStatus === 'success' && (
                        <>
                            <div className="inline-flex items-center justify-center p-3 bg-green-100 rounded-full mb-4">
                                <CheckCircle className="h-12 w-12 text-green-600" />
                            </div>
                            <p className="text-lg font-semibold text-gray-900 mb-2">
                                Upload Concluído!
                            </p>
                            <p className="text-gray-600 mb-4">{processingMessage}</p>
                            <p className="text-sm text-gray-500">Redirecionando...</p>
                        </>
                    )}

                    {processingStatus === 'error' && (
                        <>
                            <div className="inline-flex items-center justify-center p-3 bg-red-100 rounded-full mb-4">
                                <AlertCircle className="h-12 w-12 text-red-600" />
                            </div>
                            <p className="text-lg font-semibold text-gray-900 mb-2">
                                Falha no Envio
                            </p>
                            <p className="text-gray-600 mb-6">{processingMessage}</p>
                            <Button onClick={closeModal} variant="secondary">
                                Tentar Novamente
                            </Button>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
}
