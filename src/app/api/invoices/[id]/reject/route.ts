import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth, hasRole } from '@/lib/auth';
import {
    successResponse,
    errorResponse,
    unauthorizedResponse,
    forbiddenResponse,
    notFoundResponse,
} from '@/lib/api-response';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST /api/invoices/:id/reject - Reject an invoice
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        // Check role
        if (!hasRole(user, ['super_admin', 'master'])) {
            return forbiddenResponse('Sem permissão para rejeitar faturas');
        }

        const { id } = await params;
        const body = await request.json();

        // Validate reason
        if (!body.reason || body.reason.trim() === '') {
            return errorResponse('Motivo da rejeição é obrigatório', 400);
        }

        // Get invoice
        const { data: invoice, error: fetchError } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !invoice) {
            return notFoundResponse('Fatura não encontrada');
        }

        // Verify company access
        if (invoice.company_id !== user.company_id) {
            return forbiddenResponse('Sem permissão para rejeitar esta fatura');
        }

        // Check if already processed
        if (invoice.approval_status !== 'pending') {
            return errorResponse('Fatura já foi processada', 400);
        }

        // Update invoice
        const { data: updatedInvoice, error: updateError } = await supabase
            .from('invoices')
            .update({
                approval_status: 'rejected',
                approver_id: user.id,
                approved_at: new Date().toISOString(),
                approval_notes: body.reason,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Update error:', updateError);
            return errorResponse('Erro ao rejeitar fatura', 500);
        }

        // Create audit log
        await supabase.from('audit_log').insert({
            company_id: user.company_id,
            user_id: user.id,
            invoice_id: id,
            action: 'reject_invoice',
            old_values: { approval_status: invoice.approval_status },
            new_values: { approval_status: 'rejected', reason: body.reason },
        });

        // Notify invoice creator
        if (invoice.created_by && invoice.created_by !== user.id) {
            await supabase.from('notifications').insert({
                company_id: user.company_id,
                user_id: invoice.created_by,
                invoice_id: id,
                type: 'invoice_rejected',
                title: 'Fatura rejeitada',
                message: `Sua fatura ${invoice.invoice_number} foi rejeitada. Motivo: ${body.reason}`,
            });
        }

        return successResponse({
            invoice: updatedInvoice,
        }, 'Fatura rejeitada com sucesso');
    } catch (error) {
        console.error('Reject invoice error:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}
