'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, FileX, User, Calendar, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';

interface DeletedInvoice {
    id: string;
    invoice_number: string;
    supplier_name: string;
    total_amount: number;
    deleted_at: string;
    deleted_by: string;
    deletion_reason: string;
    created_at: string;
    deleter?: {
        id: string;
        name: string;
        email: string;
    };
}

export default function DeletedInvoicesPage() {
    const { company } = useAuth();
    const [deletedInvoices, setDeletedInvoices] = useState<DeletedInvoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (company?.id) {
            fetchDeletedInvoices();
        }
    }, [company?.id]);

    const fetchDeletedInvoices = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select(`
                    id,
                    invoice_number,
                    supplier_name,
                    total_amount,
                    deleted_at,
                    deleted_by,
                    deletion_reason,
                    created_at,
                    deleter:users!deleted_by(id, name, email)
                `)
                .eq('company_id', company?.id)
                .eq('status', 'deleted')
                .order('deleted_at', { ascending: false });

            if (error) {
                console.error('Error fetching deleted invoices:', error);
            } else {
                // Transform data to handle Supabase join returning array
                const transformed = (data || []).map((item: Record<string, unknown>) => ({
                    ...item,
                    deleter: Array.isArray(item.deleter) ? item.deleter[0] : item.deleter
                })) as DeletedInvoice[];
                setDeletedInvoices(transformed);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                    <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Faturas Excluídas</h1>
                    <p className="text-gray-500">Histórico de faturas removidas do sistema</p>
                </div>
            </div>

            {/* Content */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileX className="h-5 w-5 text-gray-500" />
                        Lixeira ({deletedInvoices.length} {deletedInvoices.length === 1 ? 'fatura' : 'faturas'})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Spinner size="lg" />
                        </div>
                    ) : deletedInvoices.length === 0 ? (
                        <div className="text-center py-12">
                            <Trash2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">Nenhuma fatura excluída</p>
                            <p className="text-sm text-gray-400 mt-1">
                                Faturas removidas aparecerão aqui
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {deletedInvoices.map((invoice) => (
                                <div
                                    key={invoice.id}
                                    className="border border-gray-200 rounded-lg p-4 hover:border-red-200 hover:bg-red-50/30 transition-colors"
                                >
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                        {/* Invoice Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="danger">Excluída</Badge>
                                                <span className="font-medium text-gray-900">
                                                    NF {invoice.invoice_number || 'S/N'}
                                                </span>
                                            </div>
                                            <p className="text-gray-600">{invoice.supplier_name || 'Fornecedor não informado'}</p>
                                            <p className="text-lg font-semibold text-green-600 mt-1">
                                                {formatCurrency(invoice.total_amount)}
                                            </p>
                                        </div>

                                        {/* Deletion Info */}
                                        <div className="flex-1 md:border-l md:pl-4 border-gray-200">
                                            <h4 className="text-sm font-medium text-gray-900 mb-2">Informações da Exclusão</h4>

                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <User className="h-4 w-4 text-gray-400" />
                                                    <span>
                                                        Excluída por: {' '}
                                                        <span className="font-medium">
                                                            {invoice.deleter?.name || 'Usuário desconhecido'}
                                                        </span>
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                    <span>
                                                        Data: {' '}
                                                        <span className="font-medium">
                                                            {invoice.deleted_at
                                                                ? new Date(invoice.deleted_at).toLocaleString('pt-BR')
                                                                : '-'
                                                            }
                                                        </span>
                                                    </span>
                                                </div>

                                                <div className="flex items-start gap-2 text-gray-600">
                                                    <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                                                    <div>
                                                        <span className="block text-gray-500">Motivo:</span>
                                                        <span className="font-medium text-gray-800">
                                                            {invoice.deletion_reason || 'Não informado'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
