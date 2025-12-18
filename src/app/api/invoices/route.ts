import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import {
    successResponse,
    paginatedResponse,
    errorResponse,
    unauthorizedResponse,
    parsePaginationParams,
} from '@/lib/api-response';

// GET /api/invoices - List invoices with filters
export async function GET(request: NextRequest) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        const { searchParams } = new URL(request.url);
        const { page, limit, offset } = parsePaginationParams(searchParams);

        // Build query
        let query = supabase
            .from('invoices')
            .select('*, approver:users!approver_id(id, name, email)', { count: 'exact' })
            .eq('company_id', user.company_id)
            .order('created_at', { ascending: false });

        // Apply filters
        const status = searchParams.get('status');
        if (status) {
            query = query.eq('status', status);
        }

        const approvalStatus = searchParams.get('approval_status');
        if (approvalStatus) {
            query = query.eq('approval_status', approvalStatus);
        }

        const dateFrom = searchParams.get('date_from');
        if (dateFrom) {
            query = query.gte('created_at', dateFrom);
        }

        const dateTo = searchParams.get('date_to');
        if (dateTo) {
            query = query.lte('created_at', dateTo);
        }

        const supplierName = searchParams.get('supplier_name');
        if (supplierName) {
            query = query.ilike('supplier_name', `%${supplierName}%`);
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data: invoices, error: queryError, count } = await query;

        if (queryError) {
            console.error('Query error:', queryError);
            return errorResponse('Erro ao buscar faturas', 500);
        }

        return paginatedResponse(
            { invoices },
            count || 0,
            page,
            limit,
            'Faturas carregadas com sucesso'
        );
    } catch (error) {
        console.error('Get invoices error:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}

// POST /api/invoices - Create a new invoice manually
export async function POST(request: NextRequest) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        const body = await request.json();

        // Validate required fields
        if (!body.invoice_number || !body.supplier_name || !body.total_amount) {
            return errorResponse('Número da NF, fornecedor e valor são obrigatórios', 400);
        }

        // Check auto-approval
        const { data: company } = await supabase
            .from('companies')
            .select('auto_approve_limit, default_debit_account, default_credit_account')
            .eq('id', user.company_id)
            .single();

        const amount = parseFloat(body.total_amount);
        const autoApproveLimit = company?.auto_approve_limit || 0;
        const shouldAutoApprove = amount <= autoApproveLimit;

        // Create invoice
        const invoiceData = {
            company_id: user.company_id,
            invoice_number: body.invoice_number,
            invoice_series: body.invoice_series || null,
            supplier_name: body.supplier_name,
            supplier_cnpj: body.supplier_cnpj || null,
            total_amount: amount,
            tax_amount: body.tax_amount || 0,
            discount_amount: body.discount_amount || 0,
            due_date: body.due_date || null,
            invoice_date: body.invoice_date || null,
            description: body.description || null,
            po_number: body.po_number || null,
            file_type: body.file_type || null,
            original_file_url: body.original_file_url || null,
            status: 'pending',
            approval_status: shouldAutoApprove ? 'auto_approved' : 'pending',
            debit_account_code: body.debit_account_code || company?.default_debit_account || null,
            credit_account_code: body.credit_account_code || company?.default_credit_account || null,
            created_by: user.id,
        };

        const { data: invoice, error: insertError } = await supabase
            .from('invoices')
            .insert(invoiceData)
            .select()
            .single();

        if (insertError) {
            console.error('Insert error:', insertError);
            if (insertError.code === '23505') {
                return errorResponse('Fatura já cadastrada com este número', 409);
            }
            return errorResponse('Erro ao criar fatura', 500);
        }

        // Create audit log
        await supabase.from('audit_log').insert({
            company_id: user.company_id,
            user_id: user.id,
            invoice_id: invoice.id,
            action: 'create_invoice',
            new_values: invoiceData,
        });

        // If not auto-approved, find approver and create notification
        if (!shouldAutoApprove) {
            const { data: rules } = await supabase
                .from('approval_rules')
                .select('*')
                .eq('company_id', user.company_id)
                .eq('is_active', true)
                .lte('min_amount', amount)
                .or(`max_amount.gte.${amount},max_amount.is.null`)
                .order('approval_level', { ascending: true })
                .limit(1);

            if (rules && rules.length > 0 && rules[0].approver_id) {
                await supabase.from('notifications').insert({
                    company_id: user.company_id,
                    user_id: rules[0].approver_id,
                    invoice_id: invoice.id,
                    type: 'approval_required',
                    title: 'Nova fatura aguardando aprovação',
                    message: `Fatura ${invoice.invoice_number} de ${invoice.supplier_name} no valor de R$ ${amount.toFixed(2)}`,
                });
            }
        }

        return successResponse(
            {
                invoice,
                auto_approved: shouldAutoApprove,
            },
            shouldAutoApprove
                ? 'Fatura criada e auto-aprovada'
                : 'Fatura criada e aguardando aprovação',
            201
        );
    } catch (error) {
        console.error('Create invoice error:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}
