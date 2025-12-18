import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth, hasRole } from '@/lib/auth';
import {
    successResponse,
    errorResponse,
    unauthorizedResponse,
    forbiddenResponse,
} from '@/lib/api-response';

// GET /api/company/config - Get company configuration
export async function GET(request: NextRequest) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        const { data: company, error: queryError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', user.company_id)
            .single();

        if (queryError || !company) {
            return errorResponse('Empresa não encontrada', 404);
        }

        return successResponse({
            company_id: company.id,
            name: company.name,
            cnpj: company.cnpj,
            auto_approve_limit: company.auto_approve_limit,
            default_debit_account: company.default_debit_account,
            default_credit_account: company.default_credit_account,
            is_active: company.is_active,
        }, 'Configuração carregada');
    } catch (error) {
        console.error('Get company config error:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}

// PUT /api/company/config - Update company configuration
export async function PUT(request: NextRequest) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        // Only super_admin can update
        if (!hasRole(user, ['super_admin'])) {
            return forbiddenResponse('Apenas administradores podem alterar configurações');
        }

        const body = await request.json();

        // Get current config for audit
        const { data: currentConfig } = await supabase
            .from('companies')
            .select('*')
            .eq('id', user.company_id)
            .single();

        // Build update data
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (body.auto_approve_limit !== undefined) {
            updateData.auto_approve_limit = parseFloat(body.auto_approve_limit) || 0;
        }
        if (body.default_debit_account !== undefined) {
            updateData.default_debit_account = body.default_debit_account || null;
        }
        if (body.default_credit_account !== undefined) {
            updateData.default_credit_account = body.default_credit_account || null;
        }

        // Update company
        const { data: company, error: updateError } = await supabase
            .from('companies')
            .update(updateData)
            .eq('id', user.company_id)
            .select()
            .single();

        if (updateError) {
            console.error('Update error:', updateError);
            return errorResponse('Erro ao atualizar configuração', 500);
        }

        // Create audit log
        await supabase.from('audit_log').insert({
            company_id: user.company_id,
            user_id: user.id,
            action: 'update_company_config',
            old_values: currentConfig,
            new_values: updateData,
        });

        return successResponse({
            company,
        }, 'Configuração atualizada com sucesso');
    } catch (error) {
        console.error('Update company config error:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}
