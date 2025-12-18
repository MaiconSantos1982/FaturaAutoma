import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import {
    successResponse,
    errorResponse,
    unauthorizedResponse,
} from '@/lib/api-response';

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const unreadOnly = searchParams.get('unread_only') === 'true';

        let query = supabase
            .from('notifications')
            .select('*, invoice:invoices(id, invoice_number, supplier_name, total_amount)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (unreadOnly) {
            query = query.eq('is_read', false);
        }

        const { data: notifications, error: queryError } = await query;

        if (queryError) {
            console.error('Query error:', queryError);
            return errorResponse('Erro ao buscar notificações', 500);
        }

        // Count unread
        const { count: unreadCount } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        return successResponse({
            notifications,
            unread_count: unreadCount || 0,
        }, 'Notificações carregadas');
    } catch (error) {
        console.error('Get notifications error:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}

// POST /api/notifications - Mark notifications as read
export async function POST(request: NextRequest) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        const body = await request.json();
        const { notification_ids, mark_all_read } = body;

        if (mark_all_read) {
            // Mark all as read
            const { error: updateError } = await supabase
                .from('notifications')
                .update({
                    is_read: true,
                    read_at: new Date().toISOString(),
                })
                .eq('user_id', user.id)
                .eq('is_read', false);

            if (updateError) {
                return errorResponse('Erro ao marcar notificações', 500);
            }

            return successResponse(null, 'Todas as notificações marcadas como lidas');
        }

        if (notification_ids && Array.isArray(notification_ids)) {
            // Mark specific notifications as read
            const { error: updateError } = await supabase
                .from('notifications')
                .update({
                    is_read: true,
                    read_at: new Date().toISOString(),
                })
                .eq('user_id', user.id)
                .in('id', notification_ids);

            if (updateError) {
                return errorResponse('Erro ao marcar notificações', 500);
            }

            return successResponse(null, 'Notificações marcadas como lidas');
        }

        return errorResponse('notification_ids ou mark_all_read é obrigatório', 400);
    } catch (error) {
        console.error('Update notifications error:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}
