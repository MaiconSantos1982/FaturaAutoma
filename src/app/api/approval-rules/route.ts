import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth, hasRole } from '@/lib/auth';
import {
    successResponse,
    errorResponse,
    unauthorizedResponse,
    forbiddenResponse,
} from '@/lib/api-response';

// GET /api/approval-rules - List approval rules
export async function GET(request: NextRequest) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        // Only super_admin or master can view rules
        if (!hasRole(user, ['super_admin', 'master'])) {
            return forbiddenResponse('Sem permissão para ver regras de aprovação');
        }

        const { data: rules, error: queryError } = await supabase
            .from('approval_rules')
            .select('*, approver:users!approver_id(id, name, email), escalation_approver:users!escalation_approver_id(id, name, email)')
            .eq('company_id', user.company_id)
            .order('approval_level', { ascending: true });

        if (queryError) {
            console.error('Query error:', queryError);
            return errorResponse('Erro ao buscar regras', 500);
        }

        return successResponse({
            rules,
        }, 'Regras carregadas');
    } catch (error) {
        console.error('Get approval rules error:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}

// POST /api/approval-rules - Create approval rule
export async function POST(request: NextRequest) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        // Only super_admin can create rules
        if (!hasRole(user, ['super_admin'])) {
            return forbiddenResponse('Apenas administradores podem criar regras');
        }

        const body = await request.json();

        // Validate required fields
        if (!body.approval_level || body.min_amount === undefined) {
            return errorResponse('Nível e valor mínimo são obrigatórios', 400);
        }

        // Create rule
        const { data: rule, error: insertError } = await supabase
            .from('approval_rules')
            .insert({
                company_id: user.company_id,
                approval_level: body.approval_level,
                min_amount: body.min_amount,
                max_amount: body.max_amount || null,
                auto_approve: body.auto_approve || false,
                approver_id: body.approver_id || null,
                escalation_approver_id: body.escalation_approver_id || null,
                department_codes: body.department_codes || [],
                approval_deadline_hours: body.approval_deadline_hours || 48,
                priority: body.priority || 10,
                is_active: true,
            })
            .select()
            .single();

        if (insertError) {
            console.error('Insert error:', insertError);
            if (insertError.code === '23505') {
                return errorResponse('Já existe regra com este nível', 409);
            }
            return errorResponse('Erro ao criar regra', 500);
        }

        // Create audit log
        await supabase.from('audit_log').insert({
            company_id: user.company_id,
            user_id: user.id,
            action: 'create_approval_rule',
            new_values: rule,
        });

        return successResponse({ rule }, 'Regra criada com sucesso', 201);
    } catch (error) {
        console.error('Create approval rule error:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}
