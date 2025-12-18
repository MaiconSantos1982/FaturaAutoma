import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth, hasRole } from '@/lib/auth';
import {
    successResponse,
    errorResponse,
    unauthorizedResponse,
    forbiddenResponse,
} from '@/lib/api-response';

// GET /api/users - List users in company
export async function GET(request: NextRequest) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        // Only super_admin or master can list users
        if (!hasRole(user, ['super_admin', 'master'])) {
            return forbiddenResponse('Sem permissão para listar usuários');
        }

        const { data: users, error: queryError } = await supabase
            .from('users')
            .select('*')
            .eq('company_id', user.company_id)
            .order('name');

        if (queryError) {
            console.error('Query error:', queryError);
            return errorResponse('Erro ao buscar usuários', 500);
        }

        return successResponse({
            users: users.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                department: u.department,
                is_active: u.is_active,
                created_at: u.created_at,
            })),
        }, 'Usuários carregados');
    } catch (error) {
        console.error('Get users error:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        // Only super_admin can create users
        if (!hasRole(user, ['super_admin'])) {
            return forbiddenResponse('Apenas administradores podem criar usuários');
        }

        const body = await request.json();

        // Validate required fields
        if (!body.name || !body.email) {
            return errorResponse('Nome e email são obrigatórios', 400);
        }

        // Check if email already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', body.email.toLowerCase().trim())
            .single();

        if (existingUser) {
            return errorResponse('Email já cadastrado', 409);
        }

        // Create user
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
                company_id: user.company_id,
                name: body.name.trim(),
                email: body.email.toLowerCase().trim(),
                role: body.role || 'user',
                department: body.department || null,
                is_active: true,
            })
            .select()
            .single();

        if (insertError) {
            console.error('Insert error:', insertError);
            return errorResponse('Erro ao criar usuário', 500);
        }

        // Create audit log
        await supabase.from('audit_log').insert({
            company_id: user.company_id,
            user_id: user.id,
            action: 'create_user',
            new_values: { user_id: newUser.id, name: newUser.name, email: newUser.email },
        });

        return successResponse({
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                department: newUser.department,
                is_active: newUser.is_active,
            },
        }, 'Usuário criado com sucesso', 201);
    } catch (error) {
        console.error('Create user error:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}
