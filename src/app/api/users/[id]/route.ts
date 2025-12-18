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

// GET /api/users/:id - Get single user
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        const { id } = await params;

        // Get user
        const { data: targetUser, error: queryError } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (queryError || !targetUser) {
            return notFoundResponse('Usuário não encontrado');
        }

        // Verify company access
        if (targetUser.company_id !== user.company_id) {
            return forbiddenResponse('Sem permissão para acessar este usuário');
        }

        return successResponse({
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email,
            role: targetUser.role,
            department: targetUser.department,
            is_active: targetUser.is_active,
            created_at: targetUser.created_at,
        }, 'Usuário carregado');
    } catch (error) {
        console.error('Get user error:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}

// PUT /api/users/:id - Update user
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        // Only super_admin can update users
        if (!hasRole(user, ['super_admin'])) {
            return forbiddenResponse('Apenas administradores podem editar usuários');
        }

        const { id } = await params;
        const body = await request.json();

        // Get current user
        const { data: targetUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !targetUser) {
            return notFoundResponse('Usuário não encontrado');
        }

        // Verify company access
        if (targetUser.company_id !== user.company_id) {
            return forbiddenResponse('Sem permissão para editar este usuário');
        }

        // Build update data
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (body.name !== undefined) updateData.name = body.name.trim();
        if (body.role !== undefined) updateData.role = body.role;
        if (body.department !== undefined) updateData.department = body.department || null;
        if (body.is_active !== undefined) updateData.is_active = body.is_active;

        // Update user
        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Update error:', updateError);
            return errorResponse('Erro ao atualizar usuário', 500);
        }

        // Create audit log
        await supabase.from('audit_log').insert({
            company_id: user.company_id,
            user_id: user.id,
            action: 'update_user',
            old_values: targetUser,
            new_values: updateData,
        });

        return successResponse({
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                department: updatedUser.department,
                is_active: updatedUser.is_active,
            },
        }, 'Usuário atualizado com sucesso');
    } catch (error) {
        console.error('Update user error:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}

// DELETE /api/users/:id - Soft delete user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        // Only super_admin can delete users
        if (!hasRole(user, ['super_admin'])) {
            return forbiddenResponse('Apenas administradores podem excluir usuários');
        }

        const { id } = await params;

        // Get current user
        const { data: targetUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !targetUser) {
            return notFoundResponse('Usuário não encontrado');
        }

        // Verify company access
        if (targetUser.company_id !== user.company_id) {
            return forbiddenResponse('Sem permissão para excluir este usuário');
        }

        // Cannot delete yourself
        if (targetUser.id === user.id) {
            return errorResponse('Você não pode desativar sua própria conta', 400);
        }

        // Soft delete
        const { error: deleteError } = await supabase
            .from('users')
            .update({
                is_active: false,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (deleteError) {
            console.error('Delete error:', deleteError);
            return errorResponse('Erro ao desativar usuário', 500);
        }

        // Create audit log
        await supabase.from('audit_log').insert({
            company_id: user.company_id,
            user_id: user.id,
            action: 'delete_user',
            old_values: { user_id: id, name: targetUser.name },
        });

        return successResponse(null, 'Usuário desativado com sucesso');
    } catch (error) {
        console.error('Delete user error:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}
