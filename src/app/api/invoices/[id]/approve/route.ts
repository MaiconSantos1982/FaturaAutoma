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

// POST /api/invoices/:id/approve - Approve an invoice
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        // Check role
        if (!hasRole(user, ['super_admin', 'master'])) {
            return forbiddenResponse('Sem permissão para aprovar faturas');
        }

        const { id } = await params;
        const body = await request.json();

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
            return forbiddenResponse('Sem permissão para aprovar esta fatura');
        }

        // Check if already processed
        if (invoice.approval_status !== 'pending') {
            return errorResponse('Fatura já foi processada', 400);
        }

        // Get company defaults
        const { data: company } = await supabase
            .from('companies')
            .select('default_debit_account, default_credit_account')
            .eq('id', user.company_id)
            .single();

        const debitAccount = body.debit_account_code || invoice.debit_account_code || company?.default_debit_account;
        const creditAccount = body.credit_account_code || invoice.credit_account_code || company?.default_credit_account;

        // Update invoice
        const { data: updatedInvoice, error: updateError } = await supabase
            .from('invoices')
            .update({
                approval_status: 'approved',
                status: 'completed',
                approver_id: user.id,
                approved_at: new Date().toISOString(),
                approval_notes: body.notes || null,
                debit_account_code: debitAccount,
                credit_account_code: creditAccount,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Update error:', updateError);
            return errorResponse('Erro ao aprovar fatura', 500);
        }

        // Create accounting entry
        const { data: accountingEntry, error: entryError } = await supabase
            .from('accounting_entries')
            .insert({
                company_id: user.company_id,
                invoice_id: id,
                debit_account_code: debitAccount,
                debit_amount: invoice.total_amount,
                credit_account_code: creditAccount,
                credit_amount: invoice.total_amount,
                entry_date: new Date().toISOString().split('T')[0],
                erp_status: 'pending',
                created_by: user.id,
            })
            .select()
            .single();

        if (entryError) {
            console.error('Accounting entry error:', entryError);
        }

        // Check if approver is different from assigned
        const isAssignedApprover = !invoice.assigned_approver_id || invoice.assigned_approver_id === user.id;

        // Create audit log with approver comparison
        await supabase.from('audit_log').insert({
            company_id: user.company_id,
            user_id: user.id,
            invoice_id: id,
            action: 'approve_invoice',
            old_values: {
                approval_status: invoice.approval_status,
                assigned_approver_id: invoice.assigned_approver_id,
            },
            new_values: {
                approval_status: 'approved',
                approver_id: user.id,
                approver_name: user.name,
                is_assigned_approver: isAssignedApprover,
                assigned_approver_id: invoice.assigned_approver_id,
                approval_note: !isAssignedApprover
                    ? `Aprovação realizada por ${user.name} (não era o aprovador designado)`
                    : null,
            },
        });

        // Notify invoice creator
        if (invoice.created_by && invoice.created_by !== user.id) {
            await supabase.from('notifications').insert({
                company_id: user.company_id,
                user_id: invoice.created_by,
                invoice_id: id,
                type: 'invoice_approved',
                title: 'Fatura aprovada',
                message: `Sua fatura ${invoice.invoice_number} foi aprovada por ${user.name}`,
            });
        }

        return successResponse({
            invoice: updatedInvoice,
            accounting_entry: accountingEntry,
        }, 'Fatura aprovada com sucesso');
    } catch (error) {
        console.error('Approve invoice error:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}
