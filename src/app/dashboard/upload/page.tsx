'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const fileTypeOptions = [
    { value: 'pdf', label: 'PDF' },
    { value: 'xml', label: 'XML' },
];

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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
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
        setError('');
        setIsProcessing(true);

        // Determine file type
        const ext = selectedFile.name.split('.').pop()?.toLowerCase();
        setInvoiceData(prev => ({
            ...prev,
            file_type: ext === 'xml' ? 'xml' : 'pdf'
        }));

        // Simulate OCR processing delay
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setIsProcessing(false);
    };

    const handleInputChange = (field: keyof InvoiceData, value: string) => {
        setInvoiceData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!invoiceData.invoice_number || !invoiceData.supplier_name || !invoiceData.total_amount) {
            setError('Número da NF, fornecedor e valor são obrigatórios');
            return;
        }

        setIsSubmitting(true);

        try {
            // Upload file if exists
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

            // Check auto-approval
            const amount = parseFloat(invoiceData.total_amount.replace(/[^\d,.-]/g, '').replace(',', '.'));
            const autoApproveLimit = company?.auto_approve_limit || 0;
            const shouldAutoApprove = amount <= autoApproveLimit;

            // Create invoice
            const { error: insertError } = await supabase.from('invoices').insert({
                company_id: company?.id,
                invoice_number: invoiceData.invoice_number,
                invoice_series: invoiceData.invoice_series || null,
                supplier_name: invoiceData.supplier_name,
                supplier_cnpj: invoiceData.supplier_cnpj || null,
                total_amount: amount,
                due_date: invoiceData.due_date || null,
                invoice_date: invoiceData.invoice_date || null,
                description: invoiceData.description || null,
                file_type: invoiceData.file_type,
                status: 'pending',
                approval_status: shouldAutoApprove ? 'auto_approved' : 'pending',
                original_file_url: fileUrl,
                created_by: user?.id,
            });

            if (insertError) throw insertError;

            setSuccess(true);
            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);
        } catch (err) {
            console.error('Error creating invoice:', err);
            setError('Erro ao processar fatura. Tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardContent className="py-12 text-center">
                        <div className="inline-flex items-center justify-center p-3 bg-green-100 rounded-full mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            Fatura processada com sucesso!
                        </h2>
                        <p className="text-gray-500">Redirecionando para o dashboard...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Nova Fatura</h1>
                <p className="text-gray-500">Faça upload e preencha os dados da fatura</p>
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
                    <CardTitle>Dados da Fatura</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="Número da NF *"
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
                                label="Nome do Fornecedor *"
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
                                label="Valor Total *"
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

                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => router.back()}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" isLoading={isSubmitting}>
                                Confirmar e Processar
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
