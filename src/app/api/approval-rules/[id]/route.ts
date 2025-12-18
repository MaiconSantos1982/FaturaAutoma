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

// GET /api/approval-rules/:id
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        if (!hasRole(user, ['super_admin', 'master'])) {
            return forbiddenResponse('Sem permissão');
        }

        const { id } = await params;

        const { data: rule, error: queryError } = await supabase
            .from('approval_rules')
            .select('*, approver:users!approver_id(id, name, email)')
            .eq('id', id)
            .single();

        if (queryError || !rule) {
            return notFoundResponse('Regra não encontrada');
        }

        if (rule.company_id !== user.company_id) {
            return forbiddenResponse('Sem permissão');
        }

        return successResponse({ rule }, 'Regra carregada');
    } catch (error) {
        console.error('Get rule error:', error);
        return errorResponse('Erro interno', 500);
    }
}

// PUT /api/approval-rules/:id
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        if (!hasRole(user, ['super_admin'])) {
            return forbiddenResponse('Apenas administradores podem editar regras');
        }

        const { id } = await params;
        const body = await request.json();

        // Get current rule
        const { data: currentRule, error: fetchError } = await supabase
            .from('approval_rules')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !currentRule) {
            return notFoundResponse('Regra não encontrada');
        }

        if (currentRule.company_id !== user.company_id) {
            return forbiddenResponse('Sem permissão');
        }

        // Build update data
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (body.approval_level !== undefined) updateData.approval_level = body.approval_level;
        if (body.min_amount !== undefined) updateData.min_amount = body.min_amount;
        if (body.max_amount !== undefined) updateData.max_amount = body.max_amount;
        if (body.auto_approve !== undefined) updateData.auto_approve = body.auto_approve;
        if (body.approver_id !== undefined) updateData.approver_id = body.approver_id || null;
        if (body.escalation_approver_id !== undefined) updateData.escalation_approver_id = body.escalation_approver_id || null;
        if (body.department_codes !== undefined) updateData.department_codes = body.department_codes;
        if (body.approval_deadline_hours !== undefined) updateData.approval_deadline_hours = body.approval_deadline_hours;
        if (body.is_active !== undefined) updateData.is_active = body.is_active;

        // Update rule
        const { data: rule, error: updateError } = await supabase
            .from('approval_rules')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Update error:', updateError);
            return errorResponse('Erro ao atualizar regra', 500);
        }

        // Create audit log
        await supabase.from('audit_log').insert({
            company_id: user.company_id,
            user_id: user.id,
            action: 'update_approval_rule',
            old_values: currentRule,
            new_values: updateData,
        });

        return successResponse({ rule }, 'Regra atualizada com sucesso');
    } catch (error) {
        console.error('Update rule error:', error);
        return errorResponse('Erro interno', 500);
    }
}

// DELETE /api/approval-rules/:id
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        if (!hasRole(user, ['super_admin'])) {
            return forbiddenResponse('Apenas administradores podem excluir regras');
        }

        const { id } = await params;

        const { data: currentRule, error: fetchError } = await supabase
            .from('approval_rules')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !currentRule) {
            return notFoundResponse('Regra não encontrada');
        }

        if (currentRule.company_id !== user.company_id) {
            return forbiddenResponse('Sem permissão');
        }

        // Soft delete
        const { error: deleteError } = await supabase
            .from('approval_rules')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (deleteError) {
            return errorResponse('Erro ao excluir regra', 500);
        }

        await supabase.from('audit_log').insert({
            company_id: user.company_id,
            user_id: user.id,
            action: 'delete_approval_rule',
            old_values: currentRule,
        });

        return successResponse(null, 'Regra desativada com sucesso');
    } catch (error) {
        console.error('Delete rule error:', error);
        return errorResponse('Erro interno', 500);
    }
}
