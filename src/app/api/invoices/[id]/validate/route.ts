import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import {
    successResponse,
    errorResponse,
    unauthorizedResponse,
    notFoundResponse,
} from '@/lib/api-response';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST /api/invoices/:id/validate - Validate invoice and apply routing
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        const { id } = await params;

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
            return errorResponse('Sem permissão para validar esta fatura', 403);
        }

        // Get company config
        const { data: company } = await supabase
            .from('companies')
            .select('auto_approve_limit, default_debit_account, default_credit_account')
            .eq('id', user.company_id)
            .single();

        const amount = invoice.total_amount;
        const autoApproveLimit = company?.auto_approve_limit || 0;

        // Check auto-approval
        if (amount <= autoApproveLimit) {
            // Auto-approve
            const { data: updatedInvoice, error: updateError } = await supabase
                .from('invoices')
                .update({
                    approval_status: 'auto_approved',
                    status: 'completed',
                    approved_at: new Date().toISOString(),
                    debit_account_code: invoice.debit_account_code || company?.default_debit_account,
                    credit_account_code: invoice.credit_account_code || company?.default_credit_account,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select()
                .single();

            if (updateError) {
                return errorResponse('Erro ao auto-aprovar fatura', 500);
            }

            // Create accounting entry
            await supabase.from('accounting_entries').insert({
                company_id: user.company_id,
                invoice_id: id,
                debit_account_code: updatedInvoice.debit_account_code,
                debit_amount: amount,
                credit_account_code: updatedInvoice.credit_account_code,
                credit_amount: amount,
                entry_date: new Date().toISOString().split('T')[0],
                erp_status: 'pending',
                created_by: user.id,
            });

            // Audit log
            await supabase.from('audit_log').insert({
                company_id: user.company_id,
                user_id: user.id,
                invoice_id: id,
                action: 'auto_approve_invoice',
                new_values: { approval_status: 'auto_approved', reason: 'Within auto-approval limit' },
            });

            return successResponse({
                status: 'auto_approved',
                next_step: 'completed',
                invoice: updatedInvoice,
            }, 'Fatura auto-aprovada (dentro do limite)');
        }

        // Find matching approval rule
        const { data: rules } = await supabase
            .from('approval_rules')
            .select('*')
            .eq('company_id', user.company_id)
            .eq('is_active', true)
            .lte('min_amount', amount)
            .order('approval_level', { ascending: true });

        // Find the applicable rule
        let matchingRule = null;
        for (const rule of rules || []) {
            if (rule.max_amount === null || amount <= rule.max_amount) {
                matchingRule = rule;
                break;
            }
        }

        if (matchingRule && matchingRule.auto_approve) {
            // Rule says auto-approve
            const { data: updatedInvoice } = await supabase
                .from('invoices')
                .update({
                    approval_status: 'auto_approved',
                    status: 'completed',
                    approved_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select()
                .single();

            await supabase.from('audit_log').insert({
                company_id: user.company_id,
                user_id: user.id,
                invoice_id: id,
                action: 'auto_approve_invoice',
                new_values: { approval_status: 'auto_approved', rule_id: matchingRule.id },
            });

            return successResponse({
                status: 'auto_approved',
                next_step: 'completed',
                invoice: updatedInvoice,
                rule_applied: matchingRule.approval_level,
            }, 'Fatura auto-aprovada (regra de aprovação)');
        }

        // Requires manual approval
        const approverId = matchingRule?.approver_id;

        // Update invoice status
        await supabase
            .from('invoices')
            .update({
                status: 'pending',
                approval_status: 'pending',
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        // Create notification for approver
        if (approverId) {
            await supabase.from('notifications').insert({
                company_id: user.company_id,
                user_id: approverId,
                invoice_id: id,
                type: 'approval_required',
                title: 'Nova fatura aguardando sua aprovação',
                message: `Fatura ${invoice.invoice_number} de ${invoice.supplier_name} no valor de R$ ${amount.toFixed(2)}`,
            });
        }

        return successResponse({
            status: 'pending_approval',
            next_step: 'awaiting_approver',
            approver_id: approverId,
            rule_applied: matchingRule?.approval_level || null,
        }, 'Fatura enviada para aprovação');
    } catch (error) {
        console.error('Validate invoice error:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}
