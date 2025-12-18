'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const fileTypeOptions = [
    { value: 'pdf', label: 'PDF' },
    { value: 'xml', label: 'XML' },
];

const WEBHOOK_URL = 'https://webhook.superadesafio.com.br/webhook/f1763123-1807-4e7b-87db-1f1ac457ca9c';

interface InvoiceData {
    invoice_number: string;
    invoice_series: string;
    supplier_name: string;
    supplier_cnpj: string;
    total_amount: string;
    due_date: string;
    invoice_date: string;
    description: string;
    file_type: string;
}

export default function UploadPage() {
    const router = useRouter();
    const { user, company } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showProcessingModal, setShowProcessingModal] = useState(false);
    const [processingStatus, setProcessingStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [processingMessage, setProcessingMessage] = useState('');
    const [invoiceData, setInvoiceData] = useState<InvoiceData>({
        invoice_number: '',
        invoice_series: '',
        supplier_name: '',
        supplier_cnpj: '',
        total_amount: '',
        due_date: '',
        invoice_date: '',
        description: '',
        file_type: 'pdf',
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
            processFile(droppedFile);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            processFile(selectedFile);
        }
    };

    const processFile = async (selectedFile: File) => {
        setFile(selectedFile);
        setIsProcessing(true);

        // Determine file type
        const ext = selectedFile.name.split('.').pop()?.toLowerCase();
        setInvoiceData(prev => ({
            ...prev,
            file_type: ext === 'xml' ? 'xml' : 'pdf'
        }));

        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsProcessing(false);
    };

    const handleInputChange = (field: keyof InvoiceData, value: string) => {
        setInvoiceData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Show processing modal
        setShowProcessingModal(true);
        setProcessingStatus('processing');
        setProcessingMessage('Enviando fatura para processamento...');

        try {
            // Upload file to Supabase if exists
            let fileUrl: string | undefined;
            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${company?.id}/${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('invoices')
                    .upload(fileName, file);

                if (!uploadError) {
                    const { data: urlData } = supabase.storage
                        .from('invoices')
                        .getPublicUrl(fileName);
                    fileUrl = urlData.publicUrl;
                }
            }

            // Prepare data for webhook
            const webhookPayload = {
                file_url: fileUrl || '',
                file_type: invoiceData.file_type,
                company_id: company?.id,
                user_id: user?.id,
                invoice_data: {
                    invoice_number: invoiceData.invoice_number || undefined,
                    invoice_series: invoiceData.invoice_series || undefined,
                    supplier_name: invoiceData.supplier_name || undefined,
                    supplier_cnpj: invoiceData.supplier_cnpj || undefined,
                    total_amount: invoiceData.total_amount ? parseFloat(invoiceData.total_amount.replace(/[^\d,.-]/g, '').replace(',', '.')) : undefined,
                    due_date: invoiceData.due_date || undefined,
                    invoice_date: invoiceData.invoice_date || undefined,
                    description: invoiceData.description || undefined,
                }
            };

            // Send to n8n webhook
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(webhookPayload),
            });

            if (!response.ok) {
                throw new Error(`Webhook retornou status ${response.status}`);
            }

            const result = await response.json();

            // Success
            setProcessingStatus('success');
            setProcessingMessage(result.message || 'Fatura enviada com sucesso! O processamento foi iniciado.');

            // Redirect after 3 seconds
            setTimeout(() => {
                router.push('/dashboard');
            }, 3000);

        } catch (err) {
            console.error('Error processing invoice:', err);
            setProcessingStatus('error');
            setProcessingMessage(
                err instanceof Error
                    ? `Erro: ${err.message}`
                    : 'Erro ao processar fatura. Tente novamente.'
            );
        }
    };

    const closeModal = () => {
        setShowProcessingModal(false);
        if (processingStatus === 'error') {
            // Reset on error so user can try again
            setProcessingStatus('processing');
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Nova Fatura</h1>
                <p className="text-gray-500">Faça upload e preencha os dados da fatura (todos os campos são opcionais)</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Upload do Documento</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Drop Zone */}
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
                        {isProcessing ? (
                            <div className="py-4">
                                <Spinner size="lg" />
                                <p className="mt-4 text-gray-600">Processando documento...</p>
                            </div>
                        ) : file ? (
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
                                    Arraste e solte um arquivo aqui, ou{' '}
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

                    {/* File Type */}
                    <div className="mt-6">
                        <Select
                            label="Tipo de Arquivo"
                            options={fileTypeOptions}
                            value={invoiceData.file_type}
                            onChange={(e) => handleInputChange('file_type', e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Invoice Data Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Dados da Fatura (Opcional)</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                <strong>Dica:</strong> Todos os campos abaixo são opcionais. O sistema n8n irá extrair os dados automaticamente.
                                Preencha apenas se desejar complementar ou corrigir informações.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="Número da NF"
                                placeholder="Ex: 12345"
                                value={invoiceData.invoice_number}
                                onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                            />
                            <Input
                                label="Série"
                                placeholder="Ex: 001"
                                value={invoiceData.invoice_series}
                                onChange={(e) => handleInputChange('invoice_series', e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="Nome do Fornecedor"
                                placeholder="Digite o nome do fornecedor"
                                value={invoiceData.supplier_name}
                                onChange={(e) => handleInputChange('supplier_name', e.target.value)}
                            />
                            <Input
                                label="CNPJ do Fornecedor"
                                placeholder="00.000.000/0000-00"
                                value={invoiceData.supplier_cnpj}
                                onChange={(e) => handleInputChange('supplier_cnpj', e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Input
                                label="Valor Total"
                                placeholder="R$ 0,00"
                                value={invoiceData.total_amount}
                                onChange={(e) => handleInputChange('total_amount', e.target.value)}
                            />
                            <Input
                                type="date"
                                label="Data de Emissão"
                                value={invoiceData.invoice_date}
                                onChange={(e) => handleInputChange('invoice_date', e.target.value)}
                            />
                            <Input
                                type="date"
                                label="Data de Vencimento"
                                value={invoiceData.due_date}
                                onChange={(e) => handleInputChange('due_date', e.target.value)}
                            />
                        </div>

                        <Input
                            label="Descrição"
                            placeholder="Descrição ou observações"
                            value={invoiceData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                        />

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => router.back()}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit">
                                Confirmar e Processar
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Processing Modal */}
            <Modal
                isOpen={showProcessingModal}
                onClose={processingStatus !== 'processing' ? closeModal : () => { }}
                title={
                    processingStatus === 'processing'
                        ? 'Processando...'
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
                                Fatura Enviada!
                            </p>
                            <p className="text-gray-600 mb-4">{processingMessage}</p>
                            <p className="text-sm text-gray-500">Redirecionando para o dashboard...</p>
                        </>
                    )}

                    {processingStatus === 'error' && (
                        <>
                            <div className="inline-flex items-center justify-center p-3 bg-red-100 rounded-full mb-4">
                                <AlertCircle className="h-12 w-12 text-red-600" />
                            </div>
                            <p className="text-lg font-semibold text-gray-900 mb-2">
                                Erro no Processamento
                            </p>
                            <p className="text-gray-600 mb-6">{processingMessage}</p>
                            <Button onClick={closeModal} variant="secondary">
                                Fechar e Tentar Novamente
                            </Button>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
}
