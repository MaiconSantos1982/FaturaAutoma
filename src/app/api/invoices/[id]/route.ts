import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
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

// GET /api/invoices/:id - Get single invoice
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        const { id } = await params;

        // Get invoice with related data
        const { data: invoice, error: queryError } = await supabase
            .from('invoices')
            .select(`
        *,
        approver:users!approver_id(id, name, email),
        creator:users!created_by(id, name, email)
      `)
            .eq('id', id)
            .single();

        if (queryError || !invoice) {
            return notFoundResponse('Fatura não encontrada');
        }

        // Verify company access
        if (invoice.company_id !== user.company_id) {
            return forbiddenResponse('Sem permissão para acessar esta fatura');
        }

        // Get audit history
        const { data: history } = await supabase
            .from('audit_log')
            .select('*, user:users(id, name)')
            .eq('invoice_id', id)
            .order('created_at', { ascending: false })
            .limit(20);

        return successResponse({
            invoice,
            history: history || [],
        }, 'Fatura carregada com sucesso');
    } catch (error) {
        console.error('Get invoice error:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}

// PUT /api/invoices/:id - Update invoice
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        const { id } = await params;
        const body = await request.json();

        // Get current invoice
        const { data: currentInvoice, error: fetchError } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !currentInvoice) {
            return notFoundResponse('Fatura não encontrada');
        }

        // Verify company access
        if (currentInvoice.company_id !== user.company_id) {
            return forbiddenResponse('Sem permissão para editar esta fatura');
        }

        // Only allow editing pending invoices
        if (currentInvoice.approval_status !== 'pending') {
            return errorResponse('Não é possível editar faturas já aprovadas/rejeitadas', 400);
        }

        // Build update data
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        const allowedFields = [
            'supplier_name', 'supplier_cnpj', 'invoice_number', 'invoice_series',
            'total_amount', 'tax_amount', 'discount_amount', 'due_date', 'invoice_date',
            'description', 'po_number', 'debit_account_code', 'credit_account_code'
        ];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        }

        // Update invoice
        const { data: invoice, error: updateError } = await supabase
            .from('invoices')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Update error:', updateError);
            return errorResponse('Erro ao atualizar fatura', 500);
        }

        // Create audit log
        await supabase.from('audit_log').insert({
            company_id: user.company_id,
            user_id: user.id,
            invoice_id: id,
            action: 'update_invoice',
            old_values: currentInvoice,
            new_values: updateData,
        });

        return successResponse({ invoice }, 'Fatura atualizada com sucesso');
    } catch (error) {
        console.error('Update invoice error:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}

// DELETE /api/invoices/:id - Delete invoice (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        const { id } = await params;

        // Parse body to get deletion reason
        let reason = '';
        try {
            const body = await request.json();
            reason = body.reason || '';
        } catch {
            // Body might be empty for legacy calls
        }

        if (!reason || reason.trim().length < 5) {
            return errorResponse('Motivo da exclusão é obrigatório (mínimo 5 caracteres)', 400);
        }

        // Get current invoice
        const { data: currentInvoice, error: fetchError } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !currentInvoice) {
            return notFoundResponse('Fatura não encontrada');
        }

        // Verify company access
        if (currentInvoice.company_id !== user.company_id) {
            return forbiddenResponse('Sem permissão para excluir esta fatura');
        }

        // Only super_admin or master can delete
        if (user.role !== 'super_admin' && user.role !== 'master') {
            return forbiddenResponse('Apenas administradores podem excluir faturas');
        }

        // Already deleted?
        if (currentInvoice.status === 'deleted') {
            return errorResponse('Esta fatura já foi excluída', 400);
        }

        // Soft delete with deletion metadata
        const { error: deleteError } = await supabase
            .from('invoices')
            .update({
                status: 'deleted',
                deleted_at: new Date().toISOString(),
                deleted_by: user.id,
                deletion_reason: reason.trim(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (deleteError) {
            console.error('Delete error:', deleteError);
            return errorResponse('Erro ao excluir fatura', 500);
        }

        // Create audit log
        await supabase.from('audit_log').insert({
            company_id: user.company_id,
            user_id: user.id,
            invoice_id: id,
            action: 'delete_invoice',
            old_values: currentInvoice,
            new_values: {
                status: 'deleted',
                deletion_reason: reason.trim(),
                deleted_by: user.id,
                deleted_by_name: user.name
            },
        });

        return successResponse(null, 'Fatura excluída com sucesso');
    } catch (error) {
        console.error('Delete invoice error:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}
