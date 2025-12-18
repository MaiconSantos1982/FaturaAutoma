'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';

export default function UploadPage() {
    const router = useRouter();
    const { user, company } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showProcessingModal, setShowProcessingModal] = useState(false);
    const [processingStatus, setProcessingStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [processingMessage, setProcessingMessage] = useState('');

    // Optional manual data (if user wants to help OCR)
    const [invoiceNumber, setInvoiceNumber] = useState('');

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
            const formData = new FormData();
            formData.append('file', file);
            if (company?.id) formData.append('company_id', company.id);
            if (user?.id) formData.append('user_id', user.id);

            // Optional: send manual data if needed in future
            // formData.append('invoice_number', invoiceNumber);

            // Call Backend API
            const response = await fetch('/api/invoices/upload-file', {
                method: 'POST',
                headers: {
                    // Get token from localStorage since it's stored there by AuthContext
                    'Authorization': `Bearer ${localStorage.getItem('fatura_user_token') || ''}`
                },
                body: formData,
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
                <p className="text-gray-500">Faça o upload da Nota Fiscal para processamento automático</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Upload do PDF</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">

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
                                        Arraste e solte o PDF aqui, ou{' '}
                                        <label className="text-blue-600 cursor-pointer hover:underline">
                                            clique para selecionar
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".pdf"
                                                onChange={handleFileSelect}
                                            />
                                        </label>
                                    </p>
                                    <p className="text-sm text-gray-500">Apenas arquivos PDF</p>
                                </>
                            )}
                        </div>

                        {/* Optional Info Box */}
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                            Ao confirmar, o arquivo será enviado para nossos servidores e processado para extração automática dos dados.
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
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
                </CardContent>
            </Card>

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
