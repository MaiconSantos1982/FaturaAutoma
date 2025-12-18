import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

export function formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(new Date(date));
}

export function getApprovalStatusEmoji(status: string): string {
    switch (status) {
        case 'pending':
            return '⏳';
        case 'approved':
            return '✅';
        case 'rejected':
            return '❌';
        case 'auto_approved':
            return '🔄';
        default:
            return '';
    }
}

export function getApprovalStatusLabel(status: string): string {
    switch (status) {
        case 'pending':
            return 'Pendente';
        case 'approved':
            return 'Aprovada';
        case 'rejected':
            return 'Rejeitada';
        case 'auto_approved':
            return 'Auto-aprovada';
        default:
            return status;
    }
}

export function getApprovalStatusColor(status: string): string {
    switch (status) {
        case 'pending':
            return 'bg-yellow-100 text-yellow-800';
        case 'approved':
        case 'auto_approved':
            return 'bg-green-100 text-green-800';
        case 'rejected':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

export function getStatusLabel(status: string): string {
    switch (status) {
        case 'pending_extraction':
            return 'Aguardando Extração';
        case 'pending':
            return 'Pendente';
        case 'processing':
            return 'Processando';
        case 'completed':
            return 'Concluído';
        case 'error':
            return 'Erro';
        default:
            return status;
    }
}

export function getDocumentTypeLabel(type: string): string {
    switch (type) {
        case 'nota_fiscal':
            return 'Nota Fiscal';
        case 'boleto':
            return 'Boleto';
        case 'fatura':
            return 'Fatura';
        case 'outro':
            return 'Outro';
        case 'pdf':
            return 'PDF';
        case 'xml':
            return 'XML';
        default:
            return type || 'Documento';
    }
}
